import { useCallback, useEffect, useRef } from 'react'
import { getUnreadAnnouncementCount, markAnnouncementsSeen } from '../api/announcements'
import { useAuth } from './useAuth'
import { createSharedState } from './createSharedState'

const POLL_INTERVAL_MS = 30_000

// Shared across all components so the Header badge clears the moment
// AnnouncementsPage calls clear() — otherwise both would have independent
// local state and the badge would linger until the next poll.
const countStore = createSharedState(0)

// Guards so only one poll timer runs globally, regardless of how many
// components call the hook at once.
let pollTimer: number | null = null
let pollOwners = 0

// Polls /api/announcements/unread-count while the user is signed in.
// Also exposes a `clear()` that hits /mark-seen and zeros the shared count,
// used when the user opens the announcements page.
export function useAnnouncementUnread() {
  const { role } = useAuth()
  const count = countStore.useValue()
  const roleRef = useRef(role)
  roleRef.current = role

  const fetchCount = useCallback(async () => {
    // Backend returns 0 for non-'user' roles; skip the request entirely.
    if (roleRef.current !== 'user') { countStore.set(0); return }
    try {
      const res = await getUnreadAnnouncementCount()
      countStore.set(res.data?.count ?? 0)
    } catch {
      // Silent: background poll shouldn't noise up the UI
    }
  }, [])

  const clear = useCallback(async () => {
    // Zero immediately so every instance of the badge updates in this tick,
    // then confirm with the server.
    countStore.set(0)
    try {
      await markAnnouncementsSeen()
    } catch {
      // If the server write fails, the next poll will resync.
    }
  }, [])

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

  return { count, clear, refetch: fetchCount }
}
