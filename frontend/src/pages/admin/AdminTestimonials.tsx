import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Quote } from 'lucide-react'
import { getTestimonials, toggleTestimonial } from '../../api/testimonials'
import { TestimonialCard } from '../../components/shared/TestimonialCard'
import { Skeleton } from '../../components/ui/Skeleton'
import type { Testimonial } from '../../types'

export function AdminTestimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getTestimonials().then((res) => setTestimonials(res.data)).finally(() => setIsLoading(false))
  }, [])

  const handleToggle = async (id: number) => {
    try {
      const res = await toggleTestimonial(id)
      setTestimonials((prev) => prev.map((t) => t.id === id ? res.data : t))
      toast.success('Testimonial updated')
    } catch { toast.error('Failed to update testimonial') }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-8 bg-ascb-orange rounded-full" />
          <h1 className="text-2xl font-bold text-white font-display">Testimonials</h1>
        </div>
        <p className="text-gray-500 text-sm mt-1 ml-3">Toggle visibility of featured suggestions</p>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}</div>
      ) : testimonials.length === 0 ? (
        <div className="text-center py-20 glass rounded-2xl">
          <Quote size={36} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No testimonials yet</p>
          <p className="text-gray-600 text-sm mt-1">Feature a suggestion to create a testimonial</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => <TestimonialCard key={t.id} testimonial={t} showToggle onToggle={handleToggle} />)}
        </div>
      )}
    </div>
  )
}
