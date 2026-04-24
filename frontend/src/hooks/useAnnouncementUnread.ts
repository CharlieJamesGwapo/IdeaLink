import { useCallback } from 'react'
import { toast } from 'sonner'
import { getUnreadAnnouncementCount, markAnnouncementsSeen } from '../api/announcements'
import { useAuth } from './useAuth'
import { useGlobalPoll } from './useGlobalPoll'
import { createSharedState } from './createSharedState'

// Shared across all components so the Header badge clears the moment
// AnnouncementsPage calls clear() — otherwise both would have independent
// local state and the badge would linger until the next poll.
const countStore = createSharedState(0)

// Polls /api/announcements/unread-count while the user is signed in.
// Also exposes a `clear()` that hits /mark-seen and zeros the shared count,
// used when the user opens the announcements page.
export function useAnnouncementUnread() {
  const { role } = useAuth()
  const count = countStore.useValue()

  const fetchCount = useCallback(async () => {
    // Backend returns 0 for non-'user' roles; skip the request entirely.
    if (role !== 'user') { countStore.set(0); return }
    try {
      const res = await getUnreadAnnouncementCount()
      countStore.set(res.data?.count ?? 0)
    } catch {
      // Silent: background poll shouldn't noise up the UI
    }
  }, [role])

  // Only subscribe to the poll when we actually have a user role.
  useGlobalPoll(fetchCount, role === 'user')

  const clear = useCallback(async () => {
    // Zero immediately so every instance of the badge updates in this tick,
    // then confirm with the server. On failure, the next poll resyncs, but
    // we toast so the user sees SOMETHING — the original bug report said
    // "badge takes long to clear", which turns out to have been masked by
    // a silent failure path.
    const prev = countStore.get()
    countStore.set(0)
    try {
      await markAnnouncementsSeen()
    } catch {
      countStore.set(prev)
      toast.error('Couldn\'t mark announcements as seen, will retry')
    }
  }, [])

  return { count, clear, refetch: fetchCount }
}
