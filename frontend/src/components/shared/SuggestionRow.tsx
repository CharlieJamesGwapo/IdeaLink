import { useState } from 'react'
import { Eye, Sparkles, Building2, Tag, User as UserIcon, Calendar, Star } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import type { Suggestion } from '../../types'

interface Props {
  suggestion: Suggestion
  showActions?: boolean
  showFeature?: boolean
  showHighlight?: boolean
  isHighlighted?: boolean
  // "staff" = registrar / finance (can toggle status)
  // "admin" = read-only; sees Unreviewed/Reviewed summary but no toggle
  viewer?: 'staff' | 'admin'
  onStatusChange?: (id: number, status: string) => void
  onOpen?: (id: number) => void
  onFeature?: (id: number) => void
  onToggleHighlight?: (id: number) => void
}

// Under the simplified flow the only toggle is Delivered ↔ Reviewed.
// Delivered is shown as "Unreviewed" in staff UI.
const nextStatusFor = (s: string) => (s === 'Reviewed' ? 'Delivered' : 'Reviewed')
const nextLabelFor  = (s: string) => (s === 'Reviewed' ? 'Unreviewed' : 'Reviewed')
const nextBtnColor  = (s: string) =>
  s === 'Reviewed'
    ? 'text-gray-400 border-gray-400/30 bg-gray-400/8 hover:bg-gray-400/15'
    : 'text-green-400 border-green-400/30 bg-green-400/8 hover:bg-green-400/15'

