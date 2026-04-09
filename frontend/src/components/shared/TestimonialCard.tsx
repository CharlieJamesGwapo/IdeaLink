import { Quote } from 'lucide-react'
import type { Testimonial } from '../../types'

interface Props {
  testimonial: Testimonial
  showToggle?: boolean
  onToggle?: (id: number) => void
}

export function TestimonialCard({ testimonial, showToggle, onToggle }: Props) {
  return (
    <div className="bg-navy-light rounded-xl p-6 border border-navy flex flex-col gap-4">
      <Quote size={20} className="text-accent opacity-60" />
      <p className="text-gray-300 text-sm leading-relaxed italic">"{testimonial.message}"</p>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white text-sm font-medium">{testimonial.name}</p>
          <p className="text-gray-500 text-xs">{testimonial.department}</p>
        </div>
        {showToggle && (
          <button
            onClick={() => onToggle?.(testimonial.id)}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${
              testimonial.is_active
                ? 'bg-green-500/20 text-green-300 hover:bg-red-500/20 hover:text-red-300'
                : 'bg-gray-500/20 text-gray-400 hover:bg-green-500/20 hover:text-green-300'
            }`}
          >
            {testimonial.is_active ? 'Active' : 'Hidden'}
          </button>
        )}
      </div>
    </div>
  )
}
