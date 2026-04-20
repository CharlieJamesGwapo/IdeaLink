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
    <div className="relative bg-ascb-navy-dark/70 backdrop-blur-md rounded-2xl border border-ascb-orange/25 hover:border-ascb-orange/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-ascb-orange/10 p-7 sm:p-8 h-full flex flex-col">
      {/* Decorative quote mark — anchored top-left */}
      <Quote
        size={32}
        className="text-ascb-orange/80 shrink-0"
        strokeWidth={2.2}
      />

      {/* Rating stars — shown when available, right under the quote mark */}
      {rating != null && (
        <div className="mt-3 inline-flex items-center gap-0.5" aria-label={`Rated ${rating} out of 5`}>
          {[1, 2, 3, 4, 5].map(n => (
            <Star
              key={n}
              size={16}
              className={n <= rating ? 'text-ascb-gold' : 'text-gray-700'}
              fill={n <= rating ? 'currentColor' : 'none'}
            />
          ))}
        </div>
      )}

      {/* Quote */}
      <p className="mt-5 text-center text-white/90 text-[15px] sm:text-base leading-relaxed font-body italic flex-1">
        &ldquo;{testimonial.message}&rdquo;
      </p>

      {/* Attribution */}
      <div className="mt-6 pt-4 border-t border-white/10 text-center">
        <p className="text-ascb-orange text-base font-bold font-display tracking-wide">
          {testimonial.name}
        </p>
        <p className="text-gray-400 text-[11px] mt-0.5 font-ui uppercase tracking-widest">
          {testimonial.department}
        </p>
      </div>

      {/* Admin-only toggle (only renders on the AdminTestimonials page) */}
      {showToggle && (
        <button
          onClick={() => onToggle?.(testimonial.id)}
          className={`absolute top-3 right-3 text-[10px] px-2.5 py-1 rounded-full border transition-all duration-200 font-semibold font-ui ${
            testimonial.is_active
              ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
              : 'bg-white/5 text-gray-500 border-white/10 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/20'
          }`}
        >
          {testimonial.is_active ? 'Active' : 'Hidden'}
        </button>
      )}
    </div>
  )
}
