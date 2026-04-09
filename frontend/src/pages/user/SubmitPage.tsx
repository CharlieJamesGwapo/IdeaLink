import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
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
      <h1 className="text-2xl font-bold text-white mb-2">Submit a Suggestion</h1>
      <p className="text-gray-400 text-sm mb-8">Your feedback helps improve our school.</p>
      <form onSubmit={handleSubmit} className="bg-navy rounded-xl p-6 border border-navy-light space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Department</label>
            <select value={department} onChange={(e) => setDepartment(e.target.value)}
              className="w-full bg-navy-light border border-navy-light rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent">
              <option value="Registrar">Registrar</option>
              <option value="Accounting Office">Accounting Office</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Your Role</label>
            <select value={userRole} onChange={(e) => setUserRole(e.target.value)}
              className="w-full bg-navy-light border border-navy-light rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent">
              <option value="Student">Student</option>
              <option value="Faculty Staff">Faculty Staff</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
            placeholder="Brief summary of your suggestion"
            className="w-full bg-navy-light border border-navy-light rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={5}
            placeholder="Describe your suggestion in detail..."
            className="w-full bg-navy-light border border-navy-light rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none" />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="rounded border-navy-light" />
          <span className="text-sm text-gray-400">Submit anonymously</span>
        </label>
        <Button type="submit" isLoading={isLoading} className="w-full">Submit Suggestion</Button>
      </form>
    </div>
  )
}
