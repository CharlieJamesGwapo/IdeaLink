import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Eye, Trash2, Building2, Tag, User as UserIcon, Calendar, Star, Paperclip, FileText, Download, Upload } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import {
  listSuggestionAttachments,
  uploadSuggestionAttachment,
  attachmentDownloadURL,
  type SuggestionAttachment,
} from '../../api/suggestions'
import { useAuth } from '../../hooks/useAuth'
import type { Suggestion } from '../../types'

const MAX_ATTACHMENTS = 3
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
])

interface Props {
  suggestion: Suggestion
  showActions?: boolean
  showFeature?: boolean
  showDelete?: boolean
  // "staff" = registrar / finance (can toggle status)
  // "admin" = read-only; sees Unreviewed/Reviewed summary but no toggle
  viewer?: 'staff' | 'admin'
  onStatusChange?: (id: number, status: string) => void
  onOpen?: (id: number) => void
  onFeature?: (id: number) => void
  onDelete?: (id: number) => void
}

// Under the simplified flow the only toggle is Delivered ↔ Reviewed.
// Delivered is shown as "Unreviewed" in staff UI.
const nextStatusFor = (s: string) => (s === 'Reviewed' ? 'Delivered' : 'Reviewed')
const nextLabelFor  = (s: string) => (s === 'Reviewed' ? 'Unreviewed' : 'Reviewed')
const nextBtnColor  = (s: string) =>
  s === 'Reviewed'
    ? 'text-gray-400 border-gray-400/30 bg-gray-400/8 hover:bg-gray-400/15'
    : 'text-green-400 border-green-400/30 bg-green-400/8 hover:bg-green-400/15'

