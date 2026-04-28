import { useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import axios from 'axios'
import { getOfficeHours } from '../../api/officeHours'
import type { OfficeHoursStatus } from '../../types'

interface Props {
  office: 'Registrar Office' | 'Finance Office'
}

export function OfficeHoursPage({ office }: Props) {
  const [status, setStatus] = useState<OfficeHoursStatus | null>(null)
  const [loading, setLoading]   = useState(true)

  const reload = async () => {
    try {
      const res = await getOfficeHours(office)
      setStatus(res.data)
    } catch (err) {
      toast.error(axios.isAxiosError(err) ? (err.response?.data?.error ?? 'Could not load hours') : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [office])

  if (loading || !status) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-ascb-orange border-t-transparent animate-spin" />
      </div>
    )
  }

  const isOpen = status.is_open
  return (
    <div className="max-w-3xl mx-auto px-5 py-8 space-y-6">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white font-display">Office Hours</h1>
          <p className="text-gray-400 text-sm font-ui mt-1">{office}</p>
        </div>
        <div className={`px-3 py-1.5 rounded-full border flex items-center gap-2 ${
          isOpen ? 'bg-green-500/8 border-green-500/20' : 'bg-red-500/8 border-red-500/20'
        }`}>
          {isOpen
            ? <span className="h-2 w-2 rounded-full bg-green-400 inline-block" />
            : <AlertCircle size={12} className="text-red-400" />}
          <span className="text-xs font-ui font-semibold">
            {isOpen ? 'OPEN' : 'CLOSED'}
          </span>
          <span className="text-xs text-gray-400 font-ui">· {status.status_message}</span>
        </div>
      </header>

      {/* Card 1 — Weekly Schedule (Task 12) */}
      {/* Card 2 — Schedule a Temporary Closure (Task 13) */}
      {/* Card 3 — Closures Timeline (Task 14) */}
    </div>
  )
}
