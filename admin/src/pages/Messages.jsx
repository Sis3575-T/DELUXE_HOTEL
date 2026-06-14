import React, { useEffect, useState, useCallback, useMemo } from 'react'
import axios from 'axios'
import { backendUrl } from '../App'
import {
  MdSearch, MdEmail, MdMarkEmailRead, MdDelete, MdReply,
  MdPerson, MdPhone, MdChevronLeft, MdChevronRight, MdRefresh, MdClose
} from 'react-icons/md'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import notify from '../components/ui/Toast'

const PAGE_SIZE = 5

const Messages = () => {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [replyTarget, setReplyTarget] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [replyLoading, setReplyLoading] = useState(false)

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await axios.get(backendUrl + '/api/message/list', { headers: getAuthHeaders() })
      setMessages(r.data?.messages || [])
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load messages'
      setError(msg)
      setMessages([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMessages() }, [fetchMessages])

  const unreadCount = useMemo(() => messages.filter(m => !m.read).length, [messages])

  const filtered = useMemo(() => {
    let result = messages
    if (filter === 'Unread') result = result.filter(m => !m.read)
    else if (filter === 'Read') result = result.filter(m => m.read)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(m =>
        (m.name || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q) ||
        (m.subject || '').toLowerCase().includes(q) ||
        (m.message || '').toLowerCase().includes(q)
      )
    }
    return result
  }, [messages, search, filter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const markAsRead = async (id) => {
    try {
      const r = await axios.put(backendUrl + `/api/message/update/${id}`,
        { read: true },
        { headers: getAuthHeaders() }
      )
      if (r.data?.success) {
        await fetchMessages()
      }
    } catch (err) {
      // silent
    }
  }

  const deleteMessage = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const r = await axios.delete(backendUrl + `/api/message/delete/${deleteTarget._id}`, { headers: getAuthHeaders() })
      if (r.data?.success) {
        notify.success('Message deleted')
      } else {
        notify.error(r.data?.message || 'Delete failed')
      }
      if (selected?._id === deleteTarget._id) setSelected(null)
      setDeleteTarget(null)
      await fetchMessages()
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Delete error'
      notify.error(msg)
      setDeleteTarget(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleSelect = async (msg) => {
    setSelected(msg)
    setPage(1)
    if (!msg.read) {
      await markAsRead(msg._id)
    }
  }

  return (
    <div className="fade-in-up" style={{ marginBottom: '32px' }}>
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: '#1E293B', fontFamily: "'Playfair Display', serif" }}>Messages</h1>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>{unreadCount} unread of {messages.length} total</p>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6 p-5" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
        <div className="relative flex-1 min-w-[200px]">
          <MdSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
          <input type="text" placeholder="Search by name, email, subject..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="input-field"
            style={{ paddingLeft: '36px' }}
          />
        </div>
        <div className="flex p-1 rounded" style={{ gap: '4px', background: '#F8FAFC', border: '1px solid #E5E7EB' }}>
          {['All', 'Unread', 'Read'].map(f => (
            <button key={f} onClick={() => { setFilter(f); setPage(1) }}
              className="px-3 py-1.5 rounded text-xs font-semibold transition-all"
              style={{
                background: filter === f ? '#2563EB' : 'transparent',
                color: filter === f ? '#fff' : '#6B7280',
              }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center" style={{ padding: '80px 0', color: '#94A3B8' }}>
          <svg className="animate-spin" fill="none" viewBox="0 0 24 24" style={{ width: '28px', height: '28px', marginBottom: '12px' }}>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <p className="text-sm font-medium">Loading messages...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center" style={{ padding: '80px 0' }}>
          <p className="text-sm font-medium mb-3" style={{ color: '#DC2626' }}>{error}</p>
          <Button variant="primary" size="sm" icon={MdRefresh} onClick={fetchMessages}>Retry</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 overflow-hidden" style={{ border: '1px solid #E5E7EB', borderRadius: '8px', background: '#FFFFFF' }}>
            {paginated.length === 0 ? (
              <div className="text-center py-16" style={{ color: '#94A3B8' }}>
                <MdEmail size={36} style={{ color: '#D1D5DB', margin: '0 auto 12px' }} />
                <p className="text-base font-medium">No messages found</p>
                <p className="text-sm mt-1">{search ? 'Try a different search term' : 'No messages yet'}</p>
              </div>
            ) : paginated.map(msg => (
              <div key={msg._id}
                onClick={() => handleSelect(msg)}
                className="flex items-start gap-3 px-4 py-4 border-b cursor-pointer transition-all"
                style={{
                  borderColor: '#E5E7EB',
                  background: selected?._id === msg._id ? 'rgba(37,99,235,0.04)' : !msg.read ? 'rgba(37,99,235,0.02)' : '#FFFFFF',
                }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: '#1E293B', color: '#D4AF37' }}>
                  {(msg.name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm truncate" style={{ color: '#1E293B' }}>
                      {msg.name}
                      {!msg.read && <span className="ml-2 w-2 h-2 rounded-full inline-block" style={{ background: '#3B82F6' }} />}
                    </p>
                    <span className="text-[10px] whitespace-nowrap" style={{ color: '#94A3B8' }}>{msg.date}</span>
                  </div>
                  <p className="text-xs font-medium mt-0.5 truncate" style={{ color: '#6B7280' }}>{msg.subject}</p>
                  <p className="text-xs mt-1 truncate" style={{ color: '#94A3B8' }}>{msg.message}</p>
                </div>
                <div className="flex items-center" style={{ gap: '8px', flexShrink: 0 }}>
                  {!msg.read && (
                    <button onClick={(e) => { e.stopPropagation(); markAsRead(msg._id) }}
                      className="w-9 h-9 rounded flex items-center justify-center transition-all hover:opacity-70"
                      style={{ background: '#EEF2FF', color: '#6366F1' }} title="Mark as read">
                      <MdMarkEmailRead size={18} />
                    </button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(msg) }}
                    className="w-9 h-9 rounded flex items-center justify-center transition-all hover:opacity-70"
                    style={{ background: '#FEF2F2', color: '#DC2626' }} title="Delete">
                    <MdDelete size={18} />
                  </button>
                </div>
              </div>
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
                <p className="text-xs" style={{ color: '#94A3B8' }}>{filtered.length} messages</p>
                <div className="flex items-center" style={{ gap: '6px' }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="w-8 h-8 rounded flex items-center justify-center disabled:opacity-40 transition-all"
                    style={{ border: '1px solid #E5E7EB', color: '#6B7280' }}>
                    <MdChevronLeft size={18} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button key={i} onClick={() => setPage(i + 1)}
                      className="w-8 h-8 rounded text-xs font-medium transition-all"
                      style={{
                        background: page === i + 1 ? '#2563EB' : 'transparent',
                        color: page === i + 1 ? '#fff' : '#6B7280',
                        border: `1px solid ${page === i + 1 ? '#2563EB' : '#E5E7EB'}`,
                      }}>
                      {i + 1}
                    </button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="w-8 h-8 rounded flex items-center justify-center disabled:opacity-40 transition-all"
                    style={{ border: '1px solid #E5E7EB', color: '#6B7280' }}>
                    <MdChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="overflow-hidden" style={{ border: '1px solid #E5E7EB', borderRadius: '8px', background: '#FFFFFF' }}>
            {selected ? (
              <div>
                <div className="p-5 border-b" style={{ borderColor: '#E5E7EB' }}>
                  <h3 className="font-semibold text-sm mb-1" style={{ color: '#1E293B' }}>{selected.subject}</h3>
                  <p className="text-xs" style={{ color: '#94A3B8' }}>{selected.date}</p>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                      style={{ background: '#1E293B', color: '#D4AF37' }}>
                      {(selected.name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: '#1E293B' }}>{selected.name}</p>
                      <div className="flex flex-col gap-0.5 mt-0.5">
                        <span className="flex items-center gap-1 text-xs" style={{ color: '#94A3B8' }}><MdEmail size={11} /> {selected.email}</span>
                        <span className="flex items-center gap-1 text-xs" style={{ color: '#94A3B8' }}><MdPhone size={11} /> {selected.phone || '—'}</span>
                      </div>
                    </div>
                  </div>
                    <div className="p-4 rounded" style={{ background: '#F8FAFC', border: '1px solid #E5E7EB' }}>
                      <p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>{selected.message}</p>
                    </div>
                    {selected.reply && (
                      <div className="p-4 rounded mt-3" style={{ background: '#EBF5FF', border: '1px solid #BFDBFE' }}>
                        <p className="text-xs font-semibold mb-1" style={{ color: '#1D4ED8' }}>Your Reply {selected.repliedAt ? `(${selected.repliedAt})` : ''}</p>
                        <p className="text-sm leading-relaxed" style={{ color: '#1E40AF' }}>{selected.reply}</p>
                      </div>
                    )}
                    <div className="flex gap-2 mt-4">
                    <Button variant="primary" size="sm" className="flex-1" onClick={() => { setReplyText(''); setReplyTarget(selected) }}>Reply</Button>
                    <Button variant="danger" size="sm" className="flex-1" onClick={() => setDeleteTarget(selected)}>Delete</Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <MdEmail size={36} style={{ color: '#D1D5DB' }} />
                <p className="mt-3 font-medium text-sm" style={{ color: '#6B7280' }}>Select a message</p>
                <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>Click on a message to view its details</p>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteMessage}
        title="Delete Message"
        message={`Delete message from ${deleteTarget?.name}? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
      />

      {replyTarget && (
        <div className="modal-overlay" onClick={() => setReplyTarget(null)}>
          <div className="w-full max-w-lg p-6 rounded-xl" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-base" style={{ color: '#1E293B' }}>Reply to {replyTarget.name}</h3>
              <button onClick={() => setReplyTarget(null)} className="p-1 rounded transition-all hover:bg-gray-100" style={{ color: '#94A3B8' }}>
                <MdClose size={20} />
              </button>
            </div>
            <div className="mb-4 p-3 rounded" style={{ background: '#F8FAFC', border: '1px solid #E5E7EB' }}>
              <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Original message:</p>
              <p className="text-sm" style={{ color: '#1E293B' }}>"{replyTarget.message}"</p>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Your Reply</label>
              <textarea className="input-field" rows={5} value={replyText} onChange={e => setReplyText(e.target.value)}
                placeholder="Type your reply here..." style={{ resize: 'vertical' }} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={() => setReplyTarget(null)}>Cancel</Button>
              <Button variant="primary" size="sm" loading={replyLoading} onClick={async () => {
                if (!replyText.trim()) return
                setReplyLoading(true)
                try {
                  const r = await axios.put(backendUrl + `/api/message/reply/${replyTarget._id}`,
                    { reply: replyText.trim() },
                    { headers: getAuthHeaders() }
                  )
                  if (r.data?.success) {
                    notify.success('Reply sent successfully')
                    setReplyTarget(null)
                    setReplyText('')
                    await fetchMessages()
                  } else {
                    notify.error(r.data?.message || 'Reply failed')
                  }
                } catch (err) {
                  notify.error(err.response?.data?.message || err.message || 'Error sending reply')
                } finally {
                  setReplyLoading(false)
                }
              }}>Send Reply</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Messages
