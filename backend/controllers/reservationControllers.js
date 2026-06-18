import Reservation from '../models/reservationModels.js'
import hotelModel from '../models/hotelModels.js'
import Payment from '../models/paymentModels.js'
import paymentConfig from '../config/payment.js'
import { logActivity } from './activityControllers.js'
import { createNotification } from './notificationControllers.js'
import { calculateBookingPrice } from '../utils/pricing.js'
import { initializeTransaction as chapaInitialize, generateTxRef } from '../utils/chapa.js'

const toStr = (v) => {
  if (!v) return ''
  if (typeof v === 'string') return v
  try { return JSON.stringify(v) } catch { return String(v) }
}

const PAYMENT_STATUSES = ['Pending', 'Partially Paid', 'Paid']

// Block new bookings when these statuses overlap the requested dates
const BLOCKING_STATUSES = ['Pending', 'Approved', 'Confirmed', 'Checked In']

const getOverlappingReservations = async (roomId, checkin, checkout, excludeId = null, roomName = null) => {
  if (!checkin || !checkout || checkin >= checkout) return []
  if (!roomId && !roomName) return []

  const query = {
    status: { $in: BLOCKING_STATUSES },
    checkin: { $lt: checkout },
    checkout: { $gt: checkin },
  }
  if (excludeId) query._id = { $ne: excludeId }

  if (roomId) {
    query.roomId = String(roomId)
  } else if (roomName) {
    query.roomName = roomName
  }

  return await Reservation.find(query)
}



const getAdminInfo = (req) => {
  if (req.admin) {
    return {
      userId: req.admin.userId || '',
      name: req.admin.name || 'Administrator',
      role: req.admin.role || 'Admin',
      actionDate: new Date(),
    }
  }
  return null
}

const getClientInfo = (body) => {
  return {
    userId: body.email || '',
    name: body.name || '',
    role: 'Client',
    actionDate: new Date(),
  }
}

const createReservation = async (req, res) => {
  try {
    const { name, email, phone, checkin, checkout, guests, roomName, roomId } = req.body
    if (!name || !email || !checkin || !checkout || !guests || !roomName) {
      return res.json({ success: false, message: 'All fields are required' })
    }
    if (checkin >= checkout) {
      return res.json({ success: false, message: 'Check-out date must be after check-in date' })
    }

    let resolvedRoomId = roomId ? String(roomId) : ''
    if (!resolvedRoomId && roomName) {
      const hotel = await hotelModel.findOne({ name: roomName })
      if (hotel) resolvedRoomId = hotel._id.toString()
    }
    if (!resolvedRoomId) {
      return res.json({ success: false, message: 'Room ID is required for booking validation' })
    }

    const overlapping = await getOverlappingReservations(resolvedRoomId, checkin, checkout, null, roomName)
    if (overlapping.length > 0) {
      return res.json({
        success: false,
        message: 'This room is already booked for the selected dates. Please choose different dates or another room.',
      })
    }

    const hotel = await hotelModel.findById(resolvedRoomId)
    if (!hotel) {
      return res.json({ success: false, message: 'Room not found' })
    }
    if (hotel.status === 'inactive') {
      return res.json({ success: false, message: 'This room is inactive and cannot be booked.' })
    }
    if (hotel.status === 'maintenance') {
      return res.json({ success: false, message: 'This room is under maintenance and cannot be booked.' })
    }

    const pricing = calculateBookingPrice(hotel.price, checkin, checkout)
    if (pricing.nights <= 0) {
      return res.json({ success: false, message: 'Invalid booking dates' })
    }

    const clientInfo = getClientInfo(req.body)
    const newReservation = new Reservation({
      name, email, phone, checkin, checkout, guests, roomName,
      roomId: resolvedRoomId,
      pricePerNight: pricing.pricePerNight,
      nights: pricing.nights,
      totalAmount: pricing.totalAmount,
      paymentStatus: 'Pending',
      status: 'Pending',
      createdBy: clientInfo,
    })
    await newReservation.save()

    logActivity({
      action: 'Reservation Created',
      userId: clientInfo.userId,
      userName: clientInfo.name,
      userRole: clientInfo.role,
      reservationId: newReservation._id.toString(),
      guestName: name,
      details: `Reservation created for ${name} at ${roomName}`,
    })
    createNotification({
      type: 'reservation_created',
      message: `New reservation from ${name} for ${roomName}`,
      relatedId: newReservation._id.toString(),
      relatedModel: 'Reservation',
    })

    res.json({ success: true, message: 'reservation created successfully', reservation: newReservation })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: 'error creating reservation' })
  }
}

