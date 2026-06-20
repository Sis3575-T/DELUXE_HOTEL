import Payment from '../models/paymentModels.js'
import Reservation from '../models/reservationModels.js'
import Hotel from '../models/hotelModels.js'
import paymentConfig from '../config/payment.js'
import { logActivity } from './activityControllers.js'
import { createNotification } from './notificationControllers.js'
import {
  initializeTransaction as chapaInitialize,
  verifyTransaction as chapaVerify,
  verifyWebhookSignature,
  generateTxRef,
  chapaRequest,
} from '../utils/chapa.js'

const toStr = (v) => {
  if (!v) return ''
  if (typeof v === 'string') return v
  try { return JSON.stringify(v) } catch { return String(v) }
}

const generateTransactionId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = 'PAY'
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function getChapaChannelFromResponse(data) {
  if (!data) return ''
  const body = data.data || data
  return body.channel || body.payment_method || body.funding_source || ''
}

function isValidChapaPayment(verificationData, expectedAmount, expectedCurrency) {
  const chapaData = verificationData.data || verificationData
  const chapaStatus = (chapaData.status || '').toLowerCase()
  if (chapaStatus !== 'success') return false
  if (expectedAmount && Number(chapaData.amount) !== Number(expectedAmount)) return false
  if (expectedCurrency && (chapaData.currency || '').toUpperCase() !== expectedCurrency.toUpperCase()) return false
  return true
}

const initializePayment = async (req, res) => {
  try {
    const { bookingId, guestName, guestEmail, guestPhone, paymentMethod, amount, currency, channels } = req.body

    paymentConfig.logConfig('[initializePayment]')

    console.log('[initializePayment] Request body:', JSON.stringify({
      bookingId, guestName, guestEmail, guestPhone, paymentMethod, amount, currency, channels,
    }, null, 2))

    if (!guestName || !paymentMethod || !amount) {
      return res.status(400).json({ success: false, message: 'Guest name, payment method, and amount are required' })
    }

    if (!paymentConfig.supportedMethods.includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: `Invalid payment method: "${paymentMethod}". Supported: ${paymentConfig.supportedMethods.join(', ')}` })
    }

    if (amount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than 0' })
    }

    let transactionId
    let isUnique = false
    let attempts = 0
    while (!isUnique && attempts < 10) {
      transactionId = generateTransactionId()
      const existing = await Payment.findOne({ transactionId })
      if (!existing) isUnique = true
      attempts++
    }
    if (!isUnique) {
      return res.status(500).json({ success: false, message: 'Could not generate unique transaction ID' })
    }

    const payment = new Payment({
      transactionId,
      bookingId: bookingId || null,
      guestName,
      guestEmail: guestEmail || '',
      guestPhone: guestPhone || '',
      paymentMethod,
      amount: Number(amount),
      currency: currency || 'ETB',
      status: 'Pending',
      verificationStatus: 'Unverified',
      approvalStatus: 'Pending',
    })

    let checkoutUrl = null

    if (paymentMethod === 'Chapa') {
      const tx_ref = await generateTxRef('BOOK')

      const existingTx = await Payment.findOne({ transactionId: tx_ref })
      if (existingTx) {
        return res.status(500).json({ success: false, message: 'Transaction reference collision. Please try again.' })
      }

      payment.transactionId = tx_ref

      const selectedChannel = Array.isArray(channels) && channels.length === 1 ? channels[0] : ''
      if (selectedChannel) {
        payment.paymentMethod = selectedChannel
        payment.chapaChannel = selectedChannel
      }

      const chapaPayload = {
        amount: Number(amount),
        currency: currency || 'ETB',
        email: guestEmail || '',
        first_name: (guestName || '').split(' ')[0] || guestName,
        last_name: (guestName || '').split(' ').slice(1).join(' ') || '',
        tx_ref,
        callback_url: paymentConfig.chapaCallbackUrl,
        return_url: paymentConfig.chapaReturnUrl,
        customization: {
          title: 'Hotel Booking',
          description: `Payment for booking ${bookingId || ''}`,
        },
      }

      if (Array.isArray(channels) && channels.length > 0) {
        chapaPayload.options = { channels }
      }

      console.log('[initializePayment] Chapa payload:', JSON.stringify(chapaPayload, null, 2))

      let chapaResult
      try {
        chapaResult = await chapaInitialize(chapaPayload)
        console.log('[initializePayment] Chapa success:', JSON.stringify(chapaResult, null, 2))
      } catch (chapaError) {
        const chapaMsg = toStr(chapaError?.chapaData?.message) || toStr(chapaError?.chapaData?.msg) || toStr(chapaError?.message) || 'Unknown error'
        const chapaDetail = toStr(chapaError?.chapaData?.detail) || ''
        console.error('[initializePayment] Chapa error:', chapaMsg, chapaDetail)

        payment.status = 'Failed'
        payment.chapaResponse = chapaError?.chapaData || { error: chapaError?.message || String(chapaError) }
        payment.notes = 'Chapa initialization failed: ' + chapaMsg + (chapaDetail ? ' - ' + chapaDetail : '')
        await payment.save()

        const errParts = [chapaMsg]
        if (chapaDetail) errParts.push(chapaDetail)
        return res.status(chapaError?.status || 502).json({
          success: false,
          message: errParts.join('. '),
          error: chapaError?.chapaData || chapaError?.message || String(chapaError),
          payment,
          status: chapaError?.status || 502,
        })
      }

      payment.chapaResponse = chapaResult
      checkoutUrl = chapaResult.data?.checkout_url || null

      if (!checkoutUrl) {
        console.error('[initializePayment] No checkout URL. Response:', JSON.stringify(chapaResult))
        payment.status = 'Failed'
        payment.notes = 'Chapa initialization failed: no checkout URL returned'
        await payment.save()
        return res.status(502).json({
          success: false,
          message: 'Payment gateway returned no checkout URL. Please try again.',
          payment,
          chapaResponse: chapaResult,
        })
      }
    }

    await payment.save()

    if (bookingId) {
      await logActivity({
        action: 'Payment Initialized',
        userId: guestEmail || '',
        userName: guestName,
        userRole: 'Client',
        reservationId: bookingId.toString(),
        guestName,
        details: `Payment of ${amount} ${currency || 'ETB'} via ${paymentMethod} initialized [${paymentConfig.mode}]`,
      })
      await createNotification({
        type: 'payment_initialized',
        message: `Payment of ${amount} ${currency || 'ETB'} from ${guestName} via ${paymentMethod}`,
        relatedId: payment._id.toString(),
        relatedModel: 'Payment',
      })
    }

    res.json({
      success: true,
      message: paymentMethod === 'Chapa'
        ? 'Redirecting to payment gateway...'
        : 'Payment initialized successfully',
      payment: payment.toObject(),
      checkoutUrl,
    })
  } catch (error) {
    console.error('[initializePayment] Unhandled error:', error?.message || error)
    console.error('[initializePayment] Stack:', error?.stack)
    if (error?.chapaData) {
      console.error('[initializePayment] Chapa data:', JSON.stringify(error.chapaData))
    }
    const msg = toStr(error?.chapaData?.message) || toStr(error?.chapaData?.msg) || toStr(error?.message) || 'Error initializing payment'
    if (error?.chapaData || error?.status) {
      return res.status(error?.status || 502).json({
        success: false,
        message: msg,
        error: error?.chapaData || error?.message || String(error),
        status: error?.status || 502,
      })
    }
    res.status(500).json({ success: false, message: 'Error initializing payment' })
  }
}

