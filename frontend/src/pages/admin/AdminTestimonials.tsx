import { useEffect, useState } from 'react'
import { toast } from 'sonner'
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
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Testimonials</h1>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : testimonials.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No testimonials yet. Feature a suggestion to create one.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => <TestimonialCard key={t.id} testimonial={t} showToggle onToggle={handleToggle} />)}
        </div>
      )}
    </div>
  )
}
