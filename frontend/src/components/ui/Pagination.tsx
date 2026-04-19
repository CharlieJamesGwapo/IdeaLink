import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  page: number
  totalPages: number
  onChange: (page: number) => void
  className?: string
}

export function Pagination({ page, totalPages, onChange, className = '' }: Props) {
  if (totalPages <= 1) return null

  const go = (p: number) => onChange(Math.max(1, Math.min(totalPages, p)))

  // Small page list: show current ± 1, plus edges with ellipsis.
  const pages: (number | 'dots')[] = []
  const push = (n: number) => { if (!pages.includes(n)) pages.push(n) }
  push(1)
  if (page - 1 > 2) pages.push('dots')
  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) push(i)
  if (page + 1 < totalPages - 1) pages.push('dots')
  if (totalPages > 1) push(totalPages)

  return (
    <nav className={`flex items-center justify-center gap-1.5 py-3 font-ui ${className}`} aria-label="Pagination">
      <button
        onClick={() => go(page - 1)}
        disabled={page <= 1}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border border-white/10 text-gray-300 hover:border-ascb-orange/40 hover:text-ascb-orange disabled:opacity-30 disabled:pointer-events-none transition-all"
      >
        <ChevronLeft size={14} /> Prev
      </button>
      {pages.map((p, i) =>
        p === 'dots' ? (
          <span key={`d-${i}`} className="px-1 text-xs text-gray-600">…</span>
        ) : (
          <button
            key={p}
            onClick={() => go(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`min-w-[32px] px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              p === page
                ? 'bg-ascb-orange text-white border-ascb-orange'
                : 'border-white/10 text-gray-400 hover:text-white hover:border-white/20'
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => go(page + 1)}
        disabled={page >= totalPages}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border border-white/10 text-gray-300 hover:border-ascb-orange/40 hover:text-ascb-orange disabled:opacity-30 disabled:pointer-events-none transition-all"
      >
        Next <ChevronRight size={14} />
      </button>
    </nav>
  )
}