const confirmPayment = async (req, res) => {
  try {
    const { transactionId, referenceNumber, receipt, notes } = req.body

    if (!transactionId) {
      return res.status(400).json({ success: false, message: 'Transaction ID is required' })
    }

    const payment = await Payment.findOne({ transactionId })
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' })
    }

    if (payment.status === 'Paid') {
      return res.json({ success: false, message: 'Payment already confirmed' })
    }

    if (payment.status === 'Cancelled' || payment.status === 'Refunded') {
      return res.json({ success: false, message: `Cannot confirm a ${payment.status.toLowerCase()} payment` })
    }

    if (payment.paymentMethod === 'Chapa') {
      const verification = await chapaVerify(transactionId)
      const chapaData = verification.data || verification
      const chapaStatus = (chapaData.status || '').toLowerCase()

      if (chapaStatus === 'success') {
        const amountMatch = !payment.amount || Number(chapaData.amount) === Number(payment.amount)
        const currencyMatch = !payment.currency || (chapaData.currency || '').toUpperCase() === payment.currency.toUpperCase()

        if (!amountMatch) {
          payment.status = 'Failed'
          payment.notes = `Amount mismatch: expected ${payment.amount}, got ${chapaData.amount}`
          payment.chapaResponse = verification
          payment.updatedAt = new Date()
          await payment.save()
          return res.json({ success: false, message: 'Payment amount mismatch detected', payment })
        }

        if (!currencyMatch) {
          payment.status = 'Failed'
          payment.notes = `Currency mismatch: expected ${payment.currency}, got ${chapaData.currency}`
          payment.chapaResponse = verification
          payment.updatedAt = new Date()
          await payment.save()
          return res.json({ success: false, message: 'Payment currency mismatch detected', payment })
        }

        payment.status = 'Paid'
        payment.paymentDate = new Date()
        payment.verificationStatus = 'Verified'
        payment.chapaTransactionId = chapaData.transaction_id || chapaData.tx_ref || ''
        payment.chapaChannel = getChapaChannelFromResponse(chapaData)
        payment.referenceNumber = chapaData.transaction_id || payment.referenceNumber
        payment.chapaResponse = verification
        payment.verifiedAt = new Date()
        payment.updatedAt = new Date()
        await payment.save()

        if (payment.bookingId) {
          await Reservation.findByIdAndUpdate(payment.bookingId, {
            paymentStatus: 'Paid',
            status: 'Confirmed',
          })
        }

        return res.json({ success: true, message: 'Payment confirmed via Chapa', payment })
      }

      payment.status = 'Failed'
      payment.chapaResponse = verification
      payment.updatedAt = new Date()
      await payment.save()

      return res.json({
        success: false,
        message: 'Payment verification failed with Chapa. Please try again.',
        payment,
      })
    }

    const offlineMethods = ['Telebirr', 'CBE Birr', 'Awash Bank', 'Dashen Bank', 'Bank Transfer', 'Cash Payment', 'Pay at Hotel']
    if (offlineMethods.includes(payment.paymentMethod)) {
      payment.status = 'Verification Required'
      payment.verificationStatus = 'Unverified'
      if (referenceNumber) payment.referenceNumber = referenceNumber
      if (receipt) payment.receipt = receipt
      if (notes) payment.notes = notes
      payment.updatedAt = new Date()
      await payment.save()

      await createNotification({
        type: 'payment_verification_required',
        message: `Payment ${transactionId} from ${payment.guestName} requires verification`,
        relatedId: payment._id.toString(),
        relatedModel: 'Payment',
      })

      return res.json({
        success: true,
        message: 'Payment submitted for verification. Please wait for admin confirmation.',
        payment
      })
    }

    payment.status = 'Paid'
    payment.paymentDate = new Date()
    payment.referenceNumber = referenceNumber || payment.referenceNumber
    payment.notes = notes || payment.notes
    payment.verificationStatus = 'Verified'
    payment.updatedAt = new Date()
    await payment.save()

    if (payment.bookingId) {
      await Reservation.findByIdAndUpdate(payment.bookingId, {
        paymentStatus: 'Paid',
        status: 'Confirmed',
      })
    }

    await logActivity({
      action: 'Payment Confirmed',
      userId: payment.guestEmail || '',
      userName: payment.guestName,
      userRole: 'Client',
      reservationId: payment.bookingId?.toString() || '',
      guestName: payment.guestName,
      details: `Payment ${transactionId} confirmed via ${payment.paymentMethod}`,
    })

    res.json({ success: true, message: 'Payment confirmed successfully', payment })
  } catch (error) {
    console.error('confirmPayment error:', error?.message || error)
    res.status(500).json({ success: false, message: 'Error confirming payment' })
  }
}

