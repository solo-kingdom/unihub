import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Types
export interface Datasource {
  id: string
  name: string
  typeId: string
  implId: string
  config: Record<string, string>
  createdAt: string
  updatedAt: string
}

export interface ConfigField {
  name: string
  label: string
  type: string
  required: boolean
  default?: string
  placeholder?: string
}

export interface ImplementationInfo {
  id: string
  typeId: string
  name: string
  capabilities: string[]
  configFields: ConfigField[]
}

export interface TypeInfo {
  id: string
  name: string
  interface: string
  implementations: ImplementationInfo[]
}

export interface TestResult {
  success: boolean
  message: string
}

// Datasource APIs
export const datasourceApi = {
  list: (params?: { typeId?: string; implId?: string }) =>
    api.get<Datasource[]>('/datasources', { params }),
  get: (name: string) => api.get<Datasource>(`/datasources/${name}`),
  create: (data: { name: string; typeId: string; implId: string; config: Record<string, string> }) =>
    api.post<Datasource>('/datasources', data),
  update: (name: string, data: { config: Record<string, string> }) =>
    api.put<Datasource>(`/datasources/${name}`, data),
  delete: (name: string) => api.delete(`/datasources/${name}`),
  test: (name: string) => api.post<TestResult>(`/datasources/${name}/test`),
  testNew: (data: { implId: string; config: Record<string, string> }) =>
    api.post<TestResult>('/datasources/test', data),
  listTypes: () => api.get<TypeInfo[]>('/datasource-types'),
}

// Data APIs
export const dataApi = {
  get: (dsName: string, key: string) =>
    api.get(`/datasources/${dsName}/data`, { params: { key } }),
  set: (dsName: string, key: string, value: unknown) =>
    api.put(`/datasources/${dsName}/data`, { key, value }),
  delete: (dsName: string, key: string) =>
    api.delete(`/datasources/${dsName}/data`, { params: { key } }),
  listKeys: (dsName: string, pattern?: string) =>
    api.get<{ keys: string[] }>(`/datasources/${dsName}/keys`, {
      params: pattern ? { pattern } : undefined,
    }),
  randomKey: (dsName: string) =>
    api.get<{ key: string }>(`/datasources/${dsName}/keys/random`),
  exists: (dsName: string, key: string) =>
    api.head(`/datasources/${dsName}/data`, { params: { key } }),
}

export default api
