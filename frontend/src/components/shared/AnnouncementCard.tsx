import { Megaphone, Calendar } from 'lucide-react'
import type { Announcement } from '../../types'

interface Props { announcement: Announcement }

export function AnnouncementCard({ announcement }: Props) {
  const date = new Date(announcement.date_posted).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  const isRecent = (Date.now() - new Date(announcement.date_posted).getTime()) < 3 * 24 * 60 * 60 * 1000

  return (
    <div className="glass rounded-2xl p-5 hover:border-accent/30 transition-all duration-300 hover:-translate-y-0.5 group">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
          <Megaphone size={18} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-white text-sm leading-snug">{announcement.title}</h3>
            {isRecent && <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">New</span>}
          </div>
          <p className="mt-1.5 text-gray-400 text-sm leading-relaxed">{announcement.message}</p>
          <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-600">
            <Calendar size={11} />
            {date}
          </div>
        </div>
      </div>
    </div>
  )
}
