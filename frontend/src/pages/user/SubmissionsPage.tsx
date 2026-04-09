import { useSuggestions } from '../../hooks/useSuggestions'
import { Badge } from '../../components/ui/Badge'
import { Skeleton } from '../../components/ui/Skeleton'

export function SubmissionsPage() {
  const { suggestions, isLoading } = useSuggestions()

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-white mb-8">My Submissions</h1>
      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-16 text-gray-500"><p>You haven't submitted any suggestions yet.</p></div>
      ) : (
        <div className="bg-navy rounded-xl border border-navy-light overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-navy-light bg-navy-dark">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((s) => (
                <tr key={s.id} className="border-b border-navy-light hover:bg-navy-light/30 transition-colors">
                  <td className="px-4 py-3 text-sm text-white font-medium">{s.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{s.department}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{new Date(s.submitted_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><Badge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
