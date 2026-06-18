import React, { useEffect, useState, createContext, useContext } from 'react'
import axios from 'axios'
import { Route, Routes, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import Login from './components/Login.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
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
import Payments from './pages/Payments.jsx'

export const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export const ThemeContext = createContext()
export const useTheme = () => useContext(ThemeContext)

export const SettingsContext = createContext()
export const useSettings = () => useContext(SettingsContext)

const App = () => {
  const [token, setTokenState] = useState(() => {
    try { return sessionStorage.getItem('adminToken') || '' } catch { return '' }
  })
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('abay-theme') === 'dark' } catch { return false }
  })
  const [isVerifying, setIsVerifying] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [settings, setSettings] = useState({
    hotelName: 'Abay Grand Hotel', address: '', phone: '', email: '',
    website: '', description: '', checkinTime: '14:00', checkoutTime: '12:00',
    currency: 'ETB', taxRate: '15',
  })

  const setToken = (t) => {
    setTokenState(t)
    try {
      if (t) {
        sessionStorage.setItem('adminToken', t)
        localStorage.setItem('adminToken', t)
      } else {
        sessionStorage.removeItem('adminToken')
        try { localStorage.removeItem('adminToken') } catch {}
      }
    } catch {}
  }

  const getAuthHeaders = () => {
    const t = sessionStorage.getItem('adminToken')
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
    const verify = async () => {
      const t = sessionStorage.getItem('adminToken')
      if (!t) { setIsVerifying(false); return }
      try {
        const res = await axios.get(backendUrl + '/api/user/verify', {
          headers: { Authorization: `Bearer ${t}` }
        })
        if (!res.data?.success) setToken('')
      } catch { setToken('') }
      finally { setIsVerifying(false) }
    }
    verify()
  }, [])

  useEffect(() => {
    const id = axios.interceptors.response.use(
      (response) => {
        try {
          const data = response?.data
          if (data && data.success === false) {
            const msg = (data.message || '').toLowerCase()
            if (msg.includes('unauthor') || msg.includes('not authorized') || msg.includes('authentication not successful')) {
              setToken('')
              return Promise.reject(new Error('unauthorized'))
            }
          }
        } catch (e) {}
        return response
      },
      (error) => {
        try {
          if (error?.response?.status === 401) setToken('')
        } catch (e) {}
        return Promise.reject(error)
      }
    )
    return () => axios.interceptors.response.eject(id)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    try { localStorage.setItem('abay-theme', darkMode ? 'dark' : 'light') } catch {}
  }, [darkMode])

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

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode, sidebarCollapsed, setSidebarCollapsed }}>
      <SettingsContext.Provider value={{ settings, refreshSettings }}>
        <ToastContainer />
        {isVerifying ? (
          <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#D4AF37] mx-auto mb-4" />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Verifying...</p>
            </div>
          </div>
        ) : (
          <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
            {token && <Sidebar setToken={setToken} />}
            {token && <Topbar setToken={setToken} />}
            <main
              className="transition-all duration-300 min-h-screen"
              style={{ marginLeft: token ? (sidebarCollapsed ? '72px' : '260px') : '0' }}
            >
              <div className={token ? 'p-4 md:p-6 lg:p-8' : ''} style={token ? { paddingTop: '72px' } : {}}>
                <Routes>
                  <Route path="/admin/login" element={!token ? <Login setToken={setToken} /> : <Navigate to="/dashboard" replace />} />
                  <Route path="/" element={<Navigate to={token ? '/dashboard' : '/admin/login'} replace />} />
                  <Route path="/dashboard" element={token ? <ProtectedRoute setToken={setToken}><Dashboard /></ProtectedRoute> : <Navigate to="/admin/login" replace />} />
                  <Route path="/rooms" element={token ? <ProtectedRoute setToken={setToken}><RoomManagement token={token} /></ProtectedRoute> : <Navigate to="/admin/login" replace />} />
                  <Route path="/reservation" element={token ? <ProtectedRoute setToken={setToken}><Reservation /></ProtectedRoute> : <Navigate to="/admin/login" replace />} />
                  <Route path="/guests" element={token ? <ProtectedRoute setToken={setToken}><Guests /></ProtectedRoute> : <Navigate to="/admin/login" replace />} />
                  <Route path="/revenue" element={token ? <ProtectedRoute setToken={setToken}><Revenue /></ProtectedRoute> : <Navigate to="/admin/login" replace />} />
                  <Route path="/reviews" element={token ? <ProtectedRoute setToken={setToken}><Reviews /></ProtectedRoute> : <Navigate to="/admin/login" replace />} />
                  <Route path="/messages" element={token ? <ProtectedRoute setToken={setToken}><Messages /></ProtectedRoute> : <Navigate to="/admin/login" replace />} />
                  <Route path="/settings" element={token ? <ProtectedRoute setToken={setToken}><Settings /></ProtectedRoute> : <Navigate to="/admin/login" replace />} />
                  <Route path="/activity" element={token ? <ProtectedRoute setToken={setToken}><ActivityLog /></ProtectedRoute> : <Navigate to="/admin/login" replace />} />
                  <Route path="/staff" element={token ? <ProtectedRoute setToken={setToken}><StaffManagement /></ProtectedRoute> : <Navigate to="/admin/login" replace />} />
                  <Route path="/roles" element={token ? <ProtectedRoute setToken={setToken}><Roles /></ProtectedRoute> : <Navigate to="/admin/login" replace />} />
                  <Route path="/housekeeping" element={token ? <ProtectedRoute setToken={setToken}><Housekeeping /></ProtectedRoute> : <Navigate to="/admin/login" replace />} />
                  <Route path="/maintenance" element={token ? <ProtectedRoute setToken={setToken}><Maintenance /></ProtectedRoute> : <Navigate to="/admin/login" replace />} />
                  <Route path="/reports" element={token ? <ProtectedRoute setToken={setToken}><Reports /></ProtectedRoute> : <Navigate to="/admin/login" replace />} />
                  <Route path="/calendar" element={token ? <ProtectedRoute setToken={setToken}><CalendarView /></ProtectedRoute> : <Navigate to="/admin/login" replace />} />
                  <Route path="/customer-history" element={token ? <ProtectedRoute setToken={setToken}><CustomerHistory /></ProtectedRoute> : <Navigate to="/admin/login" replace />} />
                  <Route path="/backup" element={token ? <ProtectedRoute setToken={setToken}><BackupRestore /></ProtectedRoute> : <Navigate to="/admin/login" replace />} />
                  <Route path="/notifications" element={token ? <ProtectedRoute setToken={setToken}><Notifications /></ProtectedRoute> : <Navigate to="/admin/login" replace />} />
                  <Route path="/payments" element={token ? <ProtectedRoute setToken={setToken}><Payments /></ProtectedRoute> : <Navigate to="/admin/login" replace />} />
                  <Route path="*" element={<Navigate to={token ? '/dashboard' : '/admin/login'} replace />} />
                </Routes>
              </div>
            </main>
          </div>
        )}
      </SettingsContext.Provider>
    </ThemeContext.Provider>
  )
}

export default App
