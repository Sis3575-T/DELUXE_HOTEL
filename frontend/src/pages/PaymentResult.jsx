import React, { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import axios from 'axios'
import { backendUrl } from '../App'
import { MdCheckCircle, MdCancel, MdHourglassEmpty, MdHome, MdReceipt } from 'react-icons/md'

const PaymentResult = () => {
  const [searchParams] = useSearchParams()
  const [verifying, setVerifying] = useState(true)
  const [result, setResult] = useState({ status: 'pending', message: 'Verifying your payment...' })
  const [payment, setPayment] = useState(null)

  const status = searchParams.get('status') || 'pending'
  const txRef = searchParams.get('tx_ref') || ''
  const bookingId = searchParams.get('booking_id') || ''

  useEffect(() => {
    let cancelled = false
    const verifyPayment = async () => {
      try {
        setVerifying(true)
        if (status === 'success' && txRef) {
          const r = await axios.get(`${backendUrl}/api/payment/chapa-verify/${txRef}`)
          if (!cancelled) {
            if (r.data?.success && r.data?.paid) {
              setResult({
                status: 'success',
                message: 'Payment confirmed! Your booking is confirmed.',
              })
              setPayment(r.data.payment)
            } else {
              setResult({
                status: 'failed',
                message: r.data?.message || 'Payment verification failed. Please try again.',
              })
            }
          }
        } else if (status === 'cancelled') {
          setResult({
            status: 'cancelled',
            message: 'Payment was cancelled. Your booking is pending but no payment was made. You can retry from My Reservations.',
          })
        } else if (status === 'error') {
          setResult({
            status: 'error',
            message: 'An error occurred during payment processing. Please contact support.',
          })
        } else {
          if (txRef) {
            const r = await axios.get(`${backendUrl}/api/payment/chapa-verify/${txRef}`)
            if (!cancelled && r.data?.success) {
              if (r.data?.paid) {
                setResult({
                  status: 'success',
                  message: 'Payment confirmed! Your booking is confirmed.',
                })
                setPayment(r.data.payment)
              } else {
                setResult({
                  status: 'failed',
                  message: r.data?.message || 'Payment was not completed.',
                })
              }
            } else if (!cancelled) {
              setResult({
                status: 'pending',
                message: 'Payment status unknown. Please check your reservations.',
              })
            }
          } else {
            setResult({
              status: 'pending',
              message: 'No transaction reference found. Please check your reservations.',
            })
          }
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
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center" style={{ borderColor: '#E5E7EB' }}>
          {verifying ? (
            <div>
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
              <h2 className="text-lg font-bold" style={{ color: '#1E293B' }}>
                {result.status === 'success' ? 'Payment Successful!' :
                 result.status === 'failed' ? 'Payment Failed' :
                 result.status === 'cancelled' ? 'Payment Cancelled' : 'Payment Status'}
              </h2>
              <p className="text-sm mt-2" style={{ color: '#6B7280' }}>{result.message}</p>

              {txRef && (
                <p className="text-xs mt-3 font-mono" style={{ color: '#9CA3AF' }}>
                  Ref: {txRef}
                </p>
              )}

              {payment && (
                <div className="mt-4 p-3 rounded-lg text-left text-sm" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                  <div className="flex justify-between mb-1"><span style={{ color: '#6B7280' }}>Amount:</span><span className="font-semibold">{payment.currency} {payment.amount?.toLocaleString()}</span></div>
                  <div className="flex justify-between mb-1"><span style={{ color: '#6B7280' }}>Method:</span><span>{payment.paymentMethod}</span></div>
                  <div className="flex justify-between"><span style={{ color: '#6B7280' }}>Status:</span><span className="font-semibold" style={{ color: payment.status === 'Paid' ? '#16A34A' : '#DC2626' }}>{payment.status}</span></div>
                </div>
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
                    <MdReceipt size={16} /> Retry Payment
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
