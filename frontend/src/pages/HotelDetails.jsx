import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { backendUrl } from '../App'
import { FaWifi, FaTv, FaUtensils, FaSwimmingPool, FaConciergeBell } from 'react-icons/fa'

const PAYMENT_METHODS = [
  { id: 'pay_at_hotel', name: 'Pay at Hotel', description: 'Pay when you arrive' },
]

const HotelDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [notification, setNotification] = useState(null)
  const [formErrors, setFormErrors] = useState({})
  const [availability, setAvailability] = useState({ checking: false, available: true, message: '' })
  const availabilityTimer = useRef(null)
  const [paymentMethod, setPaymentMethod] = useState('pay_at_hotel')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    checkin: '',
    checkout: '',
    guests: 1,
    roomName: '',
    roomId: ''
  })

  useEffect(() => {
    const fetchRoomDetails = async () => {
      try {
        setLoading(true)
        const response = await axios.get(`${backendUrl}/api/hotel/rooms/${id}`)
        if (response.data && response.data.hotel) {
          const fetched = response.data.hotel
          setRoom(fetched)
          setFormData(prev => ({
            ...prev,
            roomName: fetched.name,
            roomId: fetched._id,
            guests: prev.guests > (fetched.capacity || 10) ? 1 : prev.guests
          }))
        }
      } catch (error) {
        console.log('Error fetching room details:', error)
        setNotification({ type: 'error', message: 'Failed to load room details. Please try again.' })
      } finally {
        setLoading(false)
      }
    }
    fetchRoomDetails()
  }, [id])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setFormErrors(prev => ({ ...prev, [name]: '' }))
    if (name === 'checkin' || name === 'checkout') {
      if (availabilityTimer.current) clearTimeout(availabilityTimer.current)
      setAvailability(prev => ({ ...prev, checking: true, message: '' }))
    }
  }

  useEffect(() => {
    const { checkin, checkout, roomId } = formData
    if (!checkin || !checkout || !roomId) return
    if (availabilityTimer.current) clearTimeout(availabilityTimer.current)
    availabilityTimer.current = setTimeout(async () => {
      try {
        const r = await axios.get(`${backendUrl}/api/reservation/check-availability`, {
          params: { roomId, checkin, checkout }
        })
        if (r.data?.success) {
          setAvailability({
            checking: false,
            available: r.data.available,
            message: r.data.available ? '' : 'This room is not available for the selected dates.'
          })
        }
      } catch {
        setAvailability({ checking: false, available: true, message: '' })
      }
    }, 500)
    return () => { if (availabilityTimer.current) clearTimeout(availabilityTimer.current) }
  }, [formData.checkin, formData.checkout, formData.roomId])

  const bookingPrice = useMemo(() => {
    if (!room?.price || !formData.checkin || !formData.checkout || formData.checkout <= formData.checkin) {
      return null
    }
    const start = new Date(`${formData.checkin}T00:00:00`)
    const end = new Date(`${formData.checkout}T00:00:00`)
    const nights = Math.round((end - start) / (1000 * 60 * 60 * 24))
    if (nights <= 0) return null
    return {
      pricePerNight: room.price,
      nights,
      totalAmount: nights * room.price,
    }
  }, [room?.price, formData.checkin, formData.checkout])

  const formatPrice = (amount) => `$${Number(amount).toLocaleString()}`

  const validate = () => {
    const errors = {}
    if (!formData.name.trim()) errors.name = 'Name is required'
    if (!formData.email.trim()) errors.email = 'Email is required'
    if (!formData.phone.trim()) errors.phone = 'Phone is required'
    if (!formData.checkin) errors.checkin = 'Check-in date is required'
    if (!formData.checkout) errors.checkout = 'Check-out date is required'
    if (formData.checkin && formData.checkout && formData.checkout <= formData.checkin) {
      errors.checkout = 'Check-out must be after check-in'
    }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkinDate = new Date(formData.checkin + 'T00:00:00')
    checkinDate.setHours(0, 0, 0, 0)
    if (formData.checkin && checkinDate < today) {
      errors.checkin = 'Check-in cannot be in the past'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    if (formData.checkout <= formData.checkin) {
      setNotification({ type: 'error', message: 'Check-out must be after check-in' })
      return
    }
    try {
      setSubmitting(true)
      const availCheck = await axios.get(`${backendUrl}/api/reservation/check-availability`, {
        params: { roomId: formData.roomId, checkin: formData.checkin, checkout: formData.checkout, roomName: formData.roomName }
      })
      if (availCheck.data?.success && !availCheck.data.available) {
        setAvailability({ checking: false, available: false, message: availCheck.data.message || 'This room is not available for the selected dates.' })
        setNotification({ type: 'error', message: availCheck.data.message || 'This room is not available for the selected dates.' })
        return
      }
      const response = await axios.post(`${backendUrl}/api/reservation/create`, formData)
      if (response.data?.success) {
        setNotification({ type: 'success', message: 'Reservation booked successfully! You can pay at the hotel.' })
        setAvailability({ checking: false, available: true, message: '' })
        setFormData(prev => ({
          ...prev,
          name: '',
          email: '',
          phone: '',
          checkin: '',
          checkout: '',
          guests: 1
        }))
      } else {
        setNotification({ type: 'error', message: response.data.message || 'Failed to create reservation' })
      }
    } catch (error) {
      console.error('Booking error:', error)
      const msg = error.response?.data?.message || 'Error occurred while booking. Please try again.'
      setNotification({ type: 'error', message: msg })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-xl text-gray-500">Loading room details...</p>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-xl text-red-500">Room not found.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      {notification && (
        <div className={`mb-4 p-3 rounded text-sm font-medium ${notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {notification.message}
          <button onClick={() => setNotification(null)} className="float-right font-bold">&times;</button>
        </div>
      )}
      <div className="grid md:grid-cols-3 gap-8">
        {/* Left: Image + description (spans 2 cols) */}
        <div className="md:col-span-2 space-y-6">
          <div>
            <h2 className="text-3xl font-bold">{room.name}</h2>
            <p className="text-xl text-lime-500 mt-1">${room.price} / night</p>
            <p className="text-sm text-gray-500 mt-1">
              {room.occupancy || (room.capacity ? `1-${room.capacity} persons` : '1-2 persons')} &middot; {room.roomType || 'Standard'}
            </p>
          </div>

          <img src={room.image} alt={room.name} className="w-full rounded-lg shadow-md" onError={(e) => { e.target.style.display = 'none' }} />

          <div className="bg-gray-100 p-4 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-3">Amenities</h2>
            <div className="grid grid-cols-2 gap-4 text-gray-700">
              <div className="flex items-center gap-2"><FaWifi /> Free Wi-Fi</div>
              <div className="flex items-center gap-2"><FaTv /> Cable TV</div>
              <div className="flex items-center gap-2"><FaUtensils /> Restaurant</div>
              <div className="flex items-center gap-2"><FaSwimmingPool /> Swimming Pool</div>
              <div className="flex items-center gap-2"><FaConciergeBell /> Room Service</div>
            </div>

            <div className="mt-4">
              <h2 className="text-lg font-medium">Room Description</h2>
              <p className="text-gray-700">{room.description || 'A luxurious room designed for your comfort and relaxation.'}</p>
            </div>
          </div>
        </div>

        {/* Right: Booking form */}
        <aside className="p-4 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold mb-3">Book Your Stay</h2>
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div>
              <input
                className="w-full p-2 border rounded"
                type="text"
                name="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
                required
              />
              {formErrors.name && <p className="text-xs text-red-600 mt-0.5">{formErrors.name}</p>}
            </div>
            <div>
              <input
                className="w-full p-2 border rounded"
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                required
              />
              {formErrors.email && <p className="text-xs text-red-600 mt-0.5">{formErrors.email}</p>}
            </div>
            <div>
              <input
                className="w-full p-2 border rounded"
                type="tel"
                name="phone"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={handleChange}
                required
              />
              {formErrors.phone && <p className="text-xs text-red-600 mt-0.5">{formErrors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold">Check-In</label>
              <input
                className="w-full p-2 border rounded"
                type="date"
                name="checkin"
                value={formData.checkin}
                onChange={handleChange}
                required
              />
              {formErrors.checkin && <p className="text-xs text-red-600 mt-0.5">{formErrors.checkin}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold">Check-Out</label>
              <input
                className="w-full p-2 border rounded"
                type="date"
                name="checkout"
                value={formData.checkout}
                onChange={handleChange}
                required
              />
              {formErrors.checkout && <p className="text-xs text-red-600 mt-0.5">{formErrors.checkout}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold">Number of Guests</label>
              <select
                className="w-full p-2 border rounded"
                name="guests"
                value={formData.guests}
                onChange={handleChange}
              >
                {[...Array(room.capacity || 10).keys()].map((i) => (
                  <option key={i + 1} value={i + 1}>{i + 1} Guest{i > 0 ? 's' : ''}</option>
                ))}
              </select>
            </div>

            {availability.checking && (
              <p className="text-xs text-blue-600 text-center">Checking availability...</p>
            )}
            {!availability.checking && !availability.available && (
              <p className="text-xs text-red-600 text-center">{availability.message}</p>
            )}

            {bookingPrice && (
              <div className="p-3 border rounded bg-gray-50 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Room price per night</span>
                  <span className="font-medium">{formatPrice(bookingPrice.pricePerNight)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Check-in</span>
                  <span className="font-medium">{formData.checkin}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Check-out</span>
                  <span className="font-medium">{formData.checkout}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Number of nights</span>
                  <span className="font-medium">{bookingPrice.nights}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t font-bold">
                  <span>Total booking amount</span>
                  <span className="text-lime-600">{formatPrice(bookingPrice.totalAmount)}</span>
                </div>
              </div>
            )}

            <button
              className="w-full bg-lime-600 text-white p-2 rounded hover:bg-lime-700 transition-colors duration-200 disabled:opacity-60"
              type="submit"
              disabled={submitting || (!availability.checking && !availability.available)}
            >
              {submitting ? 'Processing...' : !availability.available && !availability.checking ? 'Not Available' : 'Book Now'}
            </button>
          </form>
        </aside>
      </div>
    </div>
  )
}

export default HotelDetails
