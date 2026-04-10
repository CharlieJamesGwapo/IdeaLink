import { useEffect, useState } from 'react'
import { Users, MessageSquare, TrendingUp, Bell, ArrowUpRight, Download } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts'
import { Skeleton } from '../../components/ui/Skeleton'
import { exportToCSV } from '../../api/reports'
import { getSuggestions } from '../../api/suggestions'
import client from '../../api/client'
import type { Analytics, Suggestion } from '../../types'

const COLORS = ['#F47C20', '#FFB81C', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#14b8a6', '#f97316']

function StatCard({ label, value, icon, color, trend }: {
  label: string; value: number; icon: React.ReactNode; color: string; trend?: string
}) {
  return (
    <div className="stat-card cursor-default">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
        {trend && (
          <span className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full font-ui">
            <ArrowUpRight size={10} />{trend}
          </span>
        )}
      </div>
      <div className="text-3xl font-bold text-white tabular-nums font-ui">{value.toLocaleString()}</div>
      <div className="text-sm text-gray-400 mt-1 font-ui">{label}</div>
    </div>
  )
}

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

export function AdminDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      client.get<Analytics>('/api/admin/analytics'),
      getSuggestions(),
    ]).then(([analyticsRes, suggestionsRes]) => {
      setAnalytics(analyticsRes.data)
      setSuggestions(suggestionsRes.data)
    }).finally(() => setIsLoading(false))
  }, [])

  const handleExport = () => {
    if (suggestions.length === 0) return
    exportToCSV(suggestions, 'all-feedback')
  }

  if (isLoading) return (
    <div className="animate-fade-in space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
      </div>
    </div>
  )

  if (!analytics) return null

  const statusData = (analytics.by_status || []).map(s => ({ name: s.status, value: s.count }))
  const deptData = (analytics.by_department || []).map(d => ({ name: d.department, count: d.count }))
  const trendData = (analytics.monthly_trend || []).map(m => ({ month: m.month, count: m.count }))
  const regData = (analytics.by_category_registrar || []).slice(0, 6).map(c => ({ name: c.category.replace(' / ', '/').replace('Enrollment / ', 'Enrollment/'), count: c.count }))
  const accData = (analytics.by_category_accounting || []).slice(0, 6).map(c => ({ name: c.category.replace(' / ', '/'), count: c.count }))

  return (
    <div className="animate-fade-in space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-7 bg-ascb-orange rounded-full" />
            <h1 className="text-2xl font-bold text-white font-display">Admin Dashboard</h1>
          </div>
          <p className="text-gray-500 text-sm font-ui ml-3">IdeaLink · Analytics Overview</p>
        </div>
        <button onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-ascb-orange/15 hover:bg-ascb-orange/25 border border-ascb-orange/30 text-ascb-orange rounded-xl text-sm font-medium transition-all font-ui">
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={analytics.total_users}
          icon={<Users size={18} className="text-blue-400" />} color="bg-blue-500/10" />
        <StatCard label="Total Feedback" value={analytics.total_suggestions}
          icon={<MessageSquare size={18} className="text-ascb-orange" />} color="bg-ascb-orange/10" />
        <StatCard label="This Month" value={analytics.this_month_suggestions}
          icon={<TrendingUp size={18} className="text-green-400" />} color="bg-green-500/10" trend="New" />
        <StatCard label="Unread" value={analytics.unread_suggestions}
          icon={<Bell size={18} className="text-ascb-gold" />} color="bg-ascb-gold/10" />
      </div>

      {/* Charts row 1 */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Monthly trend */}
        <div className="bg-ascb-navy rounded-2xl p-5 border border-ascb-navy-mid">
          <h2 className="font-semibold text-white mb-4 font-ui">Monthly Trend</h2>
          {trendData.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8 font-ui">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#243a5e" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: 'DM Sans' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: 'DM Sans' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="count" name="Submissions" stroke="#F47C20" strokeWidth={2} dot={{ fill: '#F47C20', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Status distribution */}
        <div className="bg-ascb-navy rounded-2xl p-5 border border-ascb-navy-mid">
          <h2 className="font-semibold text-white mb-4 font-ui">Status Distribution</h2>
          {statusData.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8 font-ui">No data yet</p>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={200}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    dataKey="value" nameKey="name">
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {statusData.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-xs text-gray-300 font-ui">{s.name}</span>
                    <span className="text-xs font-bold text-white font-ui ml-1">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* By department */}
        <div className="bg-ascb-navy rounded-2xl p-5 border border-ascb-navy-mid">
          <h2 className="font-semibold text-white mb-4 font-ui">By Department</h2>
          {deptData.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8 font-ui">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={deptData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#243a5e" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: 'DM Sans' }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af', fontFamily: 'DM Sans' }} width={110} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Submissions" fill="#F47C20" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Registrar categories */}
        <div className="bg-ascb-navy rounded-2xl p-5 border border-ascb-navy-mid">
          <h2 className="font-semibold text-white mb-4 font-ui">Registrar — Top Categories</h2>
          {regData.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8 font-ui">No Registrar feedback yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={regData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#243a5e" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: 'DM Sans' }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#9ca3af', fontFamily: 'DM Sans' }} width={120} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Feedback" fill="#FFB81C" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Accounting categories */}
      <div className="bg-ascb-navy rounded-2xl p-5 border border-ascb-navy-mid">
        <h2 className="font-semibold text-white mb-4 font-ui">Accounting — Top Categories</h2>
        {accData.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8 font-ui">No Accounting feedback yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={accData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#243a5e" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#9ca3af', fontFamily: 'DM Sans' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: 'DM Sans' }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Feedback" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Quick actions */}
      <div className="bg-ascb-navy rounded-2xl p-5 border border-ascb-navy-mid">
        <h2 className="font-semibold text-white mb-4 font-ui">Quick Actions</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { href: '/admin/suggestions', label: 'View All Feedback', icon: <MessageSquare size={15} /> },
            { href: '/admin/announcements', label: 'Manage Announcements', icon: <Bell size={15} /> },
            { href: '/admin/testimonials', label: 'Toggle Testimonials', icon: <TrendingUp size={15} /> },
          ].map(a => (
            <a key={a.href} href={a.href}
              className="flex items-center justify-between p-3 rounded-xl bg-ascb-navy-dark hover:bg-ascb-navy-mid transition-colors cursor-pointer">
              <span className="text-sm text-gray-300 font-ui">{a.label}</span>
              <span className="text-gray-500">{a.icon}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
