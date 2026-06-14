import React, {useContext} from 'react'
import { RoomContext } from '../context/RoomContext'

import { FaBath, FaUserFriends, FaWifi, FaBed } from 'react-icons/fa'
import {Link} from 'react-router-dom'
import { useSettings } from '../context/SettingsContext'

const amenitiesList = [
  { label: '1-2 persons', icon: <FaUserFriends className='text-gray-600' />},
  { label: 'Bathtub', icon: <FaBath className='text-gray-600'/>},
  { label: 'King Size Bed', icon: <FaBed className='text-gray-600' /> },
  { label: 'Free WiFi', icon: <FaWifi className='text-gray-600'/> }
]
const HotelList = () => {
  const { rooms, loading, error } = useContext(RoomContext)
  const { settings } = useSettings()
  const roomsSectionTitle = settings?.roomsSectionTitle || 'Book your stay and relax in luxury'
  return (
    <div id="rooms-section" className='bg-[#f7f0eb] py-16 px-4'>
      <div className='max-w-6xl mx-auto'>
        <h2 className='text-4xl font-serif text-center mb-12 text-gray-800'>{roomsSectionTitle}</h2>
        {loading && (
          <p className='text-gray-500 text-center col-span-full'>Loading rooms...</p>
        )}
        {error && !loading && (
          <p className='text-amber-600 text-center col-span-full mb-4'>{error}</p>
        )}
        <div className='grid grid-cols-2 gap-10'>{
        rooms && rooms.length > 0 ? (
            rooms.map((room, index) => {
              const { _id, image, name, price } = room
              return (
                <div key={_id} className='bg-white rounded-lg shadow overflow-hidden'>
                  <Link to={`/room/${_id}`}>
                    <img src={image} alt={name} className="w-full object-cover" />
                  </Link>
                  <div className='p-5'>
                    <h3 className='text-2xl font-semibold text-gray-800 mb-1'>{name}</h3>
                    <p className='text-lg font-bold text-gray-800'>${price}</p>
                  </div>
                  <div className='grid grid-cols-2 gap-4 text-base text-gray-700'>
                    {
                      amenitiesList.map((amenity, index) => (
                        <div key = {index} className='flex items-center gap-2'>
                          {amenity.icon} <span>{amenity.label} </span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )
            }
              
            )
          ) : (
            !loading && <p className='text-gray-500 text-center col-span-full'>No rooms available.</p>
          )}
          
        </div>
      </div>
      </div>
  )
}

export default HotelList
