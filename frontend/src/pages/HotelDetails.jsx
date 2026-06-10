import React from 'react'
import { useParams } from 'react-router-dom'
import { roomData } from '../assets/asset'
import { FaWifi, FaTv, FaUtensils, FaSwimmingPool, FaConciergeBell } from 'react-icons/fa'

const HotelDetails = () => {
  const { id } = useParams()
  const room = roomData.find((r) => r.id === parseInt(id))

  if (!room) return (
    <div className="p-6">
      <h1>Hotel Details</h1>
      <p>Room not found.</p>
    </div>
  )

  return (
    <div className="mx-auto max-w-7xl p-6">
      

      <div className="grid md:grid-cols-3 gap-8">
        {/* Left: Image + description (spans 2 cols) */}
        <div className="md:col-span-2 space-y-6">
          <div>
            <h2 className="text-3xl font-bold">{room.name}</h2>
            <p className="text-xl text-lime-500 mt-1">${room.price}</p>
          </div>

          <img src={room.image} alt={room.name} className="w-full rounded-lg shadow-md" />

          <div className="bg-gray-100 p-4 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-3">Amenities</h2>
            <div className="grid grid-cols-2 gap-4 text-gray-700">
              <div className="flex items-center gap-2"><FaWifi /> wi-fi</div>
              <div className="flex items-center gap-2"><FaTv /> Cable TV</div>
              <div className="flex items-center gap-2"><FaUtensils /> Resturant</div>
              <div className="flex items-center gap-2"><FaSwimmingPool /> Swimming Pool</div>
              <div className="flex items-center gap-2"><FaConciergeBell /> Room Service</div>
            </div>

            <div className="mt-4">
              <h2 className="text-lg font-medium">Room Description</h2>
              <p className="text-gray-700">{room.description}</p>
            </div>
          </div>
        </div>

        {/* Right: Booking form */}
        <aside className="p-4 rounded-lg shadow-sm">
          <h2 className="text-xl font-bold mb-3">Book Your Stay</h2>
          <form className="space-y-3">
            <input className="w-full p-2 border rounded" type="text" placeholder="Name" />
            <input className="w-full p-2 border rounded" type="email" placeholder="Email" />
            <input className="w-full p-2 border rounded" type="tel" placeholder="Phone Number" />

            <div>
              <label className="block text-sm font-bold">Check-In</label>
              <input className="w-full p-2 border rounded" type="date" />
            </div>

            <div>
              <label className="block text-sm font-bold">Check-Out</label>
              <input className="w-full p-2 border rounded" type="date" />
            </div>

            <div>
              <label className="block text-sm font-bold">Number of Guests</label>
              <select className="w-full p-2 border rounded">
                {[...Array(3).keys()].map((i) => (
                  <option key={i + 1} value={i + 1}>{i + 1} Guest(s)</option>
                ))}
              </select>
            </div>

            <button className="w-full bg-lime-600 text-white p-2 rounded" type="submit">Book Now</button>
          </form>
        </aside>
      </div>
    </div>
  )
}

export default HotelDetails
