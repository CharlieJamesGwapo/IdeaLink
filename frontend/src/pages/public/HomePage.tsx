import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ArrowRight, Shield, MessageSquare, CheckCircle2, Star, BookOpen, Target, Heart, Zap } from 'lucide-react'
import { useAnnouncements } from '../../hooks/useAnnouncements'
import { AnnouncementCard } from '../../components/shared/AnnouncementCard'
import { TestimonialCard } from '../../components/shared/TestimonialCard'
import { Skeleton } from '../../components/ui/Skeleton'
import { getTestimonials } from '../../api/testimonials'
import type { Testimonial } from '../../types'

const ANNOUNCEMENTS_PER_PAGE = 5

function useScrollReveal<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.08 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return { ref, visible }
}

const coreValues = [
  { letter: 'A', word: 'Accountability', desc: 'Acting with integrity and responsibility in all roles and decisions.', color: 'text-ascb-orange', bg: 'bg-ascb-orange/10 border-ascb-orange/20' },
  { letter: 'S', word: 'Stewardship',    desc: 'Caring for people, resources, and the environment with purpose.',    color: 'text-ascb-gold',   bg: 'bg-ascb-gold/10 border-ascb-gold/20' },
  { letter: 'C', word: 'Compassion',     desc: 'Demonstrating empathy, inclusivity, and genuine concern for others.', color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
  { letter: 'B', word: 'Brilliance',     desc: 'Pursuing excellence, innovation, and meaningful impact.',             color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20' },
]

const goals = [
  { icon: BookOpen,     text: 'Deliver quality basic, technical, and higher education programs aligned with national standards.' },
  { icon: Target,       text: 'Produce graduates equipped with knowledge, values, and skills for employment and civic engagement.' },
  { icon: Zap,          text: 'Promote research, innovation, and extension services that address local challenges.' },
  { icon: Star,         text: 'Sustain a culture of excellence, integrity, and accountability in governance.' },
  { icon: Heart,        text: 'Strengthen partnerships and linkages at local, national, and international levels.' },
]

const features = [
  { icon: MessageSquare, title: 'Direct to Departments', desc: 'Submit feedback directly to the Registrar or Accounting Office with service-specific categories.' },
  { icon: Shield,        title: 'Anonymous Option',      desc: 'Choose to submit anonymously — your identity stays completely private.' },
  { icon: CheckCircle2,  title: 'Track Your Feedback',   desc: 'Monitor real-time status updates: Pending, Under Review, or Resolved.' },
  { icon: Star,          title: 'Recognition',           desc: 'Outstanding feedback may be featured as institutional testimonials.' },
]

export function HomePage() {
  const { announcements, isLoading } = useAnnouncements()
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [page, setPage] = useState(1)
  const [testimonialIdx, setTestimonialIdx] = useState(0)

  const aboutRef = useScrollReveal<HTMLElement>()
  const valuesRef = useScrollReveal<HTMLElement>()
  const goalsRef = useScrollReveal<HTMLElement>()
  const featuresRef = useScrollReveal<HTMLElement>()
  const announcementsRef = useScrollReveal<HTMLElement>()
  const testimonialsRef = useScrollReveal<HTMLElement>()

  useEffect(() => {
    getTestimonials().then(res => setTestimonials(res.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (testimonials.length <= 1) return
    const t = setInterval(() => setTestimonialIdx(i => (i + 1) % testimonials.length), 5000)
    return () => clearInterval(t)
  }, [testimonials.length])

  const totalPages = Math.ceil(announcements.length / ANNOUNCEMENTS_PER_PAGE)
  const paged = announcements.slice((page - 1) * ANNOUNCEMENTS_PER_PAGE, page * ANNOUNCEMENTS_PER_PAGE)

  return (
    <div className="text-white">
      {/* ─── HERO ─── */}
      <section className="relative hero-bg min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-ascb-navy-dark/85 via-ascb-navy-dark/70 to-ascb-navy-dark/90" />
        {/* Decorative orange stripe */}
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-ascb-orange via-ascb-gold to-ascb-orange opacity-80" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 py-24 text-center">
          <img src="/school_logo.png" alt="ASCB Logo"
            className="h-28 w-28 object-contain mx-auto mb-6 drop-shadow-2xl animate-float"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ascb-orange/20 border border-ascb-orange/30 text-ascb-gold text-xs font-semibold uppercase tracking-widest mb-6 font-ui animate-fade-in">
            ASCB · Bislig's Pioneer in Private Education
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold font-display leading-tight mb-4 animate-fade-in stagger-1">
            Andres Soriano<br />
            <span className="text-ascb-orange">Colleges</span> of Bislig
          </h1>

          <p className="text-lg text-ascb-gold font-semibold tracking-wide font-display italic mb-2 animate-fade-in stagger-2">
            "ASCB, Ascending!"
          </p>
          <p className="text-sm text-gray-300 uppercase tracking-widest font-ui mb-6 animate-fade-in stagger-2">
            Accountability · Stewardship · Compassion · Brilliance
          </p>

          <div className="section-divider w-32 mx-auto mb-8" />

          <h2 className="text-xl sm:text-2xl font-semibold text-white font-ui mb-3 animate-fade-in stagger-3">
            IdeaLink: Web-based Feedback Management System
          </h2>
          <p className="text-gray-300 max-w-xl mx-auto text-sm leading-relaxed font-body animate-fade-in stagger-3">
            Your voice matters. Share feedback with the Registrar and Accounting Office —
            categorized, tracked, and acted upon.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8 animate-fade-in stagger-4">
            <Link to="/login" className="btn-primary text-base px-8 py-3">
              Submit Feedback <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="inline-flex items-center gap-2 px-8 py-3 border border-white/20 text-white hover:bg-white/10 rounded-xl transition-all duration-200 text-base font-ui">
              Staff Portal
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-60">
          <span className="text-xs text-gray-400 font-ui uppercase tracking-widest">Scroll</span>
          <div className="w-5 h-8 border border-gray-500 rounded-full flex items-start justify-center pt-1.5">
            <div className="w-1 h-2 bg-ascb-orange rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      {/* ─── ABOUT / PHILOSOPHY / VISION / MISSION ─── */}
      <section ref={aboutRef.ref} className={`py-20 bg-ascb-navy-dark transition-all duration-700 ${aboutRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-xs text-ascb-orange uppercase tracking-widest font-ui font-semibold">About ASCB</span>
            <h2 className="text-3xl font-bold font-display mt-2">Our Foundation</h2>
            <div className="section-divider w-20 mx-auto mt-4" />
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="glass rounded-2xl p-6 border border-ascb-orange/20">
              <h3 className="text-ascb-orange font-bold text-lg font-display mb-3">Philosophy</h3>
              <p className="text-gray-300 text-sm leading-relaxed font-body">
                Andres Soriano Colleges of Bislig believes that education is a powerful catalyst for
                <strong className="text-white"> human dignity, social equity, and national progress</strong>.
                As a private, non-stock, non-profit institution, we uphold academic freedom, inclusive growth, and lifelong learning.
              </p>
            </div>
            <div className="glass rounded-2xl p-6 border border-ascb-gold/20">
              <h3 className="text-ascb-gold font-bold text-lg font-display mb-3">Vision</h3>
              <p className="text-gray-300 text-sm leading-relaxed font-body">
                ASCB envisions itself as a <strong className="text-white">leading private educational institution</strong> in the region,
                fostering an empowering and transformative education that develops
                globally competent, values-driven, and socially engaged individuals.
              </p>
            </div>
            <div className="glass rounded-2xl p-6 border border-blue-500/20">
              <h3 className="text-blue-400 font-bold text-lg font-display mb-3">Mission</h3>
              <p className="text-gray-300 text-sm leading-relaxed font-body">
                Guided by excellence, inclusivity, and service, ASCB provides holistic, accessible, and
                quality education programs that cultivate lifelong learning, critical thinking, and innovation
                to advance sustainable development.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CORE VALUES ─── */}
      <section ref={valuesRef.ref} className={`py-20 bg-ascb-navy transition-all duration-700 ${valuesRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-xs text-ascb-orange uppercase tracking-widest font-ui font-semibold">What We Stand For</span>
            <h2 className="text-3xl font-bold font-display mt-2">Core Values</h2>
            <div className="section-divider w-20 mx-auto mt-4" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {coreValues.map(v => (
              <div key={v.letter} className={`rounded-2xl p-6 border ${v.bg} text-center`}>
                <div className={`text-5xl font-black font-display mb-2 ${v.color}`}>{v.letter}</div>
                <div className={`text-lg font-bold font-display mb-2 ${v.color}`}>{v.word}</div>
                <p className="text-gray-400 text-xs leading-relaxed font-body">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── GOALS ─── */}
      <section ref={goalsRef.ref} className={`py-20 bg-ascb-navy-dark transition-all duration-700 ${goalsRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-xs text-ascb-orange uppercase tracking-widest font-ui font-semibold">Institutional Goals</span>
            <h2 className="text-3xl font-bold font-display mt-2">Our Goals</h2>
            <div className="section-divider w-20 mx-auto mt-4" />
          </div>
          <div className="space-y-3">
            {goals.map((g, i) => (
              <div key={i} className="flex items-start gap-4 glass rounded-xl p-4">
                <div className="shrink-0 w-8 h-8 rounded-lg bg-ascb-orange/20 flex items-center justify-center">
                  <g.icon size={16} className="text-ascb-orange" />
                </div>
                <p className="text-gray-300 text-sm leading-relaxed font-body pt-1">{g.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IDEALINK WORKS ─── */}
      <section ref={featuresRef.ref} className={`py-20 bg-ascb-navy transition-all duration-700 ${featuresRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-xs text-ascb-orange uppercase tracking-widest font-ui font-semibold">IdeaLink System</span>
            <h2 className="text-3xl font-bold font-display mt-2">How It Works</h2>
            <div className="section-divider w-20 mx-auto mt-4" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <div key={i} className="stat-card text-center">
                <div className="w-12 h-12 rounded-xl bg-ascb-orange/15 flex items-center justify-center mx-auto mb-4">
                  <f.icon size={22} className="text-ascb-orange" />
                </div>
                <h3 className="text-white font-semibold font-ui mb-2">{f.title}</h3>
                <p className="text-gray-400 text-xs leading-relaxed font-body">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/login" className="btn-primary text-base px-8 py-3">
              Get Started <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── ANNOUNCEMENTS ─── */}
      <section ref={announcementsRef.ref} className={`py-20 bg-ascb-navy-dark transition-all duration-700 ${announcementsRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-xs text-ascb-orange uppercase tracking-widest font-ui font-semibold">Latest Updates</span>
            <h2 className="text-3xl font-bold font-display mt-2">Announcements</h2>
            <div className="section-divider w-20 mx-auto mt-4" />
          </div>
          {isLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : announcements.length === 0 ? (
            <p className="text-center text-gray-500 py-10 font-ui">No announcements yet.</p>
          ) : (
            <>
              <div className="space-y-3">
                {paged.map(a => <AnnouncementCard key={a.id} announcement={a} />)}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-6">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-ascb-orange/50 disabled:opacity-30 transition-colors">
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm text-gray-400 font-ui">{page} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-ascb-orange/50 disabled:opacity-30 transition-colors">
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      {testimonials.length > 0 && (
        <section ref={testimonialsRef.ref} className={`py-20 bg-ascb-navy transition-all duration-700 ${testimonialsRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="max-w-2xl mx-auto px-6">
            <div className="text-center mb-10">
              <span className="text-xs text-ascb-orange uppercase tracking-widest font-ui font-semibold">Student Voices</span>
              <h2 className="text-3xl font-bold font-display mt-2">Testimonials</h2>
              <div className="section-divider w-20 mx-auto mt-4" />
            </div>
            <div className="relative">
              <TestimonialCard testimonial={testimonials[testimonialIdx]} />
              {testimonials.length > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  {testimonials.map((_, i) => (
                    <button key={i} onClick={() => setTestimonialIdx(i)}
                      className={`w-2 h-2 rounded-full transition-all ${i === testimonialIdx ? 'bg-ascb-orange w-6' : 'bg-gray-600 hover:bg-gray-400'}`} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ─── FOOTER ─── */}
      <footer className="bg-ascb-navy-dark border-t border-white/10 py-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid sm:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <img src="/school_logo.png" alt="ASCB" className="h-10 w-10 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                <div>
                  <div className="text-ascb-gold text-[10px] uppercase tracking-widest font-ui">ASCB</div>
                  <div className="text-white font-bold text-sm font-ui">Andres Soriano Colleges of Bislig</div>
                </div>
              </div>
              <p className="text-gray-500 text-xs font-body leading-relaxed">
                Bislig's Pioneer in Private Education · ASCB, Ascending!
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm font-ui mb-3">Quick Links</h4>
              <div className="space-y-1.5">
                <Link to="/login" className="block text-gray-400 hover:text-ascb-orange text-xs font-ui transition-colors">Submit Feedback</Link>
                <Link to="/login" className="block text-gray-400 hover:text-ascb-orange text-xs font-ui transition-colors">Registrar Portal</Link>
                <Link to="/login" className="block text-gray-400 hover:text-ascb-orange text-xs font-ui transition-colors">Accounting Portal</Link>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm font-ui mb-3">Contact</h4>
              <div className="space-y-1 text-gray-400 text-xs font-body">
                <p>Bislig City, Surigao del Sur</p>
                <p>Philippines</p>
                <p className="text-ascb-orange">info@ascb.edu.ph</p>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-gray-600 text-xs font-ui">
              © {new Date().getFullYear()} Andres Soriano Colleges of Bislig. All rights reserved.
            </p>
            <p className="text-gray-600 text-xs font-ui">
              Powered by <span className="text-ascb-orange font-semibold">IdeaLink</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
