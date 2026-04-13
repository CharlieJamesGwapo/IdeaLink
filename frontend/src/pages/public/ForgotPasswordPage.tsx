import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import axios from 'axios'
import { Mail, ArrowLeft } from 'lucide-react'
import { forgotPassword } from '../../api/auth'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { toast.error('Please enter your email'); return }
    setIsLoading(true)
    try {
      await forgotPassword(email)
      setSent(true)
      toast.success('If that email exists, a reset link was sent.')
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        toast.error('Too many requests. Please try again later.')
      } else {
        toast.error('Something went wrong. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <h2 className="text-[2rem] font-bold text-white font-display leading-tight">Forgot password</h2>
          <p className="text-gray-300 text-sm font-ui font-medium mt-2 tracking-wide">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 mt-7">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 font-ui">Email Address</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600">
                <Mail size={15} />
              </div>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@ascb.edu.ph"
                className="input-field pl-10 h-11"
                autoComplete="email"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || sent}
            className="relative mt-2 w-full h-11 rounded-xl text-white font-semibold font-ui text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #F47C20 0%, #d4651a 100%)' }}
          >
            {isLoading
              ? <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              : sent ? 'Link sent' : 'Send reset link'}
          </button>
        </form>

        <Link to="/login" className="mt-7 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-ascb-orange transition-colors">
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      </div>
    </div>
  )
}