const verifyChapaPayment = async (req, res) => {
  try {
    const { transactionId } = req.params

    if (!transactionId) {
      return res.status(400).json({ success: false, message: 'Transaction reference is required' })
    }

    const payment = await Payment.findOne({ transactionId })
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' })
    }

    if (payment.status === 'Paid') {
      let booking = null
      if (payment.bookingId) {
        booking = await Reservation.findById(payment.bookingId)
      }
      return res.json({
        success: true,
        paid: true,
        message: 'Payment already verified and confirmed',
        payment,
        booking,
      })
    }

    if (payment.status === 'Failed' || payment.status === 'Cancelled') {
      return res.json({
        success: true,
        paid: false,
        message: `Payment previously ${payment.status.toLowerCase()}`,
        payment,
      })
    }

    const verification = await chapaVerify(transactionId)
    const chapaData = verification.data || verification
    const chapaStatus = (chapaData.status || '').toLowerCase()

    payment.chapaResponse = verification
    payment.updatedAt = new Date()

    if (chapaStatus === 'success') {
      if (!isValidChapaPayment(verification, payment.amount, payment.currency)) {
        payment.status = 'Failed'
        payment.notes = 'Verification failed: amount/currency mismatch with Chapa record'
        await payment.save()
        return res.json({
          success: true,
          paid: false,
          message: 'Payment data mismatch detected. Please contact support.',
          payment,
        })
      }

      payment.status = 'Paid'
      payment.paymentDate = new Date()
      payment.verificationStatus = 'Verified'
      payment.chapaTransactionId = chapaData.transaction_id || chapaData.tx_ref || ''
      payment.chapaChannel = getChapaChannelFromResponse(chapaData)
      payment.referenceNumber = chapaData.transaction_id || payment.referenceNumber
      payment.verifiedAt = new Date()
      await payment.save()

      let booking = null
      if (payment.bookingId) {
        booking = await Reservation.findByIdAndUpdate(payment.bookingId, {
          paymentStatus: 'Paid',
          status: 'Confirmed',
        }, { new: true })
        if (booking?.roomId) {
          await Hotel.findByIdAndUpdate(booking.roomId, { status: 'reserved' })
        }
      }

      return res.json({
        success: true,
        paid: true,
        message: 'Payment verified and confirmed successfully',
        payment,
        booking,
      })
    }

    payment.status = 'Failed'
    await payment.save()

    res.json({
      success: true,
      paid: false,
      message: 'Payment not completed. Please try again.',
      payment,
    })
  } catch (error) {
    console.error('verifyChapaPayment error:', error?.message || error)
    if (error?.status === 404) {
      return res.status(404).json({ success: false, message: 'Transaction not found on Chapa' })
    }
    res.status(500).json({ success: false, message: 'Error verifying payment with Chapa' })
  }
}

