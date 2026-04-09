import { toast } from 'sonner'
import { useSuggestions } from '../../hooks/useSuggestions'
import { SuggestionRow } from '../../components/shared/SuggestionRow'
import { Skeleton } from '../../components/ui/Skeleton'
import { updateSuggestionStatus } from '../../api/suggestions'

export function AccountingSuggestions() {
  const { suggestions, setSuggestions, isLoading } = useSuggestions()

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await updateSuggestionStatus(id, newStatus)
      setSuggestions((prev) => prev.map((s) => s.id === id ? { ...s, status: newStatus as any } : s))
      toast.success('Status updated')
    } catch { toast.error('Failed to update status') }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Accounting — Suggestions</h1>
      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : suggestions.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No suggestions for Accounting Office yet.</p>
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
              {suggestions.map((s) => <SuggestionRow key={s.id} suggestion={s} showActions onStatusChange={handleStatusChange} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
