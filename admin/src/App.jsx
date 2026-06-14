import React, { useEffect, useState, createContext, useContext } from 'react'
import axios from 'axios'
import { Route, Routes, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import Login from './components/Login.jsx'
import Sidebar from './components/Sidebar.jsx'
import Topbar from './components/Topbar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import RoomManagement from './pages/RoomManagement.jsx'
import Reservation from './pages/Reservation.jsx'
import Guests from './pages/Guests.jsx'
import Revenue from './pages/Revenue.jsx'
import Reviews from './pages/Reviews.jsx'
import Messages from './pages/Messages.jsx'
import Settings from './pages/Settings.jsx'
import ActivityLog from './pages/ActivityLog.jsx'
import StaffManagement from './pages/StaffManagement.jsx'
import Roles from './pages/Roles.jsx'
import Housekeeping from './pages/Housekeeping.jsx'
import Maintenance from './pages/Maintenance.jsx'
import Reports from './pages/Reports.jsx'
import CalendarView from './pages/CalendarView.jsx'
import CustomerHistory from './pages/CustomerHistory.jsx'
import BackupRestore from './pages/BackupRestore.jsx'
import Notifications from './pages/Notifications.jsx'

export const backendUrl = 'http://localhost:4000'

export const ThemeContext = createContext()
export const useTheme = () => useContext(ThemeContext)

export const SettingsContext = createContext()
export const useSettings = () => useContext(SettingsContext)

const App = () => {
  const [token, setTokenState] = useState(() => {
    try { return localStorage.getItem('adminToken') || '' } catch { return '' }
  })
  const [initialized, setInitialized] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('abay-theme') === 'dark' } catch { return false }
  })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [settings, setSettings] = useState({
    hotelName: 'Abay Grand Hotel', address: '', phone: '', email: '',
    website: '', description: '', checkinTime: '14:00', checkoutTime: '12:00',
    currency: 'ETB', taxRate: '15',
  })

  const setToken = (t) => {
    setTokenState(t)
    try {
      if (t) localStorage.setItem('adminToken', t)
      else {
        localStorage.removeItem('adminToken')
        try {
          const err = new Error('token-cleared')
          localStorage.setItem('adminTokenClearedAt', new Date().toISOString())
          localStorage.setItem('adminTokenClearedStack', err.stack || '')
        } catch {}
      }
    } catch {}
  }

  const getAuthHeaders = () => {
    const t = localStorage.getItem('adminToken')
    return t ? { Authorization: `Bearer ${t}` } : {}
  }

  const refreshSettings = async () => {
    try {
      const r = await axios.get(backendUrl + '/api/settings', { headers: getAuthHeaders() })
      if (r.data?.success && r.data?.settings) {
        setSettings(r.data.settings)
      }
    } catch {}
  }

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      refreshSettings()
    }
    else delete axios.defaults.headers.common['Authorization']
  }, [token])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    try { localStorage.setItem('abay-theme', darkMode ? 'dark' : 'light') } catch {}
  }, [darkMode])

  useEffect(() => {
    try { const t = localStorage.getItem('adminToken'); if (t) setTokenState(t) }
    catch {}
    setInitialized(true)
  }, [])

  // Debug helper: record last click target so we can trace unexpected logouts
  useEffect(() => {
    const handler = (e) => {
      try {
        const t = e.target
        const info = {
          tag: t.tagName,
          id: t.id || null,
          classes: t.className || null,
          text: (t.innerText || t.textContent || '').trim().slice(0, 120),
          time: new Date().toISOString(),
        }
        localStorage.setItem('adminLastClick', JSON.stringify(info))
      } catch {}
    }
    document.addEventListener('click', handler, true)
    return () => document.removeEventListener('click', handler, true)
  }, [])

  if (!initialized) return null
  if (!token) return <Login setToken={setToken} />

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode, sidebarCollapsed, setSidebarCollapsed }}>
      <SettingsContext.Provider value={{ settings, refreshSettings }}>
        <ToastContainer />
        <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
          <Sidebar setToken={setToken} />
          <Topbar setToken={setToken} />
          <main
            className="transition-all duration-300 min-h-screen"
            style={{ marginLeft: sidebarCollapsed ? '72px' : '260px' }}
          >
            <div className="p-4 md:p-6 lg:p-8" style={{ paddingTop: '72px' }}>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/rooms" element={<RoomManagement token={token} />} />
                <Route path="/reservation" element={<Reservation />} />
                <Route path="/guests" element={<Guests />} />
                <Route path="/revenue" element={<Revenue />} />
                <Route path="/reviews" element={<Reviews />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/activity" element={<ActivityLog />} />
                <Route path="/staff" element={<StaffManagement />} />
                <Route path="/roles" element={<Roles />} />
                <Route path="/housekeeping" element={<Housekeeping />} />
                <Route path="/maintenance" element={<Maintenance />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/calendar" element={<CalendarView />} />
                <Route path="/customer-history" element={<CustomerHistory />} />
                <Route path="/backup" element={<BackupRestore />} />
                <Route path="/notifications" element={<Notifications />} />
              </Routes>
            </div>
          </main>
        </div>
      </SettingsContext.Provider>
    </ThemeContext.Provider>
  )
}

export default App
