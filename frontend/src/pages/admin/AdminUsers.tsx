import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { UserPlus, Upload, CheckCircle2, AlertCircle, Download, Loader2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import {
  provisionUser, bulkProvisionUsers,
  type ProvisionResult, type BulkResult,
} from '../../api/adminUsers'
import axios from 'axios'

const LEVELS = ['HS', 'SHS', 'College'] as const
const DEPTS  = ['CCE', 'CTE', 'CABE', 'CCJE', 'TVET'] as const

const CSV_TEMPLATE = 'email,fullname,education_level,college_department\n' +
  'juan@ascb.edu.ph,Juan dela Cruz,College,CCE\n' +
  'maria@ascb.edu.ph,Maria Santos,HS,\n' +
  'pedro@ascb.edu.ph,Pedro Reyes,SHS,\n'

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'idealink-users-template.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function AdminUsers() {
  const [tab, setTab] = useState<'single' | 'bulk'>('single')

  // Single-user form state
  const [email, setEmail]       = useState('')
  const [fullname, setFullname] = useState('')
  const [level, setLevel]       = useState<'HS' | 'SHS' | 'College'>('HS')
  const [dept, setDept]         = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [lastResult, setLastResult] = useState<ProvisionResult | null>(null)

  // Bulk state
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null)

  const resetSingle = () => {
    setEmail(''); setFullname(''); setLevel('HS'); setDept('')
  }

  const handleSingle = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !fullname.trim()) {
      toast.error('Email and full name are required.')
      return
    }
    if (level === 'College' && !dept) {
      toast.error('Select a college department.')
      return
    }
    setSubmitting(true)
    setLastResult(null)
    try {
      const res = await provisionUser({
        email: email.trim(),
        fullname: fullname.trim(),
        education_level: level,
        college_department: level === 'College' ? (dept as any) : null,
      })
      setLastResult(res.data)
      toast.success(`Account created for ${res.data.email}`)
      resetSingle()
    } catch (err) {
      const data = axios.isAxiosError(err) ? (err.response?.data as ProvisionResult | undefined) : undefined
      if (data?.status) {
        setLastResult(data)
        toast.error(data.error ?? 'Could not create account')
      } else {
        toast.error('Could not create account')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleBulk = async (e: FormEvent) => {
    e.preventDefault()
    if (!file) {
      toast.error('Choose a CSV file first.')
      return
    }
    setUploading(true)
    setBulkResult(null)
    try {
      const res = await bulkProvisionUsers(file)
      setBulkResult(res.data)
      toast.success(`Processed ${res.data.results.length} row${res.data.results.length === 1 ? '' : 's'}`)
    } catch (err) {
      const msg = axios.isAxiosError(err) ? (err.response?.data?.error as string | undefined) : undefined
      toast.error(msg ?? 'Bulk upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-8 bg-ascb-orange rounded-full" />
          <h1 className="text-2xl font-bold text-white font-display">Provision Student Accounts</h1>
        </div>
        <p className="text-gray-500 text-sm mt-1 ml-3 font-body">
          Create accounts for students individually or in bulk. A temporary password is emailed automatically.
        </p>
      </div>

      <div className="flex gap-2">
        {([
          { id: 'single', label: 'Add single user', icon: <UserPlus size={14} /> },
          { id: 'bulk',   label: 'Bulk CSV upload', icon: <Upload size={14} /> },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-ui transition-all border ${
              tab === t.id
                ? 'bg-ascb-orange/15 text-ascb-orange border-ascb-orange/40'
                : 'border-white/10 text-gray-400 hover:text-white hover:border-white/20'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'single' && (
        <form onSubmit={handleSingle} className="glass rounded-2xl p-5 space-y-4 max-w-lg">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="student@ascb.edu.ph"
              className="input-field"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Full name</label>
            <input
              type="text"
              value={fullname}
              onChange={e => setFullname(e.target.value)}
              placeholder="Juan dela Cruz"
              className="input-field"
              required
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Education level</label>
              <select
                value={level}
                onChange={e => { setLevel(e.target.value as typeof LEVELS[number]); setDept('') }}
                className="input-field"
                style={{ background: 'rgba(13,31,60,0.85)' }}
              >
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            {level === 'College' && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">College dept</label>
                <select
                  value={dept}
                  onChange={e => setDept(e.target.value)}
                  className="input-field"
                  style={{ background: 'rgba(13,31,60,0.85)' }}
                  required
                >
                  <option value="">Select…</option>
                  {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            )}
          </div>

          <Button type="submit" isLoading={submitting} className="w-full">
            <UserPlus size={15} /> Create account & email credentials
          </Button>

          {lastResult && (
            <div className="space-y-3">
              <div className={`flex items-start gap-3 p-3 rounded-xl text-sm font-ui ${
                lastResult.status === 'created'
                  ? 'bg-green-500/10 border border-green-500/25 text-green-300'
                  : 'bg-red-500/10 border border-red-500/25 text-red-300'
              }`}>
                {lastResult.status === 'created' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <div className="flex-1">
                  <p className="font-semibold">
                    {lastResult.status === 'created' ? 'Account created' : lastResult.status === 'skipped' ? 'Skipped' : 'Error'}
                  </p>
                  <p className="text-xs opacity-80">
                    {lastResult.email}
                    {lastResult.error ? ` — ${lastResult.error}` : ''}
                  </p>
                  {lastResult.status === 'created' && lastResult.email_sent && (
                    <p className="text-xs opacity-80 mt-1">Welcome email sent with login details.</p>
                  )}
                </div>
              </div>

              {lastResult.status === 'created' && lastResult.email_sent === false && lastResult.temp_password && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 text-sm font-ui">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">Email didn't send — relay manually</p>
                    <p className="text-xs opacity-80 mt-0.5">
                      {lastResult.email_error ?? 'SMTP not configured or delivery failed.'}
                      {' '}Share this temporary password with the user. They should change it after login.
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="flex-1 text-sm font-mono bg-ascb-navy-dark border border-yellow-500/30 rounded-lg px-3 py-1.5 text-yellow-100 select-all break-all">
                        {lastResult.temp_password}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(lastResult.temp_password!)
                            .then(() => toast.success('Password copied'))
                            .catch(() => toast.error('Could not copy'))
                        }}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-xs font-semibold text-yellow-100 transition-all"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </form>
      )}

      {tab === 'bulk' && (
        <div className="space-y-4">
          <div className="glass rounded-2xl p-5 max-w-lg space-y-4">
            <div>
              <p className="text-sm text-gray-300 font-body mb-2">
                Upload a CSV with these columns:{' '}
                <code className="text-xs text-ascb-gold">email, fullname, education_level, college_department</code>
              </p>
              <button
                type="button"
                onClick={downloadTemplate}
                className="inline-flex items-center gap-2 text-xs text-ascb-orange hover:underline font-ui"
              >
                <Download size={12} /> Download template CSV
              </button>
            </div>

            <form onSubmit={handleBulk} className="space-y-3">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-300 font-ui
                           file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0
                           file:bg-ascb-orange/15 file:text-ascb-orange file:font-semibold
                           file:cursor-pointer hover:file:bg-ascb-orange/25"
              />
              <Button type="submit" disabled={!file || uploading}>
                {uploading ? <><Loader2 size={14} className="animate-spin" /> Uploading…</> : <><Upload size={14} /> Upload & provision</>}
              </Button>
            </form>
          </div>

          {bulkResult && (
            <div className="glass rounded-2xl p-5 max-w-3xl">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-sm font-ui text-green-300"><strong>{bulkResult.summary.created}</strong> created</span>
                <span className="text-sm font-ui text-yellow-300"><strong>{bulkResult.summary.skipped}</strong> skipped</span>
                <span className="text-sm font-ui text-red-300"><strong>{bulkResult.summary.error}</strong> error</span>
              </div>
              <div className="max-h-80 overflow-y-auto rounded-xl border border-white/8">
                <table className="w-full text-xs font-ui">
                  <thead className="bg-ascb-navy-dark sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium uppercase tracking-wider">Email</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium uppercase tracking-wider">Name</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium uppercase tracking-wider">Status</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium uppercase tracking-wider">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {bulkResult.results.map((r, i) => (
                      <tr key={i} className="hover:bg-white/3">
                        <td className="px-3 py-2 text-gray-300">{r.email}</td>
                        <td className="px-3 py-2 text-gray-400">{r.fullname}</td>
                        <td className={`px-3 py-2 font-semibold ${
                          r.status === 'created' ? 'text-green-400' :
                          r.status === 'skipped' ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>{r.status}</td>
                        <td className="px-3 py-2 text-gray-500">{r.error ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