const handleChapaReturn = async (req, res) => {
  try {
    console.log('[handleChapaReturn] ===== CHAPA RETURN CALLED =====')
    console.log('[handleChapaReturn] Full query params:', JSON.stringify(req.query))
    console.log('[handleChapaReturn] All query keys:', Object.keys(req.query))

    let tx_ref = req.query.tx_ref || req.query['tx-ref'] || req.query.txref || req.query.transaction_ref || req.query.reference || ''
    let chapaStatusParam = req.query.status || req.query.chapa_status || req.query.transaction_status || ''
    const transaction_id = req.query.transaction_id || req.query.transactionId || ''

    console.log('[handleChapaReturn] Parsed - tx_ref:', tx_ref, 'status:', chapaStatusParam, 'transaction_id:', transaction_id)

    if (!tx_ref) {
      console.warn('[handleChapaReturn] No tx_ref found in any query param. Available params:', JSON.stringify(req.query))
      let frontendStatus = 'error'
      const s = (chapaStatusParam || '').toLowerCase()
      if (s === 'cancel' || s === 'cancelled') frontendStatus = 'cancelled'
      const returnUrl = `${paymentConfig.chapaFrontendUrl}?status=${frontendStatus}`
      console.log('[handleChapaReturn] Redirecting to:', returnUrl)
      return res.redirect(returnUrl)
    }

    const payment = await Payment.findOne({ transactionId: tx_ref })
    if (!payment) {
      console.warn(`[handleChapaReturn] Payment not found for tx_ref=${tx_ref}`)
      const returnUrl = `${paymentConfig.chapaFrontendUrl}?status=failed&message=Transaction+not+found`
      return res.redirect(returnUrl)
    }

    console.log(`[handleChapaReturn] Found payment: ${payment._id}, status: ${payment.status}, amount: ${payment.amount}`)

    const s = (chapaStatusParam || '').toLowerCase()
    if (s === 'cancel' || s === 'cancelled') {
      console.log(`[handleChapaReturn] Payment was cancelled by user: ${tx_ref}`)
      if (payment.status !== 'Paid') {
        payment.status = 'Cancelled'
        payment.updatedAt = new Date()
        await payment.save()
        logActivity({
          action: 'Payment Cancelled by User',
          userId: payment.guestEmail || '',
          userName: payment.guestName,
          userRole: 'Client',
          reservationId: payment.bookingId?.toString() || '',
          guestName: payment.guestName,
          details: `Payment ${tx_ref} cancelled by user on Chapa checkout`,
        })
      }
      const returnUrl = `${paymentConfig.chapaFrontendUrl}?status=cancelled&tx_ref=${tx_ref}`
      return res.redirect(returnUrl)
    }

    if (payment.status === 'Paid') {
      console.log(`[handleChapaReturn] Payment ${tx_ref} already paid (via webhook). Redirecting to success.`)
      const returnUrl = `${paymentConfig.chapaFrontendUrl}?status=success&tx_ref=${tx_ref}&booking_id=${payment.bookingId || ''}`
      return res.redirect(returnUrl)
    }

    console.log(`[handleChapaReturn] Verifying transaction ${tx_ref} with Chapa API...`)
    let chapaStatus
    try {
      const verification = await chapaVerify(tx_ref)
      console.log('[handleChapaReturn] Chapa verify response:', JSON.stringify(verification, null, 2))
      payment.chapaResponse = verification
      payment.updatedAt = new Date()

      const chapaData = verification.data || verification
      chapaStatus = (chapaData.status || '').toLowerCase()
      console.log(`[handleChapaReturn] Chapa verification status: "${chapaStatus}"`)

      if (chapaStatus === 'success') {
        console.log(`[handleChapaReturn] Payment VERIFIED SUCCESS: ${tx_ref}`)
        console.log(`[handleChapaReturn] Chapa data: amount=${chapaData.amount}, currency=${chapaData.currency}`)
        console.log(`[handleChapaReturn] Expected: amount=${payment.amount}, currency=${payment.currency}`)

        if (!isValidChapaPayment(verification, payment.amount, payment.currency)) {
          console.error(`[handleChapaReturn] AMOUNT/CURRENCY MISMATCH: expected ${payment.amount}${payment.currency}, got ${chapaData.amount}${chapaData.currency}`)
          payment.status = 'Failed'
          payment.notes = `Amount/currency mismatch on return: expected ${payment.amount}${payment.currency}, got ${chapaData.amount}${chapaData.currency}`
          await payment.save()
          const returnUrl = `${paymentConfig.chapaFrontendUrl}?status=failed&tx_ref=${tx_ref}`
          return res.redirect(returnUrl)
        }

        payment.status = 'Paid'
        payment.paymentDate = new Date()
        payment.verificationStatus = 'Verified'
        payment.chapaTransactionId = chapaData.transaction_id || chapaData.tx_ref || transaction_id || ''
        payment.chapaChannel = getChapaChannelFromResponse(chapaData)
        payment.referenceNumber = chapaData.transaction_id || payment.referenceNumber
        payment.verifiedAt = new Date()
        payment.verifiedBy = 'Chapa Return'
        await payment.save()
        console.log(`[handleChapaReturn] Payment ${tx_ref} updated to PAID`)

        if (payment.bookingId) {
          const booking = await Reservation.findByIdAndUpdate(payment.bookingId, {
            paymentStatus: 'Paid',
            status: 'Confirmed',
          }, { new: true })
          console.log(`[handleChapaReturn] Booking ${payment.bookingId} updated to CONFIRMED`)
          if (booking?.roomId) {
            await Hotel.findByIdAndUpdate(booking.roomId, { status: 'reserved' })
          }
        }

        const returnUrl = `${paymentConfig.chapaFrontendUrl}?status=success&tx_ref=${tx_ref}&booking_id=${payment.bookingId || ''}`
        console.log('[handleChapaReturn] Redirecting SUCCESS to:', returnUrl)
        return res.redirect(returnUrl)
      }

      console.log(`[handleChapaReturn] Payment NOT successful. Chapa status: "${chapaStatus}"`)
      payment.status = 'Failed'
      payment.notes = `Chapa return: payment status "${chapaStatus}"`
      await payment.save()

      const returnUrl = `${paymentConfig.chapaFrontendUrl}?status=failed&tx_ref=${tx_ref}`
      return res.redirect(returnUrl)

    } catch (verifyError) {
      console.error(`[handleChapaReturn] CHAPA VERIFY FAILED for ${tx_ref}:`, verifyError?.message || verifyError)
      if (verifyError?.chapaData) {
        console.error('[handleChapaReturn] Chapa verify response data:', JSON.stringify(verifyError.chapaData, null, 2))
      }
      if (verifyError?.status) {
        console.error('[handleChapaReturn] Verify error status:', verifyError.status)
      }

      const reloaded = await Payment.findOne({ transactionId: tx_ref })
      if (reloaded && reloaded.status === 'Paid') {
        console.log(`[handleChapaReturn] Payment ${tx_ref} already PAID despite verify failure.`)
        const returnUrl = `${paymentConfig.chapaFrontendUrl}?status=success&tx_ref=${tx_ref}&booking_id=${reloaded.bookingId || ''}`
        return res.redirect(returnUrl)
      }

      const sParam = (chapaStatusParam || '').toLowerCase()
      if (sParam === 'success' || sParam === 'completed') {
        console.log(`[handleChapaReturn] Chapa sent status="${chapaStatusParam}" but verify failed. Deferring to webhook.`)
        if (reloaded) {
          reloaded.status = 'Verification Required'
          reloaded.notes = (reloaded.notes || '') + ` Chapa verify failed (${verifyError?.message || 'unknown'}). Webhook may complete.`
          reloaded.updatedAt = new Date()
          await reloaded.save()
          console.log(`[handleChapaReturn] Payment ${tx_ref} set to Verification Required`)
        }
        const returnUrl = `${paymentConfig.chapaFrontendUrl}?status=success&tx_ref=${tx_ref}&booking_id=${(reloaded?.bookingId || '')}`
        return res.redirect(returnUrl)
      }

      console.log(`[handleChapaReturn] No recovery path. chapaSentStatus="${sParam}"`)
      const fallbackStatus = sParam === 'success' || sParam === 'completed' ? 'success' : (sParam || 'error')
      const returnUrl = `${paymentConfig.chapaFrontendUrl}?status=${fallbackStatus}&tx_ref=${tx_ref}`
      console.log('[handleChapaReturn] Redirecting to:', returnUrl)
      return res.redirect(returnUrl)
    }
  } catch (error) {
    console.error('[handleChapaReturn] UNHANDLED ERROR:', error?.message || error)
    console.error('[handleChapaReturn] Stack:', error?.stack)
    const tx_ref = req.query?.tx_ref || req.query?.['tx-ref'] || req.query?.txref || ''
    const returnUrl = `${paymentConfig.chapaFrontendUrl}?status=error&tx_ref=${tx_ref}`
    res.redirect(returnUrl)
  }
}

