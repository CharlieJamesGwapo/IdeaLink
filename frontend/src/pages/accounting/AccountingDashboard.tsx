import { useState, useEffect } from 'react'
import { MessageSquare, Clock, CheckCircle, AlertCircle, Download, Settings } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { toast } from 'sonner'
import { useSuggestions } from '../../hooks/useSuggestions'
import { updateSuggestionStatus } from '../../api/suggestions'
import { getOfficeHours, setOfficeHours } from '../../api/officeHours'
import { exportToCSV } from '../../api/reports'
import { Skeleton } from '../../components/ui/Skeleton'
import type { OfficeHoursStatus } from '../../types'

const COLORS = ['#F47C20', '#3b82f6', '#22c55e', '#FFB81C', '#a855f7', '#ec4899']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass rounded-xl px-4 py-3 border border-ascb-orange/20 text-sm font-ui">
        <p className="text-gray-300 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
        ))}
      </div>
    )
  }
  return null
}

export function AccountingDashboard() {
  const { suggestions, setSuggestions, isLoading } = useSuggestions()
  const [officeHours, setOfficeHoursState] = useState<OfficeHoursStatus | null>(null)
  const [showOfficeHoursForm, setShowOfficeHoursForm] = useState(false)
  const [closureReason, setClosureReason] = useState('')
  const [closedUntil, setClosedUntil] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    getOfficeHours('Accounting Office').then(res => setOfficeHoursState(res.data)).catch(() => {})
  }, [])

  const total = suggestions.length
  const pending = suggestions.filter(s => s.status === 'Pending').length
  const underReview = suggestions.filter(s => s.status === 'Under Review').length
  const resolved = suggestions.filter(s => s.status === 'Resolved').length

  const statusData = [
    { name: 'Pending', value: pending },
    { name: 'Under Review', value: underReview },
    { name: 'Resolved', value: resolved },
  ].filter(s => s.value > 0)

  const categoryMap = new Map<string, number>()
  suggestions.forEach(s => {
    const cat = s.service_category || 'Uncategorized'
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1)
  })
  const categoryData = Array.from(categoryMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await updateSuggestionStatus(id, newStatus)
      setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: newStatus as any } : s))
      toast.success('Status updated')
    } catch { toast.error('Failed to update status') }
  }

  const handleSetOfficeHours = async (isOpen: boolean) => {
    setIsUpdating(true)
    try {
      const res = await setOfficeHours('Accounting Office', {
        is_open: isOpen,
        closure_reason: isOpen ? '' : closureReason,
        closed_until: isOpen ? null : (closedUntil || null),
      })
      setOfficeHoursState(res.data)
      setShowOfficeHoursForm(false)
      setClosureReason('')
      setClosedUntil('')
      toast.success(isOpen ? 'Office marked as open' : 'Closure notice posted')
    } catch { toast.error('Failed to update office hours') }
    finally { setIsUpdating(false) }
  }

  const recentSuggestions = suggestions.slice(0, 5)

  if (isLoading) return (
    <div className="space-y-6 animate-fade-in">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
    </div>
  )

  return (
    <div className="animate-fade-in space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-7 bg-ascb-orange rounded-full" />
            <h1 className="text-2xl font-bold text-white font-display">Accounting Dashboard</h1>
          </div>
          <p className="text-gray-500 text-sm font-ui ml-3">Feedback Analytics · Accounting Office</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => exportToCSV(suggestions, 'accounting-feedback')}
            className="flex items-center gap-2 px-3 py-2 bg-ascb-orange/15 hover:bg-ascb-orange/25 border border-ascb-orange/30 text-ascb-orange rounded-xl text-sm font-ui transition-all">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={() => setShowOfficeHoursForm(!showOfficeHoursForm)}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl text-sm font-ui transition-all">
            <Settings size={14} /> Office Hours
          </button>
        </div>
      </div>

      {/* Office Hours control */}
      {showOfficeHoursForm && (
        <div className="glass rounded-2xl p-5 border border-ascb-orange/20 animate-fade-in">
          <h3 className="text-white font-semibold font-ui mb-4">Manage Office Hours</h3>
          <div className="flex items-center gap-2 mb-4">
            <span className={`badge-${officeHours?.is_open ? 'open' : 'closed'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${officeHours?.is_open ? 'bg-green-400' : 'bg-red-400'}`} />
              Currently {officeHours?.is_open ? 'OPEN' : 'CLOSED'}
            </span>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider font-ui">Closure Reason</label>
              <input type="text" value={closureReason} onChange={e => setClosureReason(e.target.value)}
                placeholder="e.g. Staff meeting until 2:00 PM"
                className="input-field mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider font-ui">Closed Until (optional)</label>
              <input type="datetime-local" value={closedUntil} onChange={e => setClosedUntil(e.target.value)}
                className="input-field mt-1" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleSetOfficeHours(false)} disabled={isUpdating || !closureReason}
                className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-ui hover:bg-red-500/30 transition-all disabled:opacity-50">
                Post Closure Notice
              </button>
              <button onClick={() => handleSetOfficeHours(true)} disabled={isUpdating}
                className="flex-1 py-2.5 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-ui hover:bg-green-500/30 transition-all disabled:opacity-50">
                Mark as Open
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Feedback', value: total, icon: <MessageSquare size={18} className="text-ascb-orange" />, color: 'bg-ascb-orange/10' },
          { label: 'Pending', value: pending, icon: <Clock size={18} className="text-yellow-400" />, color: 'bg-yellow-500/10' },
          { label: 'Under Review', value: underReview, icon: <AlertCircle size={18} className="text-blue-400" />, color: 'bg-blue-500/10' },
          { label: 'Resolved', value: resolved, icon: <CheckCircle size={18} className="text-green-400" />, color: 'bg-green-500/10' },
        ].map(c => (
          <div key={c.label} className="stat-card">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${c.color}`}>{c.icon}</div>
            <div className="text-2xl font-bold text-white font-ui">{c.value}</div>
            <div className="text-sm text-gray-400 font-ui">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-ascb-navy rounded-2xl p-5 border border-ascb-navy-mid">
          <h2 className="font-semibold text-white mb-4 font-ui">Status Breakdown</h2>
          {statusData.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8 font-ui">No data yet</p>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={180}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" nameKey="name">
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {statusData.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-xs text-gray-300 font-ui">{s.name}: <strong className="text-white">{s.value}</strong></span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-ascb-navy rounded-2xl p-5 border border-ascb-navy-mid">
          <h2 className="font-semibold text-white mb-4 font-ui">By Service Category</h2>
          {categoryData.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8 font-ui">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#243a5e" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: 'DM Sans' }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#9ca3af', fontFamily: 'DM Sans' }} width={115} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Feedback" fill="#F47C20" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent feedback */}
      <div className="bg-ascb-navy rounded-2xl border border-ascb-navy-mid overflow-hidden">
        <div className="px-5 py-4 border-b border-ascb-navy-mid flex items-center justify-between">
          <h2 className="font-semibold text-white font-ui">Recent Feedback</h2>
          <a href="/accounting/suggestions" className="text-xs text-ascb-orange hover:underline font-ui">View all →</a>
        </div>
        {recentSuggestions.length === 0 ? (
          <div className="text-center py-10 text-gray-500 font-ui">No feedback yet</div>
        ) : (
          <div className="divide-y divide-ascb-navy-mid">
            {recentSuggestions.map(s => (
              <div key={s.id} className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium font-ui truncate">{s.title}</p>
                  <p className="text-xs text-gray-400 font-ui mt-0.5">{s.service_category || s.department}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select value={s.status} onChange={e => handleStatusChange(s.id, e.target.value)}
                    className="text-xs bg-ascb-navy-dark border border-ascb-navy-mid rounded-lg px-2 py-1 text-white font-ui focus:outline-none focus:ring-1 focus:ring-ascb-orange">
                    <option>Pending</option>
                    <option>Under Review</option>
                    <option>Resolved</option>
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
