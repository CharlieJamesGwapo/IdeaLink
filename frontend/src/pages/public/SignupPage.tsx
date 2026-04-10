import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import axios from 'axios'
import { User, Mail, Lock, ArrowRight, Eye, EyeOff, CheckCircle2, Sparkles } from 'lucide-react'
import { signup } from '../../api/auth'
import { useAuth } from '../../hooks/useAuth'

// ── Password strength calculator ─────────────────────────────────────────────
function calcStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 6)  score++
  if (pw.length >= 10) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++

  const map: Record<number, { label: string; color: string }> = {
    1: { label: 'Weak',   color: '#ef4444' },
    2: { label: 'Fair',   color: '#f97316' },
    3: { label: 'Good',   color: '#eab308' },
    4: { label: 'Strong', color: '#22c55e' },
  }
  return { score, ...map[score] }
}

export function SignupPage() {
  const { setAuth } = useAuth()
  const navigate = useNavigate()
  const [fullname, setFullname]       = useState('')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading]     = useState(false)
  const [focused, setFocused]         = useState<string | null>(null)

  const strength = calcStrength(password)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!fullname.trim()) { toast.error('Please enter your full name'); return }
    if (!email.trim()) { toast.error('Please enter your email address'); return }
    if (!password.trim()) { toast.error('Please enter a password'); return }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setIsLoading(true)
    try {
      const res = await signup(email, password, fullname)
      setAuth({ id: res.data.id }, 'user')
      toast.success('Account created! Welcome to IdeaLink.')
      navigate('/user/submit')
    } catch (err) {
      toast.error(axios.isAxiosError(err) ? (err.response?.data?.error ?? 'Signup failed') : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-ascb-navy-dark overflow-hidden">

      {/* ── LEFT PANEL — Immersive Branding ──────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[44%] xl:w-[40%] relative flex-col shrink-0 overflow-hidden">
        {/* School photo */}
        <div className="absolute inset-0 hero-bg" />
        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#060e1e]/97 via-[#0d1f3c]/88 to-[#0a1628]/95" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060e1e] via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-ascb-orange/6 to-transparent" />
        {/* Right edge separator */}
        <div className="absolute right-0 inset-y-0 w-px bg-gradient-to-b from-transparent via-ascb-orange/25 to-transparent" />

        {/* Decorative dots */}
        <div className="absolute bottom-16 left-10 grid grid-cols-5 gap-2 opacity-10">
          {Array.from({ length: 20 }).map((_, i) => (
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

          {/* Center */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="mb-4">
              <span className="inline-flex items-center gap-1.5 text-ascb-gold text-[10px] font-bold uppercase tracking-[0.22em] font-ui">
                <Sparkles size={10} />
                Join the Community
              </span>
            </div>
            <h1 className="font-display text-white leading-[1.05]">
              <span className="block text-5xl xl:text-6xl font-bold">Create</span>
              <span className="block text-5xl xl:text-6xl font-bold">your</span>
              <span className="block text-5xl xl:text-6xl font-bold text-ascb-orange">account</span>
            </h1>

            <div className="flex items-center gap-3 mt-7 mb-6">
              <div className="h-px w-10 bg-ascb-gold" />
              <div className="h-px flex-1 bg-white/8" />
            </div>

            <p className="text-gray-300 text-sm font-body leading-relaxed max-w-[260px]">
              Join the ASCB IdeaLink community. Submit feedback and make your voice heard.
            </p>

            {/* Benefits */}
            <div className="mt-10 space-y-3">
              {[
                'Submit feedback to Registrar & Accounting',
                'Track all your submissions in real time',
                'Receive updates on your concerns',
              ].map(benefit => (
                <div key={benefit} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-ascb-orange/15 border border-ascb-orange/30 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 size={11} className="text-ascb-orange" />
                  </div>
                  <p className="text-gray-400 text-xs font-body leading-relaxed">{benefit}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-gray-700 text-[10px] font-ui uppercase tracking-widest">
            ASCB · Bislig's Pioneer in Private Education
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL — Signup Form ─────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center relative p-6 lg:p-10">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(244,124,32,0.04) 0%, transparent 70%)' }} />
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
          <div className="mb-7">
            <h2 className="text-[2rem] font-bold text-white font-display leading-tight">
              Create account
            </h2>
            <p className="text-gray-500 text-sm font-body mt-1.5">
              Free student account · No credit card needed
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] font-ui">
                Full Name
              </label>
              <div className="relative">
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200 ${focused === 'name' ? 'text-ascb-orange' : 'text-gray-600'}`}>
                  <User size={15} />
                </div>
                <input
                  type="text"
                  value={fullname}
                  onChange={e => setFullname(e.target.value)}
                  onFocus={() => setFocused('name')}
                  onBlur={() => setFocused(null)}
                  placeholder="Juan dela Cruz"
                  className="input-field pl-11 h-[50px] text-sm"
                  autoComplete="name"
                />
              </div>
            </div>

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
                  placeholder="you@ascb.edu.ph"
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
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200 ${focused === 'pw' ? 'text-ascb-orange' : 'text-gray-600'}`}>
                  <Lock size={15} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocused('pw')}
                  onBlur={() => setFocused(null)}
                  placeholder="At least 6 characters"
                  className="input-field pl-11 pr-12 h-[50px] text-sm"
                  autoComplete="new-password"
                />
                <button type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors">
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Strength meter — only shows when typing */}
              {password.length > 0 && (
                <div className="pt-1 space-y-1.5 animate-fade-in">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map(level => (
                      <div
                        key={level}
                        className="flex-1 h-1 rounded-full transition-all duration-400"
                        style={{
                          background: level <= strength.score ? strength.color : 'rgba(255,255,255,0.08)',
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] font-ui transition-colors duration-300" style={{ color: strength.color || '#6b7280' }}>
                    {strength.label || 'Enter a password'}
                  </p>
                </div>
              )}
            </div>

            {/* CTA */}
            <button
              type="submit"
              disabled={isLoading}
              className="relative mt-2 w-full h-[50px] rounded-xl bg-ascb-orange text-white font-semibold font-ui text-sm transition-all duration-200 hover:bg-ascb-orange-dark hover:shadow-xl hover:shadow-ascb-orange/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 overflow-hidden group"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
              {isLoading
                ? <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                : <><span>Create Account</span><ArrowRight size={15} /></>
              }
            </button>
          </form>

          {/* Sign in link */}
          <p className="mt-7 text-center text-sm text-gray-600 font-ui">
            Already have an account?{' '}
            <Link to="/login" className="text-ascb-orange hover:text-ascb-gold font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>

    </div>
  )
}
