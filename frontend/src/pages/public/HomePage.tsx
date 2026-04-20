import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ArrowRight, Shield, MessageSquare, CheckCircle2, Star, BookOpen, Target, Heart, Zap, Sparkles, ArrowUp } from 'lucide-react'
import { useAnnouncements } from '../../hooks/useAnnouncements'
import { AnnouncementCard } from '../../components/shared/AnnouncementCard'
import { TestimonialCard } from '../../components/shared/TestimonialCard'
import { Skeleton } from '../../components/ui/Skeleton'
import { getTestimonials } from '../../api/testimonials'
import { getOfficeHours } from '../../api/officeHours'
import type { Testimonial, OfficeHoursStatus } from '../../types'

function formatHour(h: number): string {
  if (h === 24) return '12:00 AM'
  const suffix = h >= 12 ? 'PM' : 'AM'
  const display = h % 12 === 0 ? 12 : h % 12
  return `${display}:00 ${suffix}`
}

const ANNOUNCEMENTS_PER_PAGE = 5

function useScrollReveal<T extends HTMLElement = HTMLElement>() {
  // Default to visible if IntersectionObserver is unavailable (old WebViews, Facebook Lite)
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined')
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Use a ref *callback* so the observer attaches the moment the element
  // mounts. Sections that render conditionally (e.g. testimonials after an
  // async fetch) were stuck at opacity-0 because the previous useEffect
  // only ran on mount — before the element existed.
  const ref = useCallback((node: T | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }
    if (!node || typeof IntersectionObserver === 'undefined') {
      if (typeof IntersectionObserver === 'undefined') setVisible(true)
      return
    }
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.08 },
    )
    obs.observe(node)
    observerRef.current = obs
  }, [])

  useEffect(() => () => { observerRef.current?.disconnect() }, [])

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
  { icon: MessageSquare, title: 'Direct to Departments', desc: 'Submit feedback directly to the Registrar Office or Finance Office with service-specific categories.' },
  { icon: Shield,        title: 'Anonymous Option',      desc: 'Choose to submit anonymously — your identity stays completely private.' },
  { icon: CheckCircle2,  title: 'Track Your Feedback',   desc: 'Monitor real-time status updates: Delivered or Reviewed by staff.' },
  { icon: Star,          title: 'Recognition',           desc: 'Outstanding feedback may be featured as institutional testimonials.' },
]

