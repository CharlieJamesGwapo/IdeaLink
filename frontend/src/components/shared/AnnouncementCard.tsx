import { useState } from 'react'
import { Megaphone, Calendar, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import type { Announcement } from '../../types'

interface Props { announcement: Announcement }

export function AnnouncementCard({ announcement }: Props) {
  const [expanded, setExpanded] = useState(false)

  const date = new Date(announcement.date_posted).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const isRecent = Date.now() - new Date(announcement.date_posted).getTime() < 3 * 24 * 60 * 60 * 1000
  const isLong = announcement.message.length > 200

  return (
    <div className="group relative glass rounded-2xl p-5 hover:border-ascb-orange/30 transition-all duration-300 hover:-translate-y-0.5 border border-transparent">
      {/* Orange left accent */}
      <div className="absolute left-0 top-4 bottom-4 w-0.5 bg-gradient-to-b from-ascb-orange to-ascb-gold rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="flex items-start gap-4">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-ascb-orange/15 flex items-center justify-center group-hover:bg-ascb-orange/25 transition-colors duration-200">
          <Megaphone size={18} className="text-ascb-orange" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <h3 className="font-semibold text-white text-sm leading-snug font-ui">{announcement.title}</h3>
            {isRecent && (
              <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-ascb-orange/15 text-ascb-orange border border-ascb-orange/20 font-ui">
                <Sparkles size={8} /> New
              </span>
            )}
          </div>
          <p className={`text-gray-400 text-sm leading-relaxed font-body transition-all ${isLong && !expanded ? 'line-clamp-3' : ''}`}>
            {announcement.message}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1 text-xs text-ascb-orange hover:text-ascb-gold transition-colors mt-1.5 font-ui"
            >
              {expanded ? <><ChevronUp size={12}/>Show less</> : <><ChevronDown size={12}/>Read more</>}
            </button>
          )}
          <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-600 font-ui">
            <Calendar size={11} className="text-gray-600" />
            {date}
          </div>
        </div>
      </div>
    </div>
  )
}
