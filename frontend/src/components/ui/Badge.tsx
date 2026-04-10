import { cn } from '../../lib/utils'

interface BadgeProps { status: string; className?: string }

// Normalize status for case-insensitive matching
function normalizeStatus(s: string): string {
  const lower = s.toLowerCase().trim()
  if (lower === 'pending') return 'Pending'
  if (lower === 'under review') return 'Under Review'
  if (lower === 'resolved') return 'Resolved'
  return s
}

export function Badge({ status, className }: BadgeProps) {
  const normalized = normalizeStatus(status)
  const styles: Record<string, string> = {
    Pending:        'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
    'Under Review': 'bg-blue-500/10  text-blue-300  border-blue-500/20',
    Resolved:       'bg-green-500/10 text-green-300 border-green-500/20',
  }
  const dotColors: Record<string, string> = {
    Pending:        'bg-yellow-400',
    'Under Review': 'bg-blue-400',
    Resolved:       'bg-green-400',
  }
  const style = styles[normalized] ?? 'bg-gray-500/10 text-gray-400 border-gray-500/20'
  const dot   = dotColors[normalized] ?? 'bg-gray-400'

  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border', style, className)}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      {normalized}
    </span>
  )
}