export function SuggestionRow({ suggestion, showActions, showFeature, showHighlight, isHighlighted, viewer = 'staff', onStatusChange, onOpen, onFeature, onToggleHighlight }: Props) {
  const [detailOpen, setDetailOpen] = useState(false)
  const date = new Date(suggestion.submitted_at).toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
  const name = suggestion.anonymous ? 'Anonymous' : (suggestion.submitter_name ?? 'Unknown')
  const next = nextStatusFor(suggestion.status)
  const hasDescription = suggestion.description && suggestion.description.trim().length > 0

  const openDetail = () => {
    setDetailOpen(true)
    onOpen?.(suggestion.id)
  }

  return (
    <>
      {/* ── Desktop row ── */}
      <tr className="border-b border-white/5 transition-colors group hidden md:table-row hover:bg-white/3">
        <td className="px-4 py-3 max-w-[260px]">
          <div className="flex items-start gap-1.5">
            <div className="flex-1 min-w-0">
              <button
                type="button"
                onClick={() => openDetail()}
                className="text-left text-sm text-white font-medium font-ui leading-snug line-clamp-1 hover:text-ascb-orange transition-colors"
              >
                {suggestion.title}
              </button>
              {suggestion.service_category && (
                <span className="text-xs text-ascb-gold/70 mt-0.5 block truncate font-ui">{suggestion.service_category}</span>
              )}
            </div>
            <button
              onClick={() => openDetail()}
              title="View full feedback"
              className="shrink-0 p-1 text-gray-600 hover:text-ascb-orange transition-colors mt-0.5"
              aria-label="View full feedback"
            >
              <Eye size={13} />
            </button>
          </div>
        </td>
        <td className="px-4 py-3 hidden sm:table-cell">
          <span className="text-xs px-2.5 py-1 rounded-lg bg-ascb-navy-dark border border-white/10 text-gray-400 font-ui whitespace-nowrap">
            {suggestion.department}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-400 hidden md:table-cell font-ui">{name}</td>
        <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell font-ui whitespace-nowrap">{date}</td>
        <td className="px-4 py-3"><Badge status={suggestion.status} viewer="staff" /></td>
        {showActions && (
          <td className="px-4 py-3">
            <div className="flex items-center gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
              {viewer === 'staff' && (
                <button
                  onClick={() => onStatusChange?.(suggestion.id, next)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all font-ui font-semibold ${nextBtnColor(suggestion.status)}`}
                >
                  → {nextLabelFor(suggestion.status)}
                </button>
              )}
              {showFeature && (
                <Button size="sm" variant="outline" onClick={() => onFeature?.(suggestion.id)} className="text-xs py-1">
                  ★
                </Button>
              )}
              {showHighlight && (
                <button
                  onClick={() => onToggleHighlight?.(suggestion.id)}
                  title={isHighlighted ? 'Unhighlight' : 'Highlight for 24h'}
                  className={`text-xs px-2 py-1 rounded-lg border transition-all font-ui font-semibold inline-flex items-center gap-1 ${
                    isHighlighted
                      ? 'bg-ascb-gold/20 border-ascb-gold/50 text-ascb-gold'
                      : 'bg-white/5 border-white/15 text-gray-400 hover:border-ascb-gold/40 hover:text-ascb-gold'
                  }`}
                >
                  <Sparkles size={12} />
                </button>
              )}
            </div>
          </td>
        )}
      </tr>

      {/* ── Mobile card ── */}
      <tr className="md:hidden border-b border-white/5">
        <td colSpan={99} className="px-3 py-3">
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                onClick={() => openDetail()}
                className="flex-1 min-w-0 text-left"
              >
                <p className="text-sm font-semibold text-white font-ui leading-snug">{suggestion.title}</p>
                {suggestion.service_category && (
                  <p className="text-xs text-ascb-gold/70 mt-0.5 font-ui">{suggestion.service_category}</p>
                )}
              </button>
              <Badge status={suggestion.status} viewer="staff" />
            </div>

            {hasDescription && (
              <button
                onClick={() => openDetail()}
                className="flex items-center gap-1.5 text-[11px] text-ascb-orange font-ui"
              >
                <Eye size={11} /> View full feedback
              </button>
            )}

            <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 font-ui">
              <span className="px-2 py-0.5 rounded-md bg-ascb-navy-dark border border-white/10 text-gray-400">
                {suggestion.department}
              </span>
              <span>{name}</span>
              <span className="ml-auto">{date}</span>
            </div>

            {showActions && (
              <div className="flex items-center gap-2 pt-0.5">
                {viewer === 'staff' && (
                  <button
                    onClick={() => onStatusChange?.(suggestion.id, next)}
                    className={`flex-1 text-center text-xs py-1.5 rounded-lg border transition-all font-ui font-semibold ${nextBtnColor(suggestion.status)}`}
                  >
                    → {nextLabelFor(suggestion.status)}
                  </button>
                )}
                {showFeature && (
                  <Button size="sm" variant="outline" onClick={() => onFeature?.(suggestion.id)} className="text-xs py-1">
                    ★ Feature
                  </Button>
                )}
                {showHighlight && (
                  <button
                    onClick={() => onToggleHighlight?.(suggestion.id)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border font-ui font-semibold inline-flex items-center gap-1 ${
                      isHighlighted
                        ? 'bg-ascb-gold/20 border-ascb-gold/50 text-ascb-gold'
                        : 'bg-white/5 border-white/15 text-gray-400'
                    }`}
                  >
                    <Sparkles size={12} /> {isHighlighted ? 'Highlighted' : 'Highlight'}
                  </button>
                )}
              </div>
            )}
          </div>
        </td>
      </tr>

      {/* ── Detail modal ── */}
      <Modal
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="Feedback Details"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-gray-500 font-ui mb-1">Subject</p>
            <h3 className="text-base font-semibold text-white font-display leading-snug">{suggestion.title}</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-ui">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-ascb-orange/10 border border-ascb-orange/25 text-ascb-orange">
              <Building2 size={11} /> {suggestion.department}
            </span>
            {suggestion.service_category && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-ascb-gold/10 border border-ascb-gold/25 text-ascb-gold">
                <Tag size={11} /> {suggestion.service_category}
              </span>
            )}
            <Badge status={suggestion.status} viewer="staff" />
          </div>

          {suggestion.rating != null && (
            <div className="flex items-center gap-2 text-xs font-ui">
              <span className="text-gray-500 uppercase tracking-wider text-[11px]">Rating</span>
              <span className="inline-flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map(n => (
                  <Star
                    key={n}
                    size={13}
                    className={n <= (suggestion.rating ?? 0) ? 'text-ascb-gold' : 'text-gray-700'}
                    fill={n <= (suggestion.rating ?? 0) ? 'currentColor' : 'none'}
                  />
                ))}
              </span>
              <span className="text-ascb-gold font-semibold">{suggestion.rating}/5</span>
            </div>
          )}

          <div>
            <p className="text-[11px] uppercase tracking-wider text-gray-500 font-ui mb-1.5">Message</p>
            <div className="rounded-xl bg-ascb-navy-dark/70 border border-white/8 px-4 py-3 max-h-[45vh] overflow-y-auto">
              {hasDescription ? (
                <p className="text-sm text-gray-200 font-body leading-relaxed whitespace-pre-wrap">{suggestion.description}</p>
              ) : (
                <p className="text-sm text-gray-500 font-body italic">No description provided.</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-500 font-ui pt-1">
            <span className="inline-flex items-center gap-1.5">
              <UserIcon size={11} /> {name}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={11} /> {date}
            </span>
          </div>
        </div>
      </Modal>
    </>
  )
}
