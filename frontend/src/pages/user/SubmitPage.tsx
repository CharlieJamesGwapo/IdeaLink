import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Send, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, Plus,
  FileText, Award, BookOpen, Shield, CreditCard, Shuffle, HelpCircle,
  DollarSign, GraduationCap, Receipt, RotateCcw, AlertTriangle, Check,
  Building2, Calculator,
} from 'lucide-react'
import { submitSuggestion } from '../../api/suggestions'
import { Button } from '../../components/ui/Button'
import { OfficeHoursBanner } from '../../components/shared/OfficeHoursBanner'

// ── Service category definitions ─────────────────────────────────────────────

const REGISTRAR_SERVICES: { label: string; icon: React.ReactNode }[] = [
  { label: 'Enrollment / Registration',  icon: <BookOpen size={16} /> },
  { label: 'Transcript of Records (TOR)', icon: <FileText size={16} /> },
  { label: 'Certificate of Enrollment',  icon: <Award size={16} /> },
  { label: 'Good Moral Certificate',     icon: <Shield size={16} /> },
  { label: 'Diploma & Authentication',   icon: <Award size={16} /> },
  { label: 'ID Issuance',               icon: <CreditCard size={16} /> },
  { label: 'Shifting / Cross-enrollment', icon: <Shuffle size={16} /> },
  { label: 'Other Registrar Concern',    icon: <HelpCircle size={16} /> },
]

const ACCOUNTING_SERVICES: { label: string; icon: React.ReactNode }[] = [
  { label: 'Tuition Fee Payment',        icon: <DollarSign size={16} /> },
  { label: 'Scholarship / Financial Aid', icon: <GraduationCap size={16} /> },
  { label: 'Fee Assessment',             icon: <Receipt size={16} /> },
  { label: 'Clearance Processing',       icon: <CheckCircle2 size={16} /> },
  { label: 'Refund Request',             icon: <RotateCcw size={16} /> },
  { label: 'Receipt Re-issuance',        icon: <FileText size={16} /> },
  { label: 'Billing Dispute',            icon: <AlertTriangle size={16} /> },
  { label: 'Other Accounting Concern',   icon: <HelpCircle size={16} /> },
]

// ── Step progress bar ─────────────────────────────────────────────────────────

