import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import axios from 'axios'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles, Home, ChevronRight } from 'lucide-react'
import { login } from '../../api/auth'
import { useAuth } from '../../hooks/useAuth'

export function StudentLoginPage() {
  const { setAuth } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [focused, setFocused]     = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { toast.error('Please enter your email address'); return }
    if (!password.trim()) { toast.error('Please enter your password'); return }
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

      {/* ── LEFT PANEL ─────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[44%] xl:w-[40%] relative flex-col shrink-0 overflow-hidden">
        <div className="absolute inset-0 hero-bg" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#060e1e]/97 via-[#0d1f3c]/88 to-[#0a1628]/95" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060e1e] via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-ascb-orange/8 to-transparent" />
        <div className="absolute right-0 inset-y-0 w-px bg-gradient-to-b from-transparent via-ascb-orange/25 to-transparent" />
        <div className="absolute top-10 right-10 grid grid-cols-4 gap-2 opacity-15">
          {Array.from({ length: 16 }).map((_, i) => <div key={i} className="w-1 h-1 rounded-full bg-ascb-gold" />)}
        </div>

        <div className="relative z-10 flex flex-col h-full px-10 xl:px-14 py-12">
          <div className="flex items-center gap-3">
            <img src="/school_logo.png" alt="ASCB" className="h-10 w-10 object-contain drop-shadow-lg"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            <div>
              <span className="text-white font-bold text-base font-ui">Idea<span className="text-ascb-orange">Link</span></span>
              <p className="text-gray-600 text-[10px] font-ui uppercase tracking-widest leading-none mt-0.5">Student Portal</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <div className="mb-4">
              <span className="inline-flex items-center gap-1.5 text-ascb-gold text-[10px] font-bold uppercase tracking-[0.22em] font-ui">
                <Sparkles size={10} /> Your Voice Matters
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
            <div className="grid grid-cols-3 gap-0 mt-10 divide-x divide-white/8">
              {[{ v: '500+', l: 'Students' }, { v: '2', l: 'Offices' }, { v: '100%', l: 'Reviewed' }].map(({ v, l }) => (
                <div key={l} className="px-4 first:pl-0 last:pr-0">
                  <p className="text-ascb-orange text-2xl font-bold font-display leading-none">{v}</p>
                  <p className="text-gray-600 text-xs font-ui mt-1">{l}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-gray-700 text-[10px] font-ui uppercase tracking-widest">ASCB · Bislig's Pioneer in Private Education</p>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center relative px-5 py-10 sm:px-8 lg:p-10">

        {/* Home button */}
        <Link to="/" className="absolute top-4 right-4 sm:top-5 sm:right-5 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/8 text-gray-400 hover:text-white hover:bg-white/[0.09] hover:border-white/14 transition-all duration-200 text-xs font-ui z-10">
          <Home size={12} /> Home
        </Link>

        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(244,124,32,0.05) 0%, transparent 65%)' }} />
        </div>

        <div className="relative w-full max-w-sm animate-fade-in">

          {/* Mobile header */}
          <div className="lg:hidden text-center mb-8">
            <img src="/school_logo.png" alt="ASCB" className="h-16 w-16 object-contain mx-auto mb-3 drop-shadow-xl"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            <h1 className="text-xl font-bold text-white font-display">Andres Soriano Colleges of Bislig</h1>
            <p className="text-gray-500 text-xs font-ui mt-1">IdeaLink — Student Portal</p>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h2 className="text-3xl font-bold text-white font-display leading-tight">Welcome back</h2>
            <p className="text-gray-500 text-sm font-body mt-1.5">Sign in with your registered email</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-400 font-ui tracking-wide">Email Address</label>
              <div className="relative">
                <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200 ${focused === 'email' ? 'text-ascb-orange' : 'text-gray-500'}`}>
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  placeholder="you@ascb.edu.ph"
                  className="input-field pl-10 h-11"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-gray-400 font-ui tracking-wide">Password</label>
                <span className="text-[11px] text-ascb-orange hover:text-ascb-gold font-ui cursor-pointer transition-colors select-none">
                  Forgot password?
                </span>
              </div>
              <div className="relative">
                <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200 ${focused === 'password' ? 'text-ascb-orange' : 'text-gray-500'}`}>
                  <Lock size={16} />
                </div>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  placeholder="Enter your password"
                  className="input-field pl-10 pr-11 h-11"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-200 transition-colors p-1"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={isLoading}
                className="relative w-full h-11 rounded-xl text-white font-semibold font-ui text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 overflow-hidden group hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #F47C20 0%, #d4651a 100%)', boxShadow: isLoading ? 'none' : '0 4px 20px rgba(244,124,32,0.40)' }}
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
                {isLoading
                  ? <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  : <><span>Sign In</span><ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform duration-200" /></>
                }
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/6" />
            <span className="text-[11px] text-gray-700 font-ui">or</span>
            <div className="flex-1 h-px bg-white/6" />
          </div>

          {/* Staff portal link */}
          <Link
            to="/staff-login"
            className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.07] hover:border-white/15 transition-all duration-200 group"
          >
            <span className="text-xs text-gray-500 font-ui">Admin / Registrar / Accounting?</span>
            <span className="text-xs text-ascb-orange font-semibold font-ui flex items-center gap-1">
              Staff Portal <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>

          <p className="mt-5 text-center text-sm text-gray-600 font-ui">
            No account?{' '}
            <Link to="/signup" className="text-ascb-orange hover:text-ascb-gold font-semibold transition-colors">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
