import { useState } from 'react'
import { MessageSquare, Clock, CheckCircle, AlertCircle, Filter } from 'lucide-react'
import { useSuggestions } from '../../hooks/useSuggestions'
import { Skeleton } from '../../components/ui/Skeleton'

function StatusBadge({ status }: { status: string }) {
  if (status === 'Pending') return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 font-ui">
      <Clock size={10} /> Pending
    </span>
  )
  if (status === 'Under Review') return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/20 font-ui">
      <AlertCircle size={10} /> Under Review
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/15 text-green-400 border border-green-500/20 font-ui">
      <CheckCircle size={10} /> Resolved
    </span>
  )
}

export function SubmissionsPage() {
  const { suggestions, isLoading } = useSuggestions()
  const [filter, setFilter] = useState<'all' | 'Pending' | 'Under Review' | 'Resolved'>('all')
  const [deptFilter, setDeptFilter] = useState<'all' | 'Registrar' | 'Accounting Office'>('all')

  const filtered = suggestions.filter(s => {
    const statusMatch = filter === 'all' || s.status === filter
    const deptMatch = deptFilter === 'all' || s.department === deptFilter
    return statusMatch && deptMatch
  })

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-8 bg-ascb-orange rounded-full" />
          <h1 className="text-3xl font-bold text-white font-display">My Submissions</h1>
        </div>
        <p className="text-gray-400 text-sm font-body ml-3">{suggestions.length} total submission{suggestions.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-1.5 text-gray-400">
          <Filter size={14} />
          <span className="text-xs font-ui uppercase tracking-wider">Filter:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'Pending', 'Under Review', 'Resolved'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all font-ui ${
                filter === f ? 'bg-ascb-orange text-white' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
              }`}>
              {f === 'all' ? 'All Status' : f}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'Registrar', 'Accounting Office'] as const).map(d => (
            <button key={d} onClick={() => setDeptFilter(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all font-ui ${
                deptFilter === d ? 'bg-ascb-navy text-white border border-ascb-orange/50' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
              }`}>
              {d === 'all' ? 'All Offices' : d}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 glass rounded-2xl">
          <MessageSquare size={40} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium font-ui">No submissions found</p>
          <p className="text-gray-600 text-sm mt-1 font-body">
            {suggestions.length === 0 ? 'Submit your first feedback to get started.' : 'Try adjusting the filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => (
            <div key={s.id} className="glass rounded-2xl p-5 hover:border-ascb-orange/20 transition-all border border-transparent">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold font-ui truncate">{s.title}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-ascb-orange font-ui">{s.department}</span>
                    {s.service_category && (
                      <>
                        <span className="text-gray-600">·</span>
                        <span className="text-xs text-gray-400 font-ui">{s.service_category}</span>
                      </>
                    )}
                    {s.anonymous && (
                      <>
                        <span className="text-gray-600">·</span>
                        <span className="text-xs text-yellow-500 font-ui">Anonymous</span>
                      </>
                    )}
                  </div>
                </div>
                <StatusBadge status={s.status} />
              </div>
              <p className="text-gray-400 text-sm font-body line-clamp-2 mb-3">{s.description}</p>
              <p className="text-xs text-gray-600 font-ui">
                Submitted {new Date(s.submitted_at).toLocaleDateString('en-PH', {
                  year: 'numeric', month: 'long', day: 'numeric'
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
