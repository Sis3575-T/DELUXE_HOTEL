import React from 'react'
import {FaFacebook, FaInstagram, FaYoutube} from 'react-icons/fa'
const Footer = () => {
  return (
    <div className= ' flex flex-col gap-12 px-16 py-16 bg-black text-white'>
      {/* top section */}
      <div className= 'grid place-content-center '>
        <h2 className="text-4xl font-bold">Sign Up for Exclusive Offers</h2>
        <div className='flex items-center justify-center max-w-xl mx-auto w-full'>
          <input type="email" placeholder="Enter your email" className="flex-grow px-10 py-4 border-2 border-r-0 border-lime-500 rounded-l-full outline-none text-sm" />
          <button className="bg-lime-400 hover:bg-lime-600 text-white font-bold py-4 px-8 rounded-r-full font-bold ">Join Now</button>
        </div>
      </div>
      {/* bottom section */}
      <div className= 'flex flex-col justify-between  items-center text-center gap-6'>
        <div>
        <h2 className='text-2xl font-bold'>DELUXE HOTELS</h2>
        
        <div className= 'flex justify-center gap-4 mt-3 text-lime-500'>
          <FaFacebook className="text-3xl cursor-pointer hover:text-lime-400"/>
          <FaInstagram className="text-3xl cursor-pointer hover:text-lime-400"/>
          <FaYoutube className="text-3xl cursor-pointer hover:text-lime-400"/>
        </div>
        </div>
        <div>
          <ul className='flex gap-6 justify-center text-base font-medium'>
            <li className="cursor-pointer hover:text-lime-400">HOME</li>
            <li className="cursor-pointer hover:text-lime-400">BOOKINGS</li>
            <li className="cursor-pointer hover:text-lime-400">ROOMS</li>
            <li className="cursor-pointer hover:text-lime-400">CONTACT</li>
          </ul>
        </div>
      </div>
      <p>&copy; 2023 Your Hotel. All rights reserved.</p>
    </div>
  )
}

export default Footer