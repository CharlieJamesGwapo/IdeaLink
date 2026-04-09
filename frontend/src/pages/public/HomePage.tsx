import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ArrowRight, Shield, MessageSquare, Megaphone, Star, CheckCircle2 } from 'lucide-react'
import { useAnnouncements } from '../../hooks/useAnnouncements'
import { AnnouncementCard } from '../../components/shared/AnnouncementCard'
import { TestimonialCard } from '../../components/shared/TestimonialCard'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/Button'
import { getTestimonials } from '../../api/testimonials'
import type { Testimonial } from '../../types'

const ANNOUNCEMENTS_PER_PAGE = 5

const features = [
  { icon: MessageSquare, title: 'Direct to Departments', desc: 'Submit directly to Registrar or Accounting Office.' },
  { icon: Shield, title: 'Anonymous Option', desc: 'Choose to submit anonymously — your identity stays private.' },
  { icon: CheckCircle2, title: 'Track Your Submissions', desc: 'See real-time status updates on every suggestion you submit.' },
  { icon: Star, title: 'Recognition', desc: 'Outstanding suggestions may be featured as testimonials.' },
]

function useScrollReveal<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setVisible(true) }, { threshold: 0.1 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return { ref, visible }
}

export function HomePage() {
  const { announcements, isLoading } = useAnnouncements()
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [page, setPage] = useState(1)
  const [testimonialIdx, setTestimonialIdx] = useState(0)
  const aboutReveal = useScrollReveal<HTMLElement>()
  const featuresReveal = useScrollReveal<HTMLDivElement>()
  const announcementsReveal = useScrollReveal<HTMLElement>()
  const testimonialsReveal = useScrollReveal<HTMLElement>()

  useEffect(() => {
    getTestimonials().then((res) => setTestimonials(res.data)).catch(() => {})
  }, [])

  // Auto-advance testimonials carousel
  useEffect(() => {
    if (testimonials.length <= 1) return
    const timer = setInterval(() => setTestimonialIdx((i) => (i + 1) % testimonials.length), 5000)
    return () => clearInterval(timer)
  }, [testimonials.length])

  const totalPages = Math.ceil(announcements.length / ANNOUNCEMENTS_PER_PAGE)
  const paged = announcements.slice((page - 1) * ANNOUNCEMENTS_PER_PAGE, page * ANNOUNCEMENTS_PER_PAGE)

  return (
    <div className="text-white">
      {/* Hero */}
      <section className="relative bg-navy overflow-hidden min-h-[88vh] flex items-center">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        {/* Glow blobs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          {/* School logo */}
          <div className="flex justify-center mb-8">
            <img
              src="/school_logo.png"
              alt="ASCB"
              className="h-24 w-24 object-contain animate-float drop-shadow-[0_5px_20px_rgba(59,130,246,0.4)]"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            ASCB E-Suggestion Platform
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
            Your Voice,{' '}
            <span className="gradient-text">Heard by Those</span>
            <br />Who Matter
          </h1>

          <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Submit suggestions and concerns directly to ASCB departments. Every idea is reviewed, every voice matters.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/signup">
              <Button size="lg" className="w-full sm:w-auto">
                Get Started <ArrowRight size={18} />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Sign In
              </Button>
            </Link>
          </div>

          {/* Stats row */}
          <div className="mt-16 grid grid-cols-3 gap-4 max-w-sm mx-auto">
            {[['Departments', '2'], ['Reviewed', '100%'], ['Anonymous', 'Option']].map(([label, val]) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-bold text-white">{val}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About / Features */}
      <section ref={aboutReveal.ref} className={`py-20 px-4 bg-navy-dark transition-all duration-700 ${aboutReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Why IdeaLink?</h2>
            <p className="text-gray-400 max-w-xl mx-auto">A direct channel between students, faculty, and administration — transparent, accountable, and secure.</p>
          </div>
          <div ref={featuresReveal.ref} className={`grid sm:grid-cols-2 lg:grid-cols-4 gap-5 transition-all duration-700 delay-200 ${featuresReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="glass rounded-2xl p-5 hover:border-accent/30 transition-all duration-300 hover:-translate-y-1 group">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                  <Icon size={20} className="text-accent" />
                </div>
                <h3 className="font-semibold text-white text-sm mb-1">{title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Announcements */}
      <section ref={announcementsReveal.ref} className={`py-20 px-4 bg-navy transition-all duration-700 ${announcementsReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold">Announcements</h2>
              <p className="text-gray-500 text-sm mt-1">Latest updates from administration</p>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                  className="w-8 h-8 rounded-lg border border-navy-light flex items-center justify-center text-gray-400 hover:text-white hover:border-accent/40 disabled:opacity-30 transition-all">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs text-gray-500">{page}/{totalPages}</span>
                <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}
                  className="w-8 h-8 rounded-lg border border-navy-light flex items-center justify-center text-gray-400 hover:text-white hover:border-accent/40 disabled:opacity-30 transition-all">
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
          ) : paged.length === 0 ? (
            <div className="text-center py-16 glass rounded-2xl">
              <Megaphone size={32} className="text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">No announcements yet. Check back soon.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paged.map((a, i) => (
                <div key={a.id} style={{ animationDelay: `${i * 80}ms` }} className="animate-fade-in">
                  <AnnouncementCard announcement={a} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section ref={testimonialsReveal.ref} className={`py-20 px-4 bg-navy-dark transition-all duration-700 ${testimonialsReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-2">What the Community Says</h2>
              <p className="text-gray-500 text-sm">Real feedback from ASCB students and faculty</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t, i) => (
                <div key={t.id} style={{ animationDelay: `${i * 100}ms` }} className="animate-fade-in">
                  <TestimonialCard testimonial={t} />
                </div>
              ))}
            </div>
            {/* Carousel dots */}
            {testimonials.length > 3 && (
              <div className="flex justify-center gap-1.5 mt-8">
                {testimonials.map((_, i) => (
                  <button key={i} onClick={() => setTestimonialIdx(i)}
                    className={`h-1.5 rounded-full transition-all ${i === testimonialIdx % testimonials.length ? 'bg-accent w-4' : 'bg-navy-light w-1.5'}`} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 px-4 bg-navy relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-accent/5 to-purple-500/5" />
        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to make your voice heard?</h2>
          <p className="text-gray-400 mb-8">Join the ASCB community and start submitting your ideas and concerns today.</p>
          <Link to="/signup">
            <Button size="lg" className="animate-glow">
              Create Your Account <ArrowRight size={18} />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