const STEPS = ['Department', 'Category', 'Details'] as const

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((label, idx) => {
        const stepNum = idx + 1
        const done    = stepNum < current
        const active  = stepNum === current
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-ui transition-all duration-300 ${
                done   ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' :
                active ? 'bg-ascb-orange text-white shadow-lg shadow-ascb-orange/30 scale-110' :
                         'bg-white/10 text-gray-500 border border-white/15'
              }`}>
                {done ? <Check size={14} /> : stepNum}
              </div>
              <span className={`text-[10px] font-ui uppercase tracking-widest hidden sm:block transition-colors duration-300 ${
                active ? 'text-ascb-orange' : done ? 'text-green-400' : 'text-gray-600'
              }`}>{label}</span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`h-0.5 w-12 sm:w-20 mx-1 transition-all duration-500 ${
                stepNum < current ? 'bg-green-500' : 'bg-white/10'
              }`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function SubmitPage() {
  const [step, setStep]               = useState<1 | 2 | 3>(1)
  const [direction, setDirection]     = useState<'forward' | 'backward'>('forward')
  const [department, setDepartment]   = useState<'Registrar' | 'Accounting Office' | ''>('')
  const [serviceCategory, setService] = useState('')
  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [anonymous, setAnonymous]     = useState(false)
  const [isLoading, setIsLoading]     = useState(false)
  const [submitted, setSubmitted]     = useState(false)

  const services = department === 'Registrar' ? REGISTRAR_SERVICES : ACCOUNTING_SERVICES

  const goTo = (next: 1 | 2 | 3, dir: 'forward' | 'backward') => {
    setDirection(dir)
    setStep(next)
  }

  const animClass = direction === 'forward' ? 'animate-slide-in-left' : 'animate-slide-in-right'

  // ── Step 1: Department ──────────────────────────────────────────────────────

  const Step1 = (
    <div key="step1" className={animClass}>
      <p className="text-center text-gray-400 text-sm font-body mb-6">
        Which office would you like to send your feedback to?
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {([
          {
            id: 'Registrar' as const,
            icon: <BookOpen size={32} className="text-ascb-orange" />,
            desc: 'Enrollment, TOR, certificates, ID issuance, and academic records',
          },
          {
            id: 'Accounting Office' as const,
            icon: <Calculator size={32} className="text-ascb-gold" />,
            desc: 'Tuition fees, scholarships, billing, clearance, and refunds',
          },
        ] as { id: 'Registrar' | 'Accounting Office'; icon: React.ReactNode; desc: string }[]).map(d => {
          const selected = department === d.id
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => {
                setDepartment(d.id)
                setService('')
                setTimeout(() => goTo(2, 'forward'), 180)
              }}
              className={`group relative flex flex-col items-center text-center gap-3 p-6 rounded-2xl border-2 transition-all duration-200 active:scale-95 ${
                selected
                  ? 'border-ascb-orange bg-ascb-orange/12 shadow-lg shadow-ascb-orange/20'
                  : 'border-white/10 bg-white/3 hover:border-ascb-orange/40 hover:bg-white/6'
              }`}
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                selected ? 'bg-ascb-orange/20' : 'bg-white/5 group-hover:bg-ascb-orange/10'
              }`}>
                {d.icon}
              </div>
              <div>
                <p className={`font-bold font-ui text-base mb-1 transition-colors ${selected ? 'text-ascb-orange' : 'text-white'}`}>
                  {d.id}
                </p>
                <p className="text-xs text-gray-400 font-body leading-relaxed">{d.desc}</p>
              </div>
              {selected && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-ascb-orange flex items-center justify-center">
                  <Check size={11} className="text-white" />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )

  // ── Step 2: Service Category ────────────────────────────────────────────────

  const Step2 = (
    <div key="step2" className={animClass}>
      <p className="text-center text-gray-400 text-sm font-body mb-6">
        Select the service your feedback is about —{' '}
        <span className="text-ascb-orange font-semibold">{department}</span>
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-6">
        {services.map(svc => {
          const selected = serviceCategory === svc.label
          return (
            <button
              key={svc.label}
              type="button"
              onClick={() => setService(svc.label)}
              className={`flex flex-col items-center text-center gap-2 p-3 rounded-xl border transition-all duration-150 active:scale-95 ${
                selected
                  ? 'border-ascb-orange bg-ascb-orange/12 text-ascb-orange shadow-md shadow-ascb-orange/15'
                  : 'border-white/10 bg-white/3 text-gray-400 hover:border-ascb-orange/30 hover:text-white hover:bg-white/6'
              }`}
            >
              <span className={`transition-colors ${selected ? 'text-ascb-orange' : 'text-gray-500'}`}>{svc.icon}</span>
              <span className="text-xs font-ui font-medium leading-tight">{svc.label}</span>
              {selected && <Check size={10} className="text-ascb-orange" />}
            </button>
          )
        })}
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => goTo(1, 'backward')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 text-gray-400 hover:text-white hover:border-white/30 text-sm font-ui transition-all"
        >
          <ArrowLeft size={15} /> Back
        </button>
        <button
          type="button"
          disabled={!serviceCategory}
          onClick={() => goTo(3, 'forward')}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-ascb-orange hover:bg-ascb-orange-dark text-white text-sm font-semibold font-ui transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
        >
          Continue <ArrowRight size={15} />
        </button>
      </div>
    </div>
  )

  // ── Step 3: Feedback Details ────────────────────────────────────────────────

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) {
      toast.error('Please fill in all required fields.')
      return
    }
    setIsLoading(true)
    try {
      await submitSuggestion({
        department,
        service_category: serviceCategory,
        user_role: 'Student',
        title,
        description,
        anonymous,
      })
      setSubmitted(true)
      toast.success('Feedback submitted successfully!')
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Submission failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const Step3 = (
    <div key="step3" className={animClass}>
      <div className="flex flex-wrap gap-2 mb-5">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ascb-orange/15 border border-ascb-orange/30 text-ascb-orange text-xs font-semibold font-ui">
          <Building2 size={11} /> {department}
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/8 border border-white/15 text-gray-300 text-xs font-ui">
          {serviceCategory}
        </span>
      </div>

      <OfficeHoursBanner department={department} />

      <form onSubmit={handleSubmit} className="space-y-5">
        {anonymous && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 animate-fade-in">
            <AlertCircle size={15} className="text-yellow-400 mt-0.5 shrink-0" />
            <p className="text-yellow-300 text-xs font-body">Your name will be hidden from the recipient. Only admins can see anonymized submissions.</p>
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-ui">Subject / Title *</label>
            <span className={`text-xs font-ui tabular-nums transition-colors ${title.length > 140 ? 'text-yellow-400' : 'text-gray-600'}`}>
              {title.length} / 150
            </span>
          </div>
          <input
            type="text"
            value={title}
            onChange={e => { if (e.target.value.length <= 150) setTitle(e.target.value) }}
            required
            placeholder="e.g. Request for faster TOR processing"
            className="input-field"
            maxLength={150}
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-ui">Feedback Details *</label>
            <span className={`text-xs font-ui tabular-nums transition-colors ${description.length > 1800 ? 'text-red-400' : description.length > 1500 ? 'text-yellow-400' : 'text-gray-600'}`}>
              {description.length} / 2000
            </span>
          </div>
          <textarea
            value={description}
            onChange={e => { if (e.target.value.length <= 2000) setDescription(e.target.value) }}
            required
            rows={6}
            placeholder="Describe your feedback or concern in detail. Include context, impact, and any suggestions for improvement…"
            className="input-field resize-none leading-relaxed font-body"
          />
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-ascb-navy-dark border border-white/8 hover:border-white/15 transition-colors">
          <div className="flex items-center gap-3">
            {anonymous
              ? <EyeOff size={18} className="text-yellow-400 transition-colors" />
              : <Eye   size={18} className="text-gray-400 transition-colors" />
            }
            <div>
              <p className="text-sm font-medium text-white font-ui">Submit Anonymously</p>
              <p className="text-xs text-gray-500 font-body">Hide your name from the recipient</p>
            </div>
          </div>
          <button
            type="button"
            aria-checked={anonymous}
            role="switch"
            onClick={() => setAnonymous(!anonymous)}
            className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-ascb-navy-dark ${anonymous ? 'bg-ascb-orange focus:ring-ascb-orange' : 'bg-white/10 focus:ring-white/30'}`}
          >
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${anonymous ? 'left-7' : 'left-1'}`} />
          </button>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => goTo(2, 'backward')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 text-gray-400 hover:text-white hover:border-white/30 text-sm font-ui transition-all"
          >
            <ArrowLeft size={15} /> Back
          </button>
          <Button type="submit" isLoading={isLoading} size="lg" className="flex-1">
            <Send size={16} /> Submit Feedback
          </Button>
        </div>
      </form>
    </div>
  )

  // ── Success state ─────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 animate-scale-in text-center">
        <div className="glass rounded-3xl p-10 border border-green-500/20">
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center">
              <CheckCircle2 size={42} className="text-green-400" />
            </div>
            <div className="absolute inset-0 rounded-full bg-green-400/20 animate-ping" style={{ animationDuration: '2s' }} />
          </div>
          <h2 className="text-2xl font-bold text-white font-display mb-2">Feedback Submitted!</h2>
          <p className="text-gray-400 text-sm font-body mb-1">
            Your feedback has been sent to the <span className="text-white font-semibold">{department}</span> office.
          </p>
          <p className="text-gray-500 text-xs font-ui mb-2">
            Category: <span className="text-ascb-gold">{serviceCategory}</span>
          </p>
          <p className="text-gray-500 text-xs font-ui mb-8">
            We'll review it and update the status. You can track it in My Submissions.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                setStep(1); setDepartment(''); setService('')
                setTitle(''); setDescription(''); setAnonymous(false); setSubmitted(false)
              }}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-gray-300 hover:text-white hover:border-white/30 text-sm font-ui transition-all"
            >
              <Plus size={15} /> Submit Another
            </button>
            <Link
              to="/user/submissions"
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-ascb-orange hover:bg-ascb-orange-dark text-white text-sm font-semibold font-ui transition-all hover:shadow-lg hover:shadow-ascb-orange/25 active:scale-95"
            >
              View My Submissions <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Page shell ────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-8 bg-ascb-orange rounded-full" />
          <h1 className="text-3xl font-bold text-white font-display">Submit Feedback</h1>
        </div>
        <p className="text-gray-400 text-sm font-body ml-3">
          Your feedback helps improve ASCB services. All submissions are reviewed by the concerned office.
        </p>
      </div>

      <div className="glass rounded-2xl p-6 sm:p-8 overflow-hidden">
        <StepBar current={step} />
        {step === 1 && Step1}
        {step === 2 && Step2}
        {step === 3 && Step3}
      </div>
    </div>
  )
}
