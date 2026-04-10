import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import axios from 'axios'
import { Mail, Lock, Eye, EyeOff, ChevronRight, GraduationCap } from 'lucide-react'
import { login } from '../../api/auth'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'

export function StudentLoginPage() {
  const { setAuth } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

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
    <div className="min-h-screen hero-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-ascb-navy-dark/85" />

      {/* Ambient glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-in">

        {/* ── Logo + School Name ── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-5 relative">
            <div className="absolute inset-0 rounded-full bg-ascb-orange/12 blur-2xl scale-150" />
            <img
              src="/school_logo.png"
              alt="ASCB"
              className="relative h-28 w-28 object-contain drop-shadow-2xl"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>
          <h1 className="text-3xl font-bold text-white font-display leading-tight">
            Andres Soriano<br />Colleges of Bislig
          </h1>
          <p className="text-ascb-gold text-xs font-bold uppercase tracking-[0.18em] mt-2 font-ui">
            ASCB, Ascending! · Bislig's Pioneer in Private Education
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-ascb-orange/30 max-w-[80px]" />
            <span className="text-gray-400 text-xs font-ui whitespace-nowrap">IdeaLink — Student Portal</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-ascb-orange/30 max-w-[80px]" />
          </div>
        </div>

        {/* ── Login Card ── */}
        <div
          className="rounded-2xl p-7"
          style={{
            background: 'rgba(13, 31, 60, 0.78)',
            backdropFilter: 'blur(22px)',
            WebkitBackdropFilter: 'blur(22px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.04)',
          }}
        >
          {/* Card header */}
          <div className="flex items-center gap-3 mb-6 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.22)' }}>
              <GraduationCap size={22} style={{ color: '#60a5fa' }} />
            </div>
            <div>
              <p className="text-white font-bold font-display text-base leading-tight">Student Login</p>
              <p className="text-gray-500 text-xs font-ui mt-0.5">Submit feedback · Track submissions · View announcements</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest font-ui">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                  <Mail size={15} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="student@ascb.edu.ph"
                  className="input-field pl-10"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest font-ui">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                  <Lock size={15} />
                </div>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="input-field pl-10 pr-11"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <Button type="submit" isLoading={isLoading} size="lg" className="w-full">
              Sign In <ChevronRight size={16} />
            </Button>

            {/* Demo hint */}
            <div className="flex items-center justify-between pt-3 text-xs font-ui"
              style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <span className="text-gray-600">Demo: student@ascb.edu.ph</span>
              <span className="text-gray-600">Student@123</span>
            </div>
          </form>
        </div>

        {/* ── Footer link ── */}
        <p className="mt-5 text-center text-sm text-gray-500 font-ui">
          No account?{' '}
          <Link to="/signup" className="text-ascb-orange hover:text-ascb-gold transition-colors font-semibold">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
