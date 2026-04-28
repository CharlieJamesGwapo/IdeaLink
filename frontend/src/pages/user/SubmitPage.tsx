import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Send, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, Plus,
  Check, BookOpen, Building2, Calculator, Star, Paperclip, X as XIcon,
} from 'lucide-react'
import { submitSuggestion, getWeeklyUsage, uploadSuggestionAttachment, type WeeklyUsage } from '../../api/suggestions'
import { listServices, type Service } from '../../api/services'
import { ServiceIcon } from '../../lib/serviceIcons'
import { Button } from '../../components/ui/Button'
import { OfficeHoursBanner } from '../../components/shared/OfficeHoursBanner'
import axios from 'axios'

// Service categories are loaded from /api/services?department=… so the admin
// Services page is the single source of truth — adding a service in the admin
// catalog instantly makes it pickable here on the user submission form.

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
  const [department, setDepartment]   = useState<'Registrar Office' | 'Finance Office' | ''>('')
  const [serviceCategory, setService] = useState('')
  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [anonymous, setAnonymous]     = useState(false)
  const [rating, setRating]           = useState<number>(0)
  const [attachments, setAttachments] = useState<File[]>([])
  const [isLoading, setIsLoading]     = useState(false)
  const [submitted, setSubmitted]     = useState(false)
  const [referenceID, setReferenceID] = useState<number | null>(null)
  const [usage, setUsage]             = useState<WeeklyUsage | null>(null)

  const fetchUsage = () => getWeeklyUsage().then(res => setUsage(res.data)).catch(() => {})
  useEffect(() => { fetchUsage() }, [])

  // Service catalog for the chosen department, loaded fresh whenever the
  // user picks a department. The list reflects whatever the admin has
  // configured at /admin/services.
  const [services, setServices] = useState<Service[]>([])
  const [servicesLoading, setServicesLoading] = useState(false)
  useEffect(() => {
    if (department !== 'Registrar Office' && department !== 'Finance Office') {
      setServices([])
      return
    }
    let cancelled = false
    setServicesLoading(true)
    listServices(department)
      .then(res => { if (!cancelled) setServices(res.data) })
      .catch(() => { if (!cancelled) toast.error('Could not load services') })
      .finally(() => { if (!cancelled) setServicesLoading(false) })
    return () => { cancelled = true }
  }, [department])

  const goTo = (next: 1 | 2 | 3, dir: 'forward' | 'backward') => {
    setDirection(dir)
    setStep(next)
  }

  const animClass = direction === 'forward' ? 'animate-slide-in-right' : 'animate-slide-in-left'

  // ── Step 1: Department ──────────────────────────────────────────────────────

  const Step1 = (
    <div key="step1" className={animClass}>
      <p className="text-center text-gray-400 text-sm font-body mb-6">
        Which office would you like to send your feedback to?
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {([
          {
            id: 'Registrar Office' as const,
            icon: <BookOpen size={32} className="text-ascb-orange" />,
            desc: 'Enrollment, TOR, certificates, ID issuance, and academic records',
          },
          {
            id: 'Finance Office' as const,
            icon: <Calculator size={32} className="text-ascb-gold" />,
            desc: 'Tuition fees, scholarships, billing, clearance, and refunds',
          },
        ] as { id: 'Registrar Office' | 'Finance Office'; icon: React.ReactNode; desc: string }[]).map(d => {
          const selected = department === d.id
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => {
                setDepartment(d.id)
                setService('')
                goTo(2, 'forward')
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
        {servicesLoading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl border border-white/10 bg-white/3 animate-pulse" />
          ))
        ) : services.length === 0 ? (
          <p className="col-span-2 sm:col-span-3 text-center text-sm text-gray-500 font-ui py-8">
            No services available for this office yet.
          </p>
        ) : (
          services.map(svc => {
            const selected = serviceCategory === svc.label
            return (
              <button
                key={svc.id}
                type="button"
                onClick={() => setService(svc.label)}
                className={`flex flex-col items-center text-center gap-2 p-3 rounded-xl border transition-all duration-150 active:scale-95 ${
                  selected
                    ? 'border-ascb-orange bg-ascb-orange/12 text-ascb-orange shadow-md shadow-ascb-orange/15'
                    : 'border-white/10 bg-white/3 text-gray-400 hover:border-ascb-orange/30 hover:text-white hover:bg-white/6'
                }`}
              >
                <span className={`transition-colors ${selected ? 'text-ascb-orange' : 'text-gray-500'}`}>
                  <ServiceIcon name={svc.icon_name} size={16} />
                </span>
                <span className="text-xs font-ui font-medium leading-tight">{svc.label}</span>
                {selected && <Check size={10} className="text-ascb-orange" />}
              </button>
            )
          })
        )}
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
    if (!department || !serviceCategory) {
      toast.error('Please go back and select a department and category.')
      return
    }
    if (!title.trim() || !description.trim()) {
      toast.error('Please fill in all required fields.')
      return
    }
    if (rating < 1 || rating > 5) {
      toast.error('Please rate the service before submitting.')
      return
    }
    if (usage && usage.used >= usage.limit) {
      toast.error(`Weekly limit reached. Resets ${new Date(usage.resets_at).toLocaleDateString('en-PH', { weekday: 'long' })}.`)
      return
    }
    setIsLoading(true)
    try {
      const res = await submitSuggestion({
        department,
        service_category: serviceCategory,
        user_role: 'Student',
        title,
        description,
        rating,
        anonymous,
      })
      const newID = res.data?.id ?? null
      setReferenceID(newID)

      // Upload any attachments after the suggestion exists. Failures are
      // reported but don't invalidate the submission itself.
      if (newID !== null && attachments.length > 0) {
        const uploadErrors: string[] = []
        for (const file of attachments) {
          try {
            await uploadSuggestionAttachment(newID, file)
          } catch (e) {
            const msg = axios.isAxiosError(e)
              ? (e.response?.data?.error as string | undefined) ?? e.message
              : 'upload failed'
            uploadErrors.push(`${file.name}: ${msg}`)
          }
        }
        if (uploadErrors.length > 0) {
          toast.error(`Some attachments failed: ${uploadErrors.join(', ')}`)
        }
      }

      setSubmitted(true)
      toast.success('Feedback received — thank you!')
      fetchUsage()
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        toast.error(err.response.data?.error ?? 'Weekly submission limit reached.')
        fetchUsage()
      } else {
        const msg = axios.isAxiosError(err) ? (err.response?.data?.error as string | undefined) : undefined
        toast.error(msg ?? 'Submission failed. Please try again.')
      }
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
            <label htmlFor="suggestion-title" className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-ui">Subject / Title *</label>
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
            id="suggestion-title"
            className="input-field"
            maxLength={150}
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="suggestion-description" className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-ui">Feedback Details *</label>
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
            id="suggestion-description"
            className="input-field resize-none leading-relaxed font-body"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-ui">Rate this service *</label>
          <div className="flex items-center gap-1.5 p-3 rounded-xl bg-ascb-navy-dark border border-white/8">
            {[1, 2, 3, 4, 5].map(n => {
              const active = rating >= n
              return (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} star${n === 1 ? '' : 's'}`}
                  onClick={() => setRating(rating === n ? 0 : n)}
                  className="p-1 transition-transform active:scale-90"
                >
                  <Star
                    size={26}
                    className={active ? 'text-ascb-gold' : 'text-gray-600 hover:text-gray-400 transition-colors'}
                    fill={active ? 'currentColor' : 'none'}
                  />
                </button>
              )
            })}
            {rating > 0 && (
              <button
                type="button"
                onClick={() => setRating(0)}
                className="ml-auto text-xs text-gray-500 hover:text-red-400 font-ui transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          <p className="text-[11px] text-gray-600 font-body">
            {rating === 0 ? 'Tap a star to rate the service you received.' :
              rating <= 2 ? 'Tell us what went wrong in the details above.' :
              rating === 3 ? 'Okay — share what could be better.' :
              'Thanks for the positive feedback!'}
          </p>
        </div>

        {/* Attachments */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-ui">
            Attachments (optional)
          </label>
          <div className="p-3 rounded-xl bg-ascb-navy-dark border border-white/8 space-y-2">
            {attachments.length > 0 && (
              <ul className="space-y-1.5">
                {attachments.map((file, i) => (
                  <li key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/8">
                    <Paperclip size={13} className="text-ascb-gold shrink-0" />
                    <span className="flex-1 min-w-0 text-xs text-white font-ui truncate">{file.name}</span>
                    <span className="text-[10px] text-gray-500 font-ui tabular-nums shrink-0">
                      {(file.size / 1024).toFixed(0)} KB
                    </span>
                    <button
                      type="button"
                      onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                      className="shrink-0 p-1 text-gray-500 hover:text-red-400 transition-colors"
                      aria-label={`Remove ${file.name}`}
                    >
                      <XIcon size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {attachments.length < 3 && (
              <label className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-white/15 text-xs font-ui text-gray-400 hover:text-ascb-orange hover:border-ascb-orange/40 cursor-pointer transition-colors">
                <Paperclip size={13} />
                Add file
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                  multiple
                  className="hidden"
                  onChange={e => {
                    const picked = Array.from(e.target.files ?? [])
                    const allowed: File[] = []
                    for (const f of picked) {
                      if (attachments.length + allowed.length >= 3) {
                        toast.error('Max 3 files per submission.')
                        break
                      }
                      if (f.size > 5 * 1024 * 1024) {
                        toast.error(`${f.name} exceeds the 5 MB limit.`)
                        continue
                      }
                      allowed.push(f)
                    }
                    if (allowed.length > 0) setAttachments(prev => [...prev, ...allowed])
                    // Clear the input so selecting the same file again re-fires.
                    e.target.value = ''
                  }}
                />
              </label>
            )}
            <p className="text-[11px] text-gray-600 font-body">
              JPG / PNG / GIF / WebP / PDF · up to 5 MB each · max 3 files
            </p>
          </div>
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
          <Button
            type="submit"
            isLoading={isLoading}
            disabled={(usage !== null && usage.used >= usage.limit) || rating < 1}
            size="lg"
            className="flex-1"
          >
            <Send size={16} />
            {usage !== null && usage.used >= usage.limit ? 'Weekly limit reached' : 'Submit Feedback'}
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

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/12 border border-green-500/30 text-green-300 text-[11px] font-bold font-ui uppercase tracking-wider mb-3">
            <CheckCircle2 size={11} /> Acknowledged
          </span>

          <h2 className="text-2xl font-bold text-white font-display mb-2">Thank you — we've received your feedback!</h2>
          <p className="text-gray-300 text-sm font-body mb-4 max-w-md mx-auto leading-relaxed">
            Your submission has been delivered to the <span className="text-white font-semibold">{department}</span>.
            A team member will review it and you'll be notified when the status changes.
          </p>

          {referenceID !== null && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-ascb-navy-dark/70 border border-white/10 mb-3">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-ui">Reference</span>
              <span className="text-sm font-mono font-semibold text-ascb-gold">#{String(referenceID).padStart(5, '0')}</span>
            </div>
          )}

          <p className="text-gray-500 text-xs font-ui mb-8">
            Category: <span className="text-ascb-gold">{serviceCategory}</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                setStep(1); setDepartment(''); setService('')
                setTitle(''); setDescription(''); setAnonymous(false); setSubmitted(false); setReferenceID(null); setRating(0); setAttachments([])
              }}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-gray-300 hover:text-white hover:border-white/30 text-sm font-ui transition-all"
            >
              <Plus size={15} /> Submit Another
            </button>
            <Link
              to="/user/submissions"
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-ascb-orange hover:bg-ascb-orange-dark text-white text-sm font-semibold font-ui transition-all hover:shadow-lg hover:shadow-ascb-orange/25 active:scale-95"
            >
              Track My Submissions <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Page shell ────────────────────────────────────────────────────────────

  const remaining = usage ? Math.max(0, usage.limit - usage.used) : null
  const limitReached = usage !== null && usage.used >= usage.limit
  const resetDate = usage ? new Date(usage.resets_at).toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric' }) : ''

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 animate-fade-in">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-8 bg-ascb-orange rounded-full" />
          <h1 className="text-3xl font-bold text-white font-display">Submit Feedback</h1>
        </div>
        <p className="text-gray-400 text-sm font-body ml-3">
          Your feedback helps improve ASCB services. All submissions are reviewed by the concerned office.
        </p>
      </div>

      {usage && (
        <div className={`mb-5 flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 font-ui ${
          limitReached
            ? 'bg-red-500/10 border-red-500/30'
            : usage.used >= usage.limit - 1
              ? 'bg-yellow-500/10 border-yellow-500/30'
              : 'bg-white/4 border-white/10'
        }`}>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {Array.from({ length: usage.limit }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    i < usage.used ? 'bg-ascb-orange' : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
            <div className="text-xs">
              <p className={`font-semibold ${limitReached ? 'text-red-300' : 'text-white'}`}>
                {usage.used} of {usage.limit} used this week
              </p>
              <p className="text-gray-500 text-[11px]">
                {limitReached
                  ? `Limit reached — resets ${resetDate}.`
                  : `${remaining} submission${remaining === 1 ? '' : 's'} left · resets ${resetDate}`}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="glass rounded-2xl p-6 sm:p-8 overflow-hidden">
        <StepBar current={step} />
        {step === 1 && Step1}
        {step === 2 && Step2}
        {step === 3 && Step3}
      </div>
    </div>
  )
}
