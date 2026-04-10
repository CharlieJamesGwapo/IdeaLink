import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Send, Eye, EyeOff, AlertCircle, ChevronDown } from 'lucide-react'
import { submitSuggestion } from '../../api/suggestions'
import { Button } from '../../components/ui/Button'
import { OfficeHoursBanner } from '../../components/shared/OfficeHoursBanner'

const REGISTRAR_SERVICES = [
  'Enrollment / Registration',
  'Transcript of Records (TOR)',
  'Certificate of Enrollment',
  'Good Moral Certificate',
  'Diploma & Authentication',
  'ID Issuance',
  'Shifting / Cross-enrollment',
  'Other Registrar Concern',
]

const ACCOUNTING_SERVICES = [
  'Tuition Fee Payment',
  'Scholarship / Financial Aid',
  'Fee Assessment',
  'Clearance Processing',
  'Refund Request',
  'Receipt Re-issuance',
  'Billing Dispute',
  'Other Accounting Concern',
]

export function SubmitPage() {
  const [department, setDepartment] = useState('Registrar')
  const [serviceCategory, setServiceCategory] = useState(REGISTRAR_SERVICES[0])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const services = department === 'Registrar' ? REGISTRAR_SERVICES : ACCOUNTING_SERVICES

  const handleDeptChange = (dept: string) => {
    setDepartment(dept)
    setServiceCategory(dept === 'Registrar' ? REGISTRAR_SERVICES[0] : ACCOUNTING_SERVICES[0])
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
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
      toast.success('Feedback submitted successfully!')
      setTitle('')
      setDescription('')
      setServiceCategory(services[0])
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Submission failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-8 bg-ascb-orange rounded-full" />
          <h1 className="text-3xl font-bold text-white font-display">Submit Feedback</h1>
        </div>
        <p className="text-gray-400 text-sm font-body ml-3">
          Your feedback helps improve ASCB services. All submissions are reviewed by the concerned office.
        </p>
      </div>

      {/* Anonymous notice */}
      {anonymous && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 mb-5">
          <AlertCircle size={16} className="text-yellow-400 mt-0.5 shrink-0" />
          <p className="text-yellow-300 text-sm font-body">Your name will be hidden from the recipient. Only admins can see anonymized submissions.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 sm:p-8 space-y-6">

        {/* Department selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-ui">Office / Department *</label>
          <div className="grid grid-cols-2 gap-3">
            {['Registrar', 'Accounting Office'].map(dept => (
              <button
                key={dept}
                type="button"
                onClick={() => handleDeptChange(dept)}
                className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all font-ui ${
                  department === dept
                    ? 'bg-ascb-orange border-ascb-orange text-white shadow-lg shadow-ascb-orange/25'
                    : 'border-white/10 text-gray-400 hover:border-white/30 hover:text-white'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        {/* Office Hours Banner */}
        <OfficeHoursBanner department={department} />

        {/* Service Category */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-ui">Service Category *</label>
          <div className="relative">
            <select
              value={serviceCategory}
              onChange={e => setServiceCategory(e.target.value)}
              className="input-field appearance-none pr-10 cursor-pointer"
            >
              {services.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-ui">Subject / Title *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            placeholder="e.g. Request for faster TOR processing"
            className="input-field"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-ui">Feedback Details *</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
            rows={6}
            placeholder="Describe your feedback or concern in detail. Include context, impact, and any suggestions for improvement..."
            className="input-field resize-none leading-relaxed font-body"
          />
          <p className="text-xs text-gray-600 font-ui">{description.length} characters</p>
        </div>

        {/* Anonymous toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-ascb-navy-dark border border-white/10">
          <div className="flex items-center gap-3">
            {anonymous
              ? <EyeOff size={18} className="text-yellow-400" />
              : <Eye size={18} className="text-gray-400" />
            }
            <div>
              <p className="text-sm font-medium text-white font-ui">Submit Anonymously</p>
              <p className="text-xs text-gray-500 font-body">Hide your name from the recipient</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAnonymous(!anonymous)}
            className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none ${anonymous ? 'bg-ascb-orange' : 'bg-white/10'}`}
          >
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${anonymous ? 'left-7' : 'left-1'}`} />
          </button>
        </div>

        <Button type="submit" isLoading={isLoading} size="lg" className="w-full !bg-ascb-orange hover:!bg-ascb-orange-dark">
          <Send size={16} /> Submit Feedback
        </Button>
      </form>
    </div>
  )
}
