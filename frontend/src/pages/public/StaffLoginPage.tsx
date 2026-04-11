import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import axios from 'axios'
import { Mail, Lock, User, ArrowRight, ShieldCheck, BookOpen, Calculator, Home } from 'lucide-react'
import { adminLogin, registrarLogin, accountingLogin } from '../../api/auth'
import { useAuth } from '../../hooks/useAuth'

type StaffRole = 'admin' | 'registrar' | 'accounting'

const ROLES: {
  id: StaffRole; label: string; icon: React.ReactNode
  desc: string; accent: string; placeholder: string
}[] = [
  { id: 'admin',      label: 'Admin',      icon: <ShieldCheck size={18} />, desc: 'Full system access',    accent: '#F47C20', placeholder: 'admin@ascb.edu.ph' },
  { id: 'registrar',  label: 'Registrar',  icon: <BookOpen size={18} />,    desc: 'Registrar Office',     accent: '#34d399', placeholder: 'registrar'         },
  { id: 'accounting', label: 'Accounting', icon: <Calculator size={18} />,  desc: 'Accounting Office',    accent: '#a78bfa', placeholder: 'accounting'        },
]

export function StaffLoginPage() {
  const { setAuth } = useAuth()
  const navigate = useNavigate()
  const [selected, setSelected]     = useState<StaffRole>('admin')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword]     = useState('')
  const [isLoading, setIsLoading]   = useState(false)
  const [focused, setFocused]       = useState<string | null>(null)

  const current   = ROLES.find(r => r.id === selected)!
  const usesEmail = selected === 'admin'
  const roleIndex = ROLES.findIndex(r => r.id === selected)

  const handleSelect = (role: StaffRole) => { setSelected(role); setIdentifier(''); setPassword('') }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!identifier.trim() || !password.trim()) { toast.error('Please fill in all fields'); return }
    setIsLoading(true)
    try {
      if (selected === 'admin') {
        const res = await adminLogin(identifier, password)
        setAuth({ id: res.data.id }, 'admin')
        toast.success('Welcome, Admin!')
        navigate('/admin/dashboard')
      } else if (selected === 'registrar') {
        const res = await registrarLogin(identifier, password)
        setAuth({ id: res.data.id }, 'registrar')
        toast.success('Welcome, Registrar!')
        navigate('/registrar/dashboard')
      } else {
        const res = await accountingLogin(identifier, password)
        setAuth({ id: res.data.id }, 'accounting')
        toast.success('Welcome, Accounting!')
        navigate('/accounting/dashboard')
      }
    } catch (err) {
      toast.error(axios.isAxiosError(err) ? (err.response?.data?.error ?? 'Invalid credentials') : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-ascb-navy-dark overflow-hidden">

      {/* ── LEFT PANEL ─────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[44%] xl:w-[40%] relative flex-col shrink-0 overflow-hidden transition-all duration-700">
        <div className="absolute inset-0 hero-bg" />
        <div className="absolute inset-0 bg-[#060e1e]/94" />
        <div className="absolute inset-0 transition-opacity duration-700"
          style={{ background: `radial-gradient(ellipse at 30% 60%, ${current.accent}12 0%, transparent 65%)` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060e1e] via-transparent to-transparent" />
        <div className="absolute right-0 inset-y-0 w-px transition-colors duration-700"
          style={{ background: `linear-gradient(to bottom, transparent, ${current.accent}40, transparent)` }} />
        <div className="absolute top-10 right-10 grid grid-cols-4 gap-2 opacity-10">
          {Array.from({ length: 16 }).map((_, i) => <div key={i} className="w-1 h-1 rounded-full bg-white" />)}
        </div>

        <div className="relative z-10 flex flex-col h-full px-10 xl:px-14 py-12">
          <div className="flex items-center gap-3">
            <img src="/school_logo.png" alt="ASCB" className="h-10 w-10 object-contain"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            <div>
              <span className="text-white font-bold text-base font-ui">
                Idea<span style={{ color: current.accent }} className="transition-colors duration-500">Link</span>
              </span>
              <p className="text-gray-600 text-[10px] font-ui uppercase tracking-widest leading-none mt-0.5">Staff Portal</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <div className="mb-5">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest font-ui transition-all duration-500"
                style={{ background: `${current.accent}18`, color: current.accent, border: `1px solid ${current.accent}35` }}>
                {current.icon} {current.label} Access
              </span>
            </div>
            <h1 className="font-display text-white leading-[1.05]">
              <span className="block text-5xl xl:text-6xl font-bold">Staff</span>
              <span className="block text-5xl xl:text-6xl font-bold transition-colors duration-500" style={{ color: current.accent }}>Portal</span>
            </h1>
            <div className="flex items-center gap-3 mt-6 mb-5">
              <div className="h-px w-8 transition-colors duration-500" style={{ background: current.accent }} />
              <div className="h-px flex-1 bg-white/8" />
            </div>
            <p className="text-gray-400 text-sm font-body leading-relaxed max-w-[260px]">
              {current.desc} — manage feedback and service requests from students.
            </p>

            <div className="mt-10 space-y-2">
              {ROLES.map(r => (
                <button key={r.id} type="button" onClick={() => handleSelect(r.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-300"
                  style={{
                    background: selected === r.id ? `${r.accent}14` : 'transparent',
                    border: `1px solid ${selected === r.id ? r.accent + '35' : 'rgba(255,255,255,0.05)'}`,
                  }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300"
                    style={{ background: selected === r.id ? `${r.accent}20` : 'rgba(255,255,255,0.04)', color: selected === r.id ? r.accent : 'rgba(107,114,128,0.8)' }}>
                    {r.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold font-ui transition-colors duration-300"
                      style={{ color: selected === r.id ? '#fff' : 'rgba(107,114,128,0.8)' }}>{r.label}</p>
                    <p className="text-[10px] text-gray-600 font-ui">{r.desc}</p>
                  </div>
                  {selected === r.id && <div className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ background: r.accent }} />}
                </button>
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
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full transition-all duration-700"
            style={{ background: `radial-gradient(circle, ${current.accent}06 0%, transparent 70%)` }} />
        </div>

        <div className="relative w-full max-w-sm animate-fade-in">
          {/* Mobile header */}
          <div className="lg:hidden text-center mb-8">
            <img src="/school_logo.png" alt="ASCB" className="h-14 w-14 object-contain mx-auto mb-3"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            <h1 className="text-xl font-bold text-white font-display">IdeaLink — Staff Portal</h1>
          </div>

          {/* Mobile role tabs */}
          <div className="lg:hidden relative mb-6">
            <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-xl bg-white/[0.04] border border-white/8">
              <div className="absolute top-1.5 bottom-1.5 rounded-lg transition-all duration-300"
                style={{
                  left: `calc(${roleIndex} * (100% - 12px) / 3 + 6px)`,
                  width: 'calc((100% - 12px) / 3)',
                  background: `${current.accent}18`,
                  border: `1px solid ${current.accent}35`,
                }} />
              {ROLES.map(r => (
                <button key={r.id} type="button" onClick={() => handleSelect(r.id)}
                  className="relative z-10 flex flex-col items-center gap-1 py-2.5 rounded-lg text-xs font-semibold font-ui transition-colors duration-300"
                  style={{ color: selected === r.id ? '#fff' : 'rgba(107,114,128,0.7)' }}>
                  <span style={{ color: selected === r.id ? r.accent : undefined }}>{r.icon}</span>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-7">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-500"
                style={{ background: `${current.accent}18`, color: current.accent, border: `1px solid ${current.accent}30` }}>
                {current.icon}
              </div>
              <span className="text-xs font-bold uppercase tracking-widest font-ui transition-colors duration-500" style={{ color: current.accent }}>
                {current.label} Login
              </span>
            </div>
            <h2 className="text-[2rem] font-bold text-white font-display leading-tight">Staff Access</h2>
            <p className="text-gray-500 text-sm font-body mt-1.5">{current.desc} — authorised personnel only</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-400 font-ui">
                {usesEmail ? 'Email Address' : 'Username'}
              </label>
              <div className="relative">
                <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-300 ${focused === 'id' ? 'text-ascb-orange' : 'text-gray-600'}`}>
                  {usesEmail ? <Mail size={15} /> : <User size={15} />}
                </div>
                <input key={selected + '-id'} type={usesEmail ? 'email' : 'text'} value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  onFocus={() => setFocused('id')} onBlur={() => setFocused(null)}
                  placeholder={current.placeholder}
                  className="input-field pl-10 h-11"
                  autoComplete={usesEmail ? 'email' : 'username'} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-400 font-ui">Password</label>
              <div className="relative">
                <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-300 ${focused === 'pw' ? 'text-ascb-orange' : 'text-gray-600'}`}>
                  <Lock size={15} />
                </div>
                <input key={selected + '-pw'} type="password" value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocused('pw')} onBlur={() => setFocused(null)}
                  placeholder="••••••••"
                  className="input-field pl-10 h-11" autoComplete="current-password" />
              </div>
            </div>

            <button type="submit" disabled={isLoading}
              className="relative mt-2 w-full h-11 rounded-xl text-white font-semibold font-ui text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 overflow-hidden group hover:brightness-110"
              style={{ background: current.accent, boxShadow: isLoading ? 'none' : `0 4px 20px ${current.accent}55` }}>
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
              {isLoading
                ? <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                : <><span>Sign In to {current.label}</span><ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform duration-200" /></>}
            </button>
          </form>

          <p className="mt-7 text-center text-xs text-gray-700 font-ui">
            Student portal?{' '}
            <Link to="/login" className="text-gray-500 hover:text-gray-300 transition-colors underline underline-offset-2">Student Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
