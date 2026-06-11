import React, {useEffect, useState} from 'react'
import axios from 'axios'

import Login from './components/Login.jsx'
import {Route, Routes} from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import AddHotel from './pages/AddHotel.jsx'
import ListHotel from './pages/ListHotel.jsx'
import Reservation from './pages/Reservation.jsx'


export const backendUrl = 'http://localhost:4000'
const STORAGE_KEY = 'adminToken'
const App = () => {
  const [token, setTokenState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || ''
    } catch (e) {
      return ''
    }
  })

  const setToken = (t) => {
    setTokenState(t)
    try {
      if (t) localStorage.setItem(STORAGE_KEY, t)
      else localStorage.removeItem(STORAGE_KEY)
    } catch (e) {}
  }

  useEffect(() => {
    if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    else delete axios.defaults.headers.common['Authorization']
  }, [token])
  return (
    <div>
      {
        !token ? (
          <Login setToken={setToken}/>
        ) : (
          <>
          <div className='flex w-full'>
            <Sidebar setToken={setToken} />
            <div className='w-[70%] ml-[max(5vw,25px)] my-8 text-black text-base '>
              <Routes>
                <Route path='/add' element={<AddHotel />}/>
                <Route path='/list' element={<ListHotel />}/>
                <Route path='/reservation' element={<Reservation />}/>
              </Routes>
            </div>
          </div>
          </>

        )
      }
    </div>
  )
}

export default App
