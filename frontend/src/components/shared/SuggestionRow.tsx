import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import type { Suggestion } from '../../types'

interface Props {
  suggestion: Suggestion
  showActions?: boolean
  showFeature?: boolean
  onStatusChange?: (id: number, status: string) => void
  onFeature?: (id: number) => void
}

const nextStatus: Record<string, string> = {
  Pending: 'Under Review',
  'Under Review': 'Resolved',
  Resolved: 'Pending',
}

const nextStatusColor: Record<string, string> = {
  Pending:        'text-blue-400  border-blue-400/30  bg-blue-400/8  hover:bg-blue-400/15',
  'Under Review': 'text-green-400 border-green-400/30 bg-green-400/8 hover:bg-green-400/15',
  Resolved:       'text-gray-400  border-gray-400/30  bg-gray-400/8  hover:bg-gray-400/15',
}

export function SuggestionRow({ suggestion, showActions, showFeature, onStatusChange, onFeature }: Props) {
  const [expanded, setExpanded] = useState(false)
  const date = new Date(suggestion.submitted_at).toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
  const name = suggestion.anonymous ? 'Anonymous' : (suggestion.submitter_name ?? 'Unknown')
  const next = nextStatus[suggestion.status] ?? 'Pending'
  const hasDescription = suggestion.description && suggestion.description.trim().length > 0

  return (
    <>
      {/* ── Desktop row ── */}
      <tr
        className={`border-b border-white/5 transition-colors group hidden md:table-row ${expanded ? 'bg-ascb-navy-mid/20' : 'hover:bg-white/3'}`}
      >
        <td className="px-4 py-3 max-w-[220px]">
          <div className="flex items-start gap-1.5">
            <div className="flex-1 min-w-0">
              <span className="text-sm text-white font-medium font-ui leading-snug line-clamp-1">{suggestion.title}</span>
              {suggestion.service_category && (
                <span className="text-xs text-ascb-gold/70 mt-0.5 block truncate font-ui">{suggestion.service_category}</span>
              )}
            </div>
            {hasDescription && (
              <button
                onClick={() => setExpanded(v => !v)}
                title={expanded ? 'Collapse' : 'View description'}
                className="shrink-0 p-0.5 text-gray-600 hover:text-ascb-orange transition-colors mt-0.5"
              >
                {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            )}
          </div>
          {/* Expanded description */}
          {expanded && hasDescription && (
            <div className="mt-2 pr-4 pb-1">
              <p className="text-xs text-gray-400 font-body leading-relaxed bg-ascb-navy-dark/60 rounded-lg px-3 py-2 border border-white/5">
                {suggestion.description}
              </p>
            </div>
          )}
        </td>
        <td className="px-4 py-3 hidden sm:table-cell">
          <span className="text-xs px-2.5 py-1 rounded-lg bg-ascb-navy-dark border border-white/10 text-gray-400 font-ui whitespace-nowrap">
            {suggestion.department}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-400 hidden md:table-cell font-ui">{name}</td>
        <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell font-ui whitespace-nowrap">{date}</td>
        <td className="px-4 py-3"><Badge status={suggestion.status} /></td>
        {showActions && (
          <td className="px-4 py-3">
            <div className="flex items-center gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onStatusChange?.(suggestion.id, next)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-all font-ui font-semibold ${nextStatusColor[suggestion.status] ?? 'text-gray-400 border-gray-400/30 bg-gray-400/8'}`}
              >
                → {next}
              </button>
              {showFeature && (
                <Button size="sm" variant="outline" onClick={() => onFeature?.(suggestion.id)} className="text-xs py-1">
                  ★
                </Button>
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
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white font-ui leading-snug">{suggestion.title}</p>
                {suggestion.service_category && (
                  <p className="text-xs text-ascb-gold/70 mt-0.5 font-ui">{suggestion.service_category}</p>
                )}
              </div>
              <Badge status={suggestion.status} />
            </div>

            {/* Description expand on mobile */}
            {hasDescription && (
              <div>
                <p className={`text-xs text-gray-400 font-body leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
                  {suggestion.description}
                </p>
                {suggestion.description.length > 100 && (
                  <button
                    onClick={() => setExpanded(v => !v)}
                    className="flex items-center gap-1 text-[11px] text-ascb-orange mt-1 font-ui"
                  >
                    {expanded ? <><ChevronUp size={11} />Show less</> : <><ChevronDown size={11} />Read more</>}
                  </button>
                )}
              </div>
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
                <button
                  onClick={() => onStatusChange?.(suggestion.id, next)}
                  className={`flex-1 text-center text-xs py-1.5 rounded-lg border transition-all font-ui font-semibold ${nextStatusColor[suggestion.status] ?? 'text-gray-400 border-gray-400/30'}`}
                >
                  → {next}
                </button>
                {showFeature && (
                  <Button size="sm" variant="outline" onClick={() => onFeature?.(suggestion.id)} className="text-xs py-1">
                    ★ Feature
                  </Button>
                )}
              </div>
            )}
          </div>
        </td>
      </tr>
    </>
  )
}
