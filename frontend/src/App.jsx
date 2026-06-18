import React from 'react'
import { Routes, Route } from 'react-router-dom'

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
