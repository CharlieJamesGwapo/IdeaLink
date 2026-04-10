import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="bg-ascb-navy-dark border-t border-white/10 py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/school_logo.png" alt="ASCB" className="h-7 w-7 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            <div>
              <span className="text-sm font-bold text-white font-ui">
                Idea<span className="text-ascb-orange">Link</span>
              </span>
              <span className="text-gray-600 mx-2">·</span>
              <span className="text-xs text-ascb-gold font-ui">ASCB Feedback Management System</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-600 font-ui">
            <Link to="/login" className="hover:text-ascb-orange transition-colors">Student Portal</Link>
            <Link to="/login" className="hover:text-ascb-orange transition-colors">Staff Login</Link>
            <span className="text-gray-700">© {new Date().getFullYear()} ASCB</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
