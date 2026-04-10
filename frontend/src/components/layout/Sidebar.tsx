import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, MessageSquare, Megaphone, Star, LogOut, X, Menu } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuth } from '../../hooks/useAuth'
import { logout } from '../../api/auth'
import { toast } from 'sonner'
import { NotificationBell } from '../shared/NotificationBell'

const navItems = [
  { to: '/admin/dashboard',      icon: LayoutDashboard, label: 'Dashboard',     roles: ['admin'] },
  { to: '/admin/suggestions',    icon: MessageSquare,   label: 'Feedback',      roles: ['admin'] },
  { to: '/admin/announcements',  icon: Megaphone,       label: 'Announcements', roles: ['admin'] },
  { to: '/admin/testimonials',   icon: Star,            label: 'Testimonials',  roles: ['admin'] },
  { to: '/registrar/dashboard',  icon: LayoutDashboard, label: 'Dashboard',     roles: ['registrar'] },
  { to: '/registrar/suggestions',icon: MessageSquare,   label: 'Feedback',      roles: ['registrar'] },
  { to: '/accounting/dashboard', icon: LayoutDashboard, label: 'Dashboard',     roles: ['accounting'] },
  { to: '/accounting/suggestions',icon: MessageSquare,  label: 'Feedback',      roles: ['accounting'] },
]

const roleConfig: Record<string, { label: string; color: string; accent: string }> = {
  admin:      { label: 'Admin Panel',       color: 'text-ascb-orange', accent: '#F47C20' },
  registrar:  { label: 'Registrar Office',  color: 'text-green-400',   accent: '#34d399' },
  accounting: { label: 'Accounting Office', color: 'text-purple-400',  accent: '#a78bfa' },
}

export function Sidebar() {
  const { role, clearAuth } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const items = navItems.filter(item => role && item.roles.includes(role))
  const config = role ? roleConfig[role] : null

  // Close drawer on route change
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  // Lock body scroll + ESC key when mobile drawer open
  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false) }
    document.addEventListener('keydown', handler)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', handler)
    }
  }, [mobileOpen])

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // ignore — cookie is cleared server-side; we still clear local state
    } finally {
      clearAuth()
      navigate('/')
      toast.success('Logged out')
    }
  }

  const feedbackPath =
    role === 'admin'      ? '/admin/suggestions'
    : role === 'registrar'  ? '/registrar/suggestions'
    : role === 'accounting' ? '/accounting/suggestions'
    : undefined

  const NavContent = ({ onNav, showBell }: { onNav?: () => void; showBell?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/8">
        <div className="flex items-center gap-3">
          <img src="/school_logo.png" alt="ASCB"
            className="h-9 w-9 object-contain rounded-lg shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <div className="min-w-0">
            <div className="text-[10px] text-ascb-gold uppercase tracking-widest font-ui truncate">ASCB</div>
            <div className="text-sm font-bold text-white font-ui">
              Idea<span className="text-ascb-orange">Link</span>
            </div>
          </div>
        </div>
      </div>

      {/* Role badge */}
      <div className="px-5 pt-4 pb-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-600 font-ui">Portal</p>
            <p className={`text-xs font-semibold font-ui mt-0.5 ${config?.color ?? 'text-gray-400'}`}>
              {config?.label ?? ''}
            </p>
          </div>
          {showBell && <NotificationBell onClick={feedbackPath ? () => navigate(feedbackPath) : undefined} />}
        </div>
        {config && (
          <div className="mt-3 h-px w-full rounded-full" style={{ background: `linear-gradient(to right, ${config.accent}40, transparent)` }} />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto no-scrollbar">
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNav}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group font-ui',
              isActive
                ? 'text-white shadow-lg'
                : 'text-gray-500 hover:text-white hover:bg-white/8'
            )}
            style={({ isActive }) => isActive && config ? {
              background: `${config.accent}18`,
              border: `1px solid ${config.accent}30`,
              color: 'white',
              boxShadow: `0 2px 12px ${config.accent}18`,
            } : {
              border: '1px solid transparent',
            }}
          >
            {({ isActive }) => (
              <>
                <item.icon
                  size={16}
                  style={isActive && config ? { color: config.accent } : {}}
                  className={cn(!isActive && 'text-gray-600 group-hover:text-gray-300 transition-colors')}
                />
                <span>{item.label}</span>
                {isActive && config && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: config.accent }} />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-5 pt-3 border-t border-white/8">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:text-red-400 hover:bg-red-500/8 transition-all font-ui"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* ── DESKTOP sidebar ── */}
      <aside
        className="hidden md:flex w-60 shrink-0 flex-col min-h-screen sticky top-0 border-r border-white/8"
        style={{ background: 'rgba(10,24,50,0.96)', backdropFilter: 'blur(12px)' }}
      >
        <NavContent showBell />
      </aside>

      {/* ── MOBILE: top bar ── */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 border-b border-white/8"
        style={{ background: 'rgba(10,24,50,0.96)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center gap-2.5">
          <img src="/school_logo.png" alt="ASCB" className="h-7 w-7 object-contain rounded"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <span className="text-sm font-bold text-white font-ui">
            Idea<span className="text-ascb-orange">Link</span>
          </span>
          {config && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold font-ui uppercase tracking-wide"
              style={{ background: `${config.accent}18`, color: config.accent, border: `1px solid ${config.accent}30` }}>
              {config.label.split(' ')[0]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell onClick={feedbackPath ? () => navigate(feedbackPath) : undefined} />
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/8"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      {/* ── MOBILE: bottom nav ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch border-t border-white/8"
        style={{ background: 'rgba(10,24,50,0.97)', backdropFilter: 'blur(16px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn(
              'flex-1 flex flex-col items-center gap-1 py-2.5 px-1 text-[10px] font-semibold font-ui transition-all',
              isActive ? 'text-white' : 'text-gray-600'
            )}
            style={({ isActive }) => isActive && config ? { color: config.accent } : {}}
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  'p-1.5 rounded-lg transition-all',
                  isActive ? 'shadow-lg' : ''
                )} style={isActive && config ? { background: `${config.accent}18` } : {}}>
                  <item.icon size={17} />
                </div>
                <span className="truncate max-w-[52px] text-center leading-tight">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button
          onClick={handleLogout}
          className="flex-1 flex flex-col items-center gap-1 py-2.5 px-1 text-[10px] font-semibold text-gray-600 hover:text-red-400 transition-colors font-ui"
        >
          <div className="p-1.5 rounded-lg">
            <LogOut size={17} />
          </div>
          <span>Logout</span>
        </button>
      </nav>

      {/* ── MOBILE: full drawer (hamburger) ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Panel */}
          <div
            className="relative w-72 max-w-[85vw] flex flex-col animate-slide-in-left"
            style={{ background: 'rgba(10,24,50,0.98)', borderRight: '1px solid rgba(255,255,255,0.08)' }}
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
            <NavContent onNav={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
