import { useEffect, useState } from 'react'
import { Mail, RefreshCw } from 'lucide-react'
import { Skeleton } from '../../components/ui/Skeleton'
import { getEmailLogs, type EmailLog } from '../../api/adminEmailLogs'

type KindFilter = '' | 'password_reset' | 'provisioning' | 'announcement'
type StatusFilter = '' | 'sent' | 'failed' | 'skipped'

const PAGE_SIZE = 50

export function AdminEmailLogs() {
  const [rows, setRows] = useState<EmailLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [kind, setKind] = useState<KindFilter>('')
  const [status, setStatus] = useState<StatusFilter>('')
  const [page, setPage] = useState(0)

  const load = () => {
    setIsLoading(true)
    setError(null)
    getEmailLogs({
      kind: kind || undefined,
      status: status || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    })
      .then(res => setRows(res.data ?? []))
      .catch(() => setError('Failed to load logs'))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => { load() }, [kind, status, page])

  return (
    <div className="animate-fade-in space-y-5 pb-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-8 bg-ascb-orange rounded-full" />
            <h1 className="text-2xl font-bold text-white font-display">Email Logs</h1>
          </div>
          <p className="text-gray-500 text-sm font-ui ml-3">
            Every email send attempt, newest first.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 bg-ascb-orange/10 hover:bg-ascb-orange/20 text-ascb-orange border border-ascb-orange/30 rounded-xl text-sm font-medium transition-all font-ui"
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={kind}
          onChange={e => { setKind(e.target.value as KindFilter); setPage(0) }}
          className="rounded-xl border border-white/15 px-3 py-2 text-white text-sm font-ui bg-ascb-navy/80"
        >
          <option value="">All kinds</option>
          <option value="password_reset">Password reset</option>
          <option value="provisioning">Provisioning</option>
          <option value="announcement">Announcement</option>
        </select>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value as StatusFilter); setPage(0) }}
          className="rounded-xl border border-white/15 px-3 py-2 text-white text-sm font-ui bg-ascb-navy/80"
        >
          <option value="">All statuses</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="skipped">Skipped</option>
        </select>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm font-ui">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-20 glass rounded-2xl">
          <Mail size={36} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium font-ui">No email logs</p>
          <p className="text-gray-600 text-sm mt-1 font-ui">
            {kind || status ? 'Try a different filter.' : 'Attempts will show up here as the app sends mail.'}
          </p>
        </div>
      ) : (
        <div className="bg-ascb-navy rounded-2xl border border-ascb-navy-mid overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-ascb-navy-mid bg-ascb-navy-dark">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">When</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kind</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr
                  key={row.id}
                  className={row.status === 'failed' ? 'bg-red-500/5' : undefined}
                >
                  <td className="px-4 py-3 text-gray-400 font-ui whitespace-nowrap">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-white font-ui break-all">{row.to}</td>
                  <td className="px-4 py-3 text-gray-300 font-ui whitespace-nowrap">{row.kind}</td>
                  <td className="px-4 py-3 font-ui whitespace-nowrap">
                    <span
                      className={
                        row.status === 'sent'    ? 'text-green-300' :
                        row.status === 'failed'  ? 'text-red-300'   :
                        row.status === 'skipped' ? 'text-yellow-300' : 'text-gray-300'
                      }
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-ui text-xs max-w-md break-all">
                    {row.error_msg ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-4 py-2 border-t border-ascb-navy-mid/70">
            <p className="text-xs text-gray-500 font-ui">
              Page {page + 1} · {rows.length} row{rows.length === 1 ? '' : 's'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-ascb-orange/50 disabled:opacity-30 text-xs font-ui"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={rows.length < PAGE_SIZE}
                className="px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-ascb-orange/50 disabled:opacity-30 text-xs font-ui"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
