import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import { login } from '../../api/auth'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'

export function LoginPage() {
  const { setAuth } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const res = await login(email, password)
      setAuth({ id: (res.data as any).id }, 'user')
      toast.success('Welcome back!')
      navigate('/user/submit')
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Invalid credentials')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <img src="/school_logo.png" alt="ASCB" className="h-14 w-14 object-contain mx-auto mb-4"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your IdeaLink account</p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                placeholder="you@ascb.edu.ph"
                className="input-field pl-10" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                placeholder="••••••••"
                className="input-field pl-10" />
            </div>
          </div>
          <Button type="submit" isLoading={isLoading} size="lg" className="w-full mt-2">
            Sign In <ArrowRight size={16} />
          </Button>
        </form>

        <div className="mt-5 space-y-2 text-center">
          <p className="text-sm text-gray-500">
            No account? <Link to="/signup" className="text-accent hover:underline font-medium">Create one</Link>
          </p>
          <div className="flex items-center justify-center gap-3 text-xs text-gray-600">
            <Link to="/admin/login" className="hover:text-gray-400 transition-colors">Admin</Link>
            <span>·</span>
            <Link to="/registrar/login" className="hover:text-gray-400 transition-colors">Registrar</Link>
            <span>·</span>
            <Link to="/accounting/login" className="hover:text-gray-400 transition-colors">Accounting</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
