import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { User, Mail, Lock, ArrowRight } from 'lucide-react'
import { signup } from '../../api/auth'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'

export function SignupPage() {
  const { setAuth } = useAuth()
  const navigate = useNavigate()
  const [fullname, setFullname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const res = await signup(email, password, fullname)
      setAuth({ id: (res.data as any).id }, 'user')
      toast.success('Account created! Welcome to IdeaLink.')
      navigate('/user/submit')
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Signup failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 hero-bg">
      <div className="absolute inset-0 bg-ascb-navy-dark/80 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <img src="/school_logo.png" alt="ASCB" className="h-14 w-14 object-contain mx-auto mb-4"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <h1 className="text-2xl font-bold text-white">Create an account</h1>
          <p className="text-gray-500 text-sm mt-1">Join the ASCB IdeaLink community</p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Full Name</label>
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="text" value={fullname} onChange={(e) => setFullname(e.target.value)} required
                placeholder="Juan dela Cruz" className="input-field pl-10" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                placeholder="you@ascb.edu.ph" className="input-field pl-10" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                minLength={6} placeholder="At least 6 characters" className="input-field pl-10" />
            </div>
          </div>
          <Button type="submit" isLoading={isLoading} size="lg" className="w-full mt-2 !bg-ascb-orange hover:!bg-ascb-orange-dark">
            Create Account <ArrowRight size={16} />
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          Already have an account? <Link to="/login" className="text-ascb-orange hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
