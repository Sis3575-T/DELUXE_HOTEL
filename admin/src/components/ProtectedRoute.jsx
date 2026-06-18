import { useState, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { backendUrl } from '../App'

const ProtectedRoute = ({ children, setToken }) => {
  const [status, setStatus] = useState('verifying')
  const location = useLocation()

  useEffect(() => {
    let cancelled = false
    const verify = async () => {
      const token = sessionStorage.getItem('adminToken')
      if (!token) {
        if (!cancelled) setStatus('unauthenticated')
        return
      }
      try {
        const res = await axios.get(backendUrl + '/api/user/verify', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!cancelled) setStatus(res.data?.success ? 'authenticated' : 'unauthenticated')
      } catch {
        if (!cancelled) setStatus('unauthenticated')
      }
    }
    verify()
    return () => { cancelled = true }
  }, [location.pathname])

  useEffect(() => {
    if (status === 'unauthenticated') {
      sessionStorage.removeItem('adminToken')
      if (setToken) setToken('')
    }
  }, [status, setToken])

  if (status === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#D4AF37] mx-auto mb-4" />
          <p style={{ color: 'var(--text-muted)' }}>Verifying...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  return children
}

export default ProtectedRoute
