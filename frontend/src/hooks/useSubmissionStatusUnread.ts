import { useCallback, useEffect, useRef } from 'react'
import { getSubmissionsStatusUnreadCount } from '../api/suggestions'
import { useAuth } from './useAuth'
import { createSharedState } from './createSharedState'

const POLL_INTERVAL_MS = 30_000

// Shared across all components so the Header badge reflects changes made
// by SubmissionsPage (markSubmissionsSeen) without waiting for the poll.
const countStore = createSharedState(0)

let pollTimer: number | null = null
let pollOwners = 0

// Polls /api/submissions/status-unread-count while a student is signed in,
// so "My Submissions" can show a badge when staff updates a status.
export function useSubmissionStatusUnread() {
  const { role } = useAuth()
  const count = countStore.useValue()
  const roleRef = useRef(role)
  roleRef.current = role

  const fetchCount = useCallback(async () => {
    if (roleRef.current !== 'user') { countStore.set(0); return }
    try {
      const res = await getSubmissionsStatusUnreadCount()
      countStore.set(res.data?.count ?? 0)
    } catch {
      // Silent — background poll, no toast noise.
    }
  }, [])

  const clearLocal = useCallback(() => countStore.set(0), [])

  useEffect(() => {
    if (role !== 'user') {
      countStore.set(0)
      return
    }
    pollOwners++
    fetchCount()
    if (pollTimer === null) {
      pollTimer = window.setInterval(fetchCount, POLL_INTERVAL_MS)
    }
    return () => {
      pollOwners--
      if (pollOwners <= 0 && pollTimer !== null) {
        window.clearInterval(pollTimer)
        pollTimer = null
        pollOwners = 0
      }
    }
  }, [role, fetchCount])

  return { count, clearLocal, refetch: fetchCount }
}
