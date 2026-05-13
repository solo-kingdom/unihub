import { useEffect, useState, useCallback } from 'react'
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  message,
  Tag,
  Popconfirm,
  App,
} from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import {
  datasourceApi,
  type Datasource,
  type TypeInfo,
  type ImplementationInfo,
  type TestResult,
} from '../api'

const implColors: Record<string, string> = {
  redis: 'red',
  boltdb: 'blue',
  aerospike: 'purple',
  consul: 'green',
}

export default function DatasourcePage() {
  App.useApp()
  const [datasources, setDatasources] = useState<Datasource[]>([])
  const [types, setTypes] = useState<TypeInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDs, setEditingDs] = useState<Datasource | null>(null)
  const [form] = Form.useForm()
  const [selectedTypeId, setSelectedTypeId] = useState<string>('')
  const [selectedImplId, setSelectedImplId] = useState<string>('')
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)

  // Namespace auto-fetch states (for Aerospike, populated on test connection)
  const [namespaceOptions, setNamespaceOptions] = useState<{ value: string; label: string }[]>([])
  const [namespaceLoading, setNamespaceLoading] = useState(false)

  // Filter states
  const [filterTypeId, setFilterTypeId] = useState<string>('')
  const [filterImplId, setFilterImplId] = useState<string>('')

  const fetchDatasources = useCallback(async () => {
    setLoading(true)
    try {
      const params: { typeId?: string; implId?: string } = {}
      if (filterTypeId) params.typeId = filterTypeId
      if (filterImplId) params.implId = filterImplId
      const res = await datasourceApi.list(params)
      setDatasources(res.data || [])
    } catch {
      message.error('获取数据源列表失败')
    } finally {
      setLoading(false)
    }
  }, [filterTypeId, filterImplId])

  const fetchTypes = async () => {
    try {
      const res = await datasourceApi.listTypes()
      setTypes(res.data || [])
    } catch (err) {
      console.error('获取数据源类型失败:', err)
    }
  }

  useEffect(() => {
    fetchDatasources()
    fetchTypes()
  }, [fetchDatasources])

  // Refetch when filters change
  useEffect(() => {
    fetchDatasources()
  }, [filterTypeId, filterImplId, fetchDatasources])

  // Available implementations based on selected type
  const availableImpls: ImplementationInfo[] = selectedTypeId
    ? types.find((t) => t.id === selectedTypeId)?.implementations || []
    : []

  // Build lookup maps
  const typeMap = Object.fromEntries(types.map((t) => [t.id, t.name]))
  const implMap: Record<string, string> = {}
  types.forEach((t) => t.implementations.forEach((impl) => {
    implMap[impl.id] = impl.name
  }))

  const currentImplMeta = availableImpls.find((impl) => impl.id === selectedImplId)

  // Direct lookup helper: find implementation meta from types by typeId+implId
  const findImplMeta = (typeId: string, implId: string): ImplementationInfo | undefined => {
    const t = types.find(x => x.id === typeId)
    return t?.implementations.find(i => i.id === implId)
  }

  const handleOpenCreate = () => {
    setEditingDs(null)
    setSelectedTypeId('')
    setSelectedImplId('')
    setTestResult(null)
    setNamespaceOptions([])
    setNamespaceLoading(false)
    form.resetFields()
    setModalOpen(true)
  }

  const handleOpenEdit = (ds: Datasource) => {
    setEditingDs(ds)
    setSelectedTypeId(ds.typeId)
    setSelectedImplId(ds.implId)
    setTestResult(null)
    setNamespaceOptions([])
    setNamespaceLoading(false)

    // Reset and set top-level fields synchronously (always in DOM)
    form.resetFields()
    form.setFieldsValue({
      name: ds.name,
      typeId: ds.typeId,
      implId: ds.implId,
    })
    setModalOpen(true)
  }

  // Set config field values after Form.Items mount (avoids antd #57375 bug with preserve=false)
  useEffect(() => {
    if (modalOpen && editingDs && currentImplMeta) {
      const configValues: Record<string, unknown> = {}
      currentImplMeta.configFields.forEach((field) => {
        const raw = editingDs.config[field.name] || field.default || ''
        // For Aerospike namespace: store as array for multi-select
        if (field.name === 'namespace' && selectedImplId === 'aerospike') {
          configValues[`config_${field.name}`] = raw
            ? raw.split(',').map((s: string) => s.trim()).filter(Boolean)
            : []
        } else {
          configValues[`config_${field.name}`] = raw
        }
      })
      form.setFieldsValue(configValues)
    }
  }, [modalOpen, editingDs, currentImplMeta, form, selectedImplId])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const implMeta = findImplMeta(values.typeId, values.implId)
      const config: Record<string, string> = {}
      if (implMeta) {
        implMeta.configFields.forEach((field) => {
          const val = values[`config_${field.name}`]
          if (field.name === 'namespace') {
            // Convert Select multiple/tags array to comma-separated string for storage
            if (Array.isArray(val) && val.length > 0) {
              config[field.name] = val.join(',')
            } else if (val && !Array.isArray(val)) {
              config[field.name] = String(val)
            }
          } else if (val !== undefined && val !== '') {
            config[field.name] = String(val)
          }
        })
      }

      if (editingDs) {
        await datasourceApi.update(editingDs.name, { config })
        message.success('更新成功')
      } else {
        await datasourceApi.create({
          name: values.name,
          typeId: values.typeId,
          implId: values.implId,
          config,
        })
        message.success('创建成功')
      }
      setModalOpen(false)
      fetchDatasources()
    } catch (err: any) {
      if (err?.response?.data?.message) {
        message.error(err.response.data.message)
      }
    }
  }

  const handleDelete = async (name: string) => {
    try {
      await datasourceApi.delete(name)
      message.success('删除成功')
      fetchDatasources()
    } catch {
      message.error('删除失败')
    }
  }

  const handleTest = async () => {
    try {
      const values = await form.validateFields()
      const implMeta = findImplMeta(values.typeId, values.implId)
      const config: Record<string, string> = {}
      if (implMeta) {
        implMeta.configFields.forEach((field) => {
          const val = values[`config_${field.name}`]
          if (field.name === 'namespace') {
            if (Array.isArray(val) && val.length > 0) {
              config[field.name] = val.join(',')
            } else if (val && !Array.isArray(val)) {
              config[field.name] = String(val)
            }
          } else if (val !== undefined && val !== '') {
            config[field.name] = String(val)
          }
        })
      }

      setTestLoading(true)
      setTestResult(null)
      const res = await datasourceApi.testNew({ implId: values.implId, config })

      // For Aerospike: also query available namespaces on successful connection
      let resultMsg = res.data.message
      if (res.data.success && values.implId === 'aerospike') {
        setNamespaceLoading(true)
        try {
          const nsRes = await datasourceApi.queryAerospikeNamespaces(
            String(config.host || 'localhost'),
            parseInt(String(config.port || '3000'))
          )
          const nss: string[] = nsRes.data?.namespaces || []
          const opts = nss.map((ns: string) => ({ value: ns, label: ns }))

          // Keep saved namespaces as options if not in query results
          const savedNs = editingDs?.config?.namespace || values.config_namespace
          if (savedNs) {
            savedNs.split(',').forEach((ns: string) => {
              const trimmed = ns.trim()
              if (trimmed && !opts.find(o => o.value === trimmed)) {
                opts.push({ value: trimmed, label: `${trimmed}（已保存）` })
              }
            })
          }
          setNamespaceOptions(opts)
          if (nss.length > 0) {
            resultMsg += ` — 可用命名空间: ${nss.join(', ')}`
          }
        } catch {
          // namespace query failed, keep original message
          setNamespaceOptions([])
        } finally {
          setNamespaceLoading(false)
        }
      }

      setTestResult({ success: res.data.success, message: resultMsg })
      if (res.data.success) {
        message.success('连接成功')
      } else {
        message.error(res.data.message)
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err?.response?.data?.message || '测试失败' })
      message.error('连接测试失败')
    } finally {
      setTestLoading(false)
    }
  }

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: '类型',
      dataIndex: 'typeId',
      key: 'typeId',
      render: (typeId: string) => typeMap[typeId] || typeId,
    },
    {
      title: '实现',
      dataIndex: 'implId',
      key: 'implId',
      render: (implId: string) => (
        <Tag color={implColors[implId] || 'default'}>{implMap[implId] || implId}</Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Datasource) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleOpenEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description={`确定要删除数据源 "${record.name}" 吗？`}
            onConfirm={() => handleDelete(record.name)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <Space wrap>
          <Select
            allowClear
            placeholder="类型"
            style={{ width: 140 }}
            value={filterTypeId || undefined}
            onChange={(val) => {
              setFilterTypeId(val || '')
              if (!val) setFilterImplId('')
            }}
            options={types.map((t) => ({ value: t.id, label: t.name }))}
          />
          <Select
            allowClear
            placeholder="实现"
            style={{ width: 140 }}
            value={filterImplId || undefined}
            onChange={(val) => setFilterImplId(val || '')}
            options={
              filterTypeId
                ? types.find((t) => t.id === filterTypeId)?.implementations.map((impl) => ({
                    value: impl.id,
                    label: impl.name,
                  })) || []
                : types.flatMap((t) => t.implementations.map((impl) => ({ value: impl.id, label: impl.name })))
            }
          />
        </Space>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
            新增数据源
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchDatasources} loading={loading}>
            刷新
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={datasources}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingDs ? '编辑数据源' : '新增数据源'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={560}
        okText={editingDs ? '更新' : '创建'}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入数据源名称' }]}
          >
            <Input placeholder="唯一标识符，如 my-redis" disabled={!!editingDs} />
          </Form.Item>

          <Form.Item
            name="typeId"
            label="类型"
            rules={[{ required: true, message: '请选择数据源类型' }]}
          >
            <Select
              placeholder="选择数据源类型"
              onChange={(val) => {
                setSelectedTypeId(val)
                setSelectedImplId('')
                setTestResult(null)
                form.setFieldValue('implId', undefined)
                // Clear config fields
                availableImpls.forEach((impl) => {
                  impl.configFields.forEach((field) => {
                    form.setFieldValue(`config_${field.name}`, undefined)
                  })
                })
              }}
              disabled={!!editingDs}
            >
              {types.map((t) => (
                <Select.Option key={t.id} value={t.id}>
                  {t.name} ({t.interface})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="implId"
            label="实现"
            rules={[{ required: true, message: '请选择实现' }]}
          >
            <Select
              placeholder={selectedTypeId ? '选择实现' : '请先选择类型'}
              onChange={(val) => {
                setSelectedImplId(val)
                setTestResult(null)
                setNamespaceOptions([])
                setNamespaceLoading(false)
              }}
              disabled={!!editingDs || !selectedTypeId}
            >
              {availableImpls.map((impl) => (
                <Select.Option key={impl.id} value={impl.id}>
                  {impl.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {currentImplMeta && currentImplMeta.configFields.map((field) => {
            // Aerospike namespace: multi-select driven by test connection results
            if (selectedImplId === 'aerospike' && field.name === 'namespace') {
              return (
                <Form.Item
                  key={field.name}
                  name={`config_${field.name}`}
                  label={field.label}
                  rules={field.required ? [{ required: true, message: `请选择${field.label}` }] : []}
                >
                  {namespaceOptions.length > 0 ? (
                    <Select
                      mode="multiple"
                      placeholder="请选择命名空间"
                      loading={namespaceLoading}
                      options={namespaceOptions}
                      filterOption={(input, option) =>
                        (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                      }
                    />
                  ) : (
                    <Select
                      mode="tags"
                      placeholder="输入命名空间（回车添加多个）"
                      loading={namespaceLoading}
                    />
                  )}
                </Form.Item>
              )
            }

            return (
              <Form.Item
                key={field.name}
                name={`config_${field.name}`}
                label={field.label}
                rules={field.required ? [{ required: true, message: `请输入${field.label}` }] : []}
              >
                {field.type === 'number' ? (
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder={field.placeholder || `请输入${field.label}`}
                  />
                ) : field.type === 'password' ? (
                  <Input.Password placeholder={field.placeholder || `请输入${field.label}`} />
                ) : (
                  <Input placeholder={field.placeholder || `请输入${field.label}`} />
                )}
              </Form.Item>
            )
          })}

          {currentImplMeta && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <Button onClick={handleTest} loading={testLoading}>
                测试连接
              </Button>
              {testResult && (
                <Tag color={testResult.success ? 'success' : 'error'}>{testResult.message}</Tag>
              )}
            </div>
          )}
        </Form>
      </Modal>
    </div>
  )
}
