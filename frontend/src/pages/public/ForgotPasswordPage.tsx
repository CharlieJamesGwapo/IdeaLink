import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import axios from 'axios'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
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
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status
        if (status === 429) {
          toast.error('Too many requests. Please try again later.')
        } else if (status === 501) {
          toast.error('Email isn\'t set up on the server yet. Please contact the administrator.')
        } else if (status === 502) {
          toast.error('We couldn\'t send the reset email. Please try again in a minute, or contact the administrator.')
        } else {
          toast.error('Something went wrong. Please try again.')
        }
      } else {
        toast.error('Something went wrong. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-green-400" />
          </div>
          <h2 className="text-[1.75rem] font-bold text-white font-display leading-tight">Check your email</h2>
          <p className="text-gray-300 text-sm font-ui mt-3">
            If an IdeaLink account exists for <span className="text-white font-semibold">{email}</span>, we've sent a reset link.
          </p>
          <p className="text-gray-400 text-xs font-body mt-4 leading-relaxed">
            The link expires in 30 minutes. If you don't see the email, check your <span className="text-ascb-gold">spam</span> or <span className="text-ascb-gold">promotions</span> folder.
            Still nothing after a few minutes? Contact the Registrar's Office.
          </p>
          <Link to="/login" className="mt-7 inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-ascb-orange transition-colors">
            <ArrowLeft size={14} /> Back to sign in
          </Link>
        </div>
      </div>
    )
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
            disabled={isLoading}
            className="relative mt-2 w-full h-11 rounded-xl text-white font-semibold font-ui text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #F47C20 0%, #d4651a 100%)' }}
          >
            {isLoading
              ? <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              : 'Send reset link'}
          </button>
        </form>

        <Link to="/login" className="mt-7 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-ascb-orange transition-colors">
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      </div>
    </div>
  )
}
