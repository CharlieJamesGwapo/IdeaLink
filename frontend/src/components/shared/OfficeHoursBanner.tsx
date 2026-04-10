import { useEffect, useState } from 'react'
import { Clock, AlertCircle } from 'lucide-react'
import { getOfficeHours } from '../../api/officeHours'
import type { OfficeHoursStatus } from '../../types'

interface Props { department: string }

export function OfficeHoursBanner({ department }: Props) {
  const [status, setStatus] = useState<OfficeHoursStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!department) return
    let cancelled = false
    setLoading(true)
    getOfficeHours(department)
      .then(res => { if (!cancelled) setStatus(res.data) })
      .catch(() => { if (!cancelled) setStatus(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [department])

  if (loading) return <div className="skeleton h-12 rounded-xl mb-4" />
  if (!status) return null

  const isOpen = status.is_open

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border mb-2 transition-all duration-300 ${
      isOpen ? 'bg-green-500/8 border-green-500/20' : 'bg-red-500/8 border-red-500/20'
    }`}>
      <div className="shrink-0 mt-0.5">
        {isOpen ? (
          /* Animated pulse dot for open state */
          <span className="relative flex h-4 w-4 items-center justify-center mt-0.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-40 animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-400" />
          </span>
        ) : (
          <AlertCircle size={17} className="text-red-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={isOpen ? 'badge-open' : 'badge-closed'}>
            {isOpen ? 'OPEN' : 'CLOSED'}
          </span>
          <span className="text-sm font-medium text-white font-ui">{department}</span>
          {isOpen && (
            <span className="text-xs text-gray-400 flex items-center gap-1 font-ui">
              <Clock size={11} /> Mon–Fri  8:00 AM – 5:00 PM
            </span>
          )}
        </div>
        {!isOpen && status.closure_reason && (
          <p className="text-sm text-red-300 mt-1 font-body">{status.closure_reason}</p>
        )}
        {!isOpen && status.closed_until && (
          <p className="text-xs text-gray-400 mt-0.5 font-ui">
            Expected reopen:{' '}
            {new Date(status.closed_until).toLocaleString('en-PH', {
              weekday: 'short', month: 'short', day: 'numeric',
              hour: 'numeric', minute: '2-digit',
            })}
          </p>
        )}
      </div>
    </div>
  )
}