export function HomePage() {
  const { announcements, isLoading } = useAnnouncements()
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [page, setPage] = useState(1)
  const [testimonialIdx, setTestimonialIdx] = useState(0)
  const [officeStatuses, setOfficeStatuses] = useState<OfficeHoursStatus[]>([])

  const systemRef = useScrollReveal<HTMLElement>()
  const aboutRef = useScrollReveal<HTMLElement>()
  const valuesRef = useScrollReveal<HTMLElement>()
  const goalsRef = useScrollReveal<HTMLElement>()
  const featuresRef = useScrollReveal<HTMLElement>()
  const announcementsRef = useScrollReveal<HTMLElement>()
  const testimonialsRef = useScrollReveal<HTMLElement>()

  // Show the in-page nav + back-to-top once the user has scrolled past the hero.
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    getTestimonials()
      .then(res => { if (mountedRef.current) setTestimonials(Array.isArray(res.data) ? res.data : []) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    Promise.all([getOfficeHours('Registrar Office'), getOfficeHours('Finance Office')])
      .then(([r, f]) => { if (mountedRef.current) setOfficeStatuses([r.data, f.data]) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (testimonials.length <= 1) return
    const t = setInterval(() => setTestimonialIdx(i => (i + 1) % testimonials.length), 5000)
    return () => clearInterval(t)
  }, [testimonials.length])

  // Re-scroll to URL hash after async sections mount. The browser's initial
  // hash scroll fires before testimonials/office-hours fetch resolves, so
  // links like /#testimonials otherwise land on empty space.
  useEffect(() => {
    const hash = window.location.hash
    if (!hash) return
    const el = document.getElementById(hash.slice(1))
    if (el) el.scrollIntoView({ block: 'start' })
  }, [testimonials.length, officeStatuses.length])

  const totalPages = Math.ceil(announcements.length / ANNOUNCEMENTS_PER_PAGE)
  const paged = announcements.slice((page - 1) * ANNOUNCEMENTS_PER_PAGE, page * ANNOUNCEMENTS_PER_PAGE)

  return (
    <div className="text-white">
      {/* ─── HERO ─── */}
      <section className="relative hero-bg min-h-[100svh] min-h-screen flex items-center overflow-hidden">
        {/* Layered dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-ascb-navy-dark/80 via-ascb-navy-dark/65 to-ascb-navy-dark/92" />

        {/* Decorative side accents */}
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-ascb-orange via-ascb-gold to-ascb-orange opacity-90" />
        <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-ascb-orange/30 to-transparent" />

        {/* Radial ambient glow behind content (hidden on mobile for performance) */}
        <div className="absolute inset-0 hidden sm:flex items-center justify-center pointer-events-none">
          <div className="w-[700px] h-[500px] rounded-full blur-[100px]" style={{ background: 'radial-gradient(ellipse, rgba(244,124,32,0.10) 0%, rgba(27,58,110,0.15) 60%, transparent 100%)' }} />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20 pb-24 sm:pb-32 text-center">

          {/* ── Logo ── */}
          <div className="flex justify-center mb-6 animate-fade-in">
            <img
              src="/school_logo.png"
              alt="ASCB Logo"
              className="object-contain drop-shadow-2xl mx-auto w-28 h-28 sm:w-44 sm:h-44 md:w-52 md:h-52"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-ascb-orange/20 border border-ascb-orange/35 text-ascb-gold text-xs font-semibold uppercase tracking-widest mb-6 font-ui animate-fade-in stagger-1">
            ASCB · Bislig's Pioneer in Private Education
          </div>

          {/* School name */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold font-display leading-tight mb-4 animate-fade-in stagger-2">
            Andres Soriano<br />
            <span className="text-ascb-orange">Colleges</span> of Bislig
          </h1>

          <p className="text-lg text-ascb-gold font-semibold tracking-wide font-display italic mb-2 animate-fade-in stagger-3">
            "ASCB, Ascending!"
          </p>
          <p className="text-xs text-gray-300 uppercase tracking-[0.25em] font-ui mb-8 animate-fade-in stagger-3">
            Accountability · Stewardship · Compassion · Brilliance
          </p>

          <div className="section-divider w-40 mx-auto mb-8" />

          {/* IdeaLink tagline */}
          <h2 className="text-xl sm:text-2xl font-bold text-white font-ui mb-3 animate-fade-in stagger-4">
            IdeaLink — Feedback Management System
          </h2>
          <p className="text-gray-300 max-w-lg mx-auto text-sm leading-relaxed font-body animate-fade-in stagger-4">
            Your voice matters. Share feedback with the Registrar Office and Finance Office —
            categorized, tracked, and acted upon.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8 animate-fade-in stagger-5">
            <Link to="/login" className="btn-primary text-base px-8 py-3.5">
              Submit Feedback <ArrowRight size={18} />
            </Link>
            <Link to="/staff-login"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 border border-white/20 text-white hover:bg-white/10 hover:border-white/35 rounded-xl transition-all duration-200 text-base font-ui font-medium">
              Staff Portal
            </Link>
          </div>

          {/* Live office-status pills — derived from each office's schedule + any temporary closure. */}
          {officeStatuses.length === 2 && (
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto text-left animate-fade-in stagger-5">
              {officeStatuses.map(s => (
                <div
                  key={s.department}
                  className={`group rounded-2xl p-4 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 ${
                    s.is_open
                      ? 'bg-green-500/10 border border-green-400/30 hover:border-green-300/50 hover:shadow-lg hover:shadow-green-500/10'
                      : 'bg-red-500/10 border border-red-400/30 hover:border-red-300/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`relative flex w-2.5 h-2.5`}>
                      {s.is_open && (
                        <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
                      )}
                      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${s.is_open ? 'bg-green-400' : 'bg-red-400'}`} />
                    </span>
                    <span className={`text-[10px] font-bold font-ui uppercase tracking-widest ${s.is_open ? 'text-green-300' : 'text-red-300'}`}>
                      {s.is_open ? 'Open now' : 'Closed'}
                    </span>
                  </div>
                  <p className="text-white text-sm font-semibold font-ui mt-2">{s.department}</p>
                  <p className="text-[11px] text-gray-300/80 font-ui mt-0.5">
                    Mon–Fri · {formatHour(s.open_hour)} – {formatHour(s.close_hour)}
                  </p>
                  {!s.is_open && s.closure_reason && (
                    <p className="text-[11px] text-red-200 font-body mt-1 line-clamp-2">{s.closure_reason}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50">
          <span className="text-[10px] text-gray-400 font-ui uppercase tracking-widest">Scroll</span>
          <div className="w-5 h-8 border border-gray-500/60 rounded-full flex items-start justify-center pt-1.5">
            <div className="w-1 h-2 bg-ascb-orange rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      {/* ─── ABOUT IDEALINK (the system) ─── */}
      <section
        id="about"
        ref={systemRef.ref}
        className={`scroll-mt-28 py-20 bg-ascb-navy transition-all duration-700 ${systemRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      >
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ascb-orange/15 border border-ascb-orange/30 text-ascb-orange text-[11px] font-semibold uppercase tracking-widest font-ui mb-4">
            <Sparkles size={12} /> About the System
          </div>
          <h2 className="text-3xl font-bold font-display mb-4">What is IdeaLink?</h2>
          <div className="section-divider w-20 mx-auto mb-6" />
          <p className="text-gray-300 text-base leading-relaxed font-body mb-4">
            IdeaLink is the official feedback management system of Andres Soriano Colleges of Bislig.
            It gives students a direct, trackable channel to the <strong className="text-white">Registrar Office</strong> and
            the <strong className="text-white">Finance Office</strong> — with service-specific categories, optional anonymity,
            and real-time status updates from the staff who handle each concern.
          </p>
          <p className="text-gray-400 text-sm leading-relaxed font-body">
            Every piece of feedback is rated, routed, and reviewed. Staff mark items as Reviewed once acted on,
            and outstanding feedback can be featured as institutional testimonials.
          </p>
        </div>
      </section>

      {/* ─── OUR FOUNDATION / PHILOSOPHY / VISION / MISSION ─── */}
      <section
        id="foundation"
        ref={aboutRef.ref}
        className={`scroll-mt-28 py-20 bg-ascb-navy-dark transition-all duration-700 ${aboutRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      >
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
      <section id="values" ref={valuesRef.ref} className={`scroll-mt-28 py-20 bg-ascb-navy transition-all duration-700 ${valuesRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
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

      {/* ─── INSTITUTIONAL GOALS ─── */}
      <section id="goals" ref={goalsRef.ref} className={`scroll-mt-28 py-20 bg-ascb-navy-dark transition-all duration-700 ${goalsRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-xs text-ascb-orange uppercase tracking-widest font-ui font-semibold">What We Aim For</span>
            <h2 className="text-3xl font-bold font-display mt-2">Institutional Goals</h2>
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
      <section id="how-it-works" ref={featuresRef.ref} className={`scroll-mt-28 py-20 bg-ascb-navy transition-all duration-700 ${featuresRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
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
      <section id="announcements" ref={announcementsRef.ref} className={`scroll-mt-28 py-20 bg-ascb-navy-dark transition-all duration-700 ${announcementsRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
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
        <section id="testimonials" ref={testimonialsRef.ref} className={`scroll-mt-28 py-20 bg-gradient-to-b from-ascb-navy to-ascb-navy-dark transition-all duration-700 ${testimonialsRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-10 sm:mb-14">
              <span className="text-xs text-ascb-orange uppercase tracking-widest font-ui font-semibold">Student Voices</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-display mt-2 tracking-tight">
                Highlight <span className="text-ascb-orange">Testimonies</span>
              </h2>
              <div className="section-divider w-24 mx-auto mt-4" />
            </div>

            {/* Carousel: 1 card on mobile, 2 on tablet, 3 on desktop.
                testimonialIdx is the left-most visible card; arrows cycle it. */}
            <div className="relative">
              {/* Arrows sit outside the card grid on desktop, overlay on mobile */}
              {testimonials.length > 1 && (
                <>
                  <button
                    onClick={() => setTestimonialIdx(i => (i - 1 + testimonials.length) % testimonials.length)}
                    aria-label="Previous testimonial"
                    className="absolute left-0 lg:-left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-ascb-orange hover:bg-ascb-orange-dark text-white shadow-xl shadow-ascb-orange/30 flex items-center justify-center transition-all hover:scale-110"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => setTestimonialIdx(i => (i + 1) % testimonials.length)}
                    aria-label="Next testimonial"
                    className="absolute right-0 lg:-right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-ascb-orange hover:bg-ascb-orange-dark text-white shadow-xl shadow-ascb-orange/30 flex items-center justify-center transition-all hover:scale-110"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}

              <div className="mx-12 sm:mx-14 lg:mx-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                  {[0, 1, 2].map(offset => {
                    if (offset > 0 && offset >= testimonials.length) return null
                    const t = testimonials[(testimonialIdx + offset) % testimonials.length]
                    return (
                      <div key={`${t.id}-${offset}`} className={offset === 0 ? '' : offset === 1 ? 'hidden md:block' : 'hidden lg:block'}>
                        <TestimonialCard testimonial={t} />
                      </div>
                    )
                  })}
                </div>
              </div>

              {testimonials.length > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  {testimonials.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setTestimonialIdx(i)}
                      aria-label={`Go to testimonial ${i + 1}`}
                      className={`h-2 rounded-full transition-all ${i === testimonialIdx ? 'bg-ascb-orange w-8' : 'bg-white/20 hover:bg-white/40 w-2'}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ─── BACK TO TOP ─── */}
      <button
        onClick={scrollToTop}
        aria-label="Back to top"
        className={`fixed bottom-5 right-5 md:bottom-6 md:right-6 z-40 w-11 h-11 rounded-full bg-ascb-orange hover:bg-ascb-orange-dark text-white shadow-lg shadow-ascb-orange/40 flex items-center justify-center transition-all duration-300 ${
          scrolled ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <ArrowUp size={18} />
      </button>

      {/* ─── FOOTER ─── */}
      <footer className="bg-ascb-navy-dark border-t border-white/10 py-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-4 mb-3">
                <img src="/school_logo.png" alt="ASCB" className="h-20 w-20 object-contain drop-shadow-lg"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                <div>
                  <div className="text-ascb-gold text-[10px] uppercase tracking-widest font-ui">ASCB</div>
                  <div className="text-white font-bold text-base font-ui">Andres Soriano Colleges of Bislig</div>
                </div>
              </div>
              <p className="text-gray-500 text-sm font-body leading-relaxed">
                Bislig's Pioneer in Private Education · ASCB, Ascending!
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm font-ui mb-3">Quick Links</h4>
              <div className="space-y-1.5">
                <Link to="/login" className="block text-gray-400 hover:text-ascb-orange text-xs font-ui transition-colors">Submit Feedback</Link>
                <Link to="/staff-login" className="block text-gray-400 hover:text-ascb-orange text-xs font-ui transition-colors">Registrar Office Portal</Link>
                <Link to="/staff-login" className="block text-gray-400 hover:text-ascb-orange text-xs font-ui transition-colors">Finance Office Portal</Link>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold text-base font-ui mb-3">Contact</h4>
              <div className="space-y-1.5 text-gray-300 text-sm font-body">
                <p>Bislig City, Surigao del Sur</p>
                <p>Philippines</p>
                <p className="text-ascb-orange font-medium">info@ascb.edu.ph</p>
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
