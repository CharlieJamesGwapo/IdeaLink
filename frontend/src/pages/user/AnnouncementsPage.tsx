import { useEffect } from 'react'
import { useAnnouncements } from '../../hooks/useAnnouncements'
import { AnnouncementCard } from '../../components/shared/AnnouncementCard'
import { Skeleton } from '../../components/ui/Skeleton'
import client from '../../api/client'

export function AnnouncementsPage() {
  const { announcements, isLoading } = useAnnouncements()

  useEffect(() => {
    client.get('/api/auth/me').catch(() => {})
  }, [])

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-white mb-8">Announcements</h1>
      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : announcements.length === 0 ? (
        <p className="text-center text-gray-500 py-12">No announcements yet.</p>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => <AnnouncementCard key={a.id} announcement={a} />)}
        </div>
      )}
    </div>
  )
}
