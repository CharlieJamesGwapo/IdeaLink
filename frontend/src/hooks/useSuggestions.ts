import { useEffect, useState, useCallback, useRef } from 'react'
import { getSuggestions } from '../api/suggestions'
import type { Suggestion } from '../types'

export function useSuggestions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const fetchSuggestions = useCallback(() => {
    setIsLoading(true)
    setError(null)
    getSuggestions()
      .then(res => { if (mountedRef.current) setSuggestions(Array.isArray(res.data) ? res.data : []) })
      .catch(() => { if (mountedRef.current) setError('Failed to load feedback. Please try again.') })
      .finally(() => { if (mountedRef.current) setIsLoading(false) })
  }, [])

  useEffect(() => {
    fetchSuggestions()
  }, [fetchSuggestions])

  return { suggestions, setSuggestions, isLoading, error, refetch: fetchSuggestions }
}
