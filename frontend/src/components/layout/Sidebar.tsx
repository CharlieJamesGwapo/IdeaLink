import { NavLink } from 'react-router-dom'
import { LayoutDashboard, MessageSquare, Megaphone, Star } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuth } from '../../hooks/useAuth'

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
  roles: string[]
}

const navItems: NavItem[] = [
  { to: '/admin/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard', roles: ['admin'] },
  { to: '/admin/suggestions', icon: <MessageSquare size={18} />, label: 'Suggestions', roles: ['admin'] },
  { to: '/admin/announcements', icon: <Megaphone size={18} />, label: 'Announcements', roles: ['admin'] },
  { to: '/admin/testimonials', icon: <Star size={18} />, label: 'Testimonials', roles: ['admin'] },
  { to: '/registrar/suggestions', icon: <MessageSquare size={18} />, label: 'Suggestions', roles: ['registrar'] },
  { to: '/accounting/suggestions', icon: <MessageSquare size={18} />, label: 'Suggestions', roles: ['accounting'] },
]

export function Sidebar() {
  const { role } = useAuth()

  const items = navItems.filter((item) => role && item.roles.includes(role))

  return (
    <aside className="w-56 bg-navy-dark border-r border-navy-light min-h-screen p-4 flex flex-col gap-1">
      <p className="text-xs uppercase tracking-widest text-gray-500 px-3 mb-2">
        {role === 'admin' ? 'Admin Panel' : role === 'registrar' ? 'Registrar' : 'Accounting'}
      </p>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              isActive
                ? 'bg-accent text-white'
                : 'text-gray-400 hover:bg-navy-light hover:text-white'
            )
          }
        >
          {item.icon}
          {item.label}
        </NavLink>
      ))}
    </aside>
  )
}
