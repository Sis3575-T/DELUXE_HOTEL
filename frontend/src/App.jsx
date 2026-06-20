import React, { useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'

import Navbar from './components/Navbar'
import Homepage from './pages/Homepage'
import HotelDetails from './pages/HotelDetails'
import MyReservations from './pages/MyReservations'
import ContactUs from './pages/ContactUs'
import AboutUs from './pages/AboutUs'
import PaymentResult from './pages/PaymentResult'
import Footer from './components/Footer'
import RoomContextProvider from './context/RoomContext'
import SettingsProvider from './context/SettingsContext'
export const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const App = () => {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (location.pathname === '/payment/result') {
      sessionStorage.removeItem('chapa_tx_ref')
      sessionStorage.removeItem('chapa_booking_id')
      sessionStorage.removeItem('chapa_redirect_time')
      return
    }
    const txRef = sessionStorage.getItem('chapa_tx_ref')
    const redirectTime = sessionStorage.getItem('chapa_redirect_time')
    if (txRef && redirectTime) {
      const elapsed = Date.now() - parseInt(redirectTime)
      if (elapsed < 300000) {
        sessionStorage.removeItem('chapa_tx_ref')
        sessionStorage.removeItem('chapa_booking_id')
        sessionStorage.removeItem('chapa_redirect_time')
        navigate(`/payment/result?status=pending&tx_ref=${txRef}`, { replace: true })
      }
    }
  }, [])

  return(
    <SettingsProvider>
    <RoomContextProvider>
    <div>
      <Navbar/>
      <main className='min-h-screen pt-[100px]'>
        <Routes>
          <Route path="/" element={<Homepage />}/>
          <Route path="/room/:id" element={<HotelDetails />}/>
          <Route path="/my-reservations" element={<MyReservations />}/>
          <Route path="/contact" element={<ContactUs />}/>
          <Route path="/about" element={<AboutUs />}/>
          <Route path="/payment/result" element={<PaymentResult />}/>
        </Routes>
        <Footer/>
      </main>
    </div>
    </RoomContextProvider>
    </SettingsProvider>
  )
}
export default App
