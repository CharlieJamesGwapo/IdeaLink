import { Megaphone } from 'lucide-react'
import type { Announcement } from '../../types'

interface Props {
  announcement: Announcement
}

export function AnnouncementCard({ announcement }: Props) {
  const date = new Date(announcement.date_posted).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="bg-navy-light rounded-xl p-5 border border-navy hover:border-accent/40 transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
          <Megaphone size={18} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm leading-snug">{announcement.title}</h3>
          <p className="mt-1 text-gray-400 text-sm leading-relaxed">{announcement.message}</p>
          <p className="mt-2 text-xs text-gray-500">{date}</p>
        </div>
      </div>
    </div>
  )
}
