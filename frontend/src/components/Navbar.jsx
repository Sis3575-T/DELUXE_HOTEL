import React from 'react'
import { Link } from 'react-router-dom'

const Navbar = () => {
  return (
    
      <div>
         <nav className='flex items-center justify-between p-[2rem] bg-black text-white' >
      
       
          <Link to='/' >
           <div>
            <h2 className='font-bold text-2xl'>DELUXE <span className='text-lime-400'>HOTELS</span></h2>
         
                </div>
          </Link>
            <ul className='flex gap-8'>
              <li className='font-bold text-lg cursor-pointer hover:text-lime-500 '>BOOKINGS</li>
              <li className='font-bold text-lg cursor-pointer hover:text-lime-500 '>ROOMS</li>
              <li className='font-bold text-lg cursor-pointer hover:text-lime-500 '>CONTACT</li>
            </ul>
          </nav>
        </div>
      
    
  )
}

export default Navbar