import type { Suggestion } from '../types'

/** Wrap a value in double-quotes, escaping any existing double-quotes */
function csvCell(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value)
  return `"${str.replace(/"/g, '""')}"`
}

export function exportToCSV(suggestions: Suggestion[], filename: string) {
  const headers = ['ID', 'Department', 'Service Category', 'Title', 'Description', 'Status', 'Rating', 'Submitter', 'Anonymous', 'Date']

  const rows = suggestions.map(s => [
    s.id,
    csvCell(s.department),
    csvCell(s.service_category),
    csvCell(s.title),
    csvCell(s.description),
    csvCell(s.status),
    csvCell(s.rating ?? ''),
    s.anonymous ? csvCell('Anonymous') : csvCell(s.submitter_name || 'Unknown'),
    csvCell(s.anonymous ? 'Yes' : 'No'),
    csvCell(new Date(s.submitted_at).toLocaleDateString('en-PH')),
  ])

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const bom = '\uFEFF' // UTF-8 BOM so Excel opens it correctly
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
