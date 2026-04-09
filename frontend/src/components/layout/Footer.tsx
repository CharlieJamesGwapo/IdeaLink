import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="bg-navy-dark border-t border-navy-light/50 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">Idea<span className="text-accent">Link</span></span>
            <span className="text-gray-600">·</span>
            <span className="text-xs text-gray-500">ASCB E-Suggestion Platform</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <Link to="/login" className="hover:text-gray-400 transition-colors">User Portal</Link>
            <Link to="/admin/login" className="hover:text-gray-400 transition-colors">Admin</Link>
            <span>© {new Date().getFullYear()} All rights reserved</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
