import React, { useState } from 'react'
import { backendUrl } from '../App'
import axios from 'axios'

const Login = ({ setToken }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const adminLoginHandler = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const response = await axios.post(backendUrl + '/api/user/admin', { email, password })
      const data = response.data
      if (data && data.success) {
        setToken && setToken(data.token)
        console.log('login response', response)
      } else {
        console.error('Login failed', data?.message)
        alert(data?.message || 'Login failed')
      }
    } catch (err) {
      console.error('Login error', err)
      alert('Error logging in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className='flex justify-center items-center min-h-screen bg-gray-100'>
        <div className='bg-white shadow-md rounded-lg px-8 py-6 w-full max-w-md'>
          <h1 className='text-2xl font-bold text-center text-gray-800 mb-4'>Admin Login</h1>
          <form onSubmit={adminLoginHandler}>
            <div className='mb-4 '>
              <p className='text-sm font-semibold text-gray-600 mb-2'>Email Adress</p>
              <input type='email' placeholder='enter email' value={email} onChange={(e) => setEmail(e.target.value)} className='w-[95%] px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-gray-800' />
            </div>
            <div className='mb-4 '>
              <p className='text-sm font-semibold text-gray-600 mb-2'>Password</p>
              <input type='password' placeholder='password' value={password} onChange={(e) => setPassword(e.target.value)} className='w-[95%] px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-gray-800' />
            </div>
            <button type='submit' disabled={loading} className='w-full px-3 py-2 text-lg font-bold bg-green-900 rounded-md'>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
