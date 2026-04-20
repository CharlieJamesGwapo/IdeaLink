import client from './client'
import type { OfficeHoursStatus } from '../types'

export const getOfficeHours = (dept: string) =>
  client.get<OfficeHoursStatus>(`/api/office-hours/${encodeURIComponent(dept)}`)

// Partial update. Omit fields you don't want to change.
export interface SetOfficeHoursPayload {
  open_hour?: number
  close_hour?: number
  closure_reason?: string
  closed_until?: string | null
  clear_closure?: boolean
}

export const setOfficeHours = (dept: string, payload: SetOfficeHoursPayload) =>
  client.post<OfficeHoursStatus>(`/api/office-hours/${encodeURIComponent(dept)}`, payload)
