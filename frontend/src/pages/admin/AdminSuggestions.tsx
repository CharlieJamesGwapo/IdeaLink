import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Download, MessageSquare, Search, Filter, ArrowUpDown } from 'lucide-react'
import { useSuggestions } from '../../hooks/useSuggestions'
import { SuggestionRow } from '../../components/shared/SuggestionRow'
import { Skeleton } from '../../components/ui/Skeleton'
import { Pagination } from '../../components/ui/Pagination'
import { featureSuggestion } from '../../api/suggestions'
import { getHighlights, createHighlight, deleteHighlight } from '../../api/highlights'
import { exportToCSV } from '../../api/reports'

const PAGE_SIZE = 10

type StatusFilter = 'all' | 'Delivered' | 'Reviewed'
type DeptFilter   = 'all' | 'Registrar Office' | 'Finance Office'
type SortOption   = 'newest' | 'oldest' | 'status'

const selectStyle = { height: '40px', background: 'rgba(13,31,60,0.85)' } as const

export function AdminSuggestions() {
  const { suggestions, isLoading, error, refetch } = useSuggestions()
  const [status, setStatus] = useState<StatusFilter>('all')
  const [dept, setDept]     = useState<DeptFilter>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort]     = useState<SortOption>('newest')
  const [page, setPage]     = useState(1)
  // Map of suggestion_id → highlight_id for active highlights.
  const [highlightedMap, setHighlightedMap] = useState<Record<number, number>>({})

  const loadHighlights = async () => {
    try {
      const res = await getHighlights()
      const map: Record<number, number> = {}
      for (const h of res.data ?? []) map[h.suggestion_id] = h.id
      setHighlightedMap(map)
    } catch {
      // Silently ignore — highlights are a soft feature in this view.
    }
  }

  useEffect(() => { void loadHighlights() }, [])

  const handleToggleHighlight = async (suggestionId: number) => {
    const existing = highlightedMap[suggestionId]
    try {
      if (existing) {
        await deleteHighlight(existing)
        setHighlightedMap(prev => {
          const next = { ...prev }
          delete next[suggestionId]
          return next
        })
        toast.success('Unhighlighted')
      } else {
        const res = await createHighlight(suggestionId)
        setHighlightedMap(prev => ({ ...prev, [suggestionId]: res.data.id }))
        toast.success('Highlighted for 24h')
      }
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } }
      if (err.response?.status === 409) toast.error('Already highlighted')
      else toast.error('Failed to toggle highlight')
    }
  }

  const filtered = suggestions
    .filter(s => {
      if (status !== 'all' && s.status !== status) return false
      if (dept   !== 'all' && s.department !== dept) return false
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

  const handleFeature = async (id: number) => {
    try {
      await featureSuggestion(id)
      toast.success('Featured as testimonial!')
      refetch()
    } catch { toast.error('Failed to feature') }
  }

  const unreviewed = suggestions.filter(s => s.status === 'Delivered').length
  const reviewed   = suggestions.filter(s => s.status === 'Reviewed').length
  const hasFilters = search || dept !== 'all'

  // Reset to first page whenever the filter/sort/search changes
  useEffect(() => { setPage(1) }, [status, dept, search, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paged = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  )

  return (
    <div className="animate-fade-in space-y-5 pb-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-8 bg-ascb-orange rounded-full"/>
            <h1 className="text-2xl font-bold text-white font-display">All Feedback</h1>
          </div>
          <p className="text-gray-500 text-sm font-ui ml-3">
            {suggestions.length} total · {unreviewed} unreviewed · {reviewed} reviewed
          </p>
        </div>
        <button
          onClick={() => exportToCSV(filtered, 'all-feedback')}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-ascb-orange/10 hover:bg-ascb-orange/20 text-ascb-orange border border-ascb-orange/30 rounded-xl text-sm font-medium transition-all font-ui shrink-0 disabled:opacity-40 disabled:pointer-events-none"
        >
          <Download size={15}/> Export CSV
        </button>
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-2">
        {([
          { val: 'all',       label: `All (${suggestions.length})`,  cls: status === 'all'       ? 'bg-ascb-orange text-white border-ascb-orange'          : '' },
          { val: 'Delivered', label: `Unreviewed (${unreviewed})`,    cls: status === 'Delivered' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' : '' },
          { val: 'Reviewed',  label: `Reviewed (${reviewed})`,        cls: status === 'Reviewed'  ? 'bg-green-500/20 text-green-300 border-green-500/40'   : '' },
        ] as { val: StatusFilter; label: string; cls: string }[]).map(f => (
          <button key={f.val} onClick={() => setStatus(f.val)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150 font-ui ${f.cls || 'border-white/10 text-gray-500 hover:text-white hover:border-white/20'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Search + filters row */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"/>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search title, description, submitter…"
            className="input-field pl-10 text-sm" style={{ height: '40px' }}/>
        </div>
        <div className="flex gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-gray-500"/>
            <select value={dept} onChange={e => setDept(e.target.value as DeptFilter)}
              className="rounded-xl border border-white/15 px-3 text-white text-sm font-ui focus:outline-none focus:border-ascb-orange cursor-pointer appearance-none"
              style={selectStyle}>
              <option value="all">All Offices</option>
              <option value="Registrar Office">Registrar Office</option>
              <option value="Finance Office">Finance Office</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <ArrowUpDown size={13} className="text-gray-500"/>
            <select value={sort} onChange={e => setSort(e.target.value as SortOption)}
              className="rounded-xl border border-white/15 px-3 text-white text-sm font-ui focus:outline-none focus:border-ascb-orange cursor-pointer appearance-none"
              style={selectStyle}>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="status">By Status</option>
            </select>
          </div>
        </div>
      </div>

      {(hasFilters || status !== 'all') && !isLoading && (
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
            {search ? 'No results for your search.' : status !== 'all' ? `No ${status.toLowerCase()} submissions.` : 'Feedback will appear here once students submit.'}
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
                <SuggestionRow key={s.id} suggestion={s} showActions showFeature showHighlight
                  viewer="admin"
                  isHighlighted={!!highlightedMap[s.id]}
                  onFeature={handleFeature}
                  onToggleHighlight={handleToggleHighlight}/>
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
