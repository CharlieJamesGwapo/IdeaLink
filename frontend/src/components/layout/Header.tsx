import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { LogOut, Bell, Menu, X, ChevronRight } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { logout } from '../../api/auth'
import { toast } from 'sonner'

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
      navigate('/login')
      toast.success('Logged out successfully')
    } catch {
      toast.error('Logout failed')
    }
  }

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${
      isScrolled ? 'bg-navy-dark/95 backdrop-blur-md border-b border-navy-light/50 shadow-lg shadow-black/20' : 'bg-navy border-b border-navy-light'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <img src="/school_logo.png" alt="ASCB" className="h-9 w-9 object-contain rounded-lg" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            <div className="flex flex-col leading-none">
              <span className="text-lg font-bold text-white group-hover:text-accent transition-colors">
                Idea<span className="text-accent">Link</span>
              </span>
              <span className="text-[10px] text-gray-500 uppercase tracking-widest">ASCB</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-2">
            {!currentUser && (
              <>
                <Link to="/login" className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-navy-light">
                  Sign In
                </Link>
                <Link to="/signup" className="flex items-center gap-1 px-4 py-2 bg-accent hover:bg-accent-dark text-white text-sm font-medium rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-accent/30">
                  Get Started <ChevronRight size={14} />
                </Link>
              </>
            )}
            {currentUser && role === 'user' && (
              <>
                <Link to="/user/announcements" className="relative p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-navy-light">
                  <Bell size={18} />
                </Link>
                <Link to="/user/submit" className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-navy-light">Submit</Link>
                <Link to="/user/submissions" className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-navy-light">My Submissions</Link>
                <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10">
                  <LogOut size={16} /> Logout
                </button>
              </>
            )}
            {currentUser && role !== 'user' && (
              <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10">
                <LogOut size={16} /> Logout
              </button>
            )}
          </nav>

          {/* Mobile menu button */}
          <button className="md:hidden p-2 text-gray-400 hover:text-white transition-colors" onClick={() => setIsMobileOpen(!isMobileOpen)}>
            {isMobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {isMobileOpen && (
          <div className="md:hidden border-t border-navy-light py-3 space-y-1 animate-fade-in">
            {!currentUser && (
              <>
                <Link to="/login" className="block px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-navy-light rounded-lg transition-colors">Sign In</Link>
                <Link to="/signup" className="block px-4 py-2.5 text-sm text-white bg-accent hover:bg-accent-dark rounded-lg transition-colors">Get Started</Link>
              </>
            )}
            {currentUser && role === 'user' && (
              <>
                <Link to="/user/announcements" className="block px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-navy-light rounded-lg transition-colors">Announcements</Link>
                <Link to="/user/submit" className="block px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-navy-light rounded-lg transition-colors">Submit</Link>
                <Link to="/user/submissions" className="block px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-navy-light rounded-lg transition-colors">My Submissions</Link>
                <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">Logout</button>
              </>
            )}
            {currentUser && role !== 'user' && (
              <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">Logout</button>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
