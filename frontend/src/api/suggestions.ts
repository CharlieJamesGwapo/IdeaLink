import client from './client'
import type { Suggestion } from '../types'

export interface CreateSuggestionPayload {
  department: string
  user_role: string
  title: string
  description: string
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
