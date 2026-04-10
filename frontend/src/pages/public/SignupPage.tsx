import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import axios from 'axios'
import { User, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { signup } from '../../api/auth'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'

export function SignupPage() {
  const { setAuth } = useAuth()
  const navigate = useNavigate()
  const [fullname, setFullname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const res = await signup(email, password, fullname)
      setAuth({ id: res.data.id }, 'user')
      toast.success('Account created! Welcome to IdeaLink.')
      navigate('/user/submit')
    } catch (err) {
      toast.error(axios.isAxiosError(err) ? (err.response?.data?.error ?? 'Signup failed') : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 hero-bg overflow-hidden">
      {/* Dark overlay with slight blue tint */}
      <div className="absolute inset-0 bg-ascb-navy-dark/85" />
      {/* Subtle radial glow behind the card */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[480px] h-[480px] rounded-full bg-ascb-orange/6 blur-[80px]" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="text-center mb-7">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/school_logo.png" alt="ASCB"
              className="h-12 w-12 object-contain drop-shadow-lg"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            <div className="text-left">
              <p className="text-white font-bold text-base font-display leading-tight">Andres Soriano</p>
              <p className="text-white font-bold text-base font-display leading-tight">Colleges of Bislig</p>
            </div>
          </div>
          <div className="w-16 h-px bg-ascb-orange/40 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white font-display">Create your account</h1>
          <p className="text-gray-400 text-sm mt-1.5 font-body">Join the ASCB IdeaLink community</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-7 space-y-5" style={{
          background: 'rgba(13, 31, 60, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(244, 124, 32, 0.2)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04) inset',
        }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-widest font-ui">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <User size={15} />
                </div>
                <input
                  type="text"
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                  required
                  placeholder="Juan dela Cruz"
                  className="input-field pl-10"
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-widest font-ui">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <Mail size={15} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@ascb.edu.ph"
                  className="input-field pl-10"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-widest font-ui">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <Lock size={15} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  className="input-field pl-10 pr-11"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p className="text-xs text-gray-600 font-ui mt-1">Minimum 6 characters</p>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              isLoading={isLoading}
              size="lg"
              className="w-full mt-1"
            >
              Create Account <ArrowRight size={16} />
            </Button>
          </form>
        </div>

        {/* Footer link */}
        <p className="text-center text-sm text-gray-500 mt-5 font-ui">
          Already have an account?{' '}
          <Link to="/login" className="text-ascb-orange hover:text-ascb-gold transition-colors font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
