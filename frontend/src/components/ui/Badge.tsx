import { cn } from '../../lib/utils'

interface BadgeProps {
  status: string
  className?: string
  // When "staff", render Delivered as "Unreviewed" (admin/registrar/finance PoV).
  // When "user" (default), render Delivered as "Delivered".
  viewer?: 'user' | 'staff'
}

// Normalize legacy status values into the new canonical set.
// Old: Pending / Under Review / Resolved
// New: Delivered / Reviewed
function normalizeStatus(s: string): 'Delivered' | 'Reviewed' | string {
  const lower = s.toLowerCase().trim()
  if (lower === 'delivered' || lower === 'pending' || lower === 'under review') return 'Delivered'
  if (lower === 'reviewed' || lower === 'resolved') return 'Reviewed'
  return s
}

export function Badge({ status, className, viewer = 'user' }: BadgeProps) {
  const canonical = normalizeStatus(status)

  // Label swap for staff audience: Delivered ⇒ "Unreviewed".
  const label =
    viewer === 'staff' && canonical === 'Delivered' ? 'Unreviewed' :
    canonical

  const styles: Record<string, string> = {
    Delivered:  'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
    Unreviewed: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
    Reviewed:   'bg-green-500/10  text-green-300  border-green-500/20',
  }
  const dotColors: Record<string, string> = {
    Delivered:  'bg-yellow-400',
    Unreviewed: 'bg-yellow-400',
    Reviewed:   'bg-green-400',
  }
  const style = styles[label] ?? 'bg-gray-500/10 text-gray-400 border-gray-500/20'
  const dot   = dotColors[label] ?? 'bg-gray-400'

  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border', style, className)}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      {label}
    </span>
  )
}
