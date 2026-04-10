import { useEffect, useState, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { getUnreadCount } from '../../api/notifications'
import { useAuth } from '../../hooks/useAuth'

interface Props {
  onClick?: () => void
}

export function NotificationBell({ onClick }: Props) {
  const { role } = useAuth()
  const [count, setCount] = useState(0)

  const fetchCount = useCallback(async () => {
    try {
      const res = await getUnreadCount()
      setCount(res.data.count)
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    if (!role || role === 'user') return
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [role, fetchCount])

  if (!role || role === 'user') return null

  return (
    <button
      onClick={onClick}
      className="relative p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
      title={`${count} unread submission${count !== 1 ? 's' : ''}`}
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
