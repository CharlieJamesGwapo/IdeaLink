import { useEffect, useState } from 'react'
import { getSuggestions } from '../api/suggestions'
import type { Suggestion } from '../types'

export function useSuggestions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSuggestions = () => {
    setIsLoading(true)
    getSuggestions()
      .then((res) => setSuggestions(res.data))
      .catch(() => setError('Failed to load suggestions'))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    fetchSuggestions()
  }, [])

  return { suggestions, setSuggestions, isLoading, error, refetch: fetchSuggestions }
}
