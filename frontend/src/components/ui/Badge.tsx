import { cn } from '../../lib/utils'

interface BadgeProps { status: string; className?: string }

export function Badge({ status, className }: BadgeProps) {
  const styles: Record<string, string> = {
    Pending: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
    Reviewed: 'bg-green-500/10 text-green-300 border-green-500/20',
  }
  const style = styles[status] ?? 'bg-gray-500/10 text-gray-400 border-gray-500/20'

  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border', style, className)}>
      <span className={`w-1 h-1 rounded-full ${status === 'Pending' ? 'bg-yellow-400' : status === 'Reviewed' ? 'bg-green-400' : 'bg-gray-400'}`} />
      {status}
    </span>
  )
}
