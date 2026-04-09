import { useEffect, useState } from 'react'
import { Users, MessageSquare, TrendingUp, Bell, GraduationCap, Briefcase, ArrowUpRight } from 'lucide-react'
import { Skeleton } from '../../components/ui/Skeleton'
import client from '../../api/client'
import type { Analytics } from '../../types'

interface StatCardProps { label: string; value: number; icon: React.ReactNode; color: string; trend?: string }

function StatCard({ label, value, icon, color, trend }: StatCardProps) {
  return (
    <div className="stat-card cursor-default">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
        {trend && <span className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full"><ArrowUpRight size={10} />{trend}</span>}
      </div>
      <div className="text-3xl font-bold text-white tabular-nums">{value.toLocaleString()}</div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
    </div>
  )
}

export function AdminDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    client.get<Analytics>('/api/admin/analytics').then((res) => setAnalytics(res.data)).finally(() => setIsLoading(false))
  }, [])

  if (isLoading) return (
    <div className="animate-fade-in">
      <div className="mb-8"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-64 mt-2" /></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div>
    </div>
  )

  if (!analytics) return null

  const total = analytics.student_count + analytics.faculty_count
  const studentPct = total > 0 ? Math.round((analytics.student_count / total) * 100) : 0
  const facultyPct = 100 - studentPct

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of IdeaLink activity</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={analytics.total_users} icon={<Users size={18} className="text-blue-400" />} color="bg-blue-500/10" />
        <StatCard label="Total Suggestions" value={analytics.total_suggestions} icon={<MessageSquare size={18} className="text-purple-400" />} color="bg-purple-500/10" />
        <StatCard label="This Month" value={analytics.this_month_suggestions} icon={<TrendingUp size={18} className="text-green-400" />} color="bg-green-500/10" trend="New" />
        <StatCard label="Unread" value={analytics.unread_suggestions} icon={<Bell size={18} className="text-yellow-400" />} color="bg-yellow-500/10" />
      </div>

      {/* Breakdown */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-navy rounded-2xl p-6 border border-navy-light hover:border-accent/20 transition-colors">
          <h2 className="font-semibold text-white mb-5">Submitter Breakdown</h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 text-sm text-gray-300"><GraduationCap size={15} className="text-blue-400" />Students</div>
                <span className="text-sm font-semibold text-white">{analytics.student_count} <span className="text-gray-500 font-normal text-xs">({studentPct}%)</span></span>
              </div>
              <div className="h-2 bg-navy-light rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-700" style={{ width: `${studentPct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 text-sm text-gray-300"><Briefcase size={15} className="text-purple-400" />Faculty Staff</div>
                <span className="text-sm font-semibold text-white">{analytics.faculty_count} <span className="text-gray-500 font-normal text-xs">({facultyPct}%)</span></span>
              </div>
              <div className="h-2 bg-navy-light rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full transition-all duration-700" style={{ width: `${facultyPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-navy rounded-2xl p-6 border border-navy-light hover:border-accent/20 transition-colors">
          <h2 className="font-semibold text-white mb-5">Quick Actions</h2>
          <div className="space-y-3">
            <a href="/admin/suggestions" className="flex items-center justify-between p-3 rounded-xl bg-navy-dark hover:bg-navy-light transition-colors cursor-pointer">
              <span className="text-sm text-gray-300">View all suggestions</span>
              <MessageSquare size={15} className="text-gray-500" />
            </a>
            <a href="/admin/announcements" className="flex items-center justify-between p-3 rounded-xl bg-navy-dark hover:bg-navy-light transition-colors cursor-pointer">
              <span className="text-sm text-gray-300">Manage announcements</span>
              <Bell size={15} className="text-gray-500" />
            </a>
            <a href="/admin/testimonials" className="flex items-center justify-between p-3 rounded-xl bg-navy-dark hover:bg-navy-light transition-colors cursor-pointer">
              <span className="text-sm text-gray-300">Toggle testimonials</span>
              <TrendingUp size={15} className="text-gray-500" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
