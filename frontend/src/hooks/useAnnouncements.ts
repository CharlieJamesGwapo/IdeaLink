import { useEffect, useState, useCallback, useRef } from 'react'
import { getAnnouncements } from '../api/announcements'
import type { Announcement } from '../types'

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const fetchAnnouncements = useCallback(() => {
    setIsLoading(true)
    setError(null)
    getAnnouncements()
      .then(res => { if (mountedRef.current) setAnnouncements(Array.isArray(res.data) ? res.data : []) })
      .catch(() => { if (mountedRef.current) setError('Failed to load announcements') })
      .finally(() => { if (mountedRef.current) setIsLoading(false) })
  }, [])

  useEffect(() => {
    fetchAnnouncements()
  }, [fetchAnnouncements])

  return { announcements, isLoading, error, refetch: fetchAnnouncements }
}
