import { useEffect, useMemo, useState } from 'react'
import { Clock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import axios from 'axios'
import { cancelClosure, createClosure, getOfficeHours, listClosures, putSchedule } from '../../api/officeHours'
import type { Closure, DaySchedule, OfficeHoursStatus } from '../../types'

interface Props {
  office: 'Registrar Office' | 'Finance Office'
}

export function OfficeHoursPage({ office }: Props) {
  const [status, setStatus] = useState<OfficeHoursStatus | null>(null)
  const [loading, setLoading]   = useState(true)
  const [draftSchedule, setDraftSchedule] = useState<DaySchedule[] | null>(null)
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [closureFrom, setClosureFrom] = useState('')
  const [closureTo,   setClosureTo]   = useState('')
  const [closureReason, setClosureReason] = useState('')
  const [creatingClosure, setCreatingClosure] = useState(false)
  const [pastClosures, setPastClosures] = useState<Closure[]>([])
  const [pastOffset,   setPastOffset]   = useState(0)
  const [pastHasMore,  setPastHasMore]  = useState(false)
  const [pastLoading,  setPastLoading]  = useState(false)
  const [cancellingId, setCancellingId] = useState<number | null>(null)

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

  const todayBounds = () => {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    return { from: `${date}T00:00`, to: `${date}T23:59` }
  }

  const submitClosure = async () => {
    if (!closureFrom || !closureTo) { toast.error('Set both From and To'); return }
    if (closureTo <= closureFrom)   { toast.error('To must be after From'); return }
    setCreatingClosure(true)
    try {
      await createClosure(office, {
        start_at: closureFrom,
        end_at:   closureTo,
        reason:   closureReason.trim() || undefined,
      })
      toast.success('Closure scheduled')
      setClosureReason('')
      const { from, to } = todayBounds()
      setClosureFrom(from)
      setClosureTo(to)
      reload()
      fetchPast(0, false)
    } catch (err) {
      toast.error(axios.isAxiosError(err) ? (err.response?.data?.error ?? 'Could not schedule closure') : 'Something went wrong')
    } finally {
      setCreatingClosure(false)
    }
  }

  const PAST_PAGE_SIZE = 20

  const fetchPast = async (offset = 0, append = false) => {
    setPastLoading(true)
    try {
      const res = await listClosures(office, 'past', PAST_PAGE_SIZE, offset)
      const next = res.data.closures
      setPastClosures(append ? [...pastClosures, ...next] : next)
      setPastHasMore(next.length === PAST_PAGE_SIZE)
      setPastOffset(offset + next.length)
    } catch {
      toast.error('Could not load past closures')
    } finally {
      setPastLoading(false)
    }
  }

  const handleCancel = async (id: number) => {
    setCancellingId(id)
    try {
      await cancelClosure(office, id)
      toast.success('Closure cancelled')
      reload()
      fetchPast(0, false)
    } catch (err) {
      toast.error(axios.isAxiosError(err) ? (err.response?.data?.error ?? 'Could not cancel closure') : 'Something went wrong')
    } finally {
      setCancellingId(null)
    }
  }

  const fmtRange = (start: string, end: string) => {
    const fmt = (s: string) => new Date(s).toLocaleString('en-PH', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    })
    return `${fmt(start)} → ${fmt(end)}`
  }

  useEffect(() => { reload() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [office])

  useEffect(() => { fetchPast(0, false) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [office])

  useEffect(() => {
    const { from, to } = todayBounds()
    setClosureFrom(from)
    setClosureTo(to)
  }, [])

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

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6 space-y-4">
        <h2 className="text-base font-semibold text-white font-ui">Schedule a Temporary Closure</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 font-ui">From</label>
            <input
              type="datetime-local"
              className="input-field h-11 w-full"
              value={closureFrom}
              onChange={e => setClosureFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 font-ui">To</label>
            <input
              type="datetime-local"
              className="input-field h-11 w-full"
              value={closureTo}
              onChange={e => setClosureTo(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-400 font-ui">Reason (optional)</label>
          <textarea
            className="input-field w-full pt-2 pb-2 min-h-[72px]"
            maxLength={500}
            value={closureReason}
            onChange={e => setClosureReason(e.target.value)}
            placeholder="Power outage, conference, etc."
          />
          <p className="text-[10px] text-gray-500 font-ui text-right">{closureReason.length}/500</p>
        </div>

        <button
          type="button"
          onClick={submitClosure}
          disabled={creatingClosure}
          className="h-10 px-5 rounded-xl text-white font-semibold font-ui text-xs disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #F47C20 0%, #d4651a 100%)' }}
        >
          {creatingClosure ? 'Scheduling…' : 'Schedule closure'}
        </button>
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6 space-y-4">
        <h2 className="text-base font-semibold text-white font-ui">Closures</h2>

        {/* Active */}
        {status.active_closure && (
          <div>
            <h3 className="text-xs uppercase text-red-300 tracking-widest font-ui mb-2">Active</h3>
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 flex items-start gap-3">
              <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-red-200 font-ui mb-0.5">Happening now</p>
                <p className="text-sm text-white font-ui">{fmtRange(status.active_closure.start_at, status.active_closure.end_at)}</p>
                {status.active_closure.reason && (
                  <p className="text-xs text-gray-300 mt-1 font-body">{status.active_closure.reason}</p>
                )}
              </div>
              <button
                type="button"
                disabled={cancellingId === status.active_closure.id}
                onClick={() => handleCancel(status.active_closure!.id)}
                className="h-8 px-3 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50"
              >
                {cancellingId === status.active_closure.id ? 'Cancelling…' : 'Cancel closure'}
              </button>
            </div>
          </div>
        )}

        {/* Upcoming */}
        {status.upcoming_closures.length > 0 && (
          <div>
            <h3 className="text-xs uppercase text-yellow-300 tracking-widest font-ui mb-2">Upcoming</h3>
            <div className="space-y-2">
              {status.upcoming_closures.map(c => (
                <div key={c.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-3 flex items-start gap-3">
                  <Clock size={14} className="text-yellow-300 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-ui">{fmtRange(c.start_at, c.end_at)}</p>
                    {c.reason && <p className="text-xs text-gray-400 mt-0.5 font-body">{c.reason}</p>}
                  </div>
                  <button
                    type="button"
                    disabled={cancellingId === c.id}
                    onClick={() => handleCancel(c.id)}
                    className="h-7 px-2.5 rounded-lg text-[11px] font-semibold text-gray-200 bg-white/8 hover:bg-white/15 disabled:opacity-50"
                  >
                    {cancellingId === c.id ? 'Cancelling…' : 'Cancel'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Past */}
        <div>
          <h3 className="text-xs uppercase text-gray-500 tracking-widest font-ui mb-2">Past</h3>
          {pastClosures.length === 0 && !pastLoading && (
            <p className="text-xs text-gray-500 font-ui">No past closures.</p>
          )}
          <div className="space-y-2">
            {pastClosures.map(c => (
              <div key={c.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-3 flex items-start gap-3 opacity-80">
                <Clock size={14} className="text-gray-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 font-ui">{fmtRange(c.start_at, c.end_at)}</p>
                  {c.reason && <p className="text-xs text-gray-400 mt-0.5 font-body">{c.reason}</p>}
                </div>
                {c.cancelled_at && (
                  <span className="text-[10px] text-gray-500 font-ui uppercase tracking-widest mt-1">cancelled</span>
                )}
              </div>
            ))}
          </div>
          {pastHasMore && (
            <button
              type="button"
              disabled={pastLoading}
              onClick={() => fetchPast(pastOffset, true)}
              className="mt-3 text-xs font-ui text-ascb-orange hover:underline disabled:opacity-50"
            >
              {pastLoading ? 'Loading…' : 'Show more'}
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
