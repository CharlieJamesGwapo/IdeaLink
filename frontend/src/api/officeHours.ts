import client from './client'
import type { OfficeHoursStatus } from '../types'

export const getOfficeHours = (dept: string) =>
  client.get<OfficeHoursStatus>(`/api/office-hours/${encodeURIComponent(dept)}`)

export interface SetOfficeHoursPayload {
  is_open: boolean
  closure_reason: string
  closed_until: string | null
}

export const setOfficeHours = (dept: string, payload: SetOfficeHoursPayload) =>
  client.post<OfficeHoursStatus>(`/api/office-hours/${encodeURIComponent(dept)}`, payload)
