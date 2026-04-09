import { cn } from '../../lib/utils'

interface BadgeProps {
  status: 'Pending' | 'Reviewed' | string
  className?: string
}

export function Badge({ status, className }: BadgeProps) {
  const colors = {
    Pending: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
    Reviewed: 'bg-green-500/20 text-green-300 border border-green-500/30',
  }
  const color = colors[status as keyof typeof colors] ?? 'bg-gray-500/20 text-gray-300 border border-gray-500/30'

  return (
    <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', color, className)}>
      {status}
    </span>
  )
}
