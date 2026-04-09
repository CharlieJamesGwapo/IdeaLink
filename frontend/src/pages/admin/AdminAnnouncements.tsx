import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useAnnouncements } from '../../hooks/useAnnouncements'
import { createAnnouncement, updateAnnouncement, deleteAnnouncement } from '../../api/announcements'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Skeleton } from '../../components/ui/Skeleton'
import type { Announcement } from '../../types'

export function AdminAnnouncements() {
  const { announcements, isLoading, refetch } = useAnnouncements()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const openCreate = () => { setEditing(null); setTitle(''); setMessage(''); setIsModalOpen(true) }
  const openEdit = (a: Announcement) => { setEditing(a); setTitle(a.title); setMessage(a.message); setIsModalOpen(true) }

  const handleSave = async () => {
    if (!title.trim() || !message.trim()) return toast.error('Title and message are required')
    setIsSaving(true)
    try {
      if (editing) { await updateAnnouncement(editing.id, title, message); toast.success('Announcement updated') }
      else { await createAnnouncement(title, message); toast.success('Announcement created') }
      setIsModalOpen(false); refetch()
    } catch { toast.error('Failed to save announcement') }
    finally { setIsSaving(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this announcement?')) return
    try { await deleteAnnouncement(id); toast.success('Deleted'); refetch() }
    catch { toast.error('Failed to delete') }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Announcements</h1>
        <Button size="sm" onClick={openCreate}><Plus size={16} className="mr-1" /> New</Button>
      </div>
      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : announcements.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No announcements yet.</p>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="bg-navy rounded-xl p-4 border border-navy-light flex items-start justify-between gap-4">
              <div>
                <h3 className="font-medium text-white text-sm">{a.title}</h3>
                <p className="text-gray-400 text-sm mt-1 line-clamp-2">{a.message}</p>
                <p className="text-gray-600 text-xs mt-1">{new Date(a.date_posted).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button size="sm" variant="ghost" onClick={() => openEdit(a)}><Pencil size={14} /></Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(a.id)}><Trash2 size={14} /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? 'Edit Announcement' : 'New Announcement'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-navy-dark border border-navy-light rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Message</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4}
              className="w-full bg-navy-dark border border-navy-light rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button isLoading={isSaving} onClick={handleSave}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
