import { useEffect } from 'react'
import { useAnnouncements } from '../../hooks/useAnnouncements'
import { AnnouncementCard } from '../../components/shared/AnnouncementCard'
import { Skeleton } from '../../components/ui/Skeleton'
import { Megaphone } from 'lucide-react'
import client from '../../api/client'

export function AnnouncementsPage() {
  const { announcements, isLoading } = useAnnouncements()

  useEffect(() => {
    client.get('/api/auth/me').catch(() => {})
  }, [])

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-8 bg-ascb-orange rounded-full" />
          <h1 className="text-3xl font-bold text-white font-display">Announcements</h1>
        </div>
        <p className="text-gray-400 text-sm font-body ml-3">
          Stay updated with the latest news from Andres Soriano Colleges of Bislig.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-20 glass rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-ascb-orange/10 flex items-center justify-center mx-auto mb-4">
            <Megaphone size={28} className="text-ascb-orange" />
          </div>
          <p className="text-gray-300 font-semibold font-ui">No announcements yet</p>
          <p className="text-gray-500 text-sm mt-1 font-body">Check back soon for updates from administration.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a, i) => (
            <div key={a.id} className="animate-fade-in" style={{ animationDelay: `${i * 60}ms`, opacity: 0, animationFillMode: 'forwards' }}>
              <AnnouncementCard announcement={a} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
