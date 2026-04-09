import { useEffect, useState } from 'react'
import { Users, MessageSquare, TrendingUp, Eye } from 'lucide-react'
import { Skeleton } from '../../components/ui/Skeleton'
import client from '../../api/client'
import type { Analytics } from '../../types'

interface StatCardProps { label: string; value: number; icon: React.ReactNode; color: string }

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className="bg-navy rounded-xl p-5 border border-navy-light">
      <div className={`inline-flex p-2 rounded-lg mb-3 ${color}`}>{icon}</div>
      <div className="text-3xl font-bold text-white">{value.toLocaleString()}</div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
    </div>
  )
}

export function AdminDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    client.get<Analytics>('/api/admin/analytics')
      .then((res) => setAnalytics(res.data))
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
    </div>
  )

  if (!analytics) return null

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Users" value={analytics.total_users} icon={<Users size={18} className="text-blue-400" />} color="bg-blue-500/10" />
        <StatCard label="Total Suggestions" value={analytics.total_suggestions} icon={<MessageSquare size={18} className="text-purple-400" />} color="bg-purple-500/10" />
        <StatCard label="This Month" value={analytics.this_month_suggestions} icon={<TrendingUp size={18} className="text-green-400" />} color="bg-green-500/10" />
        <StatCard label="Unread" value={analytics.unread_suggestions} icon={<Eye size={18} className="text-yellow-400" />} color="bg-yellow-500/10" />
      </div>
      <div className="bg-navy rounded-xl p-5 border border-navy-light">
        <h2 className="font-semibold text-white mb-4">Submissions Breakdown</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><div className="text-gray-400 text-sm">Students</div><div className="text-2xl font-bold text-white">{analytics.student_count}</div></div>
          <div><div className="text-gray-400 text-sm">Faculty Staff</div><div className="text-2xl font-bold text-white">{analytics.faculty_count}</div></div>
        </div>
      </div>
    </div>
  )
}
