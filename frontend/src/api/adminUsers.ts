import client from './client'

export interface ProvisionInput {
  email: string
  fullname: string
  education_level: 'HS' | 'SHS' | 'College'
  college_department?: 'CCE' | 'CTE' | 'CABE' | 'CCJE' | 'TVET' | null
}

export interface ProvisionResult {
  email: string
  fullname: string
  status: 'created' | 'skipped' | 'error'
  error?: string
  // Whether the welcome email with credentials actually sent. If false,
  // temp_password will be set so the admin can relay the password manually.
  email_sent?: boolean
  email_error?: string
  temp_password?: string
}

export interface BulkResult {
  summary: { created: number; skipped: number; error: number }
  results: ProvisionResult[]
}

export const provisionUser = (input: ProvisionInput) =>
  client.post<ProvisionResult>('/api/admin/users', input)

export const bulkProvisionUsers = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  // Don't set Content-Type manually — axios/browser auto-set it with the
  // required multipart boundary. Forcing the header strips the boundary
  // and the server will fail to parse the upload.
  return client.post<BulkResult>('/api/admin/users/bulk', form)
}
