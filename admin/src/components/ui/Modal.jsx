import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { MdClose } from 'react-icons/md'

const Modal = ({ open, onClose, title, children, width = 'max-w-lg' }) => {
  // keyboard handler
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape' && open) onClose() }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // lock body scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // content ref and reset scroll when opening
  const contentRef = useRef(null)
  useEffect(() => {
    if (open && contentRef.current) {
      try { contentRef.current.scrollTop = 0 } catch (e) {}
    }
  }, [open])

  if (!open) return null

  const modal = (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`w-full ${width} mx-auto fade-in-up`}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          maxHeight: 'calc(100vh - var(--topbar-height, 72px) - 32px)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'var(--border)' }}
        >
          <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded transition-all hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
          >
            <MdClose size={20} />
          </button>
        </div>

        <div ref={contentRef} className="overflow-y-auto p-6" style={{ flex: '1 1 auto', WebkitOverflowScrolling: 'touch', paddingBottom: '96px' }}>
          {children}
        </div>
      </div>
    </div>
  )

  try {
    return createPortal(modal, document.body)
  } catch (e) {
    return modal
  }
}

export default Modal
