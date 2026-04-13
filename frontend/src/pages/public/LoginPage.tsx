import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Mail, Lock, User, ChevronRight, GraduationCap, ShieldCheck, BookOpen, Calculator, Sparkles } from 'lucide-react'
import { login, adminLogin, registrarLogin, accountingLogin } from '../../api/auth'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'

type StaffRole = 'admin' | 'registrar' | 'accounting'

const staffRoles: { id: StaffRole; label: string; icon: React.ReactNode; desc: string; accent: string }[] = [
  { id: 'admin',      label: 'Admin',      icon: <ShieldCheck size={18} />, desc: 'System administration',   accent: '#F47C20' },
  { id: 'registrar',  label: 'Registrar',  icon: <BookOpen size={18} />,    desc: 'Registrar Office portal', accent: '#34d399' },
  { id: 'accounting', label: 'Accounting', icon: <Calculator size={18} />,  desc: 'Accounting Office portal',accent: '#a78bfa' },
]

const cardStyle = {
  background: 'rgba(13, 31, 60, 0.78)',
  backdropFilter: 'blur(22px)',
  WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(244, 124, 32, 0.2)',
  boxShadow: '0 8px 40px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.04)',
} as const

export function LoginPage() {
  const { setAuth } = useAuth()
  const navigate = useNavigate()

  // Student form state
  const [studentEmail, setStudentEmail] = useState('')
  const [studentPassword, setStudentPassword] = useState('')
  const [studentLoading, setStudentLoading] = useState(false)

  // Staff form state
  const [selectedStaff, setSelectedStaff] = useState<StaffRole>('admin')
  const [staffIdentifier, setStaffIdentifier] = useState('')
  const [staffPassword, setStaffPassword] = useState('')
  const [staffLoading, setStaffLoading] = useState(false)

  const handleStudentLogin = async (e: FormEvent) => {
    e.preventDefault()
    setStudentLoading(true)
    try {
      const res = await login(studentEmail, studentPassword)
      setAuth({
        id: (res.data as any).id,
        education_level: (res.data as any).education_level ?? null,
        college_department: (res.data as any).college_department ?? null,
      }, 'user')
      toast.success('Welcome back!')
      navigate('/user/submit')
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Invalid credentials')
    } finally {
      setStudentLoading(false)
    }
  }

  const handleStaffLogin = async (e: FormEvent) => {
    e.preventDefault()
    setStaffLoading(true)
    try {
      if (selectedStaff === 'admin') {
        const res = await adminLogin(staffIdentifier, staffPassword)
        setAuth({ id: (res.data as any).id, education_level: null, college_department: null }, 'admin')
        toast.success('Welcome, Admin!')
        navigate('/admin/dashboard')
      } else if (selectedStaff === 'registrar') {
        const res = await registrarLogin(staffIdentifier, staffPassword)
        setAuth({ id: (res.data as any).id, education_level: null, college_department: null }, 'registrar')
        toast.success('Welcome, Registrar!')
        navigate('/registrar/dashboard')
      } else {
        const res = await accountingLogin(staffIdentifier, staffPassword)
        setAuth({ id: (res.data as any).id, education_level: null, college_department: null }, 'accounting')
        toast.success('Welcome, Accounting!')
        navigate('/accounting/dashboard')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Invalid credentials')
    } finally {
      setStaffLoading(false)
    }
  }

  const currentStaff = staffRoles.find(r => r.id === selectedStaff)!
  const staffUsesEmail = selectedStaff === 'admin'

  const demoHints: Record<StaffRole, { label: string; pw: string }> = {
    admin:      { label: 'admin@ascb.edu.ph', pw: 'Admin@123' },
    registrar:  { label: 'registrar',          pw: 'Staff@123' },
    accounting: { label: 'accounting',         pw: 'Staff@123' },
  }

  return (
    <div className="min-h-screen hero-bg flex items-center justify-center p-4 py-10 relative overflow-hidden">
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-ascb-navy-dark/84" />
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] rounded-full bg-ascb-orange/5 blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-5xl animate-fade-in space-y-8">

        {/* ── HEADER ── */}
        <div className="text-center">
          {/* Large logo */}
          <div className="inline-flex items-center justify-center mb-5">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-ascb-orange/15 blur-xl scale-125" />
              <img
                src="/school_logo.png"
                alt="ASCB Logo"
                className="relative h-28 w-28 object-contain drop-shadow-2xl"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white font-display tracking-wide leading-tight">
            Andres Soriano Colleges of Bislig
          </h1>
          <p className="text-ascb-gold text-xs font-bold uppercase tracking-[0.2em] mt-2 font-ui">
            ASCB, Ascending! · Bislig's Pioneer in Private Education
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="h-px w-16 bg-ascb-orange/30" />
            <p className="text-gray-400 text-sm font-ui">IdeaLink — Web-based Feedback Management System</p>
            <div className="h-px w-16 bg-ascb-orange/30" />
          </div>
        </div>

        {/* ── PORTALS ── */}
        <div className="grid md:grid-cols-2 gap-5 items-start">

          {/* ── LEFT: Student Portal ── */}
          <div className="space-y-3">
            {/* Badge */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold font-ui"
                style={{ background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.25)', color: '#93c5fd' }}>
                <GraduationCap size={12} />
                Student Portal
              </div>
              <div className="flex items-center gap-1 text-xs text-ascb-gold font-ui font-medium">
                <Sparkles size={11} />
                Open to all students
              </div>
            </div>

            {/* Student card */}
            <div className="rounded-2xl p-6" style={cardStyle}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.2)' }}>
                  <GraduationCap size={20} style={{ color: '#60a5fa' }} />
                </div>
                <div>
                  <p className="text-white font-semibold font-ui text-sm">Student Login</p>
                  <p className="text-gray-500 text-xs font-ui">Submit feedback & track your submissions</p>
                </div>
              </div>

              <form onSubmit={handleStudentLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-widest font-ui">Email</label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                      <Mail size={15} />
                    </div>
                    <input
                      type="email"
                      value={studentEmail}
                      onChange={e => setStudentEmail(e.target.value)}
                      required
                      placeholder="student@ascb.edu.ph"
                      className="input-field pl-10"
                      autoComplete="email"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-widest font-ui">Password</label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                      <Lock size={15} />
                    </div>
                    <input
                      type="password"
                      value={studentPassword}
                      onChange={e => setStudentPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="input-field pl-10"
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <Button type="submit" isLoading={studentLoading} size="lg" className="w-full">
                  Sign In to Student Portal <ChevronRight size={16} />
                </Button>

                <div className="pt-2.5 border-t border-white/8 text-xs text-gray-600 font-ui">
                  <span className="text-gray-500">Demo: </span>student@ascb.edu.ph · Student@123
                </div>
              </form>
            </div>

            <p className="text-center text-sm text-gray-500 font-ui">
              No account?{' '}
              <Link to="/signup" className="text-ascb-orange hover:text-ascb-gold transition-colors font-semibold">
                Create one
              </Link>
            </p>
          </div>

          {/* ── RIGHT: Staff Portals ── */}
          <div className="space-y-3">
            {/* Badge */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold font-ui"
                style={{ background: 'rgba(244,124,32,0.1)', border: '1px solid rgba(244,124,32,0.22)', color: '#F47C20' }}>
                <ShieldCheck size={12} />
                Staff Access
              </div>
              <span className="text-xs text-gray-600 font-ui">Admin · Registrar · Accounting</span>
            </div>

            {/* Staff selector tabs */}
            <div className="flex gap-2">
              {staffRoles.map(r => {
                const isActive = selectedStaff === r.id
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => { setSelectedStaff(r.id); setStaffIdentifier(''); setStaffPassword('') }}
                    className="flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all duration-200 text-center"
                    style={{
                      background: isActive ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.02)',
                      borderColor: isActive ? r.accent : 'rgba(255,255,255,0.08)',
                      boxShadow: isActive ? `0 0 16px ${r.accent}20` : 'none',
                    }}
                  >
                    <div style={{ color: isActive ? r.accent : 'rgba(107,114,128,0.8)' }} className="transition-colors">
                      {r.icon}
                    </div>
                    <span className={`text-xs font-semibold font-ui transition-colors ${isActive ? 'text-white' : 'text-gray-500'}`}>
                      {r.label}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Staff credentials form */}
            <div className="rounded-2xl p-6" style={cardStyle}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200"
                  style={{ background: `${currentStaff.accent}18`, border: `1px solid ${currentStaff.accent}30` }}>
                  <div style={{ color: currentStaff.accent }}>{currentStaff.icon}</div>
                </div>
                <div>
                  <p className="text-white font-semibold font-ui text-sm">{currentStaff.label} Login</p>
                  <p className="text-gray-500 text-xs font-ui">{currentStaff.desc}</p>
                </div>
              </div>

              <form onSubmit={handleStaffLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-widest font-ui">
                    {staffUsesEmail ? 'Email' : 'Username'}
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                      {staffUsesEmail ? <Mail size={15} /> : <User size={15} />}
                    </div>
                    <input
                      key={selectedStaff + '-id'}
                      type={staffUsesEmail ? 'email' : 'text'}
                      value={staffIdentifier}
                      onChange={e => setStaffIdentifier(e.target.value)}
                      required
                      placeholder={staffUsesEmail ? 'admin@ascb.edu.ph' : selectedStaff}
                      className="input-field pl-10"
                      autoComplete={staffUsesEmail ? 'email' : 'username'}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-widest font-ui">Password</label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                      <Lock size={15} />
                    </div>
                    <input
                      key={selectedStaff + '-pw'}
                      type="password"
                      value={staffPassword}
                      onChange={e => setStaffPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="input-field pl-10"
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  isLoading={staffLoading}
                  size="lg"
                  className="w-full"
                  style={{ background: currentStaff.accent === '#F47C20' ? undefined : currentStaff.accent + 'cc' }}
                >
                  Sign In to {currentStaff.label} Portal <ChevronRight size={16} />
                </Button>

                <div className="pt-2.5 border-t border-white/8 text-xs text-gray-600 font-ui">
                  <span className="text-gray-500">Demo: </span>
                  {demoHints[selectedStaff].label} · {demoHints[selectedStaff].pw}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
