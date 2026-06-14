import React, { useEffect, useState, useCallback, useMemo } from 'react'
import axios from 'axios'
import { backendUrl } from '../App'
import {
  MdSearch, MdRefresh, MdDelete, MdNotifications,
  MdCheckCircle, MdCancel, MdMeetingRoom, MdLogout,
  MdMessage, MdStar, MdAddCircle, MdMarkEmailRead
} from 'react-icons/md'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import notify from '../components/ui/Toast'

const TYPE_ICONS = {
  reservation_created: { icon: MdAddCircle, color: '#3B82F6', bg: '#EFF6FF', label: 'Reservation Created' },
  reservation_approved: { icon: MdCheckCircle, color: '#16A34A', bg: '#F0FDF4', label: 'Reservation Approved' },
  reservation_rejected: { icon: MdCancel, color: '#DC2626', bg: '#FEF2F2', label: 'Reservation Rejected' },
  reservation_cancelled: { icon: MdCancel, color: '#DC2626', bg: '#FEE2E2', label: 'Reservation Cancelled' },
  guest_checked_in: { icon: MdMeetingRoom, color: '#2563EB', bg: '#DBEAFE', label: 'Guest Checked In' },
  guest_checked_out: { icon: MdLogout, color: '#6B7280', bg: '#F3F4F6', label: 'Guest Checked Out' },
  new_message: { icon: MdMessage, color: '#D97706', bg: '#FEF3C7', label: 'New Message' },
  new_review: { icon: MdStar, color: '#D4AF37', bg: '#FFFBEB', label: 'New Review' },
}

const TYPE_LIST = Object.keys(TYPE_ICONS)

