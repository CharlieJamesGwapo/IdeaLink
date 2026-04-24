import client from './client'

export interface EmailLog {
  id: number
  to: string
  kind: 'password_reset' | 'provisioning' | 'announcement' | string
  status: 'sent' | 'failed' | 'skipped' | string
  error_msg: string | null
  created_at: string
}

export interface EmailLogFilters {
  kind?: string
  status?: string
  limit?: number
  offset?: number
}

export const getEmailLogs = (filters: EmailLogFilters = {}) => {
  const params = new URLSearchParams()
  if (filters.kind)   params.set('kind', filters.kind)
  if (filters.status) params.set('status', filters.status)
  if (filters.limit !== undefined)  params.set('limit', String(filters.limit))
  if (filters.offset !== undefined) params.set('offset', String(filters.offset))
  const qs = params.toString()
  return client.get<EmailLog[]>(`/api/admin/email-logs${qs ? `?${qs}` : ''}`)
}