const getAllReservation = async (req, res) => {
  try {
    const reservations = await Reservation.find()
    res.json(reservations)
  } catch (error) {
    console.log(error)
    res.json({ message: 'error fetching reservation' })
  }
}

const getMyReservations = async (req, res) => {
  try {
    const { email } = req.params
    if (!email) return res.json({ success: false, message: 'Email is required' })
    const reservations = await Reservation.find({ email }).sort({ createdAt: -1 })
    res.json({ success: true, reservations })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: 'error fetching reservations' })
  }
}

const approveReservation = async (req, res) => {
  try {
    const { id } = req.params
    const existing = await Reservation.findById(id)
    if (!existing) return res.status(404).json({ success: false, message: 'Reservation not found' })
    if (existing.status !== 'Pending') {
      return res.json({ success: false, message: `Cannot approve a reservation with status "${existing.status}"` })
    }

    const overlapping = await getOverlappingReservations(
      existing.roomId, existing.checkin, existing.checkout, id, existing.roomName
    )
    if (overlapping.length > 0) {
      return res.json({
        success: false,
        message: 'Cannot approve: this room is already booked for the selected dates.',
      })
    }

    const adminInfo = getAdminInfo(req)
    existing.status = 'Approved'
    existing.approvedBy = adminInfo
    await existing.save()
    // Availability is dynamic — no manual sync needed

    logActivity({
      action: 'Reservation Approved',
      userId: adminInfo.userId,
      userName: adminInfo.name,
      userRole: adminInfo.role,
      reservationId: id,
      guestName: existing.name,
      details: `Reservation for ${existing.name} approved`,
    })
    createNotification({
      type: 'reservation_approved',
      message: `${existing.name}'s reservation approved`,
      relatedId: id,
      relatedModel: 'Reservation',
    })

    res.json({ success: true, message: 'Reservation approved', reservation: existing })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: 'error approving reservation' })
  }
}

const rejectReservation = async (req, res) => {
  try {
    const { id } = req.params
    const existing = await Reservation.findById(id)
    if (!existing) return res.status(404).json({ success: false, message: 'Reservation not found' })
    if (existing.status !== 'Pending') {
      return res.json({ success: false, message: `Cannot reject a reservation with status "${existing.status}"` })
    }
    const adminInfo = getAdminInfo(req)
    existing.status = 'Rejected'
    existing.rejectedBy = adminInfo
    await existing.save()
    // Availability is dynamic — no manual sync needed

    logActivity({
      action: 'Reservation Rejected',
      userId: adminInfo.userId,
      userName: adminInfo.name,
      userRole: adminInfo.role,
      reservationId: id,
      guestName: existing.name,
      details: `Reservation for ${existing.name} rejected`,
    })
    createNotification({
      type: 'reservation_rejected',
      message: `${existing.name}'s reservation was rejected`,
      relatedId: id,
      relatedModel: 'Reservation',
    })

    res.json({ success: true, message: 'Reservation rejected', reservation: existing })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: 'error rejecting reservation' })
  }
}

const checkinReservation = async (req, res) => {
  try {
    const { id } = req.params
    const existing = await Reservation.findById(id)
    if (!existing) return res.status(404).json({ success: false, message: 'Reservation not found' })
    if (existing.status !== 'Approved' && existing.status !== 'Confirmed') {
      return res.json({ success: false, message: `Cannot check in a reservation with status "${existing.status}"` })
    }
    const adminInfo = getAdminInfo(req)
    existing.status = 'Checked In'
    existing.checkedInBy = adminInfo
    await existing.save()
    // Availability is dynamic — no manual sync needed

    logActivity({
      action: 'Guest Checked In',
      userId: adminInfo.userId,
      userName: adminInfo.name,
      userRole: adminInfo.role,
      reservationId: id,
      guestName: existing.name,
      details: `${existing.name} checked into ${existing.roomName}`,
    })
    createNotification({
      type: 'guest_checked_in',
      message: `${existing.name} checked into ${existing.roomName}`,
      relatedId: id,
      relatedModel: 'Reservation',
    })

    res.json({ success: true, message: 'Guest checked in', reservation: existing })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: 'error checking in guest' })
  }
}

