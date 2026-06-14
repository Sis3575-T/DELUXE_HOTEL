import React, { useState, useRef, useEffect, useCallback } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import {
  MdNotifications, MdDarkMode, MdLightMode, MdSearch,
  MdCheckCircle, MdCancel, MdMeetingRoom, MdLogout, MdMessage, MdStar, MdAddCircle
} from 'react-icons/md'
import { useTheme, useSettings, backendUrl } from '../App'

const getAuthHeaders = () => {
  const t = localStorage.getItem('adminToken')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

const typeIcons = {
  reservation_created: { icon: MdAddCircle, color: '#D4AF37' },
  reservation_approved: { icon: MdCheckCircle, color: '#16A34A' },
  reservation_rejected: { icon: MdCancel, color: '#DC2626' },
  reservation_cancelled: { icon: MdCancel, color: '#DC2626' },
  guest_checked_in: { icon: MdMeetingRoom, color: '#2563EB' },
  guest_checked_out: { icon: MdLogout, color: '#6B7280' },
  new_message: { icon: MdMessage, color: '#D97706' },
  new_review: { icon: MdStar, color: '#D4AF37' },
}

const timeAgo = (ts) => {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const Topbar = ({ setToken }) => {
  const { darkMode, setDarkMode, sidebarCollapsed } = useTheme()
  const { settings } = useSettings()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotif, setShowNotif] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [notifLoading, setNotifLoading] = useState(true)
  const notifRef = useRef(null)
  const profileRef = useRef(null)
  const headerRef = useRef(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const r = await axios.get(backendUrl + '/api/notification/list?limit=10', { headers: getAuthHeaders() })
      if (r.data?.success) {
        setNotifications(r.data.notifications || [])
        setUnreadCount(r.data.unreadCount || 0)
      }
    } catch {} finally {
      setNotifLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  useEffect(() => {
    const setVar = () => {
      try {
        const h = headerRef.current ? headerRef.current.offsetHeight : 72
        document.documentElement.style.setProperty('--topbar-height', `${h}px`)
      } catch (e) {}
    }
    setVar()
    window.addEventListener('resize', setVar)
    return () => window.removeEventListener('resize', setVar)
  }, [])

  const handleMarkAllRead = async () => {
    try {
      await axios.put(backendUrl + '/api/notification/read-all', {}, { headers: getAuthHeaders() })
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch {}
  }

  const handleMarkRead = async (id) => {
    try {
      await axios.put(backendUrl + '/api/notification/read/' + id, {}, { headers: getAuthHeaders() })
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch {}
  }

  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false)
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const iconBtnStyle = {
    background: 'var(--bg-card)',
    border: '1.5px solid var(--border)',
    color: 'var(--text-secondary)',
  }

  return (
    <header
      ref={headerRef}
      className="fixed top-0 z-30 flex items-center justify-between px-4 md:px-6 transition-all duration-300 right-0"
      style={{
        height: 72,
        left: sidebarCollapsed ? '72px' : '260px',
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div className="relative hidden md:flex items-center flex-1 max-w-md ml-0">
        <MdSearch size={18} className="absolute left-3.5" style={{ color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Search reservations, guests, rooms..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && searchQuery.trim()) {
              navigate('/reservation')
              setSearchQuery('')
            }
          }}
          className="pl-11 pr-4 py-2.5 rounded-lg text-sm w-full outline-none transition-all"
          style={{
            border: '1.5px solid var(--border)',
            background: 'var(--bg-subtle)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      <div className="flex items-center gap-2 md:gap-3" style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)' }}>
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:scale-105"
          style={iconBtnStyle}
          title="Toggle dark mode"
          type="button"
          aria-label="Toggle dark mode"
        >
          {darkMode ? <MdLightMode size={18} style={{ color: '#D4AF37' }} /> : <MdDarkMode size={18} />}
        </button>
        <div className="relative" ref={notifRef}>
          <button
            onClick={(e) => { e && e.stopPropagation(); setShowNotif(!showNotif); setShowProfile(false); if (!showNotif) fetchNotifications() }}
            className="w-10 h-10 rounded-lg flex items-center justify-center relative transition-all hover:scale-105"
            style={iconBtnStyle}
            aria-label="Notifications"
            type="button"
          >
            <MdNotifications size={18} />
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                style={{ background: '#DC2626' }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {showNotif && (
            <div
              className="absolute right-0 top-12 w-80 shadow-2xl overflow-hidden z-50 fade-in-up rounded-xl"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Notifications</span>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="text-xs font-medium hover:underline" style={{ color: '#D4AF37' }}>
                      Mark all read
                    </button>
                  )}
                  {unreadCount > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(212,175,55,0.15)', color: '#B8960C' }}>
                      {unreadCount} new
                    </span>
                  )}
                </div>
              </div>
              {notifLoading && (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</p>
                </div>
              )}
              {!notifLoading && notifications.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <MdNotifications size={28} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No notifications yet</p>
                </div>
              )}
              {!notifLoading && notifications.map(n => {
                const t = typeIcons[n.type] || { icon: MdNotifications, color: '#6B7280' }
                const Icon = t.icon
                return (
                  <div
                    key={n._id}
                    onClick={() => { if (!n.read) handleMarkRead(n._id) }}
                    className="flex items-start gap-3 px-4 py-3 border-b transition-all cursor-pointer"
                    style={{
                      borderColor: 'var(--border)',
                      background: n.read ? 'transparent' : 'rgba(212, 175, 55, 0.06)',
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: n.read ? 'var(--bg-subtle)' : `${t.color}18` }}
                    >
                      <Icon size={14} style={{ color: n.read ? 'var(--text-muted)' : t.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-tight" style={{ color: 'var(--text-primary)', fontWeight: n.read ? 400 : 500 }}>
                        {n.message}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full flex-shrink-0 mt-2" style={{ background: '#D4AF37' }} />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="relative" ref={profileRef}>
          <button
            onClick={() => { setShowProfile(!showProfile); setShowNotif(false) }}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all hover:scale-[1.02]"
            style={{ background: 'var(--bg-subtle)', border: '1.5px solid var(--border)' }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'linear-gradient(135deg, #1E293B, #334155)', color: '#D4AF37' }}
            >
              A
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold leading-none" style={{ color: 'var(--text-primary)' }}>Admin</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Super Admin</p>
            </div>
          </button>
          {showProfile && (
            <div
              className="absolute right-0 top-12 w-52 shadow-2xl overflow-hidden z-50 fade-in-up rounded-xl"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{settings?.hotelName || 'Abay Grand Hotel'}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{settings?.email || 'admin@abaygrnd.com'}</p>
              </div>
              {[
                { label: 'My Profile', onClick: () => {} },
                { label: 'Account Settings', onClick: () => { setShowProfile(false); navigate('/settings') } },
                { label: 'Help & Support', onClick: () => {} },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="w-full text-left px-4 py-2.5 text-sm transition-all hover:bg-[var(--bg-subtle)]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {item.label}
                </button>
              ))}
              <div className="border-t" style={{ borderColor: 'var(--border)' }}>
                <button
                  onClick={() => { setToken(''); navigate('/') }}
                  className="w-full text-left px-4 py-2.5 text-sm transition-all hover:bg-red-50"
                  style={{ color: '#DC2626' }}
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Topbar