const chapaWebhook = async (req, res) => {
  try {
    console.log('[chapaWebhook] ===== WEBHOOK RECEIVED =====')
    console.log('[chapaWebhook] Headers:', JSON.stringify(req.headers))
    console.log('[chapaWebhook] Raw body present:', !!req.rawBody)
    console.log('[chapaWebhook] Body:', JSON.stringify(req.body, null, 2))

    const rawBody = req.rawBody || JSON.stringify(req.body)
    const signature = req.headers['x-chapa-signature'] || req.headers['chapa-signature'] || req.headers['x-chapa-webhook-signature'] || ''
    console.log('[chapaWebhook] Signature from header:', signature ? signature.substring(0, 20) + '...' : 'NONE')

    if (!signature) {
      console.warn('[chapaWebhook] No signature header — accepting webhook anyway (not verifying)')
    } else {
      const isValid = verifyWebhookSignature(rawBody, signature)
      console.log('[chapaWebhook] Signature valid:', isValid)
      if (!isValid) {
        console.warn('[chapaWebhook] Invalid signature — processing anyway (webhook may not be configured with secret)')
      }
    }

    const { tx_ref, status, transaction_id, amount, currency, charge, created_at, channel } = req.body
    console.log('[chapaWebhook] Parsed fields:', { tx_ref, status, transaction_id, amount, currency, channel })

    if (!tx_ref) {
      console.error('[chapaWebhook] Missing tx_ref in webhook body')
      return res.status(400).json({ success: false, message: 'Missing tx_ref' })
    }

    const payment = await Payment.findOne({ transactionId: tx_ref })
    if (!payment) {
      console.error(`[chapaWebhook] Payment NOT FOUND for tx_ref=${tx_ref}`)
      // Try to find by chapaTransactionId
      const altPayment = transaction_id ? await Payment.findOne({ chapaTransactionId: transaction_id }) : null
      if (altPayment) {
        console.log(`[chapaWebhook] Found payment by chapaTransactionId: ${altPayment._id}`)
        return processWebhookPayment(req, res, altPayment, req.body, rawBody, signature)
      }
      return res.status(404).json({ success: false, message: 'Payment not found' })
    }

    return processWebhookPayment(req, res, payment, req.body, rawBody, signature)
  } catch (error) {
    console.error('[chapaWebhook] UNHANDLED ERROR:', error?.message || error)
    console.error('[chapaWebhook] Stack:', error?.stack)
    res.status(500).json({ success: false, message: 'Error processing webhook' })
  }
}

async function processWebhookPayment(req, res, payment, body, rawBody, signature) {
  try {
    const { tx_ref, status, transaction_id, amount, currency, created_at, channel } = body
    const chapaStatus = (status || '').toLowerCase()
    console.log(`[chapaWebhook] Processing ${chapaStatus} for payment ${payment._id}, tx_ref=${tx_ref}`)
    console.log(`[chapaWebhook] Current payment status: ${payment.status}, amount: ${payment.amount}, currency: ${payment.currency}`)

    const isDuplicate = payment.webhookEvents?.some(
      ev => ev.event === chapaStatus && ev.data?.transaction_id === transaction_id
    ) || false

    const eventRecord = {
      event: isDuplicate ? 'duplicate_webhook_ignored' : (status || 'unknown'),
      data: body,
      signature,
      receivedAt: new Date(),
    }

    if (!payment.webhookEvents) payment.webhookEvents = []
    payment.webhookEvents.push(eventRecord)
    payment.callbackData = body
    payment.updatedAt = new Date()

    if (isDuplicate) {
      await payment.save()
      console.log(`[chapaWebhook] Duplicate webhook ignored for ${tx_ref}`)
      return res.json({ success: true, message: 'Duplicate webhook ignored' })
    }

    if (chapaStatus === 'success' || chapaStatus === 'completed') {
      if (payment.status === 'Paid') {
        console.log(`[chapaWebhook] Payment ${tx_ref} already PAID. Ignoring.`)
        await payment.save()
        return res.json({ success: true, message: 'Already paid' })
      }

      console.log(`[chapaWebhook] Verifying amount/currency. Webhook: amount=${amount}, currency=${currency}`)
      console.log(`[chapaWebhook] Expected: amount=${payment.amount}, currency=${payment.currency}`)

      if (!isValidChapaPayment({ data: body }, payment.amount, payment.currency)) {
        console.error(`[chapaWebhook] AMOUNT/CURRENCY MISMATCH: webhook=${amount}${currency}, expected=${payment.amount}${payment.currency}`)
        payment.status = 'Failed'
        payment.notes = `Webhook mismatch: amount=${amount}, currency=${currency}`
        await payment.save()
        return res.json({ success: true, message: 'Webhook processed with mismatch' })
      }

      console.log(`[chapaWebhook] SETTING PAYMENT TO PAID: ${tx_ref}`)
      payment.status = 'Paid'
      payment.paymentDate = transaction_id ? new Date(created_at || Date.now()) : new Date()
      payment.referenceNumber = transaction_id || payment.referenceNumber
      payment.chapaTransactionId = transaction_id || ''
      payment.chapaChannel = channel || getChapaChannelFromResponse(body) || payment.chapaChannel
      payment.verificationStatus = 'Verified'
      payment.verifiedAt = new Date()
      payment.verifiedBy = 'Chapa Webhook'
      payment.approvalStatus = 'Approved'

      if (payment.chapaChannel && payment.chapaChannel !== payment.paymentMethod) {
        payment.paymentMethod = payment.chapaChannel
      }

      if (payment.bookingId) {
        console.log(`[chapaWebhook] Updating booking ${payment.bookingId} to CONFIRMED`)
        const booking = await Reservation.findByIdAndUpdate(payment.bookingId, {
          paymentStatus: 'Paid',
          status: 'Confirmed',
        }, { new: true })
        if (booking) {
          console.log(`[chapaWebhook] Booking ${payment.bookingId} updated: paymentStatus=Paid, status=Confirmed`)
          if (booking?.roomId) {
            await Hotel.findByIdAndUpdate(booking.roomId, { status: 'reserved' })
            console.log(`[chapaWebhook] Room ${booking.roomId} set to reserved`)
          }
        }
      }

      await payment.save()
      console.log(`[chapaWebhook] Payment ${tx_ref} saved as PAID`)

      logActivity({
        action: 'Payment Verified via Webhook',
        userId: payment.guestEmail || '',
        userName: payment.guestName,
        userRole: 'System',
        reservationId: payment.bookingId?.toString() || '',
        guestName: payment.guestName,
        details: `Payment ${tx_ref} auto-verified via Chapa webhook. Transaction: ${transaction_id || ''}, Channel: ${payment.chapaChannel || 'N/A'} [${paymentConfig.mode}]`,
      })

      createNotification({
        type: 'payment_received',
        message: `Payment of ${payment.amount} ${payment.currency} from ${payment.guestName} confirmed via ${payment.chapaChannel || payment.paymentMethod}`,
        relatedId: payment._id.toString(),
        relatedModel: 'Payment',
      })
    } else if (chapaStatus === 'failed') {
      console.log(`[chapaWebhook] Payment ${tx_ref} reported as FAILED by Chapa`)
      if (payment.status !== 'Paid') {
        payment.status = 'Failed'
        payment.notes = `Chapa reported failure: ${body['reason'] || body['failure_reason'] || ''}`
      }
    } else if (chapaStatus === 'cancelled') {
      console.log(`[chapaWebhook] Payment ${tx_ref} reported as CANCELLED by Chapa`)
      if (payment.status !== 'Paid') {
        payment.status = 'Cancelled'
      }
    } else {
      console.log(`[chapaWebhook] Unknown status from Chapa: "${chapaStatus}"`)
    }

    await payment.save()
    console.log(`[chapaWebhook] Webhook processing complete for ${tx_ref}`)
    res.json({ success: true, message: 'Webhook processed' })
  } catch (error) {
    console.error('[chapaWebhook:processWebhookPayment] Error:', error?.message || error)
    res.status(500).json({ success: false, message: 'Error processing webhook payment' })
  }
}