const checkoutReservation = async (req, res) => {
  try {
    const { id } = req.params
    const existing = await Reservation.findById(id)
    if (!existing) return res.status(404).json({ success: false, message: 'Reservation not found' })
    if (existing.status !== 'Checked In') {
      return res.json({ success: false, message: `Cannot check out a reservation with status "${existing.status}"` })
    }
    const adminInfo = getAdminInfo(req)
    existing.status = 'Checked Out'
    existing.checkedOutBy = adminInfo
    await existing.save()
    // Availability is dynamic — no manual sync needed

    logActivity({
      action: 'Guest Checked Out',
      userId: adminInfo.userId,
      userName: adminInfo.name,
      userRole: adminInfo.role,
      reservationId: id,
      guestName: existing.name,
      details: `${existing.name} checked out from ${existing.roomName}`,
    })
    createNotification({
      type: 'guest_checked_out',
      message: `${existing.name} checked out from ${existing.roomName}`,
      relatedId: id,
      relatedModel: 'Reservation',
    })

    res.json({ success: true, message: 'Guest checked out', reservation: existing })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: 'error checking out guest' })
  }
}

const cancelReservation = async (req, res) => {
  try {
    const { id } = req.params
    const existing = await Reservation.findById(id)
    if (!existing) return res.status(404).json({ success: false, message: 'Reservation not found' })
    if (existing.status === 'Checked Out' || existing.status === 'Cancelled' || existing.status === 'Rejected') {
      return res.json({ success: false, message: `Cannot cancel a reservation with status "${existing.status}"` })
    }
    const adminInfo = getAdminInfo(req)
    existing.status = 'Cancelled'
    existing.cancelledBy = adminInfo
    await existing.save()
    // Availability is dynamic — no manual sync needed

    logActivity({
      action: 'Reservation Cancelled',
      userId: adminInfo.userId,
      userName: adminInfo.name,
      userRole: adminInfo.role,
      reservationId: id,
      guestName: existing.name,
      details: `Reservation for ${existing.name} cancelled`,
    })
    createNotification({
      type: 'reservation_cancelled',
      message: `${existing.name}'s reservation cancelled`,
      relatedId: id,
      relatedModel: 'Reservation',
    })

    res.json({ success: true, message: 'Reservation cancelled', reservation: existing })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: 'error cancelling reservation' })
  }
}

const clientCancelReservation = async (req, res) => {
  try {
    const { id } = req.params
    const { email } = req.body
    const existing = await Reservation.findById(id)
    if (!existing) return res.status(404).json({ success: false, message: 'Reservation not found' })
    if (existing.email !== email) {
      return res.json({ success: false, message: 'Email does not match this reservation' })
    }
    if (existing.status === 'Checked In' || existing.status === 'Checked Out' || existing.status === 'Cancelled' || existing.status === 'Rejected') {
      return res.json({ success: false, message: `Cannot cancel a reservation with status "${existing.status}"` })
    }
    const clientInfo = getClientInfo(req.body)
    existing.status = 'Cancelled'
    existing.cancelledBy = clientInfo
    await existing.save()
    // Availability is dynamic — no manual sync needed

    logActivity({
      action: 'Reservation Cancelled',
      userId: clientInfo.userId,
      userName: clientInfo.name,
      userRole: clientInfo.role,
      reservationId: id,
      guestName: existing.name,
      details: `Reservation for ${existing.name} cancelled by client`,
    })
    createNotification({
      type: 'reservation_cancelled',
      message: `${existing.name} cancelled their reservation`,
      relatedId: id,
      relatedModel: 'Reservation',
    })

    res.json({ success: true, message: 'Reservation cancelled', reservation: existing })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: 'error cancelling reservation' })
  }
}

