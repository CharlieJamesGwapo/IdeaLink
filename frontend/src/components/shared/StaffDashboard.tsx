import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, Clock, CheckCircle, Download, ToggleLeft, ToggleRight, Search, ArrowRight, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { toast } from 'sonner'
import { useSuggestions } from '../../hooks/useSuggestions'
import { updateSuggestionStatus } from '../../api/suggestions'
import { getOfficeHours, setOfficeHours } from '../../api/officeHours'
import { exportToCSV } from '../../api/reports'
import { Skeleton } from '../ui/Skeleton'
import { Badge } from '../ui/Badge'
import { RatingsPanel } from './RatingsPanel'
import type { OfficeHoursStatus, Suggestion } from '../../types'

const STATUS_COLORS: Record<string, string> = { Delivered: '#F59E0B', Unreviewed: '#F59E0B', Reviewed: '#22C55E' }
const BAR_COLOR = '#F47C20'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3 py-2 text-xs font-ui border border-white/10" style={{ background: 'rgba(13,31,60,0.95)', backdropFilter: 'blur(12px)' }}>
      <p className="text-gray-300 mb-1">{label}</p>
      {payload.map((p: any, i: number) => <p key={i} style={{ color: p.color ?? p.fill }}>{p.name}: <strong>{p.value}</strong></p>)}
    </div>
  )
}

interface Props {
  dept: 'Registrar Office' | 'Finance Office'
  accent: string
  feedbackPath: string
}

