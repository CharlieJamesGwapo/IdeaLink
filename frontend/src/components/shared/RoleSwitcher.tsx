import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { GraduationCap, ShieldCheck, BookOpen, Calculator, ChevronUp, Zap, Check, Loader } from 'lucide-react'
import { login, adminLogin, registrarLogin, accountingLogin, logout } from '../../api/auth'
import { useAuth } from '../../hooks/useAuth'

type RoleId = 'user' | 'admin' | 'registrar' | 'accounting'

const ROLES: {
  id: RoleId
  label: string
  short: string
  icon: React.ReactNode
  accent: string
  bg: string
  loginFn: () => Promise<any>
  redirect: string
}[] = [
  {
    id: 'user',
    label: 'Student',
    short: 'STU',
    icon: <GraduationCap size={16} />,
    accent: '#60a5fa',
    bg: 'rgba(96,165,250,0.15)',
    loginFn: () => login('student@ascb.edu.ph', 'Student@123'),
    redirect: '/user/submit',
  },
  {
    id: 'admin',
    label: 'Admin',
    short: 'ADM',
    icon: <ShieldCheck size={16} />,
    accent: '#F47C20',
    bg: 'rgba(244,124,32,0.15)',
    loginFn: () => adminLogin('admin@ascb.edu.ph', 'Admin@123'),
    redirect: '/admin/dashboard',
  },
  {
    id: 'registrar',
    label: 'Registrar Office',
    short: 'REG',
    icon: <BookOpen size={16} />,
    accent: '#34d399',
    bg: 'rgba(52,211,153,0.15)',
    loginFn: () => registrarLogin('registrar@ascb.edu.ph', 'Staff@123'),
    redirect: '/registrar/dashboard',
  },
  {
    id: 'accounting',
    label: 'Finance Office',
    short: 'FIN',
    icon: <Calculator size={16} />,
    accent: '#a78bfa',
    bg: 'rgba(167,139,250,0.15)',
    loginFn: () => accountingLogin('finance@ascb.edu.ph', 'Staff@123'),
    redirect: '/accounting/dashboard',
  },
]

export function RoleSwitcher() {
  const { role, setAuth } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState<RoleId | null>(null)

  const currentRole = ROLES.find(r => r.id === role)

  const handleSwitch = async (target: typeof ROLES[0]) => {
    if (target.id === role || switching) return
    setSwitching(target.id)
    try {
      await logout().catch(() => {})
      const res = await target.loginFn()
      setAuth({
        id: (res.data as any).id,
        education_level: (res.data as any).education_level ?? null,
        college_department: (res.data as any).college_department ?? null,
        grade_level: null,
      }, target.id)
      toast.success(`Switched to ${target.label}`, {
        description: `Now viewing as ${target.label} Portal`,
        duration: 2000,
      })
      setOpen(false)
      navigate(target.redirect)
    } catch {
      toast.error(`Failed to switch to ${target.label}`)
    } finally {
      setSwitching(null)
    }
  }

  return (
    <div className="fixed bottom-[72px] md:bottom-5 right-4 md:right-5 z-[45] flex flex-col items-end gap-2">
      {/* Role options — slide up when open */}
      <div
        className="flex flex-col gap-2 transition-all duration-300 overflow-hidden"
        style={{
          maxHeight: open ? '300px' : '0px',
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0)' : 'translateY(10px)',
        }}
      >
        {ROLES.map((r, i) => {
          const isActive = r.id === role
          const isLoading = switching === r.id
          return (
            <button
              key={r.id}
              onClick={() => handleSwitch(r)}
              disabled={isActive || !!switching}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold font-ui transition-all duration-200 hover:scale-105 active:scale-95 disabled:cursor-not-allowed"
              style={{
                background: isActive
                  ? r.bg.replace('0.15', '0.25')
                  : 'rgba(13,31,60,0.92)',
                border: `1px solid ${isActive ? r.accent : 'rgba(255,255,255,0.12)'}`,
                color: isActive ? r.accent : 'rgba(255,255,255,0.75)',
                boxShadow: isActive ? `0 0 16px ${r.accent}30` : '0 4px 20px rgba(0,0,0,0.4)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                transitionDelay: open ? `${i * 40}ms` : '0ms',
              }}
            >
              {isLoading ? (
                <Loader size={15} className="animate-spin" style={{ color: r.accent }} />
              ) : isActive ? (
                <Check size={15} style={{ color: r.accent }} />
              ) : (
                <span style={{ color: r.accent }}>{r.icon}</span>
              )}
              <span>{r.label}</span>
              {isActive && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wide"
                  style={{ background: `${r.accent}22`, color: r.accent }}>
                  Active
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2.5 px-4 py-3 rounded-2xl font-semibold font-ui text-sm transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          background: currentRole ? currentRole.bg.replace('0.15', '0.22') : 'rgba(13,31,60,0.92)',
          border: `1px solid ${currentRole?.accent ?? 'rgba(255,255,255,0.15)'}`,
          color: currentRole?.accent ?? 'white',
          boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 20px ${currentRole?.accent ?? '#fff'}22`,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <Zap size={14} />
        <span>{currentRole?.label ?? 'Guest'}</span>
        <ChevronUp
          size={14}
          className="transition-transform duration-300"
          style={{ transform: open ? 'rotate(0deg)' : 'rotate(180deg)' }}
        />
      </button>
    </div>
  )
}
