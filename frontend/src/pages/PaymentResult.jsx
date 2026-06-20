import React, { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import axios from 'axios'
import { backendUrl } from '../App'
import {
  MdCheckCircle, MdCancel, MdHourglassEmpty,
  MdHome, MdReceipt, MdPayment, MdEvent, MdPerson, MdRoom,
  MdCreditCard, MdDateRange, MdRefresh,
} from 'react-icons/md'

const formatDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const DetailRow = ({ icon, label, value }) => (
  <div className="flex items-center gap-2 text-sm py-1">
    <span style={{ color: '#94A3B8', minWidth: 20 }}>{icon}</span>
    <span style={{ color: '#6B7280', minWidth: 100 }}>{label}</span>
    <span className="font-medium" style={{ color: '#1E293B' }}>{value || '—'}</span>
  </div>
)

const PaymentResult = () => {
  const [searchParams] = useSearchParams()
  const [verifying, setVerifying] = useState(true)
  const [result, setResult] = useState({ status: 'pending', message: 'Verifying your payment...' })
  const [payment, setPayment] = useState(null)
  const [booking, setBooking] = useState(null)

  const status = searchParams.get('status') || 'pending'
  const txRef = searchParams.get('tx_ref') || ''
  const bookingId = searchParams.get('booking_id') || ''

  useEffect(() => {
    if (status === 'success') {
      setResult({
        status: 'success',
        message: 'Payment confirmed! Your booking is confirmed.',
      })
      setVerifying(false)
      if (txRef) {
        axios.get(`${backendUrl}/api/payment/chapa-verify/${txRef}`)
          .then(r => {
            if (r.data?.success && r.data?.paid) {
              setPayment(r.data.payment)
              setBooking(r.data.booking)
            }
          })
          .catch(() => {})
      }
    } else if (status === 'cancelled') {
      setResult({
        status: 'cancelled',
        message: 'Payment was cancelled. Your booking is still pending — you can pay later from My Reservations.',
      })
      setVerifying(false)
    } else if (status === 'error') {
      setResult({
        status: 'error',
        message: 'An error occurred during payment processing. Please try again or contact support.',
      })
      setVerifying(false)
    } else if (!txRef) {
      setResult({
        status: 'pending',
        message: 'No transaction reference found. Check your reservations for status.',
      })
      setVerifying(false)
    } else {
      let cancelled = false
      const verifyPayment = async () => {
        try {
          setVerifying(true)
          const r = await axios.get(`${backendUrl}/api/payment/chapa-verify/${txRef}`)
          if (cancelled) return

          if (r.data?.success && r.data?.paid) {
            setResult({
              status: 'success',
              message: 'Payment confirmed! Your booking is confirmed.',
            })
            setPayment(r.data.payment)
            setBooking(r.data.booking)
          } else {
            setResult({
              status: 'failed',
              message: r.data?.message || 'Payment was not completed. Please try again.',
            })
            setPayment(r.data?.payment || null)
          }
        } catch (err) {
          if (!cancelled) {
            setResult({
              status: 'error',
              message: 'Could not verify payment. Please check your reservations.',
            })
          }
        } finally {
          if (!cancelled) setVerifying(false)
        }
      }
      verifyPayment()
      return () => { cancelled = true }
    }
  }, [status, txRef])

  const iconMap = {
    success: { icon: MdCheckCircle, color: '#16A34A', bg: '#DCFCE7' },
    failed: { icon: MdCancel, color: '#DC2626', bg: '#FEE2E2' },
    cancelled: { icon: MdCancel, color: '#D97706', bg: '#FEF3C7' },
    pending: { icon: MdHourglassEmpty, color: '#2563EB', bg: '#DBEAFE' },
    error: { icon: MdCancel, color: '#DC2626', bg: '#FEE2E2' },
  }
  const currentIcon = iconMap[result.status] || iconMap.pending
  const Icon = currentIcon.icon

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F8FAFC' }}>
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-xl shadow-sm border p-8" style={{ borderColor: '#E5E7EB' }}>
          {verifying ? (
            <div className="text-center">
              <svg className="animate-spin mx-auto mb-4" fill="none" viewBox="0 0 24 24" style={{ width: '48px', height: '48px' }}>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#2563EB" strokeWidth="4" />
                <path className="opacity-75" fill="#2563EB" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <h2 className="text-lg font-bold" style={{ color: '#1E293B' }}>Verifying Payment</h2>
              <p className="text-sm mt-2" style={{ color: '#6B7280' }}>Please wait while we confirm your payment with Chapa...</p>
            </div>
          ) : (
            <div>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: currentIcon.bg }}>
                <Icon size={32} style={{ color: currentIcon.color }} />
              </div>

              <h2 className="text-lg font-bold text-center" style={{ color: '#1E293B' }}>
                {result.status === 'success' ? 'Payment Successful!' :
                 result.status === 'failed' ? 'Payment Failed' :
                 result.status === 'cancelled' ? 'Payment Cancelled' : 'Payment Status'}
              </h2>
              <p className="text-sm text-center mt-2" style={{ color: '#6B7280' }}>{result.message}</p>

              {result.status === 'success' && payment && (
                <div className="mt-5 p-4 rounded-lg" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                  <h3 className="text-sm font-semibold mb-3" style={{ color: '#374151' }}>Booking Details</h3>
                  <div className="space-y-1">
                    <DetailRow icon={<MdReceipt size={14} />} label="Booking No." value={bookingId ? `#${bookingId.slice(-6).toUpperCase()}` : '—'} />
                    <DetailRow icon={<MdPerson size={14} />} label="Guest Name" value={payment.guestName} />
                    <DetailRow icon={<MdRoom size={14} />} label="Room Name" value={booking?.roomName || '—'} />
                    <DetailRow icon={<MdPayment size={14} />} label="Amount Paid" value={`${payment.currency || 'ETB'} ${Number(payment.amount).toLocaleString()}`} />
                    <DetailRow icon={<MdCreditCard size={14} />} label="Transaction ID" value={payment.chapaTransactionId || payment.transactionId} />
                    <DetailRow icon={<MdCreditCard size={14} />} label="Payment Method" value={payment.chapaChannel || payment.paymentMethod} />
                    <DetailRow icon={<MdDateRange size={14} />} label="Payment Date" value={formatDate(payment.paymentDate || payment.updatedAt)} />
                    <DetailRow icon={<MdReceipt size={14} />} label="Booking Status" value={booking?.status || 'Confirmed'} />
                  </div>
                </div>
              )}

              {txRef && (
                <p className="text-xs mt-3 text-center font-mono" style={{ color: '#9CA3AF' }}>
                  Ref: {txRef}
                </p>
              )}

              <div className="flex flex-col gap-3 mt-6">
                {result.status === 'success' && (
                  <Link
                    to="/my-reservations"
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded text-sm font-medium text-white transition-all hover:opacity-90"
                    style={{ background: '#2563EB' }}
                  >
                    <MdReceipt size={16} /> View My Reservations
                  </Link>
                )}
                {(result.status === 'failed' || result.status === 'cancelled') && (
                  <Link
                    to="/my-reservations"
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded text-sm font-medium text-white transition-all hover:opacity-90"
                    style={{ background: '#D97706' }}
                  >
                    <MdRefresh size={16} /> Retry Payment
                  </Link>
                )}
                {(result.status === 'error') && (
                  <Link
                    to="/my-reservations"
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded text-sm font-medium text-white transition-all hover:opacity-90"
                    style={{ background: '#D97706' }}
                  >
                    <MdRefresh size={16} /> Try Again
                  </Link>
                )}
                <Link
                  to="/"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded text-sm font-medium transition-all hover:opacity-80"
                  style={{ background: '#F3F4F6', color: '#6B7280' }}
                >
                  <MdHome size={16} /> Back to Home
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PaymentResult
