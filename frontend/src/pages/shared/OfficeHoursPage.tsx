import { useEffect, useMemo, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import axios from 'axios'
import { getOfficeHours, putSchedule } from '../../api/officeHours'
import type { DaySchedule, OfficeHoursStatus } from '../../types'

interface Props {
  office: 'Registrar Office' | 'Finance Office'
}

export function OfficeHoursPage({ office }: Props) {
  const [status, setStatus] = useState<OfficeHoursStatus | null>(null)
  const [loading, setLoading]   = useState(true)
  const [draftSchedule, setDraftSchedule] = useState<DaySchedule[] | null>(null)
  const [savingSchedule, setSavingSchedule] = useState(false)

  const reload = async () => {
    try {
      const res = await getOfficeHours(office)
      setStatus(res.data)
      setDraftSchedule(res.data.schedule)
    } catch (err) {
      toast.error(axios.isAxiosError(err) ? (err.response?.data?.error ?? 'Could not load hours') : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const VISUAL_ORDER = [1, 2, 3, 4, 5, 6, 0] as const
  const DAY_NAMES: Record<number, string> = {
    0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
    4: 'Thursday', 5: 'Friday', 6: 'Saturday',
  }

  const isDirty = useMemo(() => {
    if (!status || !draftSchedule) return false
    return JSON.stringify(status.schedule) !== JSON.stringify(draftSchedule)
  }, [status, draftSchedule])

  const updateDay = (weekday: number, patch: Partial<DaySchedule>) => {
    if (!draftSchedule) return
    setDraftSchedule(draftSchedule.map(d => d.weekday === weekday ? { ...d, ...patch } : d))
  }

  const saveSchedule = async () => {
    if (!draftSchedule) return
    for (const d of draftSchedule) {
      if (!d.is_closed && d.open_hour >= d.close_hour) {
        toast.error(`${DAY_NAMES[d.weekday]}: Open must be earlier than Close`)
        return
      }
    }
    setSavingSchedule(true)
    try {
      const res = await putSchedule(office, draftSchedule)
      setStatus(res.data)
      setDraftSchedule(res.data.schedule)
      toast.success('Schedule saved')
    } catch (err) {
      toast.error(axios.isAxiosError(err) ? (err.response?.data?.error ?? 'Could not save schedule') : 'Something went wrong')
    } finally {
      setSavingSchedule(false)
    }
  }

  const HOUR_OPTIONS = Array.from({ length: 25 }, (_, i) => i) // 0..24
  const formatHour = (h: number) => {
    if (h === 0 || h === 24) return '12:00 AM'
    const suffix = h >= 12 && h < 24 ? 'PM' : 'AM'
    const display = h % 12 === 0 ? 12 : h % 12
    return `${display}:00 ${suffix}`
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

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white font-ui">Weekly Schedule</h2>
          <button
            type="button"
            onClick={saveSchedule}
            disabled={!isDirty || savingSchedule}
            className="h-9 px-4 rounded-xl text-white font-semibold font-ui text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #F47C20 0%, #d4651a 100%)' }}
          >
            {savingSchedule ? 'Saving…' : 'Save schedule'}
          </button>
        </div>

        <div className="space-y-2">
          {draftSchedule && VISUAL_ORDER.map(wd => {
            const day = draftSchedule.find(d => d.weekday === wd)!
            const invalid = !day.is_closed && day.open_hour >= day.close_hour
            return (
              <div key={wd} className="grid grid-cols-1 sm:grid-cols-[120px_1fr_1fr_auto] gap-3 items-center px-3 py-2 rounded-xl bg-white/[0.02] border border-white/8">
                <span className="text-sm font-medium text-white font-ui">{DAY_NAMES[wd]}</span>
                <select
                  className="input-field h-10 w-full"
                  value={day.open_hour}
                  disabled={day.is_closed}
                  onChange={e => updateDay(wd, { open_hour: parseInt(e.target.value, 10) })}
                >
                  {HOUR_OPTIONS.slice(0, 24).map(h => (
                    <option key={h} value={h}>Open at {formatHour(h)}</option>
                  ))}
                </select>
                <select
                  className="input-field h-10 w-full"
                  value={day.close_hour}
                  disabled={day.is_closed}
                  onChange={e => updateDay(wd, { close_hour: parseInt(e.target.value, 10) })}
                >
                  {HOUR_OPTIONS.slice(1).map(h => (
                    <option key={h} value={h}>Closes at {formatHour(h)}</option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-xs text-gray-300 font-ui select-none">
                  <input
                    type="checkbox"
                    checked={day.is_closed}
                    onChange={e => updateDay(wd, { is_closed: e.target.checked })}
                  />
                  Closed
                </label>
                {invalid && (
                  <p className="sm:col-span-4 text-[11px] text-red-400 font-ui">Open must be earlier than Close.</p>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Card 2 — Schedule a Temporary Closure (Task 13) */}
      {/* Card 3 — Closures Timeline (Task 14) */}
    </div>
  )
}
