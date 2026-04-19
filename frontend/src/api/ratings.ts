import client from './client'

export interface RatingGroup {
  department: string
  category: string
  count: number
  average: number
  breakdown: Record<string, number> // "1".."5" -> count
}

export const getRatingsSummary = () =>
  client.get<RatingGroup[]>('/api/ratings-summary')

// Converts rating groups into a flat CSV blob the browser can download.
export function ratingsToCSV(groups: RatingGroup[]): string {
  const header = ['Department', 'Category', 'Count', 'Average', '1★', '2★', '3★', '4★', '5★']
  const rows = groups.map(g => [
    g.department,
    g.category,
    g.count,
    g.average.toFixed(2),
    g.breakdown['1'] ?? 0,
    g.breakdown['2'] ?? 0,
    g.breakdown['3'] ?? 0,
    g.breakdown['4'] ?? 0,
    g.breakdown['5'] ?? 0,
  ])
  const esc = (v: unknown) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [header, ...rows].map(r => r.map(esc).join(',')).join('\n')
}

export function downloadRatingsCSV(groups: RatingGroup[], filename = 'ratings-summary.csv') {
  const csv = ratingsToCSV(groups)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
