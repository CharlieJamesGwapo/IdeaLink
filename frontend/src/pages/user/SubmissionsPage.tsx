import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, Clock, CheckCircle, Search, Filter, ChevronDown, ChevronUp, Plus, Calendar, Tag, EyeOff } from 'lucide-react'
import { useSuggestions } from '../../hooks/useSuggestions'
import { useSubmissionStatusUnread } from '../../hooks/useSubmissionStatusUnread'
import { Skeleton } from '../../components/ui/Skeleton'
import { markSubmissionsSeen } from '../../api/suggestions'
import type { Suggestion } from '../../types'

type StatusFilter = 'all' | 'Delivered' | 'Reviewed'
type DeptFilter   = 'all' | 'Registrar Office' | 'Finance Office'
type SortOption   = 'newest' | 'oldest' | 'status'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ReactNode; cls: string }> = {
    Delivered: { icon: <Clock size={11} />,        cls: 'bg-yellow-500/12 text-yellow-400 border-yellow-500/25' },
    Reviewed:  { icon: <CheckCircle size={11} />,  cls: 'bg-green-500/12 text-green-400 border-green-500/25' },
  }
  const { icon, cls } = map[status] ?? { icon: null, cls: 'bg-gray-500/12 text-gray-400 border-gray-500/25' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border font-ui whitespace-nowrap ${cls}`}>
      {icon}{status}
    </span>
  )
}

function SubmissionCard({ s }: { s: Suggestion }) {
  const [expanded, setExpanded] = useState(false)
  const date = new Date(s.submitted_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
  const isLong = s.description.length > 140
  return (
    <div className="glass rounded-2xl p-4 sm:p-5 hover:border-ascb-orange/25 transition-all duration-200 border border-transparent">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold font-ui text-sm sm:text-base leading-snug">{s.title}</h3>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
            <span className="text-xs font-bold text-ascb-orange font-ui">{s.department}</span>
            {s.service_category && (
              <><span className="text-gray-700 text-xs">·</span>
              <span className="inline-flex items-center gap-1 text-xs text-gray-400 font-ui"><Tag size={10}/>{s.service_category}</span></>
            )}
            {s.anonymous && (
              <><span className="text-gray-700 text-xs">·</span>
              <span className="inline-flex items-center gap-1 text-xs text-yellow-500 font-ui"><EyeOff size={10}/>Anonymous</span></>
            )}
          </div>
        </div>
        <StatusBadge status={s.status} />
      </div>
      <p className={`text-gray-400 text-sm font-body leading-relaxed mb-2 ${expanded ? '' : 'line-clamp-2'}`}>{s.description}</p>
      {isLong && (
        <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-1 text-xs text-ascb-orange hover:text-ascb-gold transition-colors mb-2 font-ui">
          {expanded ? <><ChevronUp size={12}/>Show less</> : <><ChevronDown size={12}/>Read more</>}
        </button>
      )}
      <div className="flex items-center justify-between pt-2.5 border-t border-white/6">
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 font-ui"><Calendar size={11}/>{date}</span>
        <span className={`text-xs font-ui font-medium ${s.status === 'Reviewed' ? 'text-green-400' : 'text-yellow-500/60'}`}>
          {s.status === 'Reviewed' ? '✓ Reviewed by staff' : 'Delivered · awaiting review'}
        </span>
      </div>
    </div>
  )
}

export function SubmissionsPage() {
  const { suggestions, isLoading, error, refetch } = useSuggestions()
  const [search, setSearch]         = useState('')
  const [status, setStatus]         = useState<StatusFilter>('all')
  const [dept, setDept]             = useState<DeptFilter>('all')
  const [sort, setSort]             = useState<SortOption>('newest')
  const [showFilters, setShowFilters] = useState(false)

  const { clearLocal } = useSubmissionStatusUnread()
  const delivered = suggestions.filter(s => s.status === 'Delivered').length
  const reviewed  = suggestions.filter(s => s.status === 'Reviewed').length
  const total     = suggestions.length

  // Opening this page = user has seen any pending status changes.
  // Clear the shared badge state immediately so the Header updates this
  // tick, then confirm with the server.
  useEffect(() => {
    clearLocal()
    markSubmissionsSeen().catch(() => {})
  }, [clearLocal])

  const filtered = suggestions
    .filter(s => {
      if (status !== 'all' && s.status !== status) return false
      if (dept !== 'all' && s.department !== dept) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || (s.service_category ?? '').toLowerCase().includes(q)
      }
      return true
    })
    .sort((a, b) => {
      if (sort === 'newest') return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
      if (sort === 'oldest') return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
      const o: Record<string, number> = { Delivered: 0, Reviewed: 1 }
      return (o[a.status] ?? 0) - (o[b.status] ?? 0)
    })

  const hasFilters = status !== 'all' || dept !== 'all' || search.trim() !== ''

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 animate-fade-in">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-1 h-8 bg-ascb-orange rounded-full" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">My Submissions</h1>
          </div>
          <p className="text-gray-400 text-sm font-body ml-3">{total} total · {reviewed} reviewed</p>
        </div>
        <Link to="/user/submit" className="flex items-center gap-2 px-4 py-2.5 bg-ascb-orange hover:bg-ascb-orange-dark text-white rounded-xl text-sm font-semibold font-ui transition-all hover:shadow-lg hover:shadow-ascb-orange/25 active:scale-95 shrink-0">
          <Plus size={16}/> New Feedback
        </Link>
      </div>

      {total > 0 && (
        <div className="glass rounded-2xl p-4 mb-5">
          <div className="flex h-1.5 rounded-full overflow-hidden bg-white/5 mb-3">
            <div className="bg-yellow-400 transition-all duration-700" style={{ width: `${(delivered/total)*100}%` }}/>
            <div className="bg-green-400 transition-all duration-700"  style={{ width: `${(reviewed/total)*100}%` }}/>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Delivered', count: delivered, color: 'text-yellow-400', fn: () => setStatus('Delivered') },
              { label: 'Reviewed',  count: reviewed,  color: 'text-green-400',  fn: () => setStatus('Reviewed')  },
            ].map(s => (
              <button key={s.label} onClick={s.fn} className="text-center p-2 rounded-xl hover:bg-white/5 transition-colors">
                <div className={`text-xl font-bold font-ui ${s.color}`}>{s.count}</div>
                <div className="text-xs text-gray-500 font-ui">{s.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2 mb-5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"/>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search submissions…" className="input-field pl-10 text-sm" style={{ height: '42px' }}/>
          </div>
          <button onClick={() => setShowFilters(v => !v)} className={`flex items-center gap-1.5 px-3.5 rounded-xl border text-sm font-ui transition-all shrink-0 ${hasFilters ? 'bg-ascb-orange/15 border-ascb-orange/40 text-ascb-orange' : 'border-white/15 text-gray-400 hover:border-white/25 hover:text-white'}`} style={{ height: '42px' }}>
            <Filter size={14}/><span className="hidden sm:inline">Filter</span>
            {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-ascb-orange"/>}
          </button>
          <select value={sort} onChange={e => setSort(e.target.value as SortOption)} className="rounded-xl border border-white/15 px-3 text-white text-sm font-ui focus:outline-none focus:border-ascb-orange cursor-pointer shrink-0" style={{ height: '42px', background: 'rgba(13,31,60,0.8)' }}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="status">Status</option>
          </select>
        </div>
        {showFilters && (
          <div className="p-4 rounded-xl border border-white/10 space-y-3 animate-fade-in" style={{ background: 'rgba(13,31,60,0.7)' }}>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-ui mb-2">Status</p>
              <div className="flex flex-wrap gap-2">
                {(['all','Delivered','Reviewed'] as StatusFilter[]).map(f => (
                  <button key={f} onClick={() => setStatus(f)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-ui transition-all ${status === f ? 'bg-ascb-orange text-white' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'}`}>{f === 'all' ? 'All' : f}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-ui mb-2">Office</p>
              <div className="flex flex-wrap gap-2">
                {(['all','Registrar Office','Finance Office'] as DeptFilter[]).map(d => (
                  <button key={d} onClick={() => setDept(d)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-ui transition-all ${dept === d ? 'bg-white/15 text-white border border-ascb-orange/40' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'}`}>{d === 'all' ? 'All Offices' : d}</button>
                ))}
              </div>
            </div>
            {hasFilters && <button onClick={() => { setStatus('all'); setDept('all'); setSearch('') }} className="text-xs text-gray-500 hover:text-red-400 transition-colors font-ui">× Clear all</button>}
          </div>
        )}
      </div>

      {hasFilters && !isLoading && <p className="text-xs text-gray-500 font-ui mb-3">{filtered.length} of {total} submissions</p>}

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm font-ui mb-2">
          {error}
          <button onClick={refetch} className="ml-auto underline hover:no-underline text-red-400 text-xs">Retry</button>
        </div>
      )}
      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl"/>)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 glass rounded-2xl">
          <MessageSquare size={40} className="text-gray-600 mx-auto mb-3"/>
          <p className="text-gray-300 font-semibold font-ui">{total === 0 ? 'No submissions yet' : 'No matches found'}</p>
          <p className="text-gray-500 text-sm mt-1 font-body">{total === 0 ? 'Submit your first feedback to get started.' : 'Try adjusting your search or filters.'}</p>
          {total === 0 && (
            <Link to="/user/submit" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-ascb-orange text-white text-sm rounded-xl font-ui hover:bg-ascb-orange-dark transition-all"><Plus size={14}/> Submit Feedback</Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s, i) => (
            <div key={s.id} className="animate-fade-in" style={{ animationDelay: `${i * 40}ms`, opacity: 0, animationFillMode: 'forwards' }}>
              <SubmissionCard s={s}/>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
