import { useEffect, useState } from 'react'
import { getAnnouncements } from '../api/announcements'
import type { Announcement } from '../types'

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnnouncements = () => {
    setIsLoading(true)
    getAnnouncements()
      .then((res) => setAnnouncements(res.data))
      .catch(() => setError('Failed to load announcements'))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  return { announcements, isLoading, error, refetch: fetchAnnouncements }
}
