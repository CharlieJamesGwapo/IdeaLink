import { useState } from 'react'
import { toast } from 'sonner'
import { Download, MessageSquare } from 'lucide-react'
import { useSuggestions } from '../../hooks/useSuggestions'
import { SuggestionRow } from '../../components/shared/SuggestionRow'
import { Skeleton } from '../../components/ui/Skeleton'
import { updateSuggestionStatus, featureSuggestion } from '../../api/suggestions'
import { exportToCSV } from '../../api/reports'
import type { Suggestion } from '../../types'

type FilterOption = 'all' | 'Pending' | 'Under Review' | 'Resolved'

export function AdminSuggestions() {
  const { suggestions, setSuggestions, isLoading } = useSuggestions()
  const [filter, setFilter] = useState<FilterOption>('all')

  const filtered = filter === 'all' ? suggestions : suggestions.filter((s) => s.status === filter)

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await updateSuggestionStatus(id, newStatus)
      setSuggestions((prev) => prev.map((s) => s.id === id ? { ...s, status: newStatus as Suggestion['status'] } : s))
      toast.success('Status updated')
    } catch { toast.error('Failed to update status') }
  }

  const handleFeature = async (id: number) => {
    try {
      await featureSuggestion(id)
      toast.success('Suggestion featured as testimonial!')
    } catch { toast.error('Failed to feature suggestion') }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-8 bg-ascb-orange rounded-full" />
            <h1 className="text-2xl font-bold text-white font-display">Suggestions</h1>
          </div>
          <p className="text-gray-500 text-sm mt-1 ml-3">{suggestions.length} total submissions</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => exportToCSV(filtered, 'suggestions')}
            className="flex items-center gap-2 px-4 py-2 bg-ascb-orange/10 hover:bg-ascb-orange/20 text-ascb-orange border border-ascb-orange/30 rounded-xl text-sm font-medium transition-all"
          >
            <Download size={15} />
            Export CSV
          </button>
          <select value={filter} onChange={(e) => setFilter(e.target.value as FilterOption)}
            className="bg-navy-dark border border-navy-light rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-ascb-orange transition-all">
            <option value="all">All</option>
            <option value="Pending">Pending</option>
            <option value="Under Review">Under Review</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 glass rounded-2xl">
          <MessageSquare size={36} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No suggestions found</p>
          <p className="text-gray-600 text-sm mt-1">
            {filter !== 'all' ? `No ${filter.toLowerCase()} suggestions` : 'Suggestions will appear here once submitted'}
          </p>
        </div>
      ) : (
        <div className="bg-navy rounded-2xl border border-navy-light overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-navy-light bg-navy-dark">
              <tr>
                <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title / Category</th>
                <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Dept</th>
                <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Submitter</th>
                <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Date</th>
                <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <SuggestionRow key={s.id} suggestion={s} showActions showFeature onStatusChange={handleStatusChange} onFeature={handleFeature} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
