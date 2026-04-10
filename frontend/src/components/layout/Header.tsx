import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { LogOut, Menu, X, ChevronRight } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { logout } from '../../api/auth'
import { toast } from 'sonner'
import { NotificationBell } from '../shared/NotificationBell'

export function Header() {
  const { currentUser, role, clearAuth } = useAuth()
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

  const handleLogout = async () => {
    try {
      await logout()
      clearAuth()
      navigate('/')
      toast.success('Logged out successfully')
    } catch {
      toast.error('Logout failed')
    }
  }

  const staffDashboard =
    role === 'admin' ? '/admin/dashboard'
    : role === 'registrar' ? '/registrar/dashboard'
    : role === 'accounting' ? '/accounting/dashboard'
    : null

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
              className="h-10 w-10 object-contain rounded-lg"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] text-ascb-gold font-semibold uppercase tracking-widest font-ui">
                Andres Soriano Colleges of Bislig
              </span>
              <span className="text-base font-bold text-white group-hover:text-ascb-orange transition-colors font-ui">
                Idea<span className="text-ascb-orange">Link</span>
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-2">
            {!currentUser && (
              <>
                <Link to="/login" className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-white/10 font-ui">
                  Sign In
                </Link>
                <Link to="/signup" className="flex items-center gap-1 px-4 py-2 bg-ascb-orange hover:bg-ascb-orange-dark text-white text-sm font-medium rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-ascb-orange/30 font-ui">
                  Register <ChevronRight size={14} />
                </Link>
              </>
            )}
            {currentUser && role === 'user' && (
              <>
                <Link to="/user/submit" className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-white/10 font-ui">Submit Feedback</Link>
                <Link to="/user/submissions" className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-white/10 font-ui">My Submissions</Link>
                <Link to="/user/announcements" className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-white/10 font-ui">Announcements</Link>
                <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10 font-ui">
                  <LogOut size={16} /> Logout
                </button>
              </>
            )}
            {currentUser && role !== 'user' && (
              <>
                <NotificationBell onClick={() => staffDashboard && navigate(staffDashboard)} />
                <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10 font-ui">
                  <LogOut size={16} /> Logout
                </button>
              </>
            )}
          </nav>

          {/* Mobile */}
          <div className="md:hidden flex items-center gap-2">
            {currentUser && role !== 'user' && (
              <NotificationBell onClick={() => staffDashboard && navigate(staffDashboard)} />
            )}
            <button className="p-2 text-gray-400 hover:text-white transition-colors" onClick={() => setIsMobileOpen(!isMobileOpen)}>
              {isMobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileOpen && (
          <div className="md:hidden border-t border-white/10 py-3 space-y-1 animate-fade-in">
            {!currentUser && (
              <>
                <Link to="/login" className="block px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors font-ui">Sign In</Link>
                <Link to="/signup" className="block px-4 py-2.5 text-sm text-white bg-ascb-orange hover:bg-ascb-orange-dark rounded-lg transition-colors font-ui">Register</Link>
              </>
            )}
            {currentUser && role === 'user' && (
              <>
                <Link to="/user/submit" className="block px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors font-ui">Submit Feedback</Link>
                <Link to="/user/submissions" className="block px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors font-ui">My Submissions</Link>
                <Link to="/user/announcements" className="block px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors font-ui">Announcements</Link>
                <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors font-ui">Logout</button>
              </>
            )}
            {currentUser && role !== 'user' && (
              <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors font-ui">Logout</button>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