const timeAgo = (ts) => {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatDate = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  if (isNaN(d.getTime())) return String(ts)
  return d.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const PAGE_SIZE = 15

const Notifications = () => {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('All')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await axios.get(backendUrl + '/api/notification/list?limit=500', { headers: getAuthHeaders() })
      if (r.data?.success) {
        setNotifications(r.data.notifications || [])
        setUnreadCount(r.data.unreadCount || 0)
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load notifications'
      setError(msg)
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  const filtered = useMemo(() => {
    let result = notifications
    if (filterType !== 'All') {
      result = result.filter(n => n.type === filterType)
    }
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(n =>
        (n.message || '').toLowerCase().includes(q) ||
        (n.type || '').toLowerCase().includes(q)
      )
    }
    return result
  }, [notifications, search, filterType])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleMarkRead = async (id) => {
    try {
      const r = await axios.put(backendUrl + `/api/notification/read/${id}`, {}, { headers: getAuthHeaders() })
      if (r.data?.success) {
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))
        notify.success('Marked as read')
      }
    } catch {
      notify.error('Failed to mark as read')
    }
  }

  const handleMarkAllRead = async () => {
    try {
      const r = await axios.put(backendUrl + '/api/notification/read-all', {}, { headers: getAuthHeaders() })
      if (r.data?.success) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
        notify.success('All notifications marked as read')
      }
    } catch {
      notify.error('Failed to mark all as read')
    }
  }

  const deleteNotification = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const r = await axios.delete(backendUrl + `/api/notification/delete/${deleteTarget._id}`, { headers: getAuthHeaders() })
      if (r.data?.success) {
        notify.success('Notification deleted')
        if (!deleteTarget.read) setUnreadCount(prev => Math.max(0, prev - 1))
      }
      setDeleteTarget(null)
      await fetchNotifications()
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Delete failed'
      notify.error(msg)
      setDeleteTarget(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="fade-in-up" style={{ marginBottom: '32px' }}>
      <div className="flex flex-wrap items-start justify-between" style={{ gap: '16px', marginBottom: '32px' }}>
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#1E293B', fontFamily: "'Playfair Display', serif" }}>Notifications</h1>
            <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
              {notifications.length} total
              {unreadCount > 0 && (
                <span style={{ color: '#DC2626' }}> &middot; {unreadCount} unread</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center" style={{ gap: '8px' }}>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" icon={MdMarkEmailRead} onClick={handleMarkAllRead}>
              Mark All Read
            </Button>
          )}
          <Button variant="outline" size="sm" icon={MdRefresh} onClick={fetchNotifications}>Refresh</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center" style={{ gap: '16px', marginBottom: '24px' }}>
        <div className="relative flex-1 min-w-[200px]">
          <MdSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Search notifications..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="input-field"
            style={{ paddingLeft: '36px' }}
          />
        </div>
        <div className="flex flex-wrap p-1 rounded" style={{ gap: '4px', background: '#F8FAFC', border: '1px solid #E5E7EB' }}>
          <button
            onClick={() => { setFilterType('All'); setPage(1) }}
            className="px-3 py-1.5 rounded text-xs font-semibold transition-all"
            style={{
              background: filterType === 'All' ? '#2563EB' : 'transparent',
              color: filterType === 'All' ? '#fff' : '#6B7280',
            }}
          >
            All
          </button>
          {TYPE_LIST.map(type => (
            <button
              key={type}
              onClick={() => { setFilterType(type); setPage(1) }}
              className="px-3 py-1.5 rounded text-xs font-semibold transition-all"
              style={{
                background: filterType === type ? '#2563EB' : 'transparent',
                color: filterType === type ? '#fff' : '#6B7280',
              }}
            >
              {TYPE_ICONS[type].label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden" style={{ border: '1px solid #E5E7EB', borderRadius: '8px', background: '#FFFFFF' }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center" style={{ padding: '80px 0', color: '#94A3B8' }}>
            <svg className="animate-spin" fill="none" viewBox="0 0 24 24" style={{ width: '28px', height: '28px', marginBottom: '12px' }}>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <p className="text-sm font-medium">Loading notifications...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center" style={{ padding: '80px 0' }}>
            <p className="text-sm font-medium mb-3" style={{ color: '#DC2626' }}>{error}</p>
            <Button variant="primary" size="sm" icon={MdRefresh} onClick={fetchNotifications}>Retry</Button>
          </div>
        ) : paginated.length === 0 ? (
          <div className="text-center" style={{ padding: '80px 0', color: '#94A3B8' }}>
            <MdNotifications size={40} style={{ color: '#D1D5DB', margin: '0 auto 12px' }} />
            <p className="text-base font-medium">No notifications found</p>
            <p className="text-sm mt-1">
              {search || filterType !== 'All' ? 'Try a different search or filter' : 'No notifications yet. Actions on reservations will generate notifications.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full data-table">
                <thead>
                  <tr>
                    <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>Type</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>Message</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>Date &amp; Time</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>Status</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(n => {
                    const typeStyle = TYPE_ICONS[n.type] || { icon: MdNotifications, color: '#6B7280', bg: '#F3F4F6', label: n.type }
                    const Icon = typeStyle.icon
                    return (
                      <tr key={n._id} style={{ opacity: n.read ? 0.7 : 1 }}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0" style={{ background: typeStyle.bg }}>
                              <Icon size={15} style={{ color: typeStyle.color }} />
                            </div>
                            <span className="text-xs font-semibold" style={{ color: '#1E293B' }}>{typeStyle.label}</span>
                          </div>
                        </td>
                        <td>
                          <p className="text-xs" style={{ color: '#6B7280', maxWidth: '300px' }}>{n.message || '—'}</p>
                        </td>
                        <td><span className="text-xs whitespace-nowrap" style={{ color: '#6B7280' }}>{formatDate(n.createdAt)}</span></td>
                        <td>
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${n.read ? '' : 'badge-pending'}`}
                            style={{
                              background: n.read ? '#F1F5F9' : '#DBEAFE',
                              color: n.read ? '#6B7280' : '#1D4ED8',
                            }}>
                            {n.read ? 'Read' : 'Unread'}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center" style={{ gap: '6px' }}>
                            {!n.read && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleMarkRead(n._id) }}
                                className="w-9 h-9 rounded flex items-center justify-center transition-all hover:opacity-80"
                                style={{ background: '#EFF6FF', color: '#2563EB' }}
                                title="Mark as read"
                              >
                                <MdMarkEmailRead size={18} />
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteTarget(n) }}
                              className="w-9 h-9 rounded flex items-center justify-center transition-all hover:opacity-80"
                              style={{ background: '#FEF2F2', color: '#DC2626' }}
                              title="Delete"
                            >
                              <MdDelete size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t" style={{ borderColor: '#E5E7EB' }}>
                <p className="text-xs" style={{ color: '#94A3B8' }}>{filtered.length} results</p>
                <div className="flex items-center" style={{ gap: '6px' }}>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-8 h-8 rounded flex items-center justify-center disabled:opacity-40 transition-all text-sm"
                    style={{ border: '1px solid #E5E7EB', color: '#6B7280' }}
                  >
                    &lsaquo;
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setPage(i + 1)}
                      className="w-8 h-8 rounded text-xs font-medium transition-all"
                      style={{
                        background: page === i + 1 ? '#2563EB' : '#FFFFFF',
                        color: page === i + 1 ? '#fff' : '#6B7280',
                        border: `1px solid ${page === i + 1 ? '#2563EB' : '#E5E7EB'}`,
                      }}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="w-8 h-8 rounded flex items-center justify-center disabled:opacity-40 transition-all text-sm"
                    style={{ border: '1px solid #E5E7EB', color: '#6B7280' }}
                  >
                    &rsaquo;
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteNotification}
        title="Delete Notification"
        message={`Delete this notification? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  )
}

export default Notifications