const getAllPayments = async (req, res) => {
  try {
    const { status, method, page = 1, limit = 20, search, showArchived, startDate, endDate } = req.query

    const query = {}
    if (showArchived !== 'true') {
      query.archived = { $ne: true }
    }
    if (status && status !== 'all') query.status = status
    if (method && method !== 'all') query.paymentMethod = method
    if (startDate || endDate) {
      query.createdAt = {}
      if (startDate) query.createdAt.$gte = new Date(startDate)
      if (endDate) query.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z')
    }
    if (search) {
      query.$or = [
        { transactionId: { $regex: search, $options: 'i' } },
        { guestName: { $regex: search, $options: 'i' } },
        { guestEmail: { $regex: search, $options: 'i' } },
        { referenceNumber: { $regex: search, $options: 'i' } },
        { chapaTransactionId: { $regex: search, $options: 'i' } },
      ]
    }

    const total = await Payment.countDocuments(query)
    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))

    res.json({
      success: true,
      payments,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('getAllPayments error:', error?.message || error)
    res.status(500).json({ success: false, message: 'Error fetching payments' })
  }
}

const archivePayment = async (req, res) => {
  try {
    const { id } = req.params
    const payment = await Payment.findById(id)
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' })

    payment.archived = true
    payment.archivedAt = new Date()
    payment.updatedAt = new Date()
    await payment.save()

    res.json({ success: true, message: 'Payment archived', payment })
  } catch (error) {
    console.error('archivePayment error:', error?.message || error)
    res.status(500).json({ success: false, message: 'Error archiving payment' })
  }
}

const restorePayment = async (req, res) => {
  try {
    const { id } = req.params
    const payment = await Payment.findById(id)
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' })

    payment.archived = false
    payment.archivedAt = null
    payment.updatedAt = new Date()
    await payment.save()

    res.json({ success: true, message: 'Payment restored', payment })
  } catch (error) {
    console.error('restorePayment error:', error?.message || error)
    res.status(500).json({ success: false, message: 'Error restoring payment' })
  }
}

const deletePayment = async (req, res) => {
  try {
    const { id } = req.params
    const payment = await Payment.findById(id)
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' })

    await Payment.findByIdAndDelete(id)

    await logActivity({
      action: 'Payment Permanently Deleted',
      userId: req.admin?.userId || '',
      userName: req.admin?.name || 'Administrator',
      userRole: 'Admin',
      reservationId: payment.bookingId?.toString() || '',
      guestName: payment.guestName,
      details: `Payment ${payment.transactionId} permanently deleted by ${req.admin?.name || 'Administrator'}`,
    })

    res.json({ success: true, message: 'Payment permanently deleted' })
  } catch (error) {
    console.error('deletePayment error:', error?.message || error)
    res.status(500).json({ success: false, message: 'Error deleting payment' })
  }
}

const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' })
    res.json({ success: true, payment })
  } catch (error) {
    console.error('getPaymentById error:', error?.message || error)
    res.status(500).json({ success: false, message: 'Error fetching payment' })
  }
}

const getPaymentByTransactionId = async (req, res) => {
  try {
    const payment = await Payment.findOne({ transactionId: req.params.transactionId })
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' })
    res.json({ success: true, payment })
  } catch (error) {
    console.error('getPaymentByTransactionId error:', error?.message || error)
    res.status(500).json({ success: false, message: 'Error fetching payment' })
  }
}

const getPaymentsByBooking = async (req, res) => {
  try {
    const payments = await Payment.find({ bookingId: req.params.bookingId }).sort({ createdAt: -1 })
    res.json({ success: true, payments })
  } catch (error) {
    console.error('getPaymentsByBooking error:', error?.message || error)
    res.status(500).json({ success: false, message: 'Error fetching payments' })
  }
}