const updateReservation = async (req, res) => {
  try {
    const { id } = req.params
    const existing = await Reservation.findById(id)
    if (!existing) return res.status(404).json({ success: false, message: 'Reservation not found' })

    const updateData = {}
    if (req.body.name !== undefined) updateData.name = req.body.name
    if (req.body.email !== undefined) updateData.email = req.body.email
    if (req.body.phone !== undefined) updateData.phone = req.body.phone
    if (req.body.roomName !== undefined) updateData.roomName = req.body.roomName
    if (req.body.roomId !== undefined) updateData.roomId = req.body.roomId
    if (req.body.checkin !== undefined) updateData.checkin = req.body.checkin
    if (req.body.checkout !== undefined) updateData.checkout = req.body.checkout
    if (req.body.guests !== undefined) updateData.guests = Number(req.body.guests)
    if (req.body.paymentStatus !== undefined) {
      if (!PAYMENT_STATUSES.includes(req.body.paymentStatus)) {
        return res.json({ success: false, message: 'Invalid payment status' })
      }
      updateData.paymentStatus = req.body.paymentStatus
    }

    const newCheckin = req.body.checkin || existing.checkin
    const newCheckout = req.body.checkout || existing.checkout
    const newRoomId = req.body.roomId || existing.roomId
    const newRoomName = req.body.roomName || existing.roomName

    if (newCheckin >= newCheckout) {
      return res.json({ success: false, message: 'Check-out date must be after check-in date' })
    }

    const datesOrRoomChanged =
      req.body.checkin !== undefined ||
      req.body.checkout !== undefined ||
      req.body.roomId !== undefined ||
      req.body.roomName !== undefined

    if (datesOrRoomChanged) {
      if (newRoomId) {
        const hotel = await hotelModel.findById(newRoomId)
        if (!hotel) {
          return res.json({ success: false, message: 'Room not found' })
        }
        if (hotel.status === 'inactive') {
          return res.json({ success: false, message: 'Cannot move reservation to an inactive room.' })
        }
        if (hotel.status === 'maintenance') {
          return res.json({ success: false, message: 'Cannot move reservation to a room under maintenance.' })
        }
      }
    }

    const overlapping = await getOverlappingReservations(newRoomId, newCheckin, newCheckout, id, newRoomName)
    if (overlapping.length > 0) {
      return res.json({
        success: false,
        message: 'This room is already booked for the selected dates. Please choose different dates or another room.',
      })
    }

    if (datesOrRoomChanged) {
      let roomPrice = existing.pricePerNight
      if (newRoomId) {
        const hotel = await hotelModel.findById(newRoomId)
        if (hotel) roomPrice = hotel.price
      }
      const pricing = calculateBookingPrice(roomPrice, newCheckin, newCheckout)
      if (pricing.nights <= 0) {
        return res.json({ success: false, message: 'Invalid booking dates' })
      }
      updateData.pricePerNight = pricing.pricePerNight
      updateData.nights = pricing.nights
      updateData.totalAmount = pricing.totalAmount
    }

    const adminInfo = getAdminInfo(req)
    if (adminInfo) {
      updateData.updatedBy = { ...adminInfo, actionDate: new Date() }
    }

    const oldRoomId = existing.roomId
    const updated = await Reservation.findByIdAndUpdate(id, updateData, { new: true })

    // Availability is dynamic

    logActivity({
      action: 'Reservation Updated',
      userId: adminInfo?.userId || '',
      userName: adminInfo?.name || '',
      userRole: adminInfo?.role || '',
      reservationId: id,
      guestName: updated.name,
      details: `Reservation for ${updated.name} updated`,
    })
    res.json({ success: true, message: 'Reservation updated', reservation: updated })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: 'error updating reservation' })
  }
}

const deleteReservation = async (req, res) => {
  try {
    const { id } = req.params
    const reservation = await Reservation.findById(id)
    if (reservation) {
      await Reservation.findByIdAndDelete(id)
    }
    res.json({ success: true, message: 'reservation deleted successfully' })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: 'error deleting reservation' })
  }
}

const checkAvailability = async (req, res) => {
  try {
    const { roomId, checkin, checkout, excludeId, roomName } = req.query
    if ((!roomId && !roomName) || !checkin || !checkout) {
      return res.json({ success: false, message: 'roomId (or roomName), checkin, and checkout are required' })
    }
    if (checkin >= checkout) {
      return res.json({ success: true, available: false, message: 'Check-out must be after check-in' })
    }

    if (roomId) {
      const hotel = await hotelModel.findById(roomId)
      if (hotel && hotel.status === 'inactive') {
        return res.json({ success: true, available: false, message: 'This room is inactive and cannot be booked.' })
      }
      if (hotel && hotel.status === 'maintenance') {
        return res.json({ success: true, available: false, message: 'This room is under maintenance.' })
      }
    }

    const overlapping = await getOverlappingReservations(roomId, checkin, checkout, excludeId || null, roomName || null)

    let pricing = null
    if (roomId && checkin < checkout) {
      const hotel = await hotelModel.findById(roomId)
      if (hotel) {
        pricing = calculateBookingPrice(hotel.price, checkin, checkout)
      }
    }

    res.json({
      success: true,
      available: overlapping.length === 0,
      message: overlapping.length > 0 ? 'This room is already booked for the selected dates.' : '',
      pricing,
    })
  } catch (error) {
    console.error('checkAvailability error:', error?.message || error)
    res.json({ success: false, message: 'Error checking availability' })
  }
}

