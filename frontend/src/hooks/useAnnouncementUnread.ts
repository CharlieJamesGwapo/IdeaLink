import { useCallback, useEffect, useRef, useState } from 'react'
import { getUnreadAnnouncementCount, markAnnouncementsSeen } from '../api/announcements'
import { useAuth } from './useAuth'

const POLL_INTERVAL_MS = 30_000

// Polls /api/announcements/unread-count while the user is signed in.
// Also exposes a `clear()` that hits /mark-seen and zeros the local count,
// used when the user opens the announcements page.
export function useAnnouncementUnread() {
  const { role } = useAuth()
  const [count, setCount] = useState(0)
  const timerRef = useRef<number | null>(null)

  const fetchCount = useCallback(async () => {
    try {
      const res = await getUnreadAnnouncementCount()
      setCount(res.data?.count ?? 0)
    } catch {
      // Silent: background poll shouldn't noise up the UI
    }
  }, [])

  const clear = useCallback(async () => {
    try {
      await markAnnouncementsSeen()
    } catch {
      // Ignore — next poll will resync
    }
    setCount(0)
  }, [])

  useEffect(() => {
    if (!role) { setCount(0); return }
    fetchCount()
    timerRef.current = window.setInterval(fetchCount, POLL_INTERVAL_MS)
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [role, fetchCount])

  return { count, clear, refetch: fetchCount }
}
