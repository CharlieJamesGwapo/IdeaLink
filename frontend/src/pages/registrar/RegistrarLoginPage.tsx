import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { User, Lock, BookOpen, ArrowRight } from 'lucide-react'
import { registrarLogin } from '../../api/auth'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'

export function RegistrarLoginPage() {
  const { setAuth } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const res = await registrarLogin(username, password)
      setAuth({ id: (res.data as any).id, education_level: null, college_department: null }, 'registrar')
      toast.success('Welcome, Registrar!')
      navigate('/registrar/suggestions')
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
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
            <BookOpen size={28} className="text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Registrar Login</h1>
          <p className="text-gray-500 text-sm mt-1">IdeaLink — Registrar Office</p>
        </div>
        <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Username</label>
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="registrar" className="input-field pl-10" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className="input-field pl-10" />
            </div>
          </div>
          <Button type="submit" isLoading={isLoading} size="lg" className="w-full mt-2">Sign In <ArrowRight size={16} /></Button>
        </form>
      </div>
    </div>
  )
}
