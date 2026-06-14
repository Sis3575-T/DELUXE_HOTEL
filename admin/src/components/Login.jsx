import React, { useState } from 'react'
import { backendUrl } from '../App'
import axios from 'axios'
import { MdVisibility, MdVisibilityOff } from 'react-icons/md'
import Button from './ui/Button'

const Login = ({ setToken }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const adminLoginHandler = async (e) => {
    e.preventDefault()
    if (!email || !password) { setError('Email and password are required'); return }
    setError('')
    try {
      setLoading(true)
      const response = await axios.post(backendUrl + '/api/user/admin', { email, password })
      const data = response.data
      if (data && data.success) {
        setToken(data.token)
      } else {
        setError(data?.message || 'Login failed')
      }
    } catch (err) {
      if (err.code === 'ERR_NETWORK') {
        setError(`Cannot reach server at ${backendUrl}. Make sure the backend is running.`)
      } else if (err.response) {
        setError(err.response?.data?.message || `Server error (${err.response.status})`)
      } else {
        setError(err.message || 'Invalid credentials')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F8FAFC' }}>
      <form onSubmit={adminLoginHandler} className="w-full max-w-md flex flex-col items-center gap-6 p-12 rounded-xl mb-8"
        style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 4px 16px rgba(15,23,42,0.08)', minHeight: '480px' }}>
        <div className="text-center mb-2">
          <h1 className="text-lg font-bold" style={{ color: '#1E293B' }}>Abay Grand Hotel</h1>
          <p className="text-xs mt-1" style={{ color: '#64748B' }}>Admin Login</p>
        </div>

        {error && (
          <p className="text-xs text-center py-2 px-3 rounded" style={{ background: 'rgba(220,38,38,0.1)', color: '#DC2626' }}>
            {error}
          </p>
        )}

        <div className="w-full flex flex-col items-center">
          <label className="block text-sm mb-1.5 font-bold text-center" style={{ color: '#1E293B' }}>Email</label>
          <div className="w-3/4 max-w-sm">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded text-sm outline-none"
              style={{ height: '56px', background: '#F8FAFC', border: '1.5px solid #E2E8F0', color: '#1E293B' }}
            />
          </div>
        </div>

        <div className="w-full flex flex-col items-center">
          <label className="block text-sm mb-1.5 font-bold text-center" style={{ color: '#1E293B' }}>Password</label>
          <div className="relative w-3/4 max-w-sm">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded text-sm outline-none pr-10"
              style={{ height: '56px', background: '#F8FAFC', border: '1.5px solid #E2E8F0', color: '#1E293B' }}
            />
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }}>
              {showPass ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
            </button>
          </div>
        </div>

        <Button type="submit" variant="gold" size="lg" loading={loading} className="w-1/2 mx-auto">
          Sign In
        </Button>
      </form>
    </div>
  )
}

export default Login