export function StaffDashboard({ dept, accent, feedbackPath }: Props) {
  const { suggestions, setSuggestions, isLoading, error, refetch } = useSuggestions()
  const [officeHours, setOfficeHoursState] = useState<OfficeHoursStatus | null>(null)
  const [officeHoursLoading, setOfficeHoursLoading] = useState(true)
  const [closureReason, setClosureReason] = useState('')
  const [closedUntil, setClosedUntil] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [showCloseForm, setShowCloseForm] = useState(false)
  const [search, setSearch] = useState('')
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    setOfficeHoursLoading(true)
    getOfficeHours(dept)
      .then(res => { if (mountedRef.current) setOfficeHoursState(res.data) })
      .catch(() => { if (mountedRef.current) toast.error('Could not load office hours status') })
      .finally(() => { if (mountedRef.current) setOfficeHoursLoading(false) })
  }, [dept])

  const total       = suggestions.length
  const unreviewed  = suggestions.filter(s => s.status === 'Delivered').length
  const reviewed    = suggestions.filter(s => s.status === 'Reviewed').length
  const resolveRate = total > 0 ? Math.round((reviewed / total) * 100) : 0

  const statusData = [
    { name: 'Unreviewed', value: unreviewed },
    { name: 'Reviewed',   value: reviewed   },
  ].filter(s => s.value > 0)

  const categoryMap = new Map<string, number>()
  suggestions.forEach(s => { const c = s.service_category || 'Uncategorized'; categoryMap.set(c, (categoryMap.get(c) || 0) + 1) })
  const categoryData = Array.from(categoryMap.entries()).map(([name, count]) => ({ name: name.replace('/ ', '/'), count })).sort((a, b) => b.count - a.count).slice(0, 6)

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await updateSuggestionStatus(id, newStatus)
      setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: newStatus as Suggestion['status'] } : s))
      toast.success('Status updated')
    } catch { toast.error('Failed to update') }
  }

  const handleToggleOpen = async () => {
    if (officeHours?.is_open && !closureReason.trim()) { setShowCloseForm(true); return }
    setIsUpdating(true)
    try {
      const willOpen = officeHours?.is_open === false
      const res = await setOfficeHours(dept, {
        is_open: willOpen,
        closure_reason: willOpen ? '' : closureReason,
        closed_until: willOpen ? null : (closedUntil || null),
      })
      setOfficeHoursState(res.data)
      setShowCloseForm(false)
      setClosureReason('')
      setClosedUntil('')
      toast.success(willOpen ? 'Office is now open' : 'Closure notice posted')
    } catch { toast.error('Failed to update office hours') }
    finally { setIsUpdating(false) }
  }

  const filteredRecent = suggestions
    .filter(s => !search.trim() || s.title.toLowerCase().includes(search.toLowerCase()) || (s.service_category ?? '').toLowerCase().includes(search.toLowerCase()) || (s.submitter_name ?? '').toLowerCase().includes(search.toLowerCase()))
    .slice(0, search.trim() ? 20 : 8)

  const isOpen = officeHours?.is_open ?? false

  if (error && !isLoading && suggestions.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in">
      <div className="text-red-400 text-center">
        <p className="font-semibold font-ui mb-1">Failed to load feedback</p>
        <p className="text-sm text-gray-500 font-ui">{error}</p>
      </div>
      <button onClick={refetch} className="px-4 py-2 bg-ascb-orange/15 border border-ascb-orange/30 text-ascb-orange rounded-xl text-sm font-ui hover:bg-ascb-orange/25 transition-all">
        Try Again
      </button>
    </div>
  )

  if (isLoading) return (
    <div className="space-y-6 animate-fade-in">
      <Skeleton className="h-8 w-48"/>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl"/>)}</div>
      <div className="grid md:grid-cols-2 gap-4">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl"/>)}</div>
    </div>
  )

  return (
    <div className="animate-fade-in space-y-5 pb-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-7 rounded-full" style={{ background: accent }}/>
            <h1 className="text-2xl font-bold text-white font-display">{dept === 'Registrar Office' ? 'Registrar Office' : 'Finance Office'} Dashboard</h1>
          </div>
          <p className="text-gray-500 text-sm font-ui ml-3">{dept} · {total} total feedback</p>
        </div>
        <button onClick={() => exportToCSV(suggestions, `${dept.toLowerCase().replace(' ', '-')}-feedback`)}
          className="flex items-center gap-2 px-3.5 py-2 bg-ascb-orange/10 hover:bg-ascb-orange/20 border border-ascb-orange/30 text-ascb-orange rounded-xl text-sm font-ui transition-all shrink-0">
          <Download size={14}/> Export CSV
        </button>
      </div>

      {/* Office Hours Banner */}
      {officeHoursLoading ? (
        <Skeleton className="h-16 rounded-2xl" />
      ) : officeHours && (
        <div className={`rounded-2xl p-4 border transition-all ${isOpen ? 'border-green-500/25 bg-green-500/6' : 'border-red-500/25 bg-red-500/6'}`}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isOpen ? 'bg-green-400 shadow-sm shadow-green-400/50' : 'bg-red-400'} ${isOpen ? 'animate-pulse' : ''}`}/>
              <div>
                <p className={`text-sm font-bold font-ui ${isOpen ? 'text-green-300' : 'text-red-300'}`}>
                  Office is {isOpen ? 'OPEN' : 'CLOSED'}
                </p>
                {!isOpen && officeHours?.closure_reason && (
                  <p className="text-xs text-gray-400 font-body mt-0.5">{officeHours.closure_reason}</p>
                )}
                {!isOpen && officeHours?.closed_until && (
                  <p className="text-xs text-gray-500 font-ui mt-0.5">
                    Reopens: {new Date(officeHours.closed_until).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isOpen ? (
                <button onClick={() => setShowCloseForm(v => !v)} disabled={isUpdating}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold font-ui hover:bg-red-500/25 transition-all disabled:opacity-50">
                  <ToggleRight size={15}/> Close Office
                </button>
              ) : (
                <button onClick={handleToggleOpen} disabled={isUpdating}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-semibold font-ui hover:bg-green-500/25 transition-all disabled:opacity-50">
                  <ToggleLeft size={15}/> Mark Open
                </button>
              )}
            </div>
          </div>

          {/* Closure form */}
          {showCloseForm && isOpen && (
            <div className="mt-4 pt-4 border-t border-white/8 space-y-3 animate-fade-in">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest font-ui block mb-1">Reason *</label>
                  <input type="text" value={closureReason} onChange={e => setClosureReason(e.target.value)}
                    placeholder="e.g. Staff meeting, holiday, etc."
                    className="input-field text-sm" style={{ height: '38px' }}/>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest font-ui block mb-1">Reopen at (optional)</label>
                  <input type="datetime-local" value={closedUntil} onChange={e => setClosedUntil(e.target.value)}
                    className="input-field text-sm" style={{ height: '38px' }}/>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleToggleOpen} disabled={isUpdating || !closureReason.trim()}
                  className="flex-1 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-ui hover:bg-red-500/30 transition-all disabled:opacity-40">
                  Post Closure Notice
                </button>
                <button onClick={() => { setShowCloseForm(false); setClosureReason(''); setClosedUntil('') }}
                  className="px-4 py-2 rounded-xl border border-white/10 text-gray-400 text-sm font-ui hover:text-white transition-all">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total',      value: total,      icon: <MessageSquare size={17}/>, color: 'text-ascb-orange', bg: 'bg-ascb-orange/10' },
          { label: 'Unreviewed', value: unreviewed, icon: <Clock size={17}/>,         color: 'text-yellow-400',  bg: 'bg-yellow-500/10' },
          { label: 'Reviewed',   value: reviewed,   icon: <CheckCircle size={17}/>,   color: 'text-green-400',   bg: 'bg-green-500/10' },
        ].map(c => (
          <div key={c.label} className="stat-card">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${c.bg} ${c.color}`}>{c.icon}</div>
            <div className="text-2xl font-bold text-white font-ui tabular-nums">{c.value}</div>
            <div className="text-xs text-gray-400 font-ui mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Resolution rate */}
      {total > 0 && (
        <div className="glass rounded-2xl p-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400 font-ui uppercase tracking-wider">Resolution Rate</span>
              <span className="text-sm font-bold text-white font-ui flex items-center gap-1">
                <TrendingUp size={13} className="text-green-400"/>{resolveRate}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/8 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-ascb-orange to-green-400 transition-all duration-700" style={{ width: `${resolveRate}%` }}/>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-ascb-navy rounded-2xl p-5 border border-ascb-navy-mid">
          <h2 className="font-semibold text-white mb-4 font-ui text-sm">Status Breakdown</h2>
          {statusData.length === 0 ? <p className="text-gray-500 text-sm text-center py-8 font-ui">No data yet</p> : (
            <div className="flex items-center gap-3">
              <ResponsiveContainer width="55%" height={170}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value">
                    {statusData.map((s, i) => <Cell key={i} fill={STATUS_COLORS[s.name] ?? '#6b7280'}/>)}
                  </Pie>
                  <Tooltip content={<CustomTooltip/>}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {statusData.map(s => (
                  <div key={s.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: STATUS_COLORS[s.name] }}/>
                    <span className="text-xs text-gray-300 font-ui flex-1 truncate">{s.name}</span>
                    <span className="text-xs font-bold text-white font-ui">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="bg-ascb-navy rounded-2xl p-5 border border-ascb-navy-mid">
          <h2 className="font-semibold text-white mb-4 font-ui text-sm">By Service Category</h2>
          {categoryData.length === 0 ? <p className="text-gray-500 text-sm text-center py-8 font-ui">No data yet</p> : (
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#243a5e" horizontal={false}/>
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af', fontFamily: 'DM Sans' }} allowDecimals={false}/>
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#9ca3af', fontFamily: 'DM Sans' }} width={110}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Bar dataKey="count" name="Feedback" fill={BAR_COLOR} radius={[0, 5, 5, 0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Ratings */}
      <RatingsPanel department={dept} />

      {/* Recent Feedback */}
      <div className="bg-ascb-navy rounded-2xl border border-ascb-navy-mid overflow-hidden">
        <div className="px-4 py-3.5 border-b border-ascb-navy-mid flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-semibold text-white font-ui text-sm">Recent Feedback</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"/>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter…"
                className="input-field pl-8 text-xs" style={{ height: '32px', width: '140px' }}/>
            </div>
            <Link to={feedbackPath} className="flex items-center gap-1 text-xs text-ascb-orange hover:underline font-ui whitespace-nowrap">
              View all <ArrowRight size={12}/>
            </Link>
          </div>
        </div>
        {filteredRecent.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-sm font-ui">No feedback yet</div>
        ) : (
          <div className="divide-y divide-ascb-navy-mid">
            {filteredRecent.map(s => (
              <div key={s.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-white/3 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium font-ui truncate">{s.title}</p>
                  <p className="text-xs text-gray-500 font-ui truncate mt-0.5">{s.service_category || s.department}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge status={s.status} viewer="staff"/>
                  <select value={s.status} onChange={e => { if (e.target.value !== s.status) handleStatusChange(s.id, e.target.value) }}
                    className="text-xs rounded-lg px-2 py-1 text-white font-ui focus:outline-none focus:ring-1 focus:ring-ascb-orange cursor-pointer"
                    style={{ background: 'rgba(13,31,60,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <option value="Delivered">Unreviewed</option>
                    <option value="Reviewed">Reviewed</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
