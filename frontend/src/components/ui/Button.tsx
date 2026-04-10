import type { ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-medium font-ui rounded-xl transition-all duration-200 ' +
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-ascb-navy-dark ' +
    'active:scale-95 disabled:pointer-events-none disabled:opacity-50'

  const variants = {
    primary:
      'bg-ascb-orange text-white hover:bg-ascb-orange-dark focus:ring-ascb-orange ' +
      'shadow-sm hover:shadow-ascb-orange/30 hover:shadow-lg',
    secondary:
      'bg-ascb-navy-mid text-white hover:bg-ascb-navy-mid/80 focus:ring-ascb-navy-mid ' +
      'border border-ascb-navy-mid',
    danger:
      'bg-red-600 text-white hover:bg-red-700 focus:ring-red-600 shadow-sm',
    ghost:
      'text-gray-400 hover:text-white hover:bg-ascb-navy-mid focus:ring-ascb-navy-mid',
    outline:
      'border border-ascb-orange text-ascb-orange hover:bg-ascb-orange hover:text-white ' +
      'focus:ring-ascb-orange',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
  }

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 size={size === 'lg' ? 18 : 14} className="animate-spin" />
      ) : null}
      {children}
    </button>
  )
}
