import { Quote, Star } from 'lucide-react'
import type { Testimonial } from '../../types'

interface Props {
  testimonial: Testimonial
  showToggle?: boolean
  onToggle?: (id: number) => void
}

export function TestimonialCard({ testimonial, showToggle, onToggle }: Props) {
  const rating = testimonial.rating ?? null
  return (
    <div className="group glass rounded-2xl p-6 flex flex-col gap-4 hover:border-ascb-orange/30 transition-all duration-300 hover:-translate-y-1 h-full border border-transparent">
      {/* Decorative quote mark + rating */}
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-xl bg-ascb-orange/10 flex items-center justify-center">
          <Quote size={20} className="text-ascb-orange" />
        </div>
        {rating != null && (
          <div className="inline-flex items-center gap-0.5" aria-label={`Rated ${rating} out of 5`}>
            {[1, 2, 3, 4, 5].map(n => (
              <Star
                key={n}
                size={14}
                className={n <= rating ? 'text-ascb-gold' : 'text-gray-700'}
                fill={n <= rating ? 'currentColor' : 'none'}
              />
            ))}
          </div>
        )}
      </div>

      <p className="text-gray-300 text-sm leading-relaxed flex-1 font-body italic">
        "{testimonial.message}"
      </p>

      <div className="flex items-center justify-between pt-3 border-t border-white/10">
        <div>
          <p className="text-white text-sm font-semibold font-ui">{testimonial.name}</p>
          <p className="text-ascb-gold text-xs mt-0.5 font-ui">{testimonial.department}</p>
        </div>
        {showToggle && (
          <button
            onClick={() => onToggle?.(testimonial.id)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-200 font-medium font-ui ${
              testimonial.is_active
                ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                : 'bg-white/5 text-gray-500 border-white/10 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/20'
            }`}
          >
            {testimonial.is_active ? 'Active' : 'Hidden'}
          </button>
        )}
      </div>
    </div>
  )
}
