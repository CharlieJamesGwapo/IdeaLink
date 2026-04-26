import client from './client'

export type Department = 'Registrar Office' | 'Finance Office'

export interface Service {
  id: number
  department: Department
  label: string
  icon_name: string
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateServiceInput {
  department: Department
  label: string
  icon_name: string
  display_order: number
}

export type UpdateServicePatch = Partial<{
  department: Department
  label: string
  icon_name: string
  display_order: number
  is_active: boolean
}>

export const listServices = (department: Department) =>
  client.get<Service[]>(`/api/services?department=${encodeURIComponent(department)}`)

export const adminListServices = () =>
  client.get<Service[]>('/api/admin/services')

export const createService = (body: CreateServiceInput) =>
  client.post<Service>('/api/admin/services', body)

export const updateService = (id: number, patch: UpdateServicePatch) =>
  client.patch<Service>(`/api/admin/services/${id}`, patch)

export const disableService = (id: number) =>
  client.delete<Service>(`/api/admin/services/${id}`)
