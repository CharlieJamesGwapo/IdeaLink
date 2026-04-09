import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Send, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { submitSuggestion } from '../../api/suggestions'
import { Button } from '../../components/ui/Button'

export function SubmitPage() {
  const [department, setDepartment] = useState('Registrar')
  const [userRole, setUserRole] = useState('Student')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await submitSuggestion({ department, user_role: userRole, title, description, anonymous })
      toast.success('Suggestion submitted successfully!')
      setTitle('')
      setDescription('')
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Submission failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Submit a Suggestion</h1>
        <p className="text-gray-400 text-sm mt-2">Your feedback helps improve ASCB. All submissions are reviewed.</p>
      </div>

      {anonymous && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 mb-6 animate-fade-in">
          <AlertCircle size={16} className="text-yellow-400 mt-0.5 shrink-0" />
          <p className="text-yellow-300 text-sm">Your name will be hidden from the recipient. Only admins can see anonymized submissions.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 sm:p-8 space-y-6">
        {/* Department + Role */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Department *</label>
            <select value={department} onChange={(e) => setDepartment(e.target.value)}
              className="w-full bg-navy-dark border border-navy-light rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all">
              <option value="Registrar">Registrar</option>
              <option value="Accounting Office">Accounting Office</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Your Role *</label>
            <select value={userRole} onChange={(e) => setUserRole(e.target.value)}
              className="w-full bg-navy-dark border border-navy-light rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all">
              <option value="Student">Student</option>
              <option value="Faculty Staff">Faculty Staff</option>
            </select>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Subject / Title *</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
            placeholder="e.g. Request for faster grade processing"
            className="input-field" />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Description *</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={6}
            placeholder="Describe your suggestion or concern in detail. Include context, impact, and any proposed solutions..."
            className="input-field resize-none leading-relaxed" />
          <p className="text-xs text-gray-600">{description.length} characters</p>
        </div>

        {/* Anonymous toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-navy-dark border border-navy-light">
          <div className="flex items-center gap-3">
            {anonymous ? <EyeOff size={18} className="text-yellow-400" /> : <Eye size={18} className="text-gray-400" />}
            <div>
              <p className="text-sm font-medium text-white">Submit Anonymously</p>
              <p className="text-xs text-gray-500">Hide your name from the recipient</p>
            </div>
          </div>
          <button type="button" onClick={() => setAnonymous(!anonymous)}
            className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none ${anonymous ? 'bg-accent' : 'bg-navy-light'}`}>
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${anonymous ? 'left-7' : 'left-1'}`} />
          </button>
        </div>

        <Button type="submit" isLoading={isLoading} size="lg" className="w-full">
          <Send size={16} /> Submit Suggestion
        </Button>
      </form>
    </div>
  )
}
