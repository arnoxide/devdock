import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  maxWidth?: string
}

export default function Dialog({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg'
}: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div
        className={`${maxWidth} w-full bg-dock-surface border border-dock-border rounded-xl shadow-2xl animate-fade-in`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-dock-border">
          <h3 className="text-sm font-semibold text-dock-text">{title}</h3>
          <button
            onClick={onClose}
            className="text-dock-muted hover:text-dock-text transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
