import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import axios from 'axios'
import { Mail, Lock, User, ChevronRight, ShieldCheck, BookOpen, Calculator } from 'lucide-react'
import { adminLogin, registrarLogin, accountingLogin } from '../../api/auth'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'

type StaffRole = 'admin' | 'registrar' | 'accounting'

const staffRoles: {
  id: StaffRole
  label: string
  icon: React.ReactNode
  desc: string
  accent: string
  placeholder: string
}[] = [
  {
    id: 'admin',
    label: 'Admin',
    icon: <ShieldCheck size={20} />,
    desc: 'System administration',
    accent: '#F47C20',
    placeholder: 'admin@ascb.edu.ph',
  },
  {
    id: 'registrar',
    label: 'Registrar',
    icon: <BookOpen size={20} />,
    desc: 'Registrar Office portal',
    accent: '#34d399',
    placeholder: 'registrar',
  },
  {
    id: 'accounting',
    label: 'Accounting',
    icon: <Calculator size={20} />,
    desc: 'Accounting Office portal',
    accent: '#a78bfa',
    placeholder: 'accounting',
  },
]

const demoHints: Record<StaffRole, { id: string; pw: string }> = {
  admin:      { id: 'admin@ascb.edu.ph', pw: 'Admin@123' },
  registrar:  { id: 'registrar',         pw: 'Staff@123' },
  accounting: { id: 'accounting',        pw: 'Staff@123' },
}

export function StaffLoginPage() {
  const { setAuth } = useAuth()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<StaffRole>('admin')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const current = staffRoles.find(r => r.id === selected)!
  const usesEmail = selected === 'admin'

  const handleSelect = (role: StaffRole) => {
    setSelected(role)
    setIdentifier('')
    setPassword('')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
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
    <div className="min-h-screen hero-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-ascb-navy-dark/85" />

      {/* Ambient glow tinted to selected role */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-[600px] h-[500px] rounded-full blur-[130px] transition-all duration-700"
          style={{ background: `${current.accent}0a` }}
        />
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
            <span className="text-gray-400 text-xs font-ui whitespace-nowrap">IdeaLink — Staff Access</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-ascb-orange/30 max-w-[80px]" />
          </div>
        </div>

        {/* ── Role tab selector ── */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {staffRoles.map(r => {
            const isActive = selected === r.id
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => handleSelect(r.id)}
                className="flex flex-col items-center gap-2 py-3.5 px-2 rounded-xl border transition-all duration-200"
                style={{
                  background: isActive ? `${r.accent}12` : 'rgba(255,255,255,0.03)',
                  borderColor: isActive ? r.accent : 'rgba(255,255,255,0.08)',
                  boxShadow: isActive ? `0 0 20px ${r.accent}22` : 'none',
                }}
              >
                <div className="transition-colors" style={{ color: isActive ? r.accent : 'rgba(107,114,128,0.7)' }}>
                  {r.icon}
                </div>
                <span
                  className="text-xs font-semibold font-ui transition-colors leading-none"
                  style={{ color: isActive ? '#fff' : 'rgba(107,114,128,0.8)' }}
                >
                  {r.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* ── Login Card ── */}
        <div
          className="rounded-2xl p-7"
          style={{
            background: 'rgba(13, 31, 60, 0.78)',
            backdropFilter: 'blur(22px)',
            WebkitBackdropFilter: 'blur(22px)',
            border: `1px solid ${current.accent}28`,
            boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${current.accent}0a, inset 0 0 0 1px rgba(255,255,255,0.04)`,
            transition: 'border-color 0.3s, box-shadow 0.3s',
          }}
        >
          {/* Card header */}
          <div className="flex items-center gap-3 mb-6 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300"
              style={{ background: `${current.accent}14`, border: `1px solid ${current.accent}28` }}
            >
              <div style={{ color: current.accent }} className="transition-colors duration-300">{current.icon}</div>
            </div>
            <div>
              <p className="text-white font-bold font-display text-base leading-tight">{current.label} Login</p>
              <p className="text-gray-500 text-xs font-ui mt-0.5">{current.desc}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Identifier */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest font-ui">
                {usesEmail ? 'Email Address' : 'Username'}
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                  {usesEmail ? <Mail size={15} /> : <User size={15} />}
                </div>
                <input
                  key={selected + '-id'}
                  type={usesEmail ? 'email' : 'text'}
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  required
                  placeholder={current.placeholder}
                  className="input-field pl-10"
                  autoComplete={usesEmail ? 'email' : 'username'}
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
                  key={selected + '-pw'}
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="input-field pl-10"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              isLoading={isLoading}
              size="lg"
              className="w-full"
            >
              Sign In to {current.label} Portal <ChevronRight size={16} />
            </Button>

            {/* Demo hint */}
            <div className="flex items-center justify-between pt-3 text-xs font-ui"
              style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <span className="text-gray-600">Demo: {demoHints[selected].id}</span>
              <span className="text-gray-600">{demoHints[selected].pw}</span>
            </div>
          </form>
        </div>

        {/* No cross-link to student portal — staff URL is kept separate */}
      </div>
    </div>
  )
}
