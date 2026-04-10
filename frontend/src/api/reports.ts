import type { Suggestion } from '../types'

export function exportToCSV(suggestions: Suggestion[], filename: string) {
  const headers = ['ID', 'Department', 'Service Category', 'Title', 'Status', 'Submitter', 'Date']
  const rows = suggestions.map(s => [
    s.id,
    s.department,
    s.service_category || '',
    `"${s.title.replace(/"/g, '""')}"`,
    s.status,
    s.anonymous ? 'Anonymous' : (s.submitter_name || 'Unknown'),
    new Date(s.submitted_at).toLocaleDateString('en-PH'),
  ])

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
