import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LogOut, Menu, X, ChevronRight } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useAnnouncementUnread } from '../../hooks/useAnnouncementUnread'
import { useSubmissionStatusUnread } from '../../hooks/useSubmissionStatusUnread'
import { logout } from '../../api/auth'
import { toast } from 'sonner'

// Anchors shown inline in the header on the public home page, so the
// section links and Sign In button share one row instead of stacking.
const HOME_ANCHORS = [
  { id: 'about',          label: 'About' },
  { id: 'foundation',     label: 'Foundation' },
  { id: 'values',         label: 'Values' },
  { id: 'goals',          label: 'Goals' },
  { id: 'how-it-works',   label: 'How It Works' },
  { id: 'announcements',  label: 'Announcements' },
  { id: 'testimonials',   label: 'Testimonials' },
]

export function Header() {
  const { currentUser, role, isLoading, clearAuth } = useAuth()
  const { count: unread } = useAnnouncementUnread()
  const { count: statusUnread } = useSubmissionStatusUnread()
  const navigate = useNavigate()
  const location = useLocation()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setIsMobileOpen(false), [location])

  const handleLogout = () => {
    // Clear local state immediately — don't wait for the API (backend cold start)
    clearAuth()
    navigate('/')
    toast.success('Logged out successfully')
    logout().catch(() => {}) // fire-and-forget server-side cookie clear
  }

  const showHomeAnchors = location.pathname === '/' && !isLoading && !currentUser

  // Scrollspy: highlight whichever section is currently in view. Updates on
  // scroll + hashchange, so clicking an anchor lands on it AND paints it active.
  const [activeAnchor, setActiveAnchor] = useState('')
  useEffect(() => {
    if (!showHomeAnchors) return
    const ids = HOME_ANCHORS.map(a => a.id)
    const pickActive = () => {
      // Section whose top crosses ~30% of viewport height wins. Falls back to
      // the first section if none match (e.g., user is in the hero).
      const cutoff = window.innerHeight * 0.3
      let current = ''
      for (const id of ids) {
        const el = document.getElementById(id)
        if (!el) continue
        const top = el.getBoundingClientRect().top
        if (top <= cutoff) current = id
      }
      setActiveAnchor(current)
    }
    pickActive()
    window.addEventListener('scroll', pickActive, { passive: true })
    window.addEventListener('hashchange', pickActive)
    return () => {
      window.removeEventListener('scroll', pickActive)
      window.removeEventListener('hashchange', pickActive)
    }
  }, [showHomeAnchors])

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${
      isScrolled
        ? 'bg-ascb-navy-dark/95 backdrop-blur-md border-b border-white/10 shadow-xl shadow-black/30'
        : 'bg-ascb-navy/90 backdrop-blur-sm border-b border-white/10'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <img
              src="/school_logo.png"
              alt="ASCB"
              className="h-12 w-12 sm:h-14 sm:w-14 object-contain drop-shadow-md flex-shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            <div className="flex flex-col leading-tight">
              <span className="hidden sm:block text-[10px] text-ascb-gold font-semibold uppercase tracking-widest font-ui">
                Andres Soriano Colleges of Bislig
              </span>
              <span className="text-sm sm:text-base font-bold text-white group-hover:text-ascb-orange transition-colors font-ui">
                Idea<span className="text-ascb-orange">Link</span>
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-2">
            {/* Anchors need serious horizontal room — only show from lg+
                to avoid wrapping/overflow on tablets. Tablets fall back to
                the mobile hamburger (which also lists these anchors). */}
            {showHomeAnchors && (
              <ul className="hidden lg:flex items-center gap-1 mr-2">
                {HOME_ANCHORS.map(a => {
                  const isActive = activeAnchor === a.id
                  return (
                    <li key={a.id}>
                      <a
                        href={`#${a.id}`}
                        aria-current={isActive ? 'true' : undefined}
                        className={`inline-flex items-center whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold font-ui transition-colors ${
                          isActive
                            ? 'bg-white/10 text-white shadow-inner shadow-black/30'
                            : 'text-gray-300 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {a.label}
                      </a>
                    </li>
                  )
                })}
              </ul>
            )}
            {!isLoading && !currentUser && (
              <Link to="/login" className="flex items-center gap-1 px-4 py-2 bg-ascb-orange hover:bg-ascb-orange-dark text-white text-sm font-medium rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-ascb-orange/30 font-ui">
                Sign In <ChevronRight size={14} />
              </Link>
            )}
            {!isLoading && currentUser && role === 'user' && (
              <>
                {[
                  { to: '/user/submit', label: 'Submit Feedback', badge: 0 },
                  { to: '/user/submissions', label: 'My Submissions', badge: statusUnread },
                  { to: '/user/announcements', label: 'Announcements', badge: unread },
                ].map(({ to, label, badge }) => (
                  <NavLink key={to} to={to} className={({ isActive }) =>
                    `px-4 py-2 text-sm transition-all rounded-lg font-ui relative inline-flex items-center gap-1.5 ${
                      isActive
                        ? 'text-white font-semibold after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:bg-ascb-orange after:rounded-full'
                        : 'text-gray-400 hover:text-white hover:bg-white/10'
                    }`
                  }>
                    {label}
                    {badge > 0 && (
                      <span
                        aria-label={`${badge} new`}
                        className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-ascb-orange text-[10px] font-bold text-white tabular-nums animate-pulse"
                      >
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </NavLink>
                ))}
                <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10 font-ui">
                  <LogOut size={16} /> Logout
                </button>
              </>
            )}
            {!isLoading && currentUser && role !== 'user' && (
              <>
                <Link
                  to={role === 'admin' ? '/admin/dashboard' : role === 'registrar' ? '/registrar/dashboard' : '/accounting/dashboard'}
                  className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-white/10 font-ui"
                >
                  Dashboard
                </Link>
                <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10 font-ui">
                  <LogOut size={16} /> Logout
                </button>
              </>
            )}
          </nav>

          {/* Mobile */}
          <div className="md:hidden flex items-center gap-2">
            <button
              className="p-2 text-gray-400 hover:text-white transition-colors"
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              aria-expanded={isMobileOpen}
              aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
            >
              {isMobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileOpen && (
          <div className="md:hidden border-t border-white/10 py-3 space-y-1 animate-fade-in">
            {showHomeAnchors && (
              <div className="grid grid-cols-2 gap-1 pb-2 mb-2 border-b border-white/10">
                {HOME_ANCHORS.map(a => (
                  <a
                    key={a.id}
                    href={`#${a.id}`}
                    className="px-3 py-2 text-xs font-semibold font-ui text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    {a.label}
                  </a>
                ))}
              </div>
            )}
            {!isLoading && !currentUser && (
              <Link to="/login" className="block px-4 py-2.5 text-sm text-white bg-ascb-orange hover:bg-ascb-orange-dark rounded-lg transition-colors font-ui">Sign In</Link>
            )}
            {!isLoading && currentUser && role === 'user' && (
              <>
                {[
                  { to: '/user/submit', label: 'Submit Feedback', badge: 0 },
                  { to: '/user/submissions', label: 'My Submissions', badge: statusUnread },
                  { to: '/user/announcements', label: 'Announcements', badge: unread },
                ].map(({ to, label, badge }) => (
                  <NavLink key={to} to={to} className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-2.5 text-sm rounded-lg transition-colors font-ui ${
                      isActive ? 'text-white bg-ascb-orange/15 font-semibold border-l-2 border-ascb-orange pl-3' : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`
                  }>
                    <span>{label}</span>
                    {badge > 0 && (
                      <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-ascb-orange text-[10px] font-bold text-white tabular-nums">
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </NavLink>
                ))}
                <button onClick={handleLogout} className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors font-ui">
                  <LogOut size={15} /> Logout
                </button>
              </>
            )}
            {!isLoading && currentUser && role !== 'user' && (
              <>
                <Link
                  to={role === 'admin' ? '/admin/dashboard' : role === 'registrar' ? '/registrar/dashboard' : '/accounting/dashboard'}
                  className="block px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors font-ui"
                >
                  Dashboard
                </Link>
                <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors font-ui">Logout</button>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
