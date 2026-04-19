import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  maxWidth?: string
}

export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Body scroll lock + ESC key
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    // Focus the close button only if nothing inside the modal grabbed focus first
    // (e.g. an input with autoFocus). Otherwise we'd steal focus mid-typing.
    const t = setTimeout(() => {
      const active = document.activeElement as HTMLElement | null
      if (!panelRef.current?.contains(active)) {
        closeBtnRef.current?.focus()
      }
    }, 60)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', handler)
      clearTimeout(t)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      {/* Panel — slides up from bottom on mobile, scales in on desktop */}
      <div
        ref={panelRef}
        className={`relative w-full ${maxWidth} animate-scale-in border border-ascb-orange/15 max-h-[92vh] overflow-y-auto
          rounded-t-2xl sm:rounded-2xl shadow-2xl p-6`}
        style={{
          background: 'rgba(13, 31, 60, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* Drag handle on mobile */}
        <div className="sm:hidden w-10 h-1 rounded-full bg-white/20 mx-auto mb-4 -mt-1" />

        <div className="flex items-center justify-between mb-5">
          <h2 id="modal-title" className="text-lg font-semibold text-white font-display">{title}</h2>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close modal"
            className="text-gray-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10 shrink-0 -mr-1"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
