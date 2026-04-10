import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Calendar, Megaphone, Search } from 'lucide-react'
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
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? announcements.filter(a =>
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.message.toLowerCase().includes(search.toLowerCase())
      )
    : announcements

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
    <div className="animate-fade-in space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-8 bg-ascb-orange rounded-full" />
            <h1 className="text-2xl font-bold text-white font-display">Announcements</h1>
          </div>
          <p className="text-gray-500 text-sm mt-1 ml-3">
            {announcements.length} announcement{announcements.length !== 1 ? 's' : ''} · school-wide visibility
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> New Announcement
        </Button>
      </div>

      {/* Search bar (only show when there's something to search) */}
      {announcements.length > 3 && (
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search announcements…"
            className="input-field pl-9 text-sm"
            style={{ height: '40px' }}
          />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 glass rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-ascb-orange/10 flex items-center justify-center mx-auto mb-4">
            <Megaphone size={28} className="text-ascb-orange" />
          </div>
          <p className="text-gray-300 font-semibold font-ui">
            {search ? 'No matches found' : 'No announcements yet'}
          </p>
          <p className="text-gray-500 text-sm mt-1 font-body">
            {search ? 'Try a different search.' : 'Create your first announcement to notify students.'}
          </p>
          {!search && (
            <button
              onClick={openCreate}
              className="mt-5 flex items-center gap-2 mx-auto px-4 py-2.5 bg-ascb-orange/15 hover:bg-ascb-orange/25 border border-ascb-orange/30 text-ascb-orange rounded-xl text-sm font-ui transition-all"
            >
              <Plus size={14} /> Create Announcement
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {search && <p className="text-xs text-gray-500 font-ui">{filtered.length} of {announcements.length} results</p>}
          {filtered.map((a, i) => (
            <div key={a.id}
              className="glass rounded-2xl p-4 sm:p-5 hover:border-ascb-orange/25 transition-all duration-200 group animate-fade-in"
              style={{ animationDelay: `${i * 40}ms`, opacity: 0, animationFillMode: 'forwards' }}
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-ascb-orange/10 flex items-center justify-center group-hover:bg-ascb-orange/20 transition-colors">
                  <Megaphone size={17} className="text-ascb-orange" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-white text-sm leading-snug font-ui">{a.title}</h3>
                    <div className="flex gap-1 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(a)} aria-label="Edit announcement">
                        <Pencil size={13} />
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(a.id)} aria-label="Delete announcement">
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm mt-1 line-clamp-2 leading-relaxed font-body">{a.message}</p>
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-600 font-ui">
                    <Calendar size={11} />
                    {new Date(a.date_posted).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
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
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Announcement title…"
              className="input-field"
              maxLength={200}
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Message</label>
              <span className={`text-xs font-ui tabular-nums ${message.length > 900 ? 'text-yellow-400' : 'text-gray-600'}`}>
                {message.length} / 1000
              </span>
            </div>
            <textarea
              value={message}
              onChange={(e) => { if (e.target.value.length <= 1000) setMessage(e.target.value) }}
              rows={5}
              placeholder="Write your announcement…"
              className="input-field resize-none leading-relaxed"
            />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button isLoading={isSaving} onClick={handleSave}>
              {editing ? 'Save Changes' : 'Post Announcement'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