export function SuggestionRow({ suggestion, showActions, showFeature, showDelete, viewer = 'staff', onStatusChange, onOpen, onFeature, onDelete }: Props) {
  const [detailOpen, setDetailOpen] = useState(false)
  const [attachments, setAttachments] = useState<SuggestionAttachment[] | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { role } = useAuth()
  const canUpload = role === 'admin' || role === 'registrar' || role === 'accounting'

  // Load attachments lazily when the detail modal opens.
  useEffect(() => {
    if (!detailOpen) return
    let cancelled = false
    listSuggestionAttachments(suggestion.id)
      .then(res => { if (!cancelled) setAttachments(res.data) })
      .catch(() => { if (!cancelled) setAttachments([]) })
    return () => { cancelled = true }
  }, [detailOpen, suggestion.id])

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const current = attachments?.length ?? 0
    const remaining = MAX_ATTACHMENTS - current
    if (remaining <= 0) {
      toast.error(`Max ${MAX_ATTACHMENTS} files per feedback.`)
      return
    }
    const picked = Array.from(files).slice(0, remaining)
    if (files.length > remaining) {
      toast.error(`Only ${remaining} more file${remaining === 1 ? '' : 's'} allowed.`)
    }

    const valid: File[] = []
    for (const f of picked) {
      if (!ALLOWED_MIMES.has(f.type)) {
        toast.error(`${f.name}: only JPG / PNG / GIF / WebP / PDF allowed.`)
        continue
      }
      if (f.size > MAX_BYTES) {
        toast.error(`${f.name}: exceeds 5 MB limit.`)
        continue
      }
      valid.push(f)
    }
    if (valid.length === 0) return

    setUploading(true)
    const uploaded: SuggestionAttachment[] = []
    const failures: string[] = []
    for (const file of valid) {
      try {
        const res = await uploadSuggestionAttachment(suggestion.id, file)
        uploaded.push(res.data)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'upload failed'
        failures.push(`${file.name}: ${msg}`)
      }
    }
    if (uploaded.length > 0) {
      setAttachments(prev => [...(prev ?? []), ...uploaded])
      toast.success(`Uploaded ${uploaded.length} file${uploaded.length === 1 ? '' : 's'}.`)
    }
    if (failures.length > 0) {
      toast.error(failures.join(', '))
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDelete = () => {
    if (window.confirm(`Delete "${suggestion.title}"? This hides the feedback from all staff views.`)) {
      onDelete?.(suggestion.id)
    }
  }
  const date = new Date(suggestion.submitted_at).toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
  const name = suggestion.anonymous ? 'Anonymous' : (suggestion.submitter_name ?? 'Unknown')
  const next = nextStatusFor(suggestion.status)
  const hasDescription = suggestion.description && suggestion.description.trim().length > 0

  const openDetail = () => {
    setDetailOpen(true)
    onOpen?.(suggestion.id)
  }

  return (
    <>
      {/* ── Desktop row ── */}
      <tr className="border-b border-white/5 transition-colors group hidden md:table-row hover:bg-white/3">
        <td className="px-4 py-3 max-w-[260px]">
          <div className="flex items-start gap-1.5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => openDetail()}
                  className="text-left text-sm text-white font-medium font-ui leading-snug line-clamp-1 hover:text-ascb-orange transition-colors"
                >
                  {suggestion.title}
                </button>
                {/* Always-visible attachment indicator. Bright orange pill
                    when files exist; subtle gray "0" when none — that way
                    admin/staff can confirm at a glance whether an upload
                    actually landed instead of guessing. */}
                {(suggestion.attachment_count ?? 0) > 0 ? (
                  <span
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-ascb-orange text-white font-ui font-bold shadow-sm shadow-ascb-orange/40"
                    title={`${suggestion.attachment_count} attached file${suggestion.attachment_count === 1 ? '' : 's'}`}
                  >
                    <Paperclip size={11} strokeWidth={2.5} /> {suggestion.attachment_count}
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full text-gray-600 font-ui"
                    title="No files attached"
                  >
                    <Paperclip size={9} /> 0
                  </span>
                )}
              </div>
              {suggestion.service_category && (
                <span className="text-xs text-ascb-gold/70 mt-0.5 block truncate font-ui">{suggestion.service_category}</span>
              )}
            </div>
            <button
              onClick={() => openDetail()}
              title="View full feedback"
              className="shrink-0 p-1 text-gray-600 hover:text-ascb-orange transition-colors mt-0.5"
              aria-label="View full feedback"
            >
              <Eye size={13} />
            </button>
          </div>
        </td>
        <td className="px-4 py-3 hidden sm:table-cell">
          <span className="text-xs px-2.5 py-1 rounded-lg bg-ascb-navy-dark border border-white/10 text-gray-400 font-ui whitespace-nowrap">
            {suggestion.department}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-400 hidden md:table-cell font-ui">{name}</td>
        <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell font-ui whitespace-nowrap">{date}</td>
        <td className="px-4 py-3"><Badge status={suggestion.status} viewer="staff" /></td>
        {showActions && (
          <td className="px-4 py-3">
            <div className="flex items-center gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
              {viewer === 'staff' && (
                <button
                  onClick={() => onStatusChange?.(suggestion.id, next)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all font-ui font-semibold ${nextBtnColor(suggestion.status)}`}
                >
                  → {nextLabelFor(suggestion.status)}
                </button>
              )}
              {showFeature && (
                <Button size="sm" variant="outline" onClick={() => onFeature?.(suggestion.id)} className="text-xs py-1" title="Feature as testimonial">
                  ★
                </Button>
              )}
              {showDelete && (
                <button
                  onClick={handleDelete}
                  title="Delete feedback"
                  aria-label="Delete feedback"
                  className="text-xs p-1.5 rounded-lg border border-red-500/25 bg-red-500/8 text-red-400 hover:bg-red-500/15 hover:border-red-500/40 transition-all"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </td>
        )}
      </tr>

      {/* ── Mobile card ── */}
      <tr className="md:hidden border-b border-white/5">
        <td colSpan={99} className="px-3 py-3">
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                onClick={() => openDetail()}
                className="flex-1 min-w-0 text-left"
              >
                <p className="text-sm font-semibold text-white font-ui leading-snug">{suggestion.title}</p>
                {suggestion.service_category && (
                  <p className="text-xs text-ascb-gold/70 mt-0.5 font-ui">{suggestion.service_category}</p>
                )}
              </button>
              <Badge status={suggestion.status} viewer="staff" />
            </div>

            {hasDescription && (
              <button
                onClick={() => openDetail()}
                className="flex items-center gap-1.5 text-[11px] text-ascb-orange font-ui"
              >
                <Eye size={11} /> View full feedback
              </button>
            )}

            <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 font-ui">
              <span className="px-2 py-0.5 rounded-md bg-ascb-navy-dark border border-white/10 text-gray-400">
                {suggestion.department}
              </span>
              {(suggestion.attachment_count ?? 0) > 0 ? (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ascb-orange text-white font-bold shadow-sm shadow-ascb-orange/40"
                  title={`${suggestion.attachment_count} attached file${suggestion.attachment_count === 1 ? '' : 's'}`}
                >
                  <Paperclip size={11} strokeWidth={2.5} /> {suggestion.attachment_count}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-gray-600" title="No files attached">
                  <Paperclip size={9} /> 0
                </span>
              )}
              <span>{name}</span>
              <span className="ml-auto">{date}</span>
            </div>

            {showActions && (
              <div className="flex items-center gap-2 pt-0.5">
                {viewer === 'staff' && (
                  <button
                    onClick={() => onStatusChange?.(suggestion.id, next)}
                    className={`flex-1 text-center text-xs py-1.5 rounded-lg border transition-all font-ui font-semibold ${nextBtnColor(suggestion.status)}`}
                  >
                    → {nextLabelFor(suggestion.status)}
                  </button>
                )}
                {showFeature && (
                  <Button size="sm" variant="outline" onClick={() => onFeature?.(suggestion.id)} className="text-xs py-1">
                    ★ Feature
                  </Button>
                )}
                {showDelete && (
                  <button
                    onClick={handleDelete}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-red-500/25 bg-red-500/8 text-red-400 hover:bg-red-500/15 hover:border-red-500/40 font-ui font-semibold inline-flex items-center gap-1 transition-all"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </td>
      </tr>

      {/* ── Detail modal ── */}
      <Modal
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="Feedback Details"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-gray-500 font-ui mb-1">Subject</p>
            <h3 className="text-base font-semibold text-white font-display leading-snug">{suggestion.title}</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-ui">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-ascb-orange/10 border border-ascb-orange/25 text-ascb-orange">
              <Building2 size={11} /> {suggestion.department}
            </span>
            {suggestion.service_category && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-ascb-gold/10 border border-ascb-gold/25 text-ascb-gold">
                <Tag size={11} /> {suggestion.service_category}
              </span>
            )}
            <Badge status={suggestion.status} viewer="staff" />
          </div>

          {suggestion.rating != null && (
            <div className="flex items-center gap-2 text-xs font-ui">
              <span className="text-gray-500 uppercase tracking-wider text-[11px]">Rating</span>
              <span className="inline-flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map(n => (
                  <Star
                    key={n}
                    size={13}
                    className={n <= (suggestion.rating ?? 0) ? 'text-ascb-gold' : 'text-gray-700'}
                    fill={n <= (suggestion.rating ?? 0) ? 'currentColor' : 'none'}
                  />
                ))}
              </span>
              <span className="text-ascb-gold font-semibold">{suggestion.rating}/5</span>
            </div>
          )}

          <div>
            <p className="text-[11px] uppercase tracking-wider text-gray-500 font-ui mb-1.5">Message</p>
            <div className="rounded-xl bg-ascb-navy-dark/70 border border-white/8 px-4 py-3 max-h-[45vh] overflow-y-auto">
              {hasDescription ? (
                <p className="text-sm text-gray-200 font-body leading-relaxed whitespace-pre-wrap">{suggestion.description}</p>
              ) : (
                <p className="text-sm text-gray-500 font-body italic">No description provided.</p>
              )}
            </div>
          </div>

          {/* Attachments (loaded lazily when modal opens). Always rendered so
              admin/staff can confirm whether the user actually attached
              anything — "No files attached" is informative, not noise. */}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-gray-500 font-ui mb-1.5 flex items-center gap-1.5">
              <Paperclip size={11} /> Attachments{attachments ? ` (${attachments.length})` : ''}
            </p>
            {attachments === null && (
              <p className="text-xs text-gray-500 font-ui italic">Loading…</p>
            )}
            {attachments && attachments.length === 0 && (
              <p className="text-xs text-gray-500 font-ui italic px-3 py-2 rounded-lg bg-white/[0.02] border border-white/8">
                No files attached.
              </p>
            )}
            {canUpload && attachments && attachments.length < MAX_ATTACHMENTS && (
              <div className="mt-2">
                <label className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-ascb-orange/40 text-ascb-orange hover:bg-ascb-orange/10 cursor-pointer font-ui transition-colors">
                  <Upload size={13} />
                  {uploading ? 'Uploading…' : 'Add file'}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                    className="hidden"
                    disabled={uploading}
                    onChange={e => handleUpload(e.target.files)}
                  />
                </label>
                <p className="text-[10px] text-gray-500 font-ui mt-1">
                  JPG / PNG / GIF / WebP / PDF · up to 5 MB · {MAX_ATTACHMENTS - attachments.length} slot
                  {MAX_ATTACHMENTS - attachments.length === 1 ? '' : 's'} left
                </p>
              </div>
            )}
          </div>
          {attachments && attachments.length > 0 && (
            <div>
              <ul className="space-y-1.5">
                {attachments.map(att => {
                  const url = attachmentDownloadURL(suggestion.id, att.id)
                  const isImage = att.mime_type.startsWith('image/')
                  return (
                    <li
                      key={att.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-ascb-navy-dark/60 border border-white/8"
                    >
                      {isImage ? (
                        <a href={url} target="_blank" rel="noreferrer" className="shrink-0">
                          <img
                            src={url}
                            alt={att.filename}
                            className="w-10 h-10 rounded object-cover border border-white/10"
                          />
                        </a>
                      ) : (
                        <div className="w-10 h-10 rounded bg-ascb-orange/10 border border-ascb-orange/25 flex items-center justify-center shrink-0">
                          <FileText size={16} className="text-ascb-orange" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white font-ui truncate">{att.filename}</p>
                        <p className="text-[10px] text-gray-500 font-ui tabular-nums">
                          {(att.size_bytes / 1024).toFixed(0)} KB · {att.mime_type}
                        </p>
                      </div>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        download={att.filename}
                        className="shrink-0 p-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-ascb-orange hover:border-ascb-orange/40 transition-colors"
                        aria-label={`Download ${att.filename}`}
                      >
                        <Download size={13} />
                      </a>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-gray-500 font-ui pt-1">
            <span className="inline-flex items-center gap-1.5">
              <UserIcon size={11} /> {name}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={11} /> {date}
            </span>
          </div>
        </div>
      </Modal>
    </>
  )
}
