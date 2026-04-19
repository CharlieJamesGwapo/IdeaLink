import { useEffect, useMemo, useState } from 'react'
import { Download, Star } from 'lucide-react'
import { getRatingsSummary, downloadRatingsCSV, type RatingGroup } from '../../api/ratings'
import { toast } from 'sonner'

interface Props {
  // Optional filter — pass a department to restrict to that office.
  department?: string
}

// Shows overall rating per category with a 1-5 breakdown and CSV export.
// Used on Admin dashboard (all depts) and Staff dashboards (own dept).
export function RatingsPanel({ department }: Props) {
  const [groups, setGroups] = useState<RatingGroup[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getRatingsSummary()
      .then(res => setGroups(res.data))
      .catch(() => setError('Could not load ratings'))
  }, [])

  const filtered = useMemo(() => {
    if (!groups) return []
    const list = department ? groups.filter(g => g.department === department) : groups
    return [...list].sort((a, b) => b.count - a.count)
  }, [groups, department])

  const overall = useMemo(() => {
    if (filtered.length === 0) return null
    let sum = 0, total = 0
    for (const g of filtered) { sum += g.average * g.count; total += g.count }
    return total > 0 ? { avg: sum / total, total } : null
  }, [filtered])

  const handleExport = () => {
    if (!filtered.length) { toast.error('No rating data to export'); return }
    const name = department
      ? `ratings-${department.toLowerCase().replace(/\s+/g, '-')}.csv`
      : 'ratings-summary.csv'
    downloadRatingsCSV(filtered, name)
  }

  return (
    <div className="bg-ascb-navy rounded-2xl p-5 border border-ascb-navy-mid">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h2 className="font-semibold text-white font-ui text-sm">Service Ratings</h2>
          <p className="text-[11px] text-gray-500 font-ui mt-0.5">
            {department ? `${department} · avg ${overall?.avg?.toFixed(2) ?? '—'}` : `All offices · avg ${overall?.avg?.toFixed(2) ?? '—'}`}
            {overall ? ` · ${overall.total} rated` : ''}
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={!filtered.length}
          className="flex items-center gap-2 px-3 py-1.5 bg-ascb-orange/10 hover:bg-ascb-orange/20 text-ascb-orange border border-ascb-orange/30 rounded-lg text-xs font-ui transition-all disabled:opacity-40 disabled:pointer-events-none"
        >
          <Download size={12} /> Export CSV
        </button>
      </div>

      {error && <p className="text-xs text-red-400 font-ui">{error}</p>}
      {!groups && !error && <p className="text-xs text-gray-500 font-ui">Loading…</p>}

      {groups && filtered.length === 0 && (
        <p className="text-sm text-gray-500 font-ui text-center py-6">No ratings yet.</p>
      )}

      {filtered.length > 0 && (
        <ul className="space-y-3">
          {filtered.map(g => {
            const max = Math.max(...[1,2,3,4,5].map(n => g.breakdown[String(n)] ?? 0), 1)
            return (
              <li key={`${g.department}-${g.category}`} className="rounded-xl border border-white/6 bg-ascb-navy-dark/50 p-3">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div>
                    <p className="text-xs font-semibold text-white font-ui leading-snug">{g.category}</p>
                    {!department && <p className="text-[10px] text-gray-500 font-ui">{g.department}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Star size={12} className="text-ascb-gold" fill="currentColor" />
                    <span className="text-sm font-bold text-ascb-gold font-ui tabular-nums">{g.average.toFixed(2)}</span>
                    <span className="text-[10px] text-gray-500 font-ui">({g.count})</span>
                  </div>
                </div>
                <div className="space-y-1">
                  {[5, 4, 3, 2, 1].map(n => {
                    const count = g.breakdown[String(n)] ?? 0
                    const pct = Math.round((count / max) * 100)
                    return (
                      <div key={n} className="flex items-center gap-2 text-[11px] font-ui">
                        <span className="w-4 text-gray-500 tabular-nums">{n}★</span>
                        <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full rounded-full bg-ascb-gold/70 transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-8 text-right text-gray-400 tabular-nums">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
