import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, AlertCircle } from 'lucide-react'
import { getOfficeHours } from '../../api/officeHours'
import type { OfficeHoursStatus } from '../../types'

interface Props {
  office: 'Registrar Office' | 'Finance Office'
  /**
   * Where the "Manage →" link goes. The two staff portals are the only
   * callers; both pass an absolute path.
   */
  manageHref: string
}

export function OfficeStatusPill({ office, manageHref }: Props) {
  const [status, setStatus] = useState<OfficeHoursStatus | null>(null)

  useEffect(() => {
    let cancelled = false
    getOfficeHours(office)
      .then(res => { if (!cancelled) setStatus(res.data) })
      .catch(() => { if (!cancelled) setStatus(null) })
    return () => { cancelled = true }
  }, [office])

  if (!status) {
    return <div className="skeleton h-12 rounded-xl" />
  }

  const isOpen = status.is_open
  const dotClass = isOpen ? 'bg-green-400' : 'bg-red-400'

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
      isOpen
        ? 'bg-green-500/8 border-green-500/20'
        : 'bg-red-500/8 border-red-500/20'
    }`}>
      <span className="relative flex h-3 w-3 items-center justify-center shrink-0">
        {isOpen && (
          <span className={`absolute inline-flex h-full w-full rounded-full ${dotClass} opacity-40 animate-ping`} />
        )}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dotClass}`} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={isOpen ? 'badge-open' : 'badge-closed'}>
            {isOpen ? 'OPEN' : 'CLOSED'}
          </span>
          <span className="text-sm font-medium text-white font-ui">{office}</span>
          <span className="text-xs text-gray-400 flex items-center gap-1 font-ui">
            {isOpen ? <Clock size={11} /> : <AlertCircle size={11} />}
            {status.status_message}
          </span>
        </div>
      </div>
      <Link
        to={manageHref}
        className="text-xs font-semibold text-ascb-orange hover:underline shrink-0 font-ui"
      >
        Manage →
      </Link>
    </div>
  )
}