const verifyPayment = async (req, res) => {
  try {
    const { id } = req.params
    const { verifiedBy } = req.body

    const payment = await Payment.findById(id)
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' })

    if (payment.status === 'Cancelled' || payment.status === 'Refunded') {
      return res.json({ success: false, message: `Cannot verify a ${payment.status.toLowerCase()} payment` })
    }

    payment.status = 'Paid'
    payment.paymentDate = new Date()
    payment.verificationStatus = 'Verified'
    payment.verifiedBy = verifiedBy || req.admin?.name || 'Administrator'
    payment.verifiedAt = new Date()
    payment.approvalStatus = 'Approved'
    payment.approvedBy = req.admin?.name || 'Administrator'
    payment.approvedAt = new Date()
    payment.updatedAt = new Date()

    await payment.save()

    if (payment.bookingId) {
      const booking = await Reservation.findByIdAndUpdate(payment.bookingId, {
        paymentStatus: 'Paid',
        status: 'Confirmed',
      }, { new: true })
      if (booking?.roomId) {
        await Hotel.findByIdAndUpdate(booking.roomId, { status: 'reserved' })
      }
    }

    await logActivity({
      action: 'Payment Verified',
      userId: req.admin?.userId || '',
      userName: req.admin?.name || 'Administrator',
      userRole: 'Admin',
      reservationId: payment.bookingId?.toString() || '',
      guestName: payment.guestName,
      details: `Payment ${payment.transactionId} verified by ${req.admin?.name || 'Administrator'} [${paymentConfig.mode}]`,
    })

    res.json({ success: true, message: 'Payment verified successfully', payment })
  } catch (error) {
    console.error('verifyPayment error:', error?.message || error)
    res.status(500).json({ success: false, message: 'Error verifying payment' })
  }
}

const rejectPayment = async (req, res) => {
  try {
    const { id } = req.params
    const { reason } = req.body

    const payment = await Payment.findById(id)
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' })

    if (payment.status === 'Paid') {
      return res.json({ success: false, message: 'Cannot reject a paid payment' })
    }

    payment.verificationStatus = 'Rejected'
    payment.approvalStatus = 'Rejected'
    payment.approvedBy = req.admin?.name || 'Administrator'
    payment.approvedAt = new Date()
    payment.notes = reason ? `${payment.notes}\nRejection reason: ${reason}`.trim() : payment.notes
    payment.updatedAt = new Date()

    await payment.save()

    if (payment.bookingId) {
      await Reservation.findByIdAndUpdate(payment.bookingId, {
        paymentStatus: 'Pending',
      })
    }

    res.json({ success: true, message: 'Payment rejected', payment })
  } catch (error) {
    console.error('rejectPayment error:', error?.message || error)
    res.status(500).json({ success: false, message: 'Error rejecting payment' })
  }
}

const cancelPayment = async (req, res) => {
  try {
    const { id } = req.params

    const payment = await Payment.findById(id)
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' })

    if (payment.status === 'Paid' || payment.status === 'Refunded') {
      return res.json({ success: false, message: `Cannot cancel a ${payment.status.toLowerCase()} payment` })
    }

    payment.status = 'Cancelled'
    payment.updatedAt = new Date()
    await payment.save()

    if (payment.bookingId) {
      const booking = await Reservation.findByIdAndUpdate(payment.bookingId, {
        paymentStatus: 'Pending',
      })
      if (booking?.roomId) {
        await Hotel.findByIdAndUpdate(booking.roomId, { status: 'available' })
      }
    }

    res.json({ success: true, message: 'Payment cancelled', payment })
  } catch (error) {
    console.error('cancelPayment error:', error?.message || error)
    res.status(500).json({ success: false, message: 'Error cancelling payment' })
  }
}

const refundPayment = async (req, res) => {
  try {
    const { id } = req.params
    const payment = await Payment.findById(id)
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' })

    if (payment.status !== 'Paid') {
      return res.json({ success: false, message: 'Only paid payments can be refunded' })
    }

    payment.status = 'Refunded'
    payment.updatedAt = new Date()
    await payment.save()

    if (payment.bookingId) {
      const booking = await Reservation.findByIdAndUpdate(payment.bookingId, {
        status: 'Cancelled',
      })
      if (booking?.roomId) {
        await Hotel.findByIdAndUpdate(booking.roomId, { status: 'available' })
      }
    }

    res.json({ success: true, message: 'Payment refunded successfully', payment })
  } catch (error) {
    console.error('refundPayment error:', error?.message || error)
    res.status(500).json({ success: false, message: 'Error refunding payment' })
  }
}

const getPaymentStats = async (req, res) => {
  try {
    const stats = await Payment.aggregate([
      {
        $group: {
          _id: '$paymentMethod',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          paid: { $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, '$amount', 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, '$amount', 0] } },
        }
      }
    ])

    const totals = await Payment.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalPaid: { $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, '$amount', 0] } },
          totalPending: { $sum: { $cond: [{ $in: ['$status', ['Pending', 'Verification Required']] }, '$amount', 0] } },
          totalPayments: { $sum: 1 },
          paidCount: { $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, 1, 0] } },
          pendingCount: { $sum: { $cond: [{ $in: ['$status', ['Pending', 'Verification Required']] }, 1, 0] } },
          failedCount: { $sum: { $cond: [{ $eq: ['$status', 'Failed'] }, 1, 0] } },
          refundedCount: { $sum: { $cond: [{ $eq: ['$status', 'Refunded'] }, 1, 0] } },
        }
      }
    ])

    const methodBreakdown = {}
    stats.forEach(s => {
      methodBreakdown[s._id] = { total: s.total, count: s.count, paid: s.paid, pending: s.pending }
    })

    res.json({
      success: true,
      stats: totals[0] || { totalAmount: 0, totalPaid: 0, totalPending: 0, totalPayments: 0, paidCount: 0, pendingCount: 0, failedCount: 0, refundedCount: 0 },
      methodBreakdown,
    })
  } catch (error) {
    console.error('getPaymentStats error:', error?.message || error)
    res.status(500).json({ success: false, message: 'Error fetching payment stats' })
  }
}

