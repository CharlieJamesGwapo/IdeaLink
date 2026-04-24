import { useCallback, useEffect, useRef, useState } from 'react'
import { getAnnouncements } from '../api/announcements'
import { useGlobalPoll } from './useGlobalPoll'
import type { Announcement } from '../types'

const STALE_MS = 10_000

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const lastFetchedAtRef = useRef(0)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const fetchNow = useCallback(async () => {
    try {
      const res = await getAnnouncements()
      if (!mountedRef.current) return
      setAnnouncements(Array.isArray(res.data) ? res.data : [])
      setError(null)
      lastFetchedAtRef.current = Date.now()
    } catch {
      if (mountedRef.current) setError('Failed to load announcements')
    } finally {
      if (mountedRef.current) setIsLoading(false)
    }
  }, [])

  // 30s poll — shared timer across the app. The public HomePage and the
  // user AnnouncementsPage both benefit; admin views already call refetch
  // after mutations, so the extra tick is just freshness insurance.
  useGlobalPoll(fetchNow)

  // Consumers call this when they need the list to be fresh RIGHT NOW
  // (e.g., AnnouncementsPage on mount). Returns immediately if the last
  // fetch was recent enough to trust.
  const ensureFresh = useCallback(async () => {
    if (Date.now() - lastFetchedAtRef.current > STALE_MS) {
      await fetchNow()
    }
  }, [fetchNow])

  return { announcements, isLoading, error, refetch: fetchNow, ensureFresh }
}
