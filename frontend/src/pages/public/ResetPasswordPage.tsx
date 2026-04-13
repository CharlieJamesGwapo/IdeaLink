import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import axios from 'axios'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { resetPassword } from '../../api/auth'

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!token) { toast.error('This reset link is invalid.'); return }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    if (password !== confirm) { toast.error('Passwords do not match'); return }
    setIsLoading(true)
    try {
      await resetPassword(token, password)
      toast.success('Password updated. Please sign in.')
      navigate('/login')
    } catch (err) {
      const msg =
        axios.isAxiosError(err)
          ? (err.response?.data?.error ?? 'This reset link is invalid or expired. Please request a new one.')
          : 'Something went wrong.'
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <h2 className="text-[2rem] font-bold text-white font-display leading-tight">Reset password</h2>
          <p className="text-gray-300 text-sm font-ui font-medium mt-2 tracking-wide">Choose a new password for your account.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 mt-7">
          {/* New password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 font-ui">New password</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600">
                <Lock size={15} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="input-field pl-10 pr-11 h-11"
                autoComplete="new-password"
              />
              <button type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors p-0.5">
                {showPassword ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
            </div>
          </div>

          {/* Confirm */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 font-ui">Confirm password</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600">
                <Lock size={15} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                className="input-field pl-10 h-11"
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="relative mt-2 w-full h-11 rounded-xl text-white font-semibold font-ui text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #F47C20 0%, #d4651a 100%)' }}
          >
            {isLoading
              ? <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              : 'Update password'}
          </button>
        </form>

        <Link to="/login" className="mt-7 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-ascb-orange transition-colors">
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
