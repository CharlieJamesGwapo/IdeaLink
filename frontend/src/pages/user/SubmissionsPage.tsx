import { useSuggestions } from '../../hooks/useSuggestions'
import { Badge } from '../../components/ui/Badge'
import { Skeleton } from '../../components/ui/Skeleton'
import { FileText, Clock } from 'lucide-react'

export function SubmissionsPage() {
  const { suggestions, isLoading } = useSuggestions()

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">My Submissions</h1>
        <p className="text-gray-400 text-sm mt-2">Track the status of your suggestions</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}</div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-20 glass rounded-2xl">
          <FileText size={36} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No submissions yet</p>
          <p className="text-gray-600 text-sm mt-1">Your submitted suggestions will appear here</p>
        </div>
      ) : (
        <div className="bg-navy rounded-2xl border border-navy-light overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-navy-light bg-navy-dark">
              <tr>
                <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Department</th>
                <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Date</th>
                <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((s) => (
                <tr key={s.id} className="border-b border-navy-light/50 hover:bg-accent/5 transition-colors">
                  <td className="px-4 py-3.5 text-sm text-white font-medium max-w-[200px] truncate">{s.title}</td>
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    <span className="text-xs px-2 py-1 rounded-lg bg-navy-dark text-gray-400">{s.department}</span>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Clock size={11} />
                      {new Date(s.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </td>
                  <td className="px-4 py-3.5"><Badge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