const getRevenueStats = async (req, res) => {
  try {
    const { startDate, endDate, period, paymentMethod, paymentStatus } = req.query

    let dateFilter = {}
    const now = new Date()

    if (startDate && endDate) {
      dateFilter = {
        paymentDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate + 'T23:59:59.999Z'),
        }
      }
    } else if (period === 'daily') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      dateFilter = { paymentDate: { $gte: start } }
    } else if (period === 'weekly') {
      const dayOfWeek = now.getDay()
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      const start = new Date(now.getFullYear(), now.getMonth(), diff)
      dateFilter = { paymentDate: { $gte: start } }
    } else if (period === 'monthly') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      dateFilter = { paymentDate: { $gte: start } }
    } else if (period === 'yearly') {
      const start = new Date(now.getFullYear(), 0, 1)
      dateFilter = { paymentDate: { $gte: start } }
    }

    const matchFilter = { status: 'Paid', ...dateFilter }
    if (paymentMethod && paymentMethod !== 'all') matchFilter.paymentMethod = paymentMethod
    if (paymentStatus && paymentStatus !== 'all') matchFilter.status = paymentStatus
    if (!paymentStatus || paymentStatus === 'all') {
      const revenueStats = await Payment.aggregate([
        { $match: { status: 'Paid', ...dateFilter } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' },
            totalTransactions: { $sum: 1 },
            averageTransaction: { $avg: '$amount' },
            maxTransaction: { $max: '$amount' },
            minTransaction: { $min: '$amount' },
          }
        }
      ])

      const methodBreakdown = await Payment.aggregate([
        { $match: { status: 'Paid', ...dateFilter } },
        {
          $group: {
            _id: '$paymentMethod',
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          }
        },
        { $sort: { total: -1 } },
      ])

      const dailyBreakdown = await Payment.aggregate([
        { $match: { status: 'Paid', ...dateFilter } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$paymentDate' },
            },
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          }
        },
        { $sort: { _id: 1 } },
      ])

      return res.json({
        success: true,
        stats: revenueStats[0] || { totalRevenue: 0, totalTransactions: 0, averageTransaction: 0, maxTransaction: 0, minTransaction: 0 },
        methodBreakdown,
        dailyBreakdown,
        period: period || 'custom',
        startDate: startDate || dateFilter?.paymentDate?.$gte || null,
        endDate: endDate || dateFilter?.paymentDate?.$lte || null,
        mode: paymentConfig.mode,
      })
    }

    const revenueStats = await Payment.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalTransactions: { $sum: 1 },
          averageTransaction: { $avg: '$amount' },
        }
      }
    ])

    const methodBreakdown = await Payment.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$paymentMethod',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        }
      },
      { $sort: { total: -1 } },
    ])

    res.json({
      success: true,
      stats: revenueStats[0] || { totalRevenue: 0, totalTransactions: 0, averageTransaction: 0 },
      methodBreakdown,
      period: period || 'custom',
      startDate: startDate || dateFilter?.paymentDate?.$gte || null,
      endDate: endDate || dateFilter?.paymentDate?.$lte || null,
      mode: paymentConfig.mode,
    })
  } catch (error) {
    console.error('getRevenueStats error:', error?.message || error)
    res.status(500).json({ success: false, message: 'Error fetching revenue statistics' })
  }
}

const getPaymentByChapaTransactionId = async (req, res) => {
  try {
    const { chapaTransactionId } = req.params
    if (!chapaTransactionId) {
      return res.status(400).json({ success: false, message: 'Chapa transaction ID is required' })
    }
    const payment = await Payment.findOne({ chapaTransactionId })
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' })
    res.json({ success: true, payment })
  } catch (error) {
    console.error('getPaymentByChapaTransactionId error:', error?.message || error)
    res.status(500).json({ success: false, message: 'Error fetching payment' })
  }
}

const testChapaConnection = async (req, res) => {
  try {
    console.log('[testChapaConnection] Starting Chapa API connectivity test...')
    paymentConfig.logConfig('[testChapaConnection]')

    const configErrors = paymentConfig.validate()
    if (configErrors.length > 0) {
      console.error('[testChapaConnection] Configuration errors:', configErrors)
      return res.status(500).json({
        success: false,
        message: 'Chapa configuration errors',
        errors: configErrors,
      })
    }

    const testRef = 'TEST-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase()
    console.log('[testChapaConnection] Test tx_ref:', testRef)

    const payload = {
      amount: '1',
      currency: 'ETB',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      tx_ref: testRef,
      callback_url: paymentConfig.chapaCallbackUrl,
      return_url: paymentConfig.chapaReturnUrl,
      customization: { title: 'API Test', description: 'API connectivity test' },
    }

    console.log('[testChapaConnection] Payload:', JSON.stringify(payload, null, 2))

    const result = await chapaRequest('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    console.log('[testChapaConnection] SUCCESS:', JSON.stringify(result, null, 2))
    res.json({
      success: true,
      message: 'Chapa API is reachable',
      data: {
        checkout_url: result.data?.checkout_url || null,
        status: result.status || result.data?.status,
        tx_ref: result.data?.tx_ref || testRef,
      },
    })
  } catch (error) {
    console.error('[testChapaConnection] FAILED:', error?.message)
    console.error('[testChapaConnection] Chapa data:', JSON.stringify(error?.chapaData, null, 2))
    console.error('[testChapaConnection] Status:', error?.status)
    return res.status(error?.status || 500).json({
      success: false,
      message: toStr(error?.chapaData?.message) || toStr(error?.chapaData?.msg) || toStr(error?.message) || 'Chapa API error',
      error: error?.chapaData || error?.message || String(error),
      status: error?.status || 0,
      configErrors: error?.configErrors,
    })
  }
}

const getChapaChannels = async (req, res) => {
  res.json({
    success: true,
    channels: paymentConfig.chapaChannels,
    mode: paymentConfig.mode,
  })
}

export {
  initializePayment,
  confirmPayment,
  verifyChapaPayment,
  handleChapaReturn,
  getAllPayments,
  getPaymentById,
  getPaymentByTransactionId,
  getPaymentsByBooking,
  verifyPayment,
  rejectPayment,
  cancelPayment,
  refundPayment,
  getPaymentStats,
  getRevenueStats,
  getPaymentByChapaTransactionId,
  testChapaConnection,
  chapaWebhook,
  getChapaChannels,
  archivePayment,
  restorePayment,
  deletePayment,
}
