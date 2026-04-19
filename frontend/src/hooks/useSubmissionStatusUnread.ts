import { useCallback, useEffect, useRef, useState } from 'react'
import { getSubmissionsStatusUnreadCount } from '../api/suggestions'
import { useAuth } from './useAuth'

const POLL_INTERVAL_MS = 30_000

// Polls /api/submissions/status-unread-count while a student is signed in,
// so "My Submissions" can show a badge when staff updates a status.
export function useSubmissionStatusUnread() {
  const { role } = useAuth()
  const [count, setCount] = useState(0)
  const timerRef = useRef<number | null>(null)

  const fetchCount = useCallback(async () => {
    try {
      const res = await getSubmissionsStatusUnreadCount()
      setCount(res.data?.count ?? 0)
    } catch {
      // Silent — background poll, no toast noise.
    }
  }, [])

  const clearLocal = useCallback(() => setCount(0), [])

  useEffect(() => {
    if (role !== 'user') { setCount(0); return }
    fetchCount()
    timerRef.current = window.setInterval(fetchCount, POLL_INTERVAL_MS)
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [role, fetchCount])

  return { count, clearLocal, refetch: fetchCount }
}
