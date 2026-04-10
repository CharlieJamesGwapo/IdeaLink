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

export function SuggestionRow({ suggestion, showActions, showFeature, onStatusChange, onFeature }: Props) {
  const date = new Date(suggestion.submitted_at).toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric'
  })
  const name = suggestion.anonymous ? 'Anonymous' : (suggestion.submitter_name ?? 'Unknown')
  const next = nextStatus[suggestion.status] ?? 'Pending'

  return (
    <tr className="border-b border-white/5 hover:bg-ascb-orange/5 transition-colors group">
      <td className="px-4 py-3.5 max-w-[200px]">
        <span className="text-sm text-white font-medium font-ui truncate block">{suggestion.title}</span>
        {suggestion.service_category && (
          <span className="text-xs text-ascb-gold/70 mt-0.5 block truncate font-ui">{suggestion.service_category}</span>
        )}
      </td>
      <td className="px-4 py-3.5 hidden sm:table-cell">
        <span className="text-xs px-2.5 py-1 rounded-lg bg-ascb-navy-dark border border-white/10 text-gray-400 font-ui">
          {suggestion.department}
        </span>
      </td>
      <td className="px-4 py-3.5 text-sm text-gray-400 hidden md:table-cell font-ui">{name}</td>
      <td className="px-4 py-3.5 text-xs text-gray-500 hidden lg:table-cell font-ui">{date}</td>
      <td className="px-4 py-3.5"><Badge status={suggestion.status} /></td>
      {showActions && (
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
            <Button size="sm" variant="secondary" onClick={() => onStatusChange?.(suggestion.id, next)}>
              → {next}
            </Button>
            {showFeature && (
              <Button size="sm" variant="outline" onClick={() => onFeature?.(suggestion.id)}>
                Feature
              </Button>
            )}
          </div>
        </td>
      )}
    </tr>
  )
}
