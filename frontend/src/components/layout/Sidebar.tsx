import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, MessageSquare, Megaphone, Star, ChevronRight, LogOut, Menu, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuth } from '../../hooks/useAuth'
import { logout } from '../../api/auth'
import { toast } from 'sonner'
import { NotificationBell } from '../shared/NotificationBell'

const navItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin'] },
  { to: '/admin/suggestions', icon: MessageSquare, label: 'Feedback', roles: ['admin'] },
  { to: '/admin/announcements', icon: Megaphone, label: 'Announcements', roles: ['admin'] },
  { to: '/admin/testimonials', icon: Star, label: 'Testimonials', roles: ['admin'] },
  { to: '/registrar/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['registrar'] },
  { to: '/registrar/suggestions', icon: MessageSquare, label: 'Feedback', roles: ['registrar'] },
  { to: '/accounting/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['accounting'] },
  { to: '/accounting/suggestions', icon: MessageSquare, label: 'Feedback', roles: ['accounting'] },
]

const roleLabels: Record<string, string> = {
  admin: 'Admin Panel',
  registrar: 'Registrar Office',
  accounting: 'Accounting Office',
}

export function Sidebar() {
  const { role } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const items = navItems.filter(item => role && item.roles.includes(role))

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/')
      toast.success('Logged out')
    } catch {
      toast.error('Logout failed')
    }
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img src="/school_logo.png" alt="ASCB" className="h-9 w-9 object-contain rounded"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <div>
            <div className="text-[10px] text-ascb-gold uppercase tracking-widest font-ui">ASCB</div>
            <div className="text-sm font-bold text-white font-ui">
              Idea<span className="text-ascb-orange">Link</span>
            </div>
          </div>
        </div>
      </div>

      {/* Role badge */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-gray-500 font-ui">
            {role ? roleLabels[role] : ''}
          </span>
          <NotificationBell />
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-1 py-2">
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group font-ui',
                isActive
                  ? 'bg-ascb-orange text-white shadow-lg shadow-ascb-orange/25'
                  : 'text-gray-400 hover:bg-white/10 hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center gap-3">
                  <item.icon size={17} className={isActive ? 'text-white' : 'text-gray-500 group-hover:text-white transition-colors'} />
                  {item.label}
                </div>
                {isActive && <ChevronRight size={14} className="opacity-70" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4 border-t border-white/10 pt-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all font-ui"
        >
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 bg-ascb-navy-dark border-r border-white/10 min-h-screen flex-col shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile hamburger */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-ascb-navy-dark rounded-lg border border-white/10 text-white"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="w-60 bg-ascb-navy-dark border-r border-white/10 flex flex-col">
            <SidebarContent />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  )
}
