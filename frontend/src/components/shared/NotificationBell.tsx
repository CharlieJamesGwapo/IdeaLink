import { useState, useRef, useEffect, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { getUnreadCount, markAllNotificationsRead } from '../../api/notifications'
import { useAuth } from '../../hooks/useAuth'
import { useGlobalPoll } from '../../hooks/useGlobalPoll'

interface Props {
  onClick?: () => void
}

export function NotificationBell({ onClick }: Props) {
  const { role } = useAuth()
  const [count, setCount] = useState(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const fetch = useCallback(async () => {
    try {
      const res = await getUnreadCount()
      if (mountedRef.current) setCount(res.data.count)
    } catch {
      // silently ignore — bell just shows no badge
    }
  }, [])

  useGlobalPoll(fetch, Boolean(role) && role !== 'user')

  // Facebook-style: clicking the bell clears the badge for everything the
  // current role can see, then runs the parent's onClick (typically a
  // navigate to the feedback list). Optimistic — set count to 0 immediately
  // so the badge disappears even before the server responds.
  const handleClick = () => {
    if (count > 0) {
      setCount(0)
      markAllNotificationsRead().catch(() => {
        // server failed — re-fetch the real count so we don't lie to the user
        fetch()
      })
    }
    onClick?.()
  }

  if (!role || role === 'user') return null

  const label = count > 0
    ? `${count > 99 ? '99+' : count} unread submission${count !== 1 ? 's' : ''}`
    : 'No unread submissions'

  return (
    <button
      onClick={handleClick}
      className="relative p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
      aria-label={label}
      title={label}
    >
      <Bell size={20} />
      {count > 0 && (
        <>
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-ascb-orange animate-pulse-ring" />
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-ascb-orange text-white text-[10px] font-bold flex items-center justify-center px-1 font-ui">
            {count > 99 ? '99+' : count}
          </span>
        </>
      )}
    </button>
  )
}
