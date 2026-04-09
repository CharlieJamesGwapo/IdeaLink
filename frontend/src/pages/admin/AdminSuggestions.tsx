import { useState } from 'react'
import { toast } from 'sonner'
import { useSuggestions } from '../../hooks/useSuggestions'
import { SuggestionRow } from '../../components/shared/SuggestionRow'
import { Skeleton } from '../../components/ui/Skeleton'
import { updateSuggestionStatus, featureSuggestion } from '../../api/suggestions'

export function AdminSuggestions() {
  const { suggestions, setSuggestions, isLoading } = useSuggestions()
  const [filter, setFilter] = useState<'all' | 'Pending' | 'Reviewed'>('all')

  const filtered = filter === 'all' ? suggestions : suggestions.filter((s) => s.status === filter)

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await updateSuggestionStatus(id, newStatus)
      setSuggestions((prev) => prev.map((s) => s.id === id ? { ...s, status: newStatus as any } : s))
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Suggestions</h1>
        <select value={filter} onChange={(e) => setFilter(e.target.value as any)}
          className="bg-navy-light border border-navy-light rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none">
          <option value="all">All</option>
          <option value="Pending">Pending</option>
          <option value="Reviewed">Reviewed</option>
        </select>
      </div>
      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No suggestions found.</p>
      ) : (
        <div className="bg-navy rounded-xl border border-navy-light overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-navy-light bg-navy-dark">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dept</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitter</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
