import { useEffect, useState } from 'react'
import { useAnnouncements } from '../../hooks/useAnnouncements'
import { useAnnouncementUnread } from '../../hooks/useAnnouncementUnread'
import { AnnouncementCard } from '../../components/shared/AnnouncementCard'
import { Skeleton } from '../../components/ui/Skeleton'
import { Megaphone, RefreshCw, Search } from 'lucide-react'

export function AnnouncementsPage() {
  const { announcements, isLoading, error, refetch } = useAnnouncements()
  const { clear } = useAnnouncementUnread()
  const [search, setSearch] = useState('')

  // Mark announcements as seen once the user lands on this page.
  useEffect(() => { clear() }, [clear])

  const filtered = search.trim()
    ? announcements.filter(a =>
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.message.toLowerCase().includes(search.toLowerCase())
      )
    : announcements

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 animate-fade-in">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-8 bg-ascb-orange rounded-full" />
            <h1 className="text-3xl font-bold text-white font-display">Announcements</h1>
          </div>
          <p className="text-gray-400 text-sm font-body ml-3">
            Stay updated with the latest news from ASCB.
          </p>
        </div>
        {announcements.length > 0 && (
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search announcements…"
              className="input-field pl-9 text-sm"
              style={{ height: '40px', width: '220px' }}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm font-ui mb-4">
          <span className="flex-1">{error}</span>
          <button onClick={refetch} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors shrink-0">
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 glass rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-ascb-orange/10 flex items-center justify-center mx-auto mb-4">
            <Megaphone size={28} className="text-ascb-orange" />
          </div>
          <p className="text-gray-300 font-semibold font-ui">
            {search ? 'No matching announcements' : 'No announcements yet'}
          </p>
          <p className="text-gray-500 text-sm mt-1 font-body">
            {search ? 'Try a different search term.' : 'Check back soon for updates from administration.'}
          </p>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="mt-4 text-xs text-ascb-orange hover:text-ascb-gold transition-colors font-ui"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {search && (
            <p className="text-xs text-gray-500 font-ui mb-1">{filtered.length} of {announcements.length} announcements</p>
          )}
          {filtered.map((a, i) => (
            <div key={a.id} className="animate-fade-in" style={{ animationDelay: `${i * 40}ms`, opacity: 0, animationFillMode: 'forwards' }}>
              <AnnouncementCard announcement={a} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
