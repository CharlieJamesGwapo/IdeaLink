import client from './client'
import type { Highlight } from '../types'

export const getHighlights = () =>
  client.get<Highlight[]>('/api/highlights')

export const createHighlight = (suggestionId: number) =>
  client.post<{ id: number }>('/api/admin/highlights', { suggestion_id: suggestionId })

export const deleteHighlight = (id: number) =>
  client.delete<void>(`/api/admin/highlights/${id}`)

export const reactHighlight = (id: number) =>
  client.post<{ react_count: number; viewer_reacted: boolean }>(`/api/highlights/${id}/react`)
