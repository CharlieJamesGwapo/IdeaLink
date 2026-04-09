import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Calendar, Megaphone } from 'lucide-react'
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
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Announcements</h1>
          <p className="text-gray-500 text-sm mt-1">Manage school-wide announcements</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> New Announcement
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}</div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-20 glass rounded-2xl">
          <Megaphone size={36} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No announcements yet</p>
          <p className="text-gray-600 text-sm mt-1">Create your first announcement</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="glass rounded-2xl p-5 hover:border-accent/20 transition-all duration-200 group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Megaphone size={18} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white text-sm">{a.title}</h3>
                    <p className="text-gray-400 text-sm mt-1 line-clamp-2 leading-relaxed">{a.message}</p>
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-600">
                      <Calendar size={11} />
                      {new Date(a.date_posted).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(a)}><Pencil size={14} /></Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(a.id)}><Trash2 size={14} /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? 'Edit Announcement' : 'New Announcement'}>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Announcement title..."
              className="input-field" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Message</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5}
              placeholder="Write your announcement..."
              className="input-field resize-none leading-relaxed" />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button isLoading={isSaving} onClick={handleSave}>Save Announcement</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
