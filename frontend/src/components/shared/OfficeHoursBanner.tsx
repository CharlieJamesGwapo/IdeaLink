import { useEffect, useState } from 'react'
import { Clock, AlertCircle } from 'lucide-react'
import { getOfficeHours } from '../../api/officeHours'
import type { OfficeHoursStatus } from '../../types'

interface Props { department: string }

function formatHour(h: number): string {
  if (h === 0 || h === 24) return '12:00 AM'
  const suffix = h >= 12 ? 'PM' : 'AM'
  const display = h % 12 === 0 ? 12 : h % 12
  return `${display}:00 ${suffix}`
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function todayHoursLabel(status: OfficeHoursStatus): string {
  const now = new Date()
  const wd = now.getDay() // 0=Sun..6=Sat
  const today = status.schedule.find(d => d.weekday === wd)
  if (!today || today.is_closed) return `${DAY_LABELS[wd]} · Closed today`
  return `${DAY_LABELS[wd]} · ${formatHour(today.open_hour)} – ${formatHour(today.close_hour)}`
}

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
          <span className="text-xs text-gray-400 flex items-center gap-1 font-ui">
            <Clock size={11} /> {todayHoursLabel(status)}
          </span>
        </div>
        {!isOpen && status.active_closure?.reason && (
          <p className="text-sm text-red-300 mt-1 font-body">{status.active_closure.reason}</p>
        )}
        {!isOpen && status.active_closure?.end_at && (
          <p className="text-xs text-gray-400 mt-0.5 font-ui">
            Expected reopen:{' '}
            {new Date(status.active_closure.end_at).toLocaleString('en-PH', {
              weekday: 'short', month: 'short', day: 'numeric',
              hour: 'numeric', minute: '2-digit',
            })}
          </p>
        )}
      </div>
    </div>
  )
}
