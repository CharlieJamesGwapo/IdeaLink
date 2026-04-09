import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAnnouncements } from '../../hooks/useAnnouncements'
import { AnnouncementCard } from '../../components/shared/AnnouncementCard'
import { TestimonialCard } from '../../components/shared/TestimonialCard'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/Button'
import { getTestimonials } from '../../api/testimonials'
import type { Testimonial } from '../../types'

const ANNOUNCEMENTS_PER_PAGE = 5

export function HomePage() {
  const { announcements, isLoading } = useAnnouncements()
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [page, setPage] = useState(1)

  useEffect(() => {
    getTestimonials().then((res) => setTestimonials(res.data)).catch(() => {})
  }, [])

  const totalPages = Math.ceil(announcements.length / ANNOUNCEMENTS_PER_PAGE)
  const paged = announcements.slice((page - 1) * ANNOUNCEMENTS_PER_PAGE, page * ANNOUNCEMENTS_PER_PAGE)

  return (
    <div className="text-white">
      <section className="bg-navy py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            Your Voice.<br />
            <span className="text-accent">Heard by Those Who Matter.</span>
          </h1>
          <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
            IdeaLink is ASCB's e-suggestion platform. Submit ideas and concerns directly to the Registrar or Accounting departments — anonymously or openly.
          </p>
          <div className="flex gap-3 justify-center">
            <Link to="/signup"><Button size="lg">Get Started</Button></Link>
            <Link to="/login"><Button size="lg" variant="secondary">Sign In</Button></Link>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-navy-dark">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">About IdeaLink</h2>
          <p className="text-gray-400 leading-relaxed max-w-2xl mx-auto">
            ASCB's IdeaLink platform empowers students and faculty to share feedback, suggestions, and concerns with school administration. Every submission is reviewed and acted upon.
          </p>
        </div>
      </section>

      <section className="py-16 px-4 bg-navy">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center">Announcements</h2>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : paged.length === 0 ? (
            <p className="text-center text-gray-500">No announcements yet.</p>
          ) : (
            <>
              <div className="space-y-3">
                {paged.map((a) => <AnnouncementCard key={a.id} announcement={a} />)}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-6">
                  <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="p-1 text-gray-400 hover:text-white disabled:opacity-30">
                    <ChevronLeft size={20} />
                  </button>
                  <span className="text-sm text-gray-400">{page} / {totalPages}</span>
                  <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="p-1 text-gray-400 hover:text-white disabled:opacity-30">
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {testimonials.length > 0 && (
        <section className="py-16 px-4 bg-navy-dark">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold mb-8 text-center">What People Say</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t) => <TestimonialCard key={t.id} testimonial={t} />)}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
