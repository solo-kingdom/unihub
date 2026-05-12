import { useEffect, useState, useRef, useCallback } from 'react'
import {
  Select,
  List,
  Input,
  Button,
  Space,
  Empty,
  Spin,
  Modal,
  Form,
  App,
  Popconfirm,
  Typography,
  Tag,
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { datasourceApi, dataApi, type Datasource, type TestResult } from '../api'

const { Text, Paragraph } = Typography

export default function DataQueryPage() {
  const { message } = App.useApp()
  const [datasources, setDatasources] = useState<Datasource[]>([])
  const [selectedDs, setSelectedDs] = useState<string>('')
  const [keys, setKeys] = useState<string[]>([])
  const [selectedKey, setSelectedKey] = useState<string>('')
  const [keyValue, setKeyValue] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)
  const [valueLoading, setValueLoading] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [addForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const [searchPattern, setSearchPattern] = useState('')
  const [randomLoading, setRandomLoading] = useState(false)
  const [keyExistsWarning, setKeyExistsWarning] = useState(false)
  const [checkingKey, setCheckingKey] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<TestResult | null>(null)
  const [connectionLoading, setConnectionLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const existsDebounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Namespace auto-query states (for Aerospike)
  const [namespaceOptions, setNamespaceOptions] = useState<{ value: string; label: string }[]>([])
  const [namespaceLoading, setNamespaceLoading] = useState(false)
  const namespaceDebounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Derive full datasource object for config access
  const selectedDatasource = datasources.find((d) => d.name === selectedDs)

  useEffect(() => {
    datasourceApi.list().then((res) => {
      setDatasources(res.data || [])
    })
  }, [])

  // Cleanup namespace debounce on unmount
  useEffect(() => {
    return () => {
      if (namespaceDebounceRef.current) clearTimeout(namespaceDebounceRef.current)
    }
  }, [])

  const fetchKeys = useCallback(async (dsName: string, pattern?: string) => {
    if (!dsName) return
    setLoading(true)
    setSelectedKey('')
    setKeyValue(null)
    try {
      const res = await dataApi.listKeys(dsName, pattern || undefined)
      setKeys(res.data?.keys || [])
    } catch {
      message.error('获取键列表失败')
    } finally {
      setLoading(false)
    }
  }, [message])

  const handleSelectDs = (name: string) => {
    setSelectedDs(name)
    setSearchPattern('')
    setConnectionStatus(null)
    setNamespaceOptions([])
    fetchKeys(name)

    const ds = datasources.find((d) => d.name === name)
    if (!ds) return

    // Test connection for Aerospike datasources
    if (ds.implId === 'aerospike') {
      setConnectionLoading(true)
      datasourceApi.test(name).then((res) => {
        setConnectionStatus(res.data)
      }).catch((err) => {
        setConnectionStatus({ success: false, message: err?.response?.data?.message || '连接测试失败' })
      }).finally(() => {
        setConnectionLoading(false)
      })

      // Auto-query namespaces for Aerospike
      const host = ds.config.host || 'localhost'
      const port = parseInt(ds.config.port || '3000')
      if (host && port) {
        setNamespaceLoading(true)
        if (namespaceDebounceRef.current) clearTimeout(namespaceDebounceRef.current)
        namespaceDebounceRef.current = setTimeout(async () => {
          try {
            const nsRes = await datasourceApi.queryAerospikeNamespaces(host, port)
            const opts = (nsRes.data?.namespaces || []).map((ns: string) => ({ value: ns, label: ns }))
            // Keep saved namespace as option if not in results
            const savedNs = ds.config.namespace
            if (savedNs && !opts.find(o => o.value === savedNs)) {
              opts.push({ value: savedNs, label: `${savedNs}（已保存）` })
            }
            setNamespaceOptions(opts)
          } catch {
            // query failed, leave options empty
          } finally {
            setNamespaceLoading(false)
          }
        }, 300)
      }
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchPattern(value)
    // Debounce server-side search
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchKeys(selectedDs, value || undefined)
    }, 300)
  }

  const handleRandomKey = async () => {
    setRandomLoading(true)
    try {
      const res = await dataApi.randomKey(selectedDs)
      const randomKey = res.data?.key
      if (randomKey) {
        handleSelectKey(randomKey)
      }
    } catch (err: any) {
      if (err?.response?.status === 404) {
        message.info('当前数据源无可用数据')
      } else {
        message.error('获取随机键失败')
      }
    } finally {
      setRandomLoading(false)
    }
  }

  const handleKeyNameChange = (value: string) => {
    // Debounce key existence check
    if (existsDebounceRef.current) clearTimeout(existsDebounceRef.current)
    if (!value) {
      setKeyExistsWarning(false)
      return
    }
    existsDebounceRef.current = setTimeout(async () => {
      setCheckingKey(true)
      try {
        await dataApi.exists(selectedDs, value)
        setKeyExistsWarning(true)
      } catch {
        setKeyExistsWarning(false)
      } finally {
        setCheckingKey(false)
      }
    }, 500)
  }

  const handleSelectKey = async (key: string) => {
    setSelectedKey(key)
    setValueLoading(true)
    try {
      const res = await dataApi.get(selectedDs, key)
      setKeyValue(res.data?.value)
    } catch {
      message.error('获取数据失败')
      setKeyValue(null)
    } finally {
      setValueLoading(false)
    }
  }

  const handleAdd = async () => {
    try {
      const values = await addForm.validateFields()
      let parsedValue = values.value
      try {
        parsedValue = JSON.parse(values.value)
      } catch {
        // keep as string
      }
      await dataApi.set(selectedDs, values.key, parsedValue)
      message.success('添加成功')
      setAddModalOpen(false)
      addForm.resetFields()
      fetchKeys(selectedDs)
    } catch (err: any) {
      if (err?.response?.data?.message) {
        message.error(err.response.data.message)
      }
    }
  }

  const handleEdit = async () => {
    try {
      const values = await editForm.validateFields()
      let parsedValue = values.value
      try {
        parsedValue = JSON.parse(values.value)
      } catch {
        // keep as string
      }
      await dataApi.set(selectedDs, selectedKey, parsedValue)
      message.success('更新成功')
      setEditModalOpen(false)
      handleSelectKey(selectedKey)
    } catch (err: any) {
      if (err?.response?.data?.message) {
        message.error(err.response.data.message)
      }
    }
  }

  const handleDelete = async (key: string) => {
    try {
      await dataApi.delete(selectedDs, key)
      message.success('删除成功')
      if (selectedKey === key) {
        setSelectedKey('')
        setKeyValue(null)
      }
      fetchKeys(selectedDs)
    } catch {
      message.error('删除失败')
    }
  }

  const formatValue = (val: unknown): string => {
    if (val === null || val === undefined) return ''
    if (typeof val === 'object') return JSON.stringify(val, null, 2)
    return String(val)
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <span>选择数据源：</span>
          <Select
            style={{ width: 300 }}
            placeholder="请选择数据源"
            onChange={handleSelectDs}
            value={selectedDs || undefined}
          >
            {datasources.map((ds) => (
              <Select.Option key={ds.name} value={ds.name}>
                {ds.name} ({ds.implId})
              </Select.Option>
            ))}
          </Select>
          {selectedDs && (
            <Button
              icon={<PlusOutlined />}
              type="primary"
              onClick={() => setAddModalOpen(true)}
            >
              新增
            </Button>
          )}
          {selectedDs && (
            <Button
              icon={<ReloadOutlined />}
              onClick={() => fetchKeys(selectedDs)}
            >
              刷新
            </Button>
          )}
          {/* Aerospike: namespace selector + connection status */}
          {selectedDatasource && selectedDatasource.implId === 'aerospike' && (
            <>
              {namespaceOptions.length > 0 ? (
                <Select
                  style={{ width: 180 }}
                  placeholder="命名空间"
                  loading={namespaceLoading}
                  value={selectedDatasource.config.namespace || undefined}
                  options={namespaceOptions}
                  filterOption={(input, option) =>
                    (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                />
              ) : (
                <Tag color="purple">
                  {namespaceLoading ? <Spin size="small" /> : null}
                  ns: {selectedDatasource.config.namespace || '(未设置)'}
                </Tag>
              )}
              {connectionLoading ? (
                <Tag><Spin size="small" /> 测试中...</Tag>
              ) : connectionStatus ? (
                <Tag color={connectionStatus.success ? 'success' : 'error'}>
                  {connectionStatus.success ? '已连接' : '连接失败'}
                </Tag>
              ) : null}
            </>
          )}
        </Space>
      </div>

      {!selectedDs ? (
        <Empty description="请先选择数据源" />
      ) : (
        <div style={{ display: 'flex', gap: 16, minHeight: 400 }}>
          {/* 键列表 - 左侧面板 */}
          <div
            style={{
              width: 280,
              border: '1px solid #f0f0f0',
              borderRadius: 8,
              overflow: 'auto',
              maxHeight: 600,
            }}
          >
            <div
              style={{
                padding: '8px 16px',
                borderBottom: '1px solid #f0f0f0',
                fontWeight: 500,
                background: '#fafafa',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span>键列表 ({keys.length})</span>
                <Button
                  size="small"
                  onClick={handleRandomKey}
                  loading={randomLoading}
                >
                  🎲 随机
                </Button>
              </div>
              <Input
                size="small"
                placeholder="搜索键名 (支持 * 通配符)"
                prefix={<SearchOutlined />}
                allowClear
                value={searchPattern}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center' }}>
                <Spin />
              </div>
            ) : keys.length === 0 ? (
              <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                size="small"
                dataSource={keys}
                renderItem={(key) => (
                  <List.Item
                    style={{
                      cursor: 'pointer',
                      background: selectedKey === key ? '#e6f7ff' : undefined,
                      padding: '8px 16px',
                    }}
                    onClick={() => handleSelectKey(key)}
                    actions={[
                      <Button
                        key="del"
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={(e) => {
                          e.stopPropagation()
                        }}
                      />,
                    ]}
                  >
                    <Text ellipsis style={{ maxWidth: 180 }}>
                      {key}
                    </Text>
                  </List.Item>
                )}
              />
            )}
          </div>

          {/* 值详情 - 右侧面板 */}
          <div
            style={{
              flex: 1,
              border: '1px solid #f0f0f0',
              borderRadius: 8,
              overflow: 'auto',
              maxHeight: 600,
            }}
          >
            <div
              style={{
                padding: '8px 16px',
                borderBottom: '1px solid #f0f0f0',
                fontWeight: 500,
                background: '#fafafa',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{selectedKey ? `键: ${selectedKey}` : '值详情'}</span>
              {selectedKey && (
                <Space>
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => {
                      editForm.setFieldsValue({ value: formatValue(keyValue) })
                      setEditModalOpen(true)
                    }}
                  >
                    编辑
                  </Button>
                  <Popconfirm
                    title="确认删除"
                    description={`确定要删除键 "${selectedKey}" 吗？`}
                    onConfirm={() => handleDelete(selectedKey)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button size="small" danger icon={<DeleteOutlined />}>
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              )}
            </div>
            <div style={{ padding: 16 }}>
              {valueLoading ? (
                <Spin />
              ) : selectedKey ? (
                <Paragraph>
                  <pre
                    style={{
                      background: '#f5f5f5',
                      padding: 12,
                      borderRadius: 4,
                      fontSize: 13,
                      maxHeight: 500,
                      overflow: 'auto',
                    }}
                  >
                    {formatValue(keyValue)}
                  </pre>
                </Paragraph>
              ) : (
                <Empty description="请选择键查看详情" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* 新增键值 Modal */}
      <Modal
        title="新增键值"
        open={addModalOpen}
        onOk={handleAdd}
        onCancel={() => {
          setAddModalOpen(false)
          setKeyExistsWarning(false)
          addForm.resetFields()
        }}
        okText="添加"
      >
        <Form form={addForm} layout="vertical">
          <Form.Item
            name="key"
            label="键名"
            rules={[{ required: true, message: '请输入键名' }]}
            validateStatus={keyExistsWarning ? 'warning' : undefined}
            help={keyExistsWarning ? '该键名已存在，继续添加将覆盖原值' : undefined}
          >
            <Input
              placeholder="请输入键名"
              onChange={(e) => handleKeyNameChange(e.target.value)}
              suffix={checkingKey ? <Spin size="small" /> : undefined}
            />
          </Form.Item>
          <Form.Item
            name="value"
            label="值"
            rules={[{ required: true, message: '请输入值' }]}
          >
            <Input.TextArea rows={4} placeholder='请输入值（支持 JSON 格式，如 {"key": "value"}）' />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑键值 Modal */}
      <Modal
        title={`编辑: ${selectedKey}`}
        open={editModalOpen}
        onOk={handleEdit}
        onCancel={() => setEditModalOpen(false)}
        okText="保存"
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="value"
            label="值"
            rules={[{ required: true, message: '请输入值' }]}
          >
            <Input.TextArea rows={8} placeholder="请输入值" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
