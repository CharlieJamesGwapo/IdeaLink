import { Heart, Sparkles, Clock } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useHighlights } from '../../hooks/useHighlights'
import { Skeleton } from '../ui/Skeleton'

function timeRemaining(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return 'expired'
  const hrs = Math.floor(ms / 3_600_000)
  if (hrs >= 1) return `${hrs}h left`
  const mins = Math.max(1, Math.floor(ms / 60_000))
  return `${mins}m left`
}

export function HighlightsStrip() {
  const { role } = useAuth()
  const { highlights, isLoading, toggleReact } = useHighlights()
  const canReact = role === 'user'

  if (isLoading) {
    return <Skeleton className="h-36 w-full rounded-2xl mb-6" />
  }
  if (highlights.length === 0) return null

  const [top, ...rest] = highlights

  const renderReactButton = (h: typeof top, sizeClass = 'text-sm px-3 py-1.5') => (
    <button
      type="button"
      onClick={() => canReact && toggleReact(h.id)}
      disabled={!canReact}
      title={canReact ? (h.viewer_reacted ? 'Remove reaction' : 'React to this highlight') : 'Only students can react'}
      className={`inline-flex items-center gap-1.5 rounded-full border font-ui font-semibold transition-all ${sizeClass} ${
        h.viewer_reacted
          ? 'bg-pink-500/20 border-pink-400/50 text-pink-300'
          : 'bg-white/5 border-white/15 text-gray-300 hover:border-pink-400/40 hover:text-pink-300'
      } ${canReact ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
    >
      <Heart size={14} fill={h.viewer_reacted ? 'currentColor' : 'none'} />
      {h.react_count}
    </button>
  )

  return (
    <section className="mb-8 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={16} className="text-ascb-gold" />
        <h2 className="text-sm uppercase tracking-wider font-semibold text-ascb-gold font-ui">
          Highlights
        </h2>
        <span className="text-xs text-gray-500 font-ui">Trending feedback · auto-expires in 24h</span>
      </div>

      {/* Featured (top) — landscape card */}
      <div className="relative rounded-2xl bg-gradient-to-r from-ascb-navy-dark via-ascb-navy-mid/60 to-ascb-navy-dark border border-ascb-gold/30 p-5 sm:p-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-ascb-orange/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase tracking-widest font-bold text-ascb-orange font-ui">
                #1 Trending
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-ascb-navy-dark border border-white/10 text-gray-400 font-ui">
                {top.suggestion.department}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-gray-500 font-ui ml-auto sm:ml-0">
                <Clock size={11} /> {timeRemaining(top.expires_at)}
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white font-display leading-snug mb-1 line-clamp-2">
              {top.suggestion.title}
            </h3>
            <p className="text-sm text-gray-300 font-body line-clamp-2 sm:line-clamp-3">
              {top.suggestion.description}
            </p>
          </div>
          <div className="shrink-0">
            {renderReactButton(top, 'text-base px-4 py-2')}
          </div>
        </div>
      </div>

      {/* Other highlights */}
      {rest.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          {rest.slice(0, 4).map(h => (
            <div
              key={h.id}
              className="rounded-xl bg-ascb-navy-dark/70 border border-white/10 p-4 hover:border-ascb-gold/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-ascb-navy-dark border border-white/10 text-gray-400 font-ui">
                      {h.suggestion.department}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-gray-500 font-ui">
                      <Clock size={10} /> {timeRemaining(h.expires_at)}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-white font-ui line-clamp-1">
                    {h.suggestion.title}
                  </p>
                  <p className="text-xs text-gray-400 font-body line-clamp-2 mt-0.5">
                    {h.suggestion.description}
                  </p>
                </div>
                <div className="shrink-0">{renderReactButton(h, 'text-xs px-2.5 py-1')}</div>
              </div>
            </div>
          ))}
          {rest.length > 4 && (
            <p className="sm:col-span-2 text-center text-xs text-gray-500 font-ui">
              +{rest.length - 4} more highlight{rest.length - 4 === 1 ? '' : 's'}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
