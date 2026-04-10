import { useEffect, useState } from 'react'
import { Clock, AlertCircle, CheckCircle } from 'lucide-react'
import { getOfficeHours } from '../../api/officeHours'
import type { OfficeHoursStatus } from '../../types'

interface Props {
  department: string
}

export function OfficeHoursBanner({ department }: Props) {
  const [status, setStatus] = useState<OfficeHoursStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!department) return
    setLoading(true)
    getOfficeHours(department)
      .then(res => setStatus(res.data))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false))
  }, [department])

  if (loading) return (
    <div className="h-12 rounded-xl bg-ascb-navy-mid/40 animate-pulse mb-4" />
  )

  if (!status) return null

  const isOpen = status.is_open

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border mb-6 ${
      isOpen
        ? 'bg-green-500/10 border-green-500/20'
        : 'bg-red-500/10 border-red-500/20'
    }`}>
      <div className="shrink-0 mt-0.5">
        {isOpen
          ? <CheckCircle size={18} className="text-green-400" />
          : <AlertCircle size={18} className="text-red-400" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={isOpen ? 'badge-open' : 'badge-closed'}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-green-400' : 'bg-red-400'}`} />
            {isOpen ? 'OPEN' : 'CLOSED'}
          </span>
          <span className="text-sm font-medium text-white font-ui">
            {department}
          </span>
          {isOpen && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock size={11} /> Mon–Fri 8:00 AM – 5:00 PM
            </span>
          )}
        </div>
        {!isOpen && status.closure_reason && (
          <p className="text-sm text-red-300 mt-1">{status.closure_reason}</p>
        )}
        {!isOpen && status.closed_until && (
          <p className="text-xs text-gray-400 mt-0.5">
            Expected to reopen: {new Date(status.closed_until).toLocaleString('en-PH', {
              weekday: 'short', month: 'short', day: 'numeric',
              hour: 'numeric', minute: '2-digit'
            })}
          </p>
        )}
      </div>
    </div>
  )
}
