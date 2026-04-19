import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Download, MessageSquare, Search, ArrowUpDown } from 'lucide-react'
import { useSuggestions } from '../../hooks/useSuggestions'
import { SuggestionRow } from '../../components/shared/SuggestionRow'
import { Skeleton } from '../../components/ui/Skeleton'
import { Pagination } from '../../components/ui/Pagination'
import { updateSuggestionStatus, markSuggestionReviewed } from '../../api/suggestions'
import { exportToCSV } from '../../api/reports'
import type { Suggestion } from '../../types'

type FilterOption = 'all' | 'Delivered' | 'Reviewed'
type SortOption   = 'newest' | 'oldest' | 'status'

const selectStyle = { height: '40px', background: 'rgba(13,31,60,0.85)' } as const
const PAGE_SIZE = 10

export function RegistrarSuggestions() {
  const { suggestions, setSuggestions, isLoading, error, refetch } = useSuggestions()
  const [filter, setFilter] = useState<FilterOption>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort]     = useState<SortOption>('newest')
  const [page, setPage]     = useState(1)

  const filtered = suggestions
    .filter(s => {
      if (filter !== 'all' && s.status !== filter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return (
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          (s.service_category ?? '').toLowerCase().includes(q) ||
          (s.submitter_name   ?? '').toLowerCase().includes(q)
        )
      }
      return true
    })
    .sort((a, b) => {
      if (sort === 'newest') return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
      if (sort === 'oldest') return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
      const o: Record<string, number> = { Delivered: 0, Reviewed: 1 }
      return (o[a.status] ?? 0) - (o[b.status] ?? 0)
    })

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await updateSuggestionStatus(id, newStatus)
      setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: newStatus as Suggestion['status'] } : s))
      toast.success('Status updated')
    } catch { toast.error('Failed to update status') }
  }

  // Auto-mark as Reviewed when staff opens the feedback detail.
  const handleOpen = async (id: number) => {
    const target = suggestions.find(s => s.id === id)
    if (!target || target.status === 'Reviewed') return
    try {
      await markSuggestionReviewed(id)
      setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: 'Reviewed', is_read: true } : s))
    } catch {
      // Silent — opening should never block reading the content.
    }
  }

  const unreviewed = suggestions.filter(s => s.status === 'Delivered').length
  const reviewed   = suggestions.filter(s => s.status === 'Reviewed').length

  useEffect(() => { setPage(1) }, [filter, search, sort])
  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paged       = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  )

  return (
    <div className="animate-fade-in space-y-5 pb-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-8 bg-green-400 rounded-full"/>
            <h1 className="text-2xl font-bold text-white font-display">Registrar Office Feedback</h1>
          </div>
          <p className="text-gray-500 text-sm font-ui ml-3">
            {suggestions.length} total · {unreviewed} unreviewed · {reviewed} reviewed
          </p>
        </div>
        <button
          onClick={() => exportToCSV(filtered, 'registrar-feedback')}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-ascb-orange/10 hover:bg-ascb-orange/20 text-ascb-orange border border-ascb-orange/30 rounded-xl text-sm font-medium transition-all font-ui shrink-0 disabled:opacity-40 disabled:pointer-events-none"
        >
          <Download size={15}/> Export CSV
        </button>
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-2">
        {([
          { val: 'all',       label: `All (${suggestions.length})` },
          { val: 'Delivered', label: `Unreviewed (${unreviewed})` },
          { val: 'Reviewed',  label: `Reviewed (${reviewed})` },
        ] as { val: FilterOption; label: string }[]).map(f => (
          <button key={f.val} onClick={() => setFilter(f.val)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150 font-ui ${
              filter === f.val
                ? f.val === 'all'       ? 'bg-green-400/20 text-green-300 border-green-400/40'
                : f.val === 'Delivered' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                : 'bg-green-500/20 text-green-300 border-green-500/40'
                : 'border-white/10 text-gray-500 hover:text-white hover:border-white/20'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Search + sort */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"/>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search title, category, submitter…"
            className="input-field pl-10 text-sm" style={{ height: '40px' }}/>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ArrowUpDown size={13} className="text-gray-500"/>
          <select value={sort} onChange={e => setSort(e.target.value as SortOption)}
            className="rounded-xl border border-white/15 px-3 text-white text-sm font-ui focus:outline-none focus:border-green-400 cursor-pointer appearance-none"
            style={selectStyle}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="status">By Status</option>
          </select>
        </div>
      </div>

      {(search || filter !== 'all') && !isLoading && (
        <p className="text-xs text-gray-500 font-ui">{filtered.length} of {suggestions.length} results</p>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm font-ui">
          {error}
          <button onClick={refetch} className="ml-auto underline hover:no-underline text-red-400 text-xs">Retry</button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full"/>)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 glass rounded-2xl">
          <MessageSquare size={36} className="text-gray-600 mx-auto mb-3"/>
          <p className="text-gray-400 font-medium font-ui">No feedback found</p>
          <p className="text-gray-600 text-sm mt-1 font-ui">
            {search ? 'Try a different search.' : filter !== 'all' ? `No ${filter.toLowerCase()} submissions.` : 'Registrar Office feedback will appear here.'}
          </p>
        </div>
      ) : (
        <div className="bg-ascb-navy rounded-2xl border border-ascb-navy-mid overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-ascb-navy-mid bg-ascb-navy-dark hidden md:table-header-group">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title / Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Dept</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Submitter</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(s => (
                <SuggestionRow key={s.id} suggestion={s} showActions viewer="staff"
                  onStatusChange={handleStatusChange} onOpen={handleOpen}/>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-4 py-2 border-t border-ascb-navy-mid/70">
            <p className="text-xs text-gray-500 font-ui">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
          </div>
        </div>
      )}
    </div>
  )
}
