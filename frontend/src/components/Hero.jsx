import React from 'react'
import bgImage from '../assets/hero2.jpg'
import { useSettings } from '../context/SettingsContext'

const Hero = () => {
  const { settings } = useSettings()
  const hotelName = settings?.hotelName || 'DELUXE HOTELS'
  const tagline = settings?.tagline || settings?.description?.split('.')[0] || 'Where Luxury Meets Comfort'
  const heroButtonText = settings?.heroButtonText || 'BOOK YOUR STAY'
  const scrollToRooms = () => {
    const el = document.getElementById('rooms-section')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }
  return (
    <div className='relative h-[100vh] w-full bg-cover bg-center bg-no-repeat'style={{backgroundImage:`url(${bgImage})`}}>
      <div className='absolute inset-0 bg-gray-900 opacity-30 z-10'>
      
      </div>
      <div className='relative z-20 flex flex-col items-center justify-center h-full text-center text-white px-4'>
       <h2 className='text-lg tracking-widest uppercase'>{tagline}</h2> 
       <h1 className='text-4xl font-bold mb-6'>{hotelName}</h1>
       <button onClick={scrollToRooms} className='bg-lime-500 text-black font-bold py-3 px-6 rounded-lg hover:bg-lime-600 transition'>{heroButtonText}</button>
      </div>
    </div>
    
  )
}

export default Hero
