import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import axios from 'axios'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react'
import { login } from '../../api/auth'
import { useAuth } from '../../hooks/useAuth'

export function StudentLoginPage() {
  const { setAuth } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [focused, setFocused]   = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const res = await login(email, password)
      setAuth({ id: res.data.id }, 'user')
      toast.success('Welcome back!')
      navigate('/user/submit')
    } catch (err) {
      toast.error(axios.isAxiosError(err) ? (err.response?.data?.error ?? 'Invalid credentials') : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-ascb-navy-dark overflow-hidden">

      {/* ── LEFT PANEL — Immersive School Branding ───────────────────────────── */}
      <div className="hidden lg:flex lg:w-[44%] xl:w-[40%] relative flex-col shrink-0 overflow-hidden">
        {/* School photo */}
        <div className="absolute inset-0 hero-bg" />
        {/* Rich multi-layer overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#060e1e]/97 via-[#0d1f3c]/88 to-[#0a1628]/95" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060e1e] via-transparent to-transparent" />
        {/* Subtle orange vignette at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-ascb-orange/8 to-transparent" />
        {/* Right edge separator */}
        <div className="absolute right-0 inset-y-0 w-px bg-gradient-to-b from-transparent via-ascb-orange/25 to-transparent" />

        {/* Decorative corner dots */}
        <div className="absolute top-10 right-10 grid grid-cols-4 gap-2 opacity-15">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-ascb-gold" />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full px-10 xl:px-14 py-12">
          {/* Top: IdeaLink mark */}
          <div className="flex items-center gap-3">
            <img src="/school_logo.png" alt="ASCB"
              className="h-10 w-10 object-contain drop-shadow-lg"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            <div>
              <span className="text-white font-bold text-base font-ui">
                Idea<span className="text-ascb-orange">Link</span>
              </span>
              <p className="text-gray-600 text-[10px] font-ui uppercase tracking-widest leading-none mt-0.5">Student Portal</p>
            </div>
          </div>

          {/* Center: Main branding */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="mb-4">
              <span className="inline-flex items-center gap-1.5 text-ascb-gold text-[10px] font-bold uppercase tracking-[0.22em] font-ui">
                <Sparkles size={10} />
                Your Voice Matters
              </span>
            </div>
            <h1 className="font-display text-white leading-[1.05]">
              <span className="block text-5xl xl:text-6xl font-bold">Andres</span>
              <span className="block text-5xl xl:text-6xl font-bold">Soriano</span>
              <span className="block text-5xl xl:text-6xl font-bold text-ascb-orange">Colleges</span>
              <span className="block text-2xl xl:text-3xl font-normal text-gray-400 mt-1">of Bislig</span>
            </h1>

            <div className="flex items-center gap-3 mt-7 mb-6">
              <div className="h-px w-10 bg-ascb-gold" />
              <div className="h-px flex-1 bg-white/8" />
            </div>

            <p className="text-gray-300 text-sm font-body leading-relaxed max-w-[260px]">
              Submit feedback, track your submissions, and help improve ASCB services through IdeaLink.
            </p>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-0 mt-10 divide-x divide-white/8">
              {[
                { v: '500+', l: 'Students' },
                { v: '2',    l: 'Offices' },
                { v: '100%', l: 'Reviewed' },
              ].map(({ v, l }) => (
                <div key={l} className="px-4 first:pl-0 last:pr-0">
                  <p className="text-ascb-orange text-2xl font-bold font-display leading-none">{v}</p>
                  <p className="text-gray-600 text-xs font-ui mt-1">{l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom */}
          <p className="text-gray-700 text-[10px] font-ui uppercase tracking-widest">
            ASCB · Bislig's Pioneer in Private Education
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL — Login Form ─────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center relative p-6 lg:p-10">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(96,165,250,0.04) 0%, transparent 70%)' }} />
        </div>

        <div className="relative w-full max-w-[400px] animate-fade-in">

          {/* Mobile-only header */}
          <div className="lg:hidden text-center mb-10">
            <div className="inline-flex items-center justify-center mb-4">
              <img src="/school_logo.png" alt="ASCB" className="h-14 w-14 object-contain drop-shadow-xl"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
            <h1 className="text-2xl font-bold text-white font-display">
              Andres Soriano<br />Colleges of Bislig
            </h1>
          </div>

          {/* Page heading */}
          <div className="mb-8">
            <h2 className="text-[2rem] font-bold text-white font-display leading-tight">
              Welcome back
            </h2>
            <p className="text-gray-500 text-sm font-body mt-1.5">
              Sign in to your student account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] font-ui">
                Email Address
              </label>
              <div className="relative">
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200 ${focused === 'email' ? 'text-ascb-orange' : 'text-gray-600'}`}>
                  <Mail size={15} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  required
                  placeholder="student@ascb.edu.ph"
                  className="input-field pl-11 h-[50px] text-sm"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] font-ui">
                Password
              </label>
              <div className="relative">
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200 ${focused === 'password' ? 'text-ascb-orange' : 'text-gray-600'}`}>
                  <Lock size={15} />
                </div>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  required
                  placeholder="••••••••"
                  className="input-field pl-11 pr-12 h-[50px] text-sm"
                  autoComplete="current-password"
                />
                <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* CTA */}
            <button
              type="submit"
              disabled={isLoading}
              className="relative mt-2 w-full h-[50px] rounded-xl bg-ascb-orange text-white font-semibold font-ui text-sm transition-all duration-200 hover:bg-ascb-orange-dark hover:shadow-xl hover:shadow-ascb-orange/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 overflow-hidden group"
            >
              {/* Shimmer effect */}
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
              {isLoading
                ? <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                : <><span>Sign In</span><ArrowRight size={15} /></>
              }
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-5 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/6">
            <p className="text-[11px] text-gray-600 font-ui text-center">
              Demo — <span className="text-gray-500">student@ascb.edu.ph</span>
              <span className="mx-2 text-white/10">|</span>
              <span className="text-gray-500">Student@123</span>
            </p>
          </div>

          {/* Sign up */}
          <p className="mt-7 text-center text-sm text-gray-600 font-ui">
            No account?{' '}
            <Link to="/signup" className="text-ascb-orange hover:text-ascb-gold font-semibold transition-colors">
              Create one free
            </Link>
          </p>

          {/* Staff link */}
          <p className="mt-3 text-center text-xs text-gray-700 font-ui">
            Staff member?{' '}
            <Link to="/staff-login" className="text-gray-500 hover:text-gray-300 transition-colors underline underline-offset-2">
              Access Staff Portal
            </Link>
          </p>
        </div>
      </div>

    </div>
  )
}
