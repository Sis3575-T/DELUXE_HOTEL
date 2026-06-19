import React, {useState} from 'react'

import Login from './components/Login.jsx'
import {Route, Routes} from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import AddHotel from './pages/AddHotel.jsx'
import ListHotel from './pages/ListHotel.jsx'
import Reservation from './pages/Reservation.jsx'


export const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const App = () => {
  const [token, setToken] = useState('')
  return (
    <div>
      {
        !token ? (
          <Login/>
        ) : (
          <>
          <div>
            <Sidebar/>
            <div>
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