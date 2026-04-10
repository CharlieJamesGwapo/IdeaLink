import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Mail, Lock, User, ChevronRight, GraduationCap, ShieldCheck, BookOpen, Calculator } from 'lucide-react'
import { login, adminLogin, registrarLogin, accountingLogin } from '../../api/auth'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'

type Role = 'student' | 'admin' | 'registrar' | 'accounting'

const roles: { id: Role; label: string; icon: React.ReactNode; desc: string; color: string }[] = [
  { id: 'student',    label: 'Student',    icon: <GraduationCap size={22} />, desc: 'Submit feedback & track status', color: 'text-blue-400' },
  { id: 'admin',      label: 'Admin',      icon: <ShieldCheck size={22} />,   desc: 'System administration',          color: 'text-ascb-orange' },
  { id: 'registrar',  label: 'Registrar',  icon: <BookOpen size={22} />,      desc: 'Registrar Office portal',        color: 'text-green-400' },
  { id: 'accounting', label: 'Accounting', icon: <Calculator size={22} />,    desc: 'Accounting Office portal',       color: 'text-purple-400' },
]

export function LoginPage() {
  const { setAuth } = useAuth()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Role>('student')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const usesEmail = selected === 'student' || selected === 'admin'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      if (selected === 'student') {
        const res = await login(email, password)
        setAuth({ id: (res.data as any).id }, 'user')
        toast.success('Welcome back!')
        navigate('/user/submit')
      } else if (selected === 'admin') {
        const res = await adminLogin(email, password)
        setAuth({ id: (res.data as any).id }, 'admin')
        toast.success('Welcome, Admin!')
        navigate('/admin/dashboard')
      } else if (selected === 'registrar') {
        const res = await registrarLogin(username, password)
        setAuth({ id: (res.data as any).id }, 'registrar')
        toast.success('Welcome, Registrar!')
        navigate('/registrar/dashboard')
      } else {
        const res = await accountingLogin(username, password)
        setAuth({ id: (res.data as any).id }, 'accounting')
        toast.success('Welcome, Accounting!')
        navigate('/accounting/dashboard')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Invalid credentials')
    } finally {
      setIsLoading(false)
    }
  }

  const selectedRole = roles.find(r => r.id === selected)!

  return (
    <div className="min-h-screen hero-bg flex items-center justify-center p-4 relative">
      {/* Overlay */}
      <div className="absolute inset-0 bg-ascb-navy-dark/80" />

      <div className="relative z-10 w-full max-w-4xl animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <img src="/school_logo.png" alt="ASCB"
            className="h-20 w-20 object-contain mx-auto mb-4 drop-shadow-2xl"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <h1 className="text-3xl font-bold text-white font-display tracking-wide">
            Andres Soriano Colleges of Bislig
          </h1>
          <p className="text-ascb-gold text-sm font-semibold uppercase tracking-widest mt-1 font-ui">
            ASCB, Ascending! · Bislig's Pioneer in Private Education
          </p>
          <div className="w-24 h-0.5 bg-ascb-orange mx-auto mt-3" />
          <p className="text-gray-300 text-sm mt-3 font-ui">
            IdeaLink — Web-based Feedback Management System
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Role selector */}
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3 font-ui">Select Portal</p>
            <div className="space-y-2">
              {roles.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left ${
                    selected === r.id
                      ? 'bg-ascb-navy border-ascb-orange shadow-lg shadow-ascb-orange/20'
                      : 'glass border-transparent hover:border-white/20'
                  }`}
                >
                  <div className={`shrink-0 ${selected === r.id ? r.color : 'text-gray-500'}`}>
                    {r.icon}
                  </div>
                  <div>
                    <div className={`text-sm font-semibold font-ui ${selected === r.id ? 'text-white' : 'text-gray-300'}`}>
                      {r.label} Login
                    </div>
                    <div className="text-xs text-gray-500 font-ui">{r.desc}</div>
                  </div>
                  {selected === r.id && <ChevronRight size={16} className="ml-auto text-ascb-orange" />}
                </button>
              ))}
            </div>
          </div>

          {/* Login form */}
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3 font-ui">
              {selectedRole.label} Credentials
            </p>
            <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-4">
              {usesEmail ? (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider font-ui">Email</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                      placeholder={selected === 'student' ? 'student@ascb.edu.ph' : 'admin@ascb.edu.ph'}
                      className="input-field pl-10" />
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider font-ui">Username</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" value={username} onChange={e => setUsername(e.target.value)} required
                      placeholder={selected === 'registrar' ? 'registrar' : 'accounting'}
                      className="input-field pl-10" />
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider font-ui">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                    placeholder="••••••••"
                    className="input-field pl-10" />
                </div>
              </div>

              <Button type="submit" isLoading={isLoading} size="lg" className="w-full !bg-ascb-orange hover:!bg-ascb-orange-dark">
                Sign In to {selectedRole.label} Portal <ChevronRight size={16} />
              </Button>

              {/* Demo credentials hint */}
              <div className="pt-2 border-t border-white/10 text-xs text-gray-500 font-ui space-y-0.5">
                {selected === 'student' && <><p>Demo: student@ascb.edu.ph</p><p>Password: Student@123</p></>}
                {selected === 'admin' && <><p>Demo: admin@ascb.edu.ph</p><p>Password: Admin@123</p></>}
                {selected === 'registrar' && <><p>Demo: registrar</p><p>Password: Staff@123</p></>}
                {selected === 'accounting' && <><p>Demo: accounting</p><p>Password: Staff@123</p></>}
              </div>
            </form>

            {selected === 'student' && (
              <p className="text-center text-sm text-gray-500 mt-4 font-ui">
                No account?{' '}
                <Link to="/signup" className="text-ascb-orange hover:underline font-medium">Create one</Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
