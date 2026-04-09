import { Quote } from 'lucide-react'
import type { Testimonial } from '../../types'

interface Props { testimonial: Testimonial; showToggle?: boolean; onToggle?: (id: number) => void }

export function TestimonialCard({ testimonial, showToggle, onToggle }: Props) {
  return (
    <div className="glass rounded-2xl p-6 flex flex-col gap-4 hover:border-accent/30 transition-all duration-300 hover:-translate-y-1 h-full">
      <Quote size={24} className="text-accent/40" />
      <p className="text-gray-300 text-sm leading-relaxed flex-1">"{testimonial.message}"</p>
      <div className="flex items-center justify-between pt-2 border-t border-navy/50">
        <div>
          <p className="text-white text-sm font-semibold">{testimonial.name}</p>
          <p className="text-gray-500 text-xs mt-0.5">{testimonial.department}</p>
        </div>
        {showToggle && (
          <button onClick={() => onToggle?.(testimonial.id)}
            className={`text-xs px-3 py-1 rounded-full border transition-all duration-200 font-medium ${
              testimonial.is_active
                ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                : 'bg-gray-500/10 text-gray-500 border-gray-500/20 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/20'
            }`}>
            {testimonial.is_active ? 'Active' : 'Hidden'}
          </button>
        )}
      </div>
    </div>
  )
}