const bookWithChapa = async (req, res) => {
  try {
    const { name, email, phone, checkin, checkout, guests, roomName, roomId, paymentMethod, channels } = req.body

    paymentConfig.logConfig('[bookWithChapa]')

    console.log('[bookWithChapa] Request body:', JSON.stringify({
      name, email, phone, checkin, checkout, guests, roomName, roomId, paymentMethod, channels,
    }, null, 2))

    if (!name || !email || !checkin || !checkout || !guests || !roomName) {
      return res.status(400).json({ success: false, message: 'All booking fields are required' })
    }
    if (checkin >= checkout) {
      return res.status(400).json({ success: false, message: 'Check-out date must be after check-in date' })
    }
    if (paymentMethod !== 'Chapa') {
      return res.status(400).json({ success: false, message: 'Only Chapa payment is supported at this endpoint' })
    }

    let resolvedRoomId = roomId ? String(roomId) : ''
    if (!resolvedRoomId && roomName) {
      const hotel = await hotelModel.findOne({ name: roomName })
      if (hotel) resolvedRoomId = hotel._id.toString()
    }
    if (!resolvedRoomId) {
      return res.status(400).json({ success: false, message: 'Room ID is required for booking validation' })
    }

    const overlapping = await getOverlappingReservations(resolvedRoomId, checkin, checkout, null, roomName)
    if (overlapping.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This room is already booked for the selected dates. Please choose different dates or another room.',
      })
    }

    const hotel = await hotelModel.findById(resolvedRoomId)
    if (!hotel) return res.status(404).json({ success: false, message: 'Room not found' })
    if (hotel.status === 'inactive') return res.status(400).json({ success: false, message: 'This room is inactive and cannot be booked.' })
    if (hotel.status === 'maintenance') return res.status(400).json({ success: false, message: 'This room is under maintenance and cannot be booked.' })

    const rawPrice = Number(hotel.price) || Number(hotel.pricePerNight) || 0
    const pricing = calculateBookingPrice(rawPrice, checkin, checkout)
    if (pricing.nights <= 0) return res.status(400).json({ success: false, message: 'Invalid booking dates' })
    if (pricing.totalAmount <= 0) return res.status(400).json({ success: false, message: 'Invalid room price. Please contact support.' })

    console.log('[bookWithChapa] Price calculated:', JSON.stringify(pricing))

    const tx_ref = await generateTxRef('BOOK')

    const existingPayment = await Payment.findOne({ transactionId: tx_ref })
    if (existingPayment) {
      console.error('[bookWithChapa] tx_ref collision:', tx_ref)
      return res.status(500).json({ success: false, message: 'Transaction reference collision. Please try again.' })
    }

    const clientInfo = getClientInfo(req.body)

    const newReservation = new Reservation({
      name, email, phone, checkin, checkout, guests, roomName,
      roomId: resolvedRoomId,
      pricePerNight: pricing.pricePerNight,
      nights: pricing.nights,
      totalAmount: pricing.totalAmount,
      paymentMethod: 'Chapa',
      paymentStatus: 'Pending',
      status: 'Pending',
      createdBy: clientInfo,
    })
    await newReservation.save()
    console.log('[bookWithChapa] Reservation created:', newReservation._id)

    const selectedChannel = Array.isArray(channels) && channels.length === 1 ? channels[0] : ''

    const payment = new Payment({
      transactionId: tx_ref,
      bookingId: newReservation._id,
      guestName: name,
      guestEmail: email,
      guestPhone: phone || '',
      paymentMethod: selectedChannel || 'Chapa',
      chapaChannel: selectedChannel,
      amount: pricing.totalAmount,
      currency: 'ETB',
      status: 'Pending',
      verificationStatus: 'Unverified',
      approvalStatus: 'Pending',
    })
    await payment.save()
    console.log('[bookWithChapa] Payment record created:', payment._id, 'tx_ref:', tx_ref, 'channel:', selectedChannel)

    const chapaPayload = {
      amount: pricing.totalAmount,
      currency: 'ETB',
      email: email || '',
      first_name: name.split(' ')[0] || name,
      last_name: name.split(' ').slice(1).join(' ') || '',
      tx_ref,
      callback_url: paymentConfig.chapaCallbackUrl,
      return_url: paymentConfig.chapaReturnUrl,
      customization: {
        title: 'Hotel Booking',
        description: `Payment for ${roomName} - ${name}`,
      },
    }

    if (Array.isArray(channels) && channels.length > 0) {
      chapaPayload.options = { channels }
    }

    console.log('[bookWithChapa] Chapa payload:', JSON.stringify(chapaPayload, null, 2))

    let chapaResult
    try {
      chapaResult = await chapaInitialize(chapaPayload)
      console.log('[bookWithChapa] Chapa initialization SUCCESS:', JSON.stringify(chapaResult, null, 2))
    } catch (chapaError) {
      const chapaMsg = toStr(chapaError?.chapaData?.message) || toStr(chapaError?.chapaData?.msg) || toStr(chapaError?.message) || 'Unknown error'
      const chapaDetail = toStr(chapaError?.chapaData?.detail) || ''
      console.error('[bookWithChapa] Chapa initialization FAILED:')
      console.error('  Status:', chapaError?.status)
      console.error('  Message:', chapaMsg)
      console.error('  Detail:', chapaDetail)
      console.error('  Full Chapa response:', JSON.stringify(chapaError?.chapaData, null, 2))
      console.error('  Validation errors:', chapaError?.validationErrors)
      console.error('  Config errors:', chapaError?.configErrors)

      payment.status = 'Failed'
      payment.chapaResponse = chapaError?.chapaData || {
        error: chapaError?.message || String(chapaError),
        validationErrors: chapaError?.validationErrors,
        configErrors: chapaError?.configErrors,
      }
      payment.notes = 'Chapa initialization failed: ' + chapaMsg + (chapaDetail ? ' - ' + chapaDetail : '')
      await payment.save()
      await Reservation.findByIdAndDelete(newReservation._id)

      const errParts = [chapaMsg]
      if (chapaDetail) errParts.push(chapaDetail)
      return res.status(chapaError?.status || 502).json({
        success: false,
        message: errParts.join('. '),
        error: chapaError?.chapaData || chapaError?.message || String(chapaError),
        validationErrors: chapaError?.validationErrors,
        status: chapaError?.status || 502,
      })
    }

    payment.chapaResponse = chapaResult
    await payment.save()

    const checkoutUrl = chapaResult.data?.checkout_url || null
    if (!checkoutUrl) {
      console.error('[bookWithChapa] No checkout_url in Chapa response:', JSON.stringify(chapaResult))
      payment.status = 'Failed'
      payment.notes = 'No checkout URL from Chapa'
      await payment.save()
      await Reservation.findByIdAndDelete(newReservation._id)
      return res.status(502).json({
        success: false,
        message: 'Payment gateway returned no checkout URL. Please try again.',
        chapaResponse: chapaResult,
      })
    }

    console.log('[bookWithChapa] Checkout URL:', checkoutUrl)

    logActivity({
      action: 'Booking with Chapa',
      userId: email || '',
      userName: name,
      userRole: 'Client',
      reservationId: newReservation._id.toString(),
      guestName: name,
      details: `Booking created for ${name} at ${roomName} with Chapa payment. Total: ${pricing.totalAmount} ETB`,
    })
    createNotification({
      type: 'booking_chapa_initiated',
      message: `New Chapa payment initiated: ${name} - ${roomName} - ${pricing.totalAmount} ETB`,
      relatedId: newReservation._id.toString(),
      relatedModel: 'Reservation',
    })

    res.json({
      success: true,
      message: 'Booking created. Redirecting to payment...',
      reservation: newReservation,
      payment: payment.toObject(),
      checkoutUrl,
      tx_ref,
    })
  } catch (error) {
    console.error('[bookWithChapa] Unhandled error:', error?.message || error)
    console.error('[bookWithChapa] Stack:', error?.stack)
    res.status(500).json({ success: false, message: 'Error processing booking with payment' })
  }
}

export {
  createReservation,
  getAllReservation,
  getMyReservations,
  approveReservation,
  rejectReservation,
  checkinReservation,
  checkoutReservation,
  cancelReservation,
  clientCancelReservation,
  updateReservation,
  deleteReservation,
  checkAvailability,
  getOverlappingReservations,
  BLOCKING_STATUSES,
  bookWithChapa,
}
