import { cn } from '../../lib/utils'

interface BadgeProps { status: string; className?: string }

export function Badge({ status, className }: BadgeProps) {
  const styles: Record<string, string> = {
    Pending: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
    'Under Review': 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    Resolved: 'bg-green-500/10 text-green-300 border-green-500/20',
  }
  const dotColors: Record<string, string> = {
    Pending: 'bg-yellow-400',
    'Under Review': 'bg-blue-400',
    Resolved: 'bg-green-400',
  }
  const style = styles[status] ?? 'bg-gray-500/10 text-gray-400 border-gray-500/20'
  const dot = dotColors[status] ?? 'bg-gray-400'

  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border', style, className)}>
      <span className={`w-1 h-1 rounded-full ${dot}`} />
      {status}
    </span>
  )
}
