import React, { useState, useCallback } from 'react'
import axios from 'axios'
import { backendUrl } from '../App'
import {
  MdSearch, MdCheckCircle, MdCancel, MdMeetingRoom, MdLogout,
  MdClose, MdHistory, MdRefresh, MdEventNote, MdPayment,
} from 'react-icons/md'

const statusBadge = (status) => {
  const map = {
    'Pending':     { bg: '#FEF3C7', color: '#D97706' },
    'Approved':    { bg: '#DCFCE7', color: '#16A34A' },
    'Confirmed':   { bg: '#DCFCE7', color: '#16A34A' },
    'Rejected':    { bg: '#FEE2E2', color: '#DC2626' },
    'Checked In':  { bg: '#DBEAFE', color: '#2563EB' },
    'Checked Out': { bg: '#F3F4F6', color: '#6B7280' },
    'Cancelled':   { bg: '#FEE2E2', color: '#DC2626' },
  }
  const s = map[status] || { bg: '#F3F4F6', color: '#6B7280' }
  return (
    <span className="px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap" style={{ background: s.bg, color: s.color }}>
      {status || 'Pending'}
    </span>
  )
}

const formatDate = (d) => {
  if (!d) return ''
  const parts = d.split('-')
  if (parts.length === 3) {
    const date = new Date(parts[0], parts[1] - 1, parts[2])
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  return d
}

const formatPrice = (amount) => {
  if (amount == null || amount === '') return '—'
  return `$${Number(amount).toLocaleString()}`
}

const paymentBadge = (status) => {
  const map = {
    'Pending': { bg: '#FEF3C7', color: '#D97706' },
    'Partially Paid': { bg: '#DBEAFE', color: '#2563EB' },
    'Paid': { bg: '#DCFCE7', color: '#16A34A' },
    'Failed': { bg: '#FEE2E2', color: '#DC2626' },
  }
  const s = map[status] || map['Pending']
  return (
    <span className="px-2 py-1 rounded text-xs font-semibold whitespace-nowrap" style={{ background: s.bg, color: s.color }}>
      {status || 'Pending'}
    </span>
  )
}

const MyReservations = () => {
  const [email, setEmail] = useState('')
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [expandedId, setExpandedId] = useState(null)

  const fetchReservations = useCallback(async (emailVal) => {
    if (!emailVal) return
    setLoading(true)
    setError(null)
    try {
      const r = await axios.get(`${backendUrl}/api/reservation/my-reservations/${encodeURIComponent(emailVal)}`)
      if (r.data?.success) {
        setReservations(r.data.reservations || [])
      } else {
        setReservations([])
      }
      setSearched(true)
    } catch {
      setError('Failed to fetch reservations. Please try again.')
      setReservations([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubmittedEmail(email.trim())
    fetchReservations(email.trim())
  }

  const handleCancel = async () => {
    if (!cancelTarget) return
    setCancelLoading(true)
    try {
      const r = await axios.put(`${backendUrl}/api/reservation/client-cancel/${cancelTarget._id}`, {
        name: cancelTarget.name,
        email: submittedEmail,
      })
      if (r.data?.success) {
        setReservations(prev => prev.map(res =>
          res._id === cancelTarget._id ? { ...res, status: 'Cancelled', cancelledBy: r.data.reservation.cancelledBy } : res
        ))
      } else {
        alert(r.data?.message || 'Cancel failed')
      }
    } catch {
      alert('Error cancelling reservation')
    } finally {
      setCancelLoading(false)
      setCancelTarget(null)
    }
  }

  const canCancel = (status) => {
    return status === 'Pending' || status === 'Approved'
  }

  return (
    <div className="min-h-screen" style={{ background: '#F8FAFC' }}>
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <MdEventNote size={32} style={{ color: '#2563EB' }} />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: '#1E293B' }}>My Reservations</h1>
          <p className="text-sm mt-2" style={{ color: '#6B7280' }}>
            Enter your email to view all your reservation requests and their status
          </p>
        </div>

        <form onSubmit={handleSearch} className="max-w-md mx-auto mb-12">
          <div className="relative">
            <MdSearch size={20} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              className="w-full pl-12 pr-4 py-3 rounded text-sm outline-none"
              style={{
                border: '1.5px solid #E5E7EB',
                background: '#FFFFFF',
                color: '#1E293B',
                borderRadius: '8px',
              }}
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded text-sm font-medium text-white"
              style={{ background: '#2563EB' }}
            >
              Search
            </button>
          </div>
        </form>

        {loading && (
          <div className="text-center py-12">
            <svg className="animate-spin mx-auto mb-3" fill="none" viewBox="0 0 24 24" style={{ width: '32px', height: '32px' }}>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#2563EB" strokeWidth="4" />
              <path className="opacity-75" fill="#2563EB" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <p className="text-sm" style={{ color: '#94A3B8' }}>Loading your reservations...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: '#DC2626' }}>{error}</p>
            <button
              onClick={() => fetchReservations(submittedEmail)}
              className="mt-3 px-4 py-2 rounded text-sm font-medium text-white"
              style={{ background: '#2563EB' }}
            >
              <MdRefresh size={16} className="inline mr-1" /> Retry
            </button>
          </div>
        )}

        {!loading && !error && searched && (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm" style={{ color: '#6B7280' }}>
                {reservations.length === 0
                  ? 'No reservations found for this email'
                  : `${reservations.length} reservation${reservations.length !== 1 ? 's' : ''} found`
                }
              </p>
              {reservations.length > 0 && (
                <button
                  onClick={() => fetchReservations(submittedEmail)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all hover:opacity-80"
                  style={{ background: '#FFFFFF', border: '1.5px solid #E5E7EB', color: '#6B7280' }}
                >
                  <MdRefresh size={14} /> Refresh
                </button>
              )}
            </div>

            {reservations.length === 0 && (
              <div className="text-center py-16">
                <MdHistory size={48} className="mx-auto mb-3" style={{ color: '#D1D5DB' }} />
                <p className="text-sm" style={{ color: '#94A3B8' }}>No reservations found</p>
                <p className="text-xs mt-1" style={{ color: '#D1D5DB' }}>Make a booking to see your reservations here</p>
              </div>
            )}

            <div className="flex flex-col gap-4">
              {reservations.map((res) => (
                <div
                  key={res._id}
                  className="rounded-lg border overflow-hidden transition-all"
                  style={{
                    background: '#FFFFFF',
                    borderColor: '#E5E7EB',
                    borderRadius: '10px',
                  }}
                >
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === res._id ? null : res._id)}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div>
                        <p className="font-semibold text-sm" style={{ color: '#1E293B' }}>{res.roomName}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                          {formatDate(res.checkin)} — {formatDate(res.checkout)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {statusBadge(res.status || 'Pending')}
                      <MdSearch
                        size={18}
                        style={{
                          color: '#94A3B8',
                          transform: expandedId === res._id ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.2s',
                        }}
                      />
                    </div>
                  </div>

                  {expandedId === res._id && (
                    <div className="px-4 pb-4 pt-0 border-t" style={{ borderColor: '#E5E7EB' }}>
                      <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                        <div><span className="font-medium" style={{ color: '#6B7280' }}>Booking ID:</span> <span style={{ color: '#1E293B' }}>#{String(res._id).slice(-6).toUpperCase()}</span></div>
                        <div><span className="font-medium" style={{ color: '#6B7280' }}>Guests:</span> <span style={{ color: '#1E293B' }}>{res.guests}</span></div>
                        <div><span className="font-medium" style={{ color: '#6B7280' }}>Check-in:</span> <span style={{ color: '#1E293B' }}>{formatDate(res.checkin)}</span></div>
                        <div><span className="font-medium" style={{ color: '#6B7280' }}>Check-out:</span> <span style={{ color: '#1E293B' }}>{formatDate(res.checkout)}</span></div>
                        {res.pricePerNight > 0 && (
                          <>
                            <div><span className="font-medium" style={{ color: '#6B7280' }}>Price per night:</span> <span style={{ color: '#1E293B' }}>{formatPrice(res.pricePerNight)}</span></div>
                            <div><span className="font-medium" style={{ color: '#6B7280' }}>Nights:</span> <span style={{ color: '#1E293B' }}>{res.nights || '—'}</span></div>
                            <div><span className="font-medium" style={{ color: '#6B7280' }}>Total amount:</span> <span className="font-semibold" style={{ color: '#1E293B' }}>{formatPrice(res.totalAmount)}</span></div>
                            <div><span className="font-medium" style={{ color: '#6B7280' }}>Payment:</span> {paymentBadge(res.paymentStatus)}</div>
                          </>
                        )}
                        {res.paymentMethod && (
                          <div><span className="font-medium" style={{ color: '#6B7280' }}>Payment Method:</span> <span style={{ color: '#1E293B' }}>{res.paymentMethod}</span></div>
                        )}
                        {res.createdBy?.name && (
                          <div className="col-span-2">
                            <span className="font-medium" style={{ color: '#6B7280' }}>Booked by:</span>{' '}
                            <span style={{ color: '#1E293B' }}>{res.createdBy.name} ({res.createdBy.role || 'Client'})</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t" style={{ borderColor: '#E5E7EB' }}>
                        {res.paymentMethod === 'Chapa' && res.paymentStatus !== 'Paid' && res.status !== 'Cancelled' && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation()
                              try {
                                const r = await axios.post(`${backendUrl}/api/payment/initialize`, {
                                  bookingId: res._id,
                                  guestName: res.name,
                                  guestEmail: res.email,
                                  guestPhone: res.phone || '',
                                  paymentMethod: 'Chapa',
                                  amount: res.totalAmount || 0,
                                  currency: 'ETB',
                                })
                                if (r.data?.checkoutUrl) {
                                  window.location.href = r.data.checkoutUrl
                                } else {
                                  alert(r.data?.message || 'Failed to initiate payment')
                                }
                              } catch {
                                alert('Failed to initiate payment. Please try again.')
                              }
                            }}
                            className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-medium transition-all hover:opacity-80"
                            style={{ background: '#FEF3C7', color: '#D97706', border: '1px solid #FDE68A' }}
                          >
                            <MdPayment size={14} /> Pay Now (Chapa)
                          </button>
                        )}
                        {canCancel(res.status) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setCancelTarget(res) }}
                            className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-medium transition-all hover:opacity-80"
                            style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
                          >
                            <MdClose size={14} /> Cancel Reservation
                          </button>
                        )}
                        {res.status === 'Checked In' && (
                          <span className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-medium"
                            style={{ background: '#DBEAFE', color: '#2563EB' }}>
                            <MdMeetingRoom size={14} /> Checked In
                          </span>
                        )}
                        {res.status === 'Approved' && (
                          <span className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-medium"
                            style={{ background: '#DCFCE7', color: '#16A34A' }}>
                            <MdCheckCircle size={14} /> Approved
                          </span>
                        )}
                        {res.status === 'Pending' && (
                          <span className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-medium"
                            style={{ background: '#FEF3C7', color: '#D97706' }}>
                            Awaiting Approval
                          </span>
                        )}
                        {res.status === 'Rejected' && (
                          <span className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-medium"
                            style={{ background: '#FEE2E2', color: '#DC2626' }}>
                            <MdCancel size={14} /> Not Approved
                          </span>
                        )}
                        {res.status === 'Checked Out' && (
                          <span className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-medium"
                            style={{ background: '#F3F4F6', color: '#6B7280' }}>
                            <MdLogout size={14} /> Stay Completed
                          </span>
                        )}
                        {res.status === 'Cancelled' && (
                          <span className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-medium"
                            style={{ background: '#FEE2E2', color: '#DC2626' }}>
                            <MdClose size={14} /> Cancelled
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && !searched && (
          <div className="text-center py-16">
            <MdHistory size={64} className="mx-auto mb-4" style={{ color: '#D1D5DB' }} />
            <p className="text-sm" style={{ color: '#94A3B8' }}>Enter your email above to view your reservations</p>
          </div>
        )}
      </div>

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-sm rounded-lg overflow-hidden" style={{ background: '#FFFFFF', borderRadius: '10px' }}>
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <MdClose size={24} style={{ color: '#DC2626' }} />
              </div>
              <h3 className="text-lg font-bold text-center" style={{ color: '#1E293B' }}>Cancel Reservation</h3>
              <p className="text-sm text-center mt-2" style={{ color: '#6B7280' }}>
                Are you sure you want to cancel your reservation for <strong>{cancelTarget.roomName}</strong>?
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setCancelTarget(null)}
                  className="flex-1 px-4 py-2.5 rounded text-sm font-medium transition-all hover:opacity-80"
                  style={{ background: '#F3F4F6', color: '#6B7280' }}
                >
                  Keep Reservation
                </button>
                <button
                  onClick={handleCancel}
                  disabled={cancelLoading}
                  className="flex-1 px-4 py-2.5 rounded text-sm font-medium text-white transition-all hover:opacity-80 disabled:opacity-60"
                  style={{ background: '#DC2626' }}
                >
                  {cancelLoading ? 'Cancelling...' : 'Yes, Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyReservations
