import client from './client'
import type { Closure, DaySchedule, OfficeHoursStatus } from '../types'

export const getOfficeHours = (dept: string) =>
  client.get<OfficeHoursStatus>(`/api/office-hours/${encodeURIComponent(dept)}`)

export const putSchedule = (dept: string, schedule: DaySchedule[]) =>
  client.put<OfficeHoursStatus>(
    `/api/office-hours/${encodeURIComponent(dept)}/schedule`,
    { schedule },
  )

export type ClosureStatus = 'active' | 'upcoming' | 'past' | 'all'

export const listClosures = (dept: string, status: ClosureStatus = 'all', limit = 50, offset = 0) =>
  client.get<{ closures: Closure[] }>(
    `/api/office-hours/${encodeURIComponent(dept)}/closures`,
    { params: { status, limit, offset } },
  )

export interface CreateClosurePayload {
  start_at: string  // RFC3339 or "YYYY-MM-DDTHH:MM"
  end_at: string
  reason?: string
}

export const createClosure = (dept: string, payload: CreateClosurePayload) =>
  client.post<Closure>(`/api/office-hours/${encodeURIComponent(dept)}/closures`, payload)

export const cancelClosure = (dept: string, id: number) =>
  client.delete<Closure>(`/api/office-hours/${encodeURIComponent(dept)}/closures/${id}`)
