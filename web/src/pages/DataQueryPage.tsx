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
  Table,
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

  // Active namespace for Aerospike (switches independently from saved config)
  const [activeNamespace, setActiveNamespace] = useState<string>('')

  // Meta info panel states (for Aerospike)
  const [metaData, setMetaData] = useState<Record<string, unknown> | null>(null)
  const [metaLoading, setMetaLoading] = useState(false)
  const [metaPanelOpen, setMetaPanelOpen] = useState(false)

  // Aerospike direct query input
  const [queryInput, setQueryInput] = useState<string>('')
  const [queryNotFound, setQueryNotFound] = useState(false)

  // Aerospike sample data
  const [sampleData, setSampleData] = useState<Array<{ key: string; value: unknown }>>([])
  const [sampleLoading, setSampleLoading] = useState(false)

  // Derive full datasource object for config access
  const selectedDatasource = datasources.find((d) => d.name === selectedDs)

  // Task 1.1: isAerospike computed variable
  const isAerospike = selectedDatasource?.implId === 'aerospike'

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
    setActiveNamespace('')
    setMetaData(null)
    setMetaPanelOpen(false)
    // Task 2.4: reset aerospike query state
    setQueryInput('')
    setQueryNotFound(false)
    // Reset sample data
    setSampleData([])

    const ds = datasources.find((d) => d.name === name)
    if (!ds) return

    // Task 2.4: only fetchKeys for non-Aerospike
    if (ds.implId !== 'aerospike') {
      fetchKeys(name)
    }

    // Set active namespace for Aerospike (first namespace or full value)
    const savedNs = ds.config.namespace || ''
    setActiveNamespace(savedNs.includes(',') ? savedNs.split(',')[0].trim() : savedNs)

    // Test connection for Aerospike datasources
    if (ds.implId === 'aerospike') {
      handleRetryConnection(name)
      fetchSampleData(name)

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
            // Keep saved namespaces as option if not in results (supports comma-separated multi-value)
            const savedNs = ds.config.namespace
            if (savedNs) {
              savedNs.split(',').forEach((ns: string) => {
                const trimmed = ns.trim()
                if (trimmed && !opts.find(o => o.value === trimmed)) {
                  opts.push({ value: trimmed, label: `${trimmed}（已保存）` })
                }
              })
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

  const handleRetryConnection = useCallback(async (dsName: string) => {
    setConnectionLoading(true)
    try {
      const res = await datasourceApi.test(dsName)
      setConnectionStatus(res.data)
    } catch (err: any) {
      setConnectionStatus({ success: false, message: err?.response?.data?.message || '连接测试失败' })
    } finally {
      setConnectionLoading(false)
    }
  }, [])

  const fetchSampleData = useCallback(async (dsName: string) => {
    if (!dsName) return
    setSampleLoading(true)
    try {
      const res = await dataApi.queryAerospikeSample(dsName, 20)
      setSampleData(res.data?.items || [])
    } catch {
      setSampleData([])
    } finally {
      setSampleLoading(false)
    }
  }, [])

  const handleFetchMeta = useCallback(async () => {
    if (!selectedDs) return
    setMetaLoading(true)
    try {
      const res = await dataApi.queryAerospikeMeta(selectedDs, 'sets,statistics,build,node')
      setMetaData(res.data || null)
    } catch {
      setMetaData(null)
    } finally {
      setMetaLoading(false)
    }
  }, [selectedDs])

  const handleToggleMetaPanel = useCallback(() => {
    const nextOpen = !metaPanelOpen
    setMetaPanelOpen(nextOpen)
    if (nextOpen && !metaData) {
      handleFetchMeta()
    }
  }, [metaPanelOpen, metaData, handleFetchMeta])

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

  // Task 1.3 & 1.4: Aerospike direct key query
  const handleAerospikeQuery = useCallback(async (key?: string) => {
    const queryKey = key ?? queryInput
    if (!queryKey.trim()) return
    setQueryNotFound(false)
    setSelectedKey(queryKey)
    setValueLoading(true)
    try {
      const res = await dataApi.get(selectedDs, queryKey)
      setKeyValue(res.data?.value)
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setQueryNotFound(true)
        setKeyValue(null)
      } else {
        message.error('获取数据失败')
        setKeyValue(null)
      }
    } finally {
      setValueLoading(false)
    }
  }, [selectedDs, queryInput, message])

  // Task 1.6: clear query input resets state
  const handleQueryInputChange = (value: string) => {
    setQueryInput(value)
    if (!value.trim()) {
      setSelectedKey('')
      setKeyValue(null)
      setQueryNotFound(false)
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
      // Task 2.1: for Aerospike, show result directly instead of fetchKeys
      if (isAerospike) {
        setQueryInput(values.key)
        setQueryNotFound(false)
        setSelectedKey(values.key)
        setKeyValue(parsedValue)
      } else {
        fetchKeys(selectedDs)
      }
    } catch (err: any) {
      if (err?.response?.data?.message) {
        message.error(err.response.data.message)
      } else {
        message.error('添加失败')
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
      // Task 2.2: refresh value display after edit (works for both modes)
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
      // Task 2.3: for Aerospike, clear query input and value panel
      if (isAerospike) {
        setQueryInput('')
        setSelectedKey('')
        setKeyValue(null)
        setQueryNotFound(false)
      } else {
        if (selectedKey === key) {
          setSelectedKey('')
          setKeyValue(null)
        }
        fetchKeys(selectedDs)
      }
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
        <Space wrap>
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
          {/* Non-Aerospike: refresh button */}
          {selectedDs && !isAerospike && (
            <Button
              icon={<ReloadOutlined />}
              onClick={() => fetchKeys(selectedDs)}
            >
              刷新
            </Button>
          )}
          {/* Aerospike: meta info toggle */}
          {isAerospike && (
            <Button
              icon={<span>📊</span>}
              onClick={handleToggleMetaPanel}
              type={metaPanelOpen ? 'primary' : 'default'}
            >
              元信息
            </Button>
          )}
          {/* Aerospike: namespace selector + connection status */}
          {isAerospike && (
            <>
              {namespaceOptions.length > 0 ? (
                <Select
                  style={{ width: 180 }}
                  placeholder="命名空间"
                  loading={namespaceLoading}
                  value={activeNamespace || undefined}
                  options={namespaceOptions}
                  onChange={(val) => {
                    setActiveNamespace(val)
                  }}
                  filterOption={(input, option) =>
                    (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                />
              ) : (
                <Tag color="purple">
                  {namespaceLoading ? <Spin size="small" /> : null}
                  ns: {activeNamespace || selectedDatasource!.config.namespace || '(未设置)'}
                </Tag>
              )}
              {connectionLoading ? (
                <Tag><Spin size="small" /> 测试中...</Tag>
              ) : connectionStatus ? (
                <Space size={4}>
                  <Tag color={connectionStatus.success ? 'success' : 'error'}>
                    {connectionStatus.success ? '已连接' : '连接失败'}
                  </Tag>
                  {!connectionStatus.success && (
                    <Button
                      size="small"
                      icon={<ReloadOutlined />}
                      loading={connectionLoading}
                      onClick={() => handleRetryConnection(selectedDs)}
                    >
                      重试
                    </Button>
                  )}
                </Space>
              ) : null}
            </>
          )}
        </Space>
      </div>

      {/* Aerospike Meta Info Panel */}
      {metaPanelOpen && isAerospike && (
        <div
          style={{
            marginBottom: 16,
            padding: 16,
            border: '1px solid #d9d9d9',
            borderRadius: 8,
            background: '#fafafa',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text strong style={{ fontSize: 14 }}>📊 Aerospike 元信息</Text>
            <Space>
              <Button size="small" icon={<ReloadOutlined />} loading={metaLoading} onClick={handleFetchMeta}>
                刷新
              </Button>
              <Button size="small" onClick={() => setMetaPanelOpen(false)}>收起</Button>
            </Space>
          </div>
          {metaLoading ? (
            <div style={{ textAlign: 'center', padding: 16 }}><Spin /></div>
          ) : metaData ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {/* Node & Build Info */}
              {(!!metaData.nodeId || !!metaData.build || !!metaData.clusterName) && (
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {metaData.nodeId ? <Tag color="blue">Node: {String(metaData.nodeId)}</Tag> : null}
                  {metaData.build ? <Tag color="geekblue">Build: {String(metaData.build)}</Tag> : null}
                  {metaData.clusterName ? <Tag color="green">Cluster: {String(metaData.clusterName)}</Tag> : null}
                </div>
              )}

              {/* Namespaces */}
              {Array.isArray(metaData.namespaces) && (
                <div style={{ padding: 8, background: '#fff', borderRadius: 6, border: '1px solid #f0f0f0' }}>
                  <Text strong style={{ fontSize: 13 }}>命名空间</Text>
                  <div style={{ marginTop: 4 }}>
                    {(metaData.namespaces as string[]).map((ns) => (
                      <Tag key={ns} color="purple">{ns}</Tag>
                    ))}
                  </div>
                </div>
              )}

              {/* Sets per Namespace */}
              {!!metaData.sets && (
                <div style={{ padding: 8, background: '#fff', borderRadius: 6, border: '1px solid #f0f0f0' }}>
                  <Text strong style={{ fontSize: 13 }}>Set 列表</Text>
                  <div style={{ marginTop: 4 }}>
                    {Object.entries(metaData.sets as Record<string, string[]>).map(([ns, sets]) => (
                      <div key={ns} style={{ marginBottom: 4 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>{ns}: </Text>
                        {sets.length > 0
                          ? sets.map((s) => <Tag key={s} style={{ marginBottom: 2 }}>{s}</Tag>)
                          : <Text type="secondary" style={{ fontSize: 12 }}>(无)</Text>
                        }
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Statistics (collapsible within panel) */}
              {!!metaData.statistics && (
                <details style={{ padding: 8, background: '#fff', borderRadius: 6, border: '1px solid #f0f0f0', gridColumn: '1 / -1' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 500, fontSize: 13 }}>服务器统计</summary>
                  <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 4 }}>
                    {Object.entries(metaData.statistics as Record<string, string>).map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 8px', fontSize: 12, background: '#fafafa', borderRadius: 4 }}>
                        <Text type="secondary" ellipsis style={{ maxWidth: 140 }}>{k}</Text>
                        <Text strong>{v}</Text>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 16, color: '#999' }}>加载元信息失败</div>
          )}
        </div>
      )}

      {!selectedDs ? (
        <Empty description="请先选择数据源" />
      ) : isAerospike ? (
        /* Task 1.2 & 1.3: Aerospike mode — direct key query layout */
        <div style={{ minHeight: 400 }}>
          {/* Key query toolbar */}
          <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
            <Input
              style={{ maxWidth: 400 }}
              placeholder="输入 key 名称查询"
              value={queryInput}
              onChange={(e) => handleQueryInputChange(e.target.value)}
              onPressEnter={() => handleAerospikeQuery()}
              prefix={<SearchOutlined />}
              allowClear
            />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              loading={valueLoading}
              onClick={() => handleAerospikeQuery()}
            >
              查询
            </Button>
          </div>

          {/* Sample data panel */}
          <div style={{ marginBottom: 16, border: '1px solid #f0f0f0', borderRadius: 8 }}>
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
              <span>📋 示例数据 {sampleData.length > 0 && `(${sampleData.length})`}</span>
              <Button
                size="small"
                icon={<ReloadOutlined />}
                loading={sampleLoading}
                onClick={() => fetchSampleData(selectedDs)}
              >
                换一批
              </Button>
            </div>
            <div style={{ padding: sampleLoading || sampleData.length === 0 ? 16 : 0 }}>
              {sampleLoading ? (
                <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
              ) : sampleData.length === 0 ? (
                <Empty description="暂无示例数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <Table
                  size="small"
                  pagination={false}
                  dataSource={sampleData}
                  rowKey="key"
                  onRow={(record) => ({
                    onClick: () => {
                      setQueryInput(record.key)
                      setQueryNotFound(false)
                      setSelectedKey(record.key)
                      setKeyValue(record.value)
                    },
                    style: { cursor: 'pointer' },
                  })}
                  columns={[
                    {
                      title: 'Key',
                      dataIndex: 'key',
                      width: 200,
                      ellipsis: true,
                      render: (val: string) => <Text code>{val}</Text>,
                    },
                    {
                      title: 'Value',
                      dataIndex: 'value',
                      ellipsis: true,
                      render: (val: unknown) => {
                        const str = val === null || val === undefined ? '' : typeof val === 'object' ? JSON.stringify(val) : String(val)
                        return <Text type="secondary" ellipsis>{str}</Text>
                      },
                    },
                  ]}
                />
              )}
            </div>
          </div>

          {/* Value detail panel (full width) */}
          <div
            style={{
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
              {/* Task 1.5: hide edit/delete when key not found */}
              {selectedKey && !queryNotFound && (
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
              ) : queryNotFound ? (
                /* Task 1.5: key not found message */
                <Empty description={`键 "${queryInput}" 不存在`} image={Empty.PRESENTED_IMAGE_SIMPLE} />
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
                <Empty description="请输入 key 查询" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Non-Aerospike mode — original key list + value detail layout */
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
          {/* Aerospike context: namespace and set */}
          {selectedDatasource?.implId === 'aerospike' && (
            <div style={{ marginBottom: 12, padding: '6px 10px', background: '#f6f8fa', borderRadius: 6, fontSize: 13 }}>
              <Space size={12}>
                <span>
                  📍 <Text type="secondary">namespace:</Text>{' '}
                  <Tag color="purple">{activeNamespace || selectedDatasource.config.namespace}</Tag>
                </span>
                <span>
                  📦 <Text type="secondary">set:</Text>{' '}
                  <Tag color="blue">{selectedDatasource.config.set || '默认'}</Tag>
                </span>
              </Space>
            </div>
          )}
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
          {/* Aerospike context: namespace and set */}
          {selectedDatasource?.implId === 'aerospike' && (
            <div style={{ marginBottom: 12, padding: '6px 10px', background: '#f6f8fa', borderRadius: 6, fontSize: 13 }}>
              <Space size={12}>
                <span>
                  📍 <Text type="secondary">namespace:</Text>{' '}
                  <Tag color="purple">{activeNamespace || selectedDatasource.config.namespace}</Tag>
                </span>
                <span>
                  📦 <Text type="secondary">set:</Text>{' '}
                  <Tag color="blue">{selectedDatasource.config.set || '默认'}</Tag>
                </span>
              </Space>
            </div>
          )}
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
