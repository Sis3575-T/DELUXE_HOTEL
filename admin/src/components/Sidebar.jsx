import React, { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  MdDashboard, MdHotel, MdEventNote, MdPeople, MdAttachMoney,
  MdStar, MdMessage, MdSettings, MdLogout, MdMenu, MdClose,
  MdChevronLeft
} from 'react-icons/md'
import { useTheme, useSettings } from '../App'

const navItems = [
  { to: '/dashboard',   icon: MdDashboard,   label: 'Dashboard' },
  { to: '/rooms',       icon: MdHotel,       label: 'Room Management' },
  { to: '/reservation', icon: MdEventNote,   label: 'Reservations' },
  { to: '/guests',      icon: MdPeople,      label: 'Guests' },
  { to: '/revenue',     icon: MdAttachMoney, label: 'Revenue' },
  { to: '/reviews',     icon: MdStar,        label: 'Reviews' },
  { to: '/messages',    icon: MdMessage,     label: 'Messages' },
  { to: '/settings',    icon: MdSettings,    label: 'Settings' },
]

const Sidebar = ({ setToken }) => {
  const { sidebarCollapsed, setSidebarCollapsed } = useTheme()
  const { settings } = useSettings()
  const [collapsed, setCollapsed] = useState(sidebarCollapsed)
  const navigate = useNavigate()

  const hotelName = settings?.hotelName || 'Abay Grand Hotel'
  const shortName = hotelName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'AG'
  const firstLine = hotelName.split(' ').slice(0, 2).join(' ') || hotelName
  const secondLine = hotelName.split(' ').slice(2).join(' ') || 'Hotel'

  useEffect(() => { setSidebarCollapsed(collapsed) }, [collapsed, setSidebarCollapsed])

  const handleLogout = () => { setToken(''); navigate('/') }

  return (
    <>
      <button
        className="fixed top-4 left-4 z-[10001] md:hidden p-2.5 rounded-lg shadow-lg transition-all"
        style={{ background: '#1E293B' }}
        onClick={() => setCollapsed(!collapsed)}
        aria-label="Toggle menu"
      >
        {collapsed ? <MdMenu size={22} color="#D4AF37" /> : <MdClose size={22} color="#D4AF37" />}
      </button>

      <aside
        className={`fixed left-0 top-0 h-full z-50 flex flex-col transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-[260px]'} translate-x-0`}
        style={{
          background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)',
          borderRight: '1px solid rgba(212, 175, 55, 0.12)',
          boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center justify-between px-5 py-5 border-b flex-shrink-0"
          style={{ borderColor: 'rgba(212, 175, 55, 0.15)', minHeight: 80 }}
        >
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-lg flex items-center justify-center font-bold text-lg shadow-md"
                style={{ background: 'linear-gradient(135deg, #D4AF37, #F5E6A3)', color: '#0F172A' }}
              >
                {settings?.logo ? (
                  <img src={settings.logo} alt="" className="w-full h-full object-cover rounded-lg" />
                ) : shortName}
              </div>
              <div>
                <p className="font-bold text-sm leading-tight" style={{ color: '#D4AF37' }}>{firstLine}</p>
                <p className="text-[11px] mt-0.5 tracking-wide uppercase" style={{ color: 'rgba(255,255,255,0.45)' }}>{secondLine}</p>
              </div>
            </div>
          ) : (
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center font-bold mx-auto"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #F5E6A3)', color: '#0F172A' }}
            >
              {shortName}
            </div>
          )}
          <button
            className="hidden md:flex items-center justify-center w-7 h-7 rounded-md transition-all hover:bg-white/10"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Collapse sidebar"
          >
            <MdChevronLeft size={16} style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <div className="flex flex-col gap-3">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className="block rounded-lg transition-all duration-200"
              >
                {({ isActive }) => (
                  <div
                    className="flex items-center rounded-lg transition-all duration-200"
                    style={{
                      background: isActive ? 'rgba(212, 175, 55, 0.12)' : 'transparent',
                      border: isActive ? '1px solid rgba(212, 175, 55, 0.25)' : '1px solid transparent',
                      padding: collapsed ? '12px 0' : '11px 14px',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                    }}
                  >
                    <Icon
                      size={21}
                      style={{
                        color: isActive ? '#D4AF37' : 'rgba(255,255,255,0.55)',
                        flexShrink: 0,
                      }}
                    />
                    {!collapsed && (
                      <span
                        className="text-sm font-medium ml-3"
                        style={{ color: isActive ? '#D4AF37' : 'rgba(255,255,255,0.78)' }}
                      >
                        {label}
                      </span>
                    )}
                  </div>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t flex-shrink-0" style={{ borderColor: 'rgba(212, 175, 55, 0.12)' }}>
          <button
            onClick={handleLogout}
            className="flex items-center w-full rounded-lg transition-all duration-200 hover:bg-red-500/10"
            style={{ padding: collapsed ? '12px 0' : '11px 14px', justifyContent: collapsed ? 'center' : 'flex-start' }}
          >
            <MdLogout size={21} style={{ color: 'rgba(248,113,113,0.85)', flexShrink: 0 }} />
            {!collapsed && (
              <span className="text-sm font-medium ml-3" style={{ color: 'rgba(248,113,113,0.85)' }}>
                Logout
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
