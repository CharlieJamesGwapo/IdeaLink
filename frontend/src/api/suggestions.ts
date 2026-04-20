import client from './client'
import type { Suggestion } from '../types'

export interface CreateSuggestionPayload {
  department: string
  service_category: string
  user_role: string
  title: string
  description: string
  rating: number
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

// Soft-delete: hides the row from all staff views but keeps it in the DB.
export const deleteSuggestion = (id: number) =>
  client.delete<void>(`/api/suggestions/${id}`)

export interface SuggestionAttachment {
  id: number
  suggestion_id: number
  filename: string
  mime_type: string
  size_bytes: number
  uploaded_at: string
}

export const uploadSuggestionAttachment = (suggestionID: number, file: File) => {
  const form = new FormData()
  form.append('file', file)
  // Don't set Content-Type — browser sets the multipart boundary.
  return client.post<SuggestionAttachment>(`/api/suggestions/${suggestionID}/attachments`, form)
}

export const listSuggestionAttachments = (suggestionID: number) =>
  client.get<SuggestionAttachment[]>(`/api/suggestions/${suggestionID}/attachments`)

// Direct download URL — the browser hits it with cookies because axios/client
// sets withCredentials. Used for <a href> and <img src>.
export const attachmentDownloadURL = (suggestionID: number, attachmentID: number): string => {
  const base = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
  return `${base}/api/suggestions/${suggestionID}/attachments/${attachmentID}`
}

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
