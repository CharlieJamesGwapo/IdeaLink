import client from './client'
import type { Suggestion } from '../types'

export interface CreateSuggestionPayload {
  department: string
  service_category: string
  user_role: string
  title: string
  description: string
  rating?: number
  anonymous: boolean
}

export const getSuggestions = () =>
  client.get<Suggestion[]>('/api/suggestions')

export const submitSuggestion = (payload: CreateSuggestionPayload) =>
  client.post<Suggestion>('/api/suggestions', payload)

export const updateSuggestionStatus = (id: number, status: string) =>
  client.patch(`/api/suggestions/${id}/status`, { status })

export const featureSuggestion = (id: number) =>
  client.post(`/api/suggestions/${id}/feature`)

// Staff auto-mark: opening a feedback detail flips status to "Reviewed".
export const markSuggestionReviewed = (id: number) =>
  client.post<void>(`/api/suggestions/${id}/read`)

// User-side: unread-status-change badge for "My Submissions".
export const getSubmissionsStatusUnreadCount = () =>
  client.get<{ count: number }>('/api/submissions/status-unread-count')

export const markSubmissionsSeen = () =>
  client.post<void>('/api/submissions/mark-seen')

export interface WeeklyUsage {
  used: number
  limit: number
  resets_at: string
}

export const getWeeklyUsage = () =>
  client.get<WeeklyUsage>('/api/submissions/weekly-usage')
