import client from './client'
import type { Announcement } from '../types'

export const getAnnouncements = () =>
  client.get<Announcement[]>('/api/announcements')

export const createAnnouncement = (title: string, message: string) =>
  client.post<Announcement>('/api/announcements', { title, message })

export const updateAnnouncement = (id: number, title: string, message: string) =>
  client.put<void>(`/api/announcements/${id}`, { title, message })

export const deleteAnnouncement = (id: number) =>
  client.delete<void>(`/api/announcements/${id}`)
