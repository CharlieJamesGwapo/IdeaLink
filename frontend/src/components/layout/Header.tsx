import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Bell } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { logout } from '../../api/auth'
import { toast } from 'sonner'

export function Header() {
  const { currentUser, role, clearAuth } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logout()
      clearAuth()
      navigate('/login')
    } catch {
      toast.error('Logout failed')
    }
  }

  return (
    <header className="bg-navy border-b border-navy-light sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-white">Idea<span className="text-accent">Link</span></span>
        </Link>

        <nav className="flex items-center gap-4">
          {!currentUser && (
            <>
              <Link to="/login" className="text-gray-300 hover:text-white text-sm transition-colors">Login</Link>
              <Link to="/signup" className="bg-accent text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-600 transition-colors">Sign Up</Link>
            </>
          )}
          {currentUser && role === 'user' && (
            <>
              <Link to="/user/announcements" className="text-gray-300 hover:text-white transition-colors">
                <Bell size={18} />
              </Link>
              <Link to="/user/submit" className="text-gray-300 hover:text-white text-sm transition-colors">Submit</Link>
              <Link to="/user/submissions" className="text-gray-300 hover:text-white text-sm transition-colors">My Submissions</Link>
              <button onClick={handleLogout} className="text-gray-400 hover:text-white transition-colors">
                <LogOut size={18} />
              </button>
            </>
          )}
          {currentUser && role !== 'user' && (
            <button onClick={handleLogout} className="text-gray-400 hover:text-white transition-colors flex items-center gap-1 text-sm">
              <LogOut size={16} /> Logout
            </button>
          )}
        </nav>
      </div>
    </header>
  )
}
