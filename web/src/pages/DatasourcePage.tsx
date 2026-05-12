import { useEffect, useState } from 'react'
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
  type DatasourceTypeMeta,
  type TestResult,
} from '../api'

const typeColors: Record<string, string> = {
  'kv-redis': 'red',
  'kv-boltdb': 'blue',
  'kv-aerospike': 'purple',
  'config-consul': 'green',
}

export default function DatasourcePage() {
  const { modal } = App.useApp()
  const [datasources, setDatasources] = useState<Datasource[]>([])
  const [types, setTypes] = useState<DatasourceTypeMeta[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDs, setEditingDs] = useState<Datasource | null>(null)
  const [form] = Form.useForm()
  const [selectedType, setSelectedType] = useState<string>('')
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)

  const fetchDatasources = async () => {
    setLoading(true)
    try {
      const res = await datasourceApi.list()
      setDatasources(res.data || [])
    } catch {
      message.error('获取数据源列表失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchTypes = async () => {
    try {
      const res = await datasourceApi.listTypes()
      setTypes(res.data || [])
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchDatasources()
    fetchTypes()
  }, [])

  const currentTypeMeta = types.find((t) => t.type === selectedType)

  const handleOpenCreate = () => {
    setEditingDs(null)
    setSelectedType('')
    setTestResult(null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleOpenEdit = (ds: Datasource) => {
    setEditingDs(ds)
    setSelectedType(ds.type)
    setTestResult(null)
    form.setFieldsValue({
      name: ds.name,
      type: ds.type,
    })
    // Set config field values
    const typeMeta = types.find((t) => t.type === ds.type)
    if (typeMeta) {
      const configValues: Record<string, string> = {}
      typeMeta.configFields.forEach((field) => {
        configValues[`config_${field.name}`] = ds.config[field.name] || field.default || ''
      })
      form.setFieldsValue(configValues)
    }
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const typeMeta = types.find((t) => t.type === values.type)
      const config: Record<string, string> = {}
      if (typeMeta) {
        typeMeta.configFields.forEach((field) => {
          const val = values[`config_${field.name}`]
          if (val !== undefined && val !== '') {
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
          type: values.type,
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
      const typeMeta = types.find((t) => t.type === values.type)
      const config: Record<string, string> = {}
      if (typeMeta) {
        typeMeta.configFields.forEach((field) => {
          const val = values[`config_${field.name}`]
          if (val !== undefined && val !== '') {
            config[field.name] = String(val)
          }
        })
      }

      setTestLoading(true)
      setTestResult(null)
      const res = await datasourceApi.testNew({ type: values.type, config })
      setTestResult(res.data)
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
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const meta = types.find((t) => t.type === type)
        return <Tag color={typeColors[type] || 'default'}>{meta?.name || type}</Tag>
      },
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
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
          新增数据源
        </Button>
        <Button icon={<ReloadOutlined />} onClick={fetchDatasources} loading={loading}>
          刷新
        </Button>
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
        <Form form={form} layout="vertical" disabled={!!editingDs}>
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入数据源名称' }]}
          >
            <Input placeholder="唯一标识符，如 my-redis" disabled={!!editingDs} />
          </Form.Item>

          <Form.Item
            name="type"
            label="类型"
            rules={[{ required: true, message: '请选择数据源类型' }]}
          >
            <Select
              placeholder="选择数据源类型"
              onChange={(val) => {
                setSelectedType(val)
                setTestResult(null)
              }}
              disabled={!!editingDs}
            >
              {types.map((t) => (
                <Select.Option key={t.type} value={t.type}>
                  {t.name} ({t.category})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>

        {currentTypeMeta && (
          <Form form={form} layout="vertical">
            {currentTypeMeta.configFields.map((field) => (
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
                    defaultValue={field.default ? Number(field.default) : undefined}
                  />
                ) : field.type === 'password' ? (
                  <Input.Password placeholder={field.placeholder || `请输入${field.label}`} />
                ) : (
                  <Input placeholder={field.placeholder || `请输入${field.label}`} />
                )}
              </Form.Item>
            ))}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <Button onClick={handleTest} loading={testLoading}>
                测试连接
              </Button>
              {testResult && (
                <Tag color={testResult.success ? 'success' : 'error'}>{testResult.message}</Tag>
              )}
            </div>
          </Form>
        )}
      </Modal>
    </div>
  )
}
