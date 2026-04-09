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
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Announcements</h1>
        <p className="text-gray-400 text-sm mt-2">Stay updated with the latest from administration</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}</div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-20 glass rounded-2xl">
          <Megaphone size={36} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No announcements yet</p>
          <p className="text-gray-600 text-sm mt-1">Check back soon for updates</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a, i) => (
            <div key={a.id} style={{ animationDelay: `${i * 60}ms` }} className="animate-fade-in">
              <AnnouncementCard announcement={a} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
