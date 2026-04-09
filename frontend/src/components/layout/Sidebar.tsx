import { NavLink } from 'react-router-dom'
import { LayoutDashboard, MessageSquare, Megaphone, Star, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuth } from '../../hooks/useAuth'

const navItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin'] },
  { to: '/admin/suggestions', icon: MessageSquare, label: 'Suggestions', roles: ['admin'] },
  { to: '/admin/announcements', icon: Megaphone, label: 'Announcements', roles: ['admin'] },
  { to: '/admin/testimonials', icon: Star, label: 'Testimonials', roles: ['admin'] },
  { to: '/registrar/suggestions', icon: MessageSquare, label: 'Suggestions', roles: ['registrar'] },
  { to: '/accounting/suggestions', icon: MessageSquare, label: 'Suggestions', roles: ['accounting'] },
]

const roleLabels: Record<string, string> = {
  admin: 'Admin Panel',
  registrar: 'Registrar Office',
  accounting: 'Accounting Office',
}

export function Sidebar() {
  const { role } = useAuth()
  const items = navItems.filter((item) => role && item.roles.includes(role))

  return (
    <aside className="w-60 bg-navy-dark border-r border-navy-light/50 min-h-screen p-4 flex flex-col gap-1 shrink-0">
      {/* Role badge */}
      <div className="mb-4 px-3 py-2">
        <span className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">
          {role ? roleLabels[role] : ''}
        </span>
      </div>

      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              'flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
              isActive
                ? 'bg-accent text-white shadow-lg shadow-accent/20'
                : 'text-gray-400 hover:bg-navy-light hover:text-white'
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
    </aside>
  )
}
