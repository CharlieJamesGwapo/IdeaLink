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

export function SuggestionRow({ suggestion, showActions, showFeature, onStatusChange, onFeature }: Props) {
  const date = new Date(suggestion.submitted_at).toLocaleDateString()
  const name = suggestion.anonymous ? 'Anonymous' : (suggestion.submitter_name ?? 'Unknown')

  return (
    <tr className="border-b border-navy-light hover:bg-navy-light/50 transition-colors">
      <td className="px-4 py-3 text-sm text-white font-medium">{suggestion.title}</td>
      <td className="px-4 py-3 text-sm text-gray-400">{suggestion.department}</td>
      <td className="px-4 py-3 text-sm text-gray-400">{name}</td>
      <td className="px-4 py-3 text-sm text-gray-400">{date}</td>
      <td className="px-4 py-3">
        <Badge status={suggestion.status} />
      </td>
      {showActions && (
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onStatusChange?.(suggestion.id, suggestion.status === 'Pending' ? 'Reviewed' : 'Pending')}
            >
              {suggestion.status === 'Pending' ? 'Mark Reviewed' : 'Mark Pending'}
            </Button>
            {showFeature && (
              <Button size="sm" variant="ghost" onClick={() => onFeature?.(suggestion.id)}>
                Feature
              </Button>
            )}
          </div>
        </td>
      )}
    </tr>
  )
}
