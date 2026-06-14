import React, { useEffect, useState, useCallback, useMemo } from 'react'
import axios from 'axios'
import { backendUrl } from '../App'
import {
  MdPersonSearch, MdSearch, MdRefresh, MdCheckCircle, MdCancel,
  MdMeetingRoom, MdLogout, MdClose, MdHistory, MdAttachMoney
} from 'react-icons/md'
import Button from '../components/ui/Button'
import notify from '../components/ui/Toast'

const statusBadge = (status) => {
  const map = {
    'Pending':     { bg: '#FEF3C7', color: '#D97706' },
    'Approved':    { bg: '#DCFCE7', color: '#16A34A' },
    'Rejected':    { bg: '#FEE2E2', color: '#DC2626' },
    'Checked In':  { bg: '#DBEAFE', color: '#2563EB' },
    'Checked Out': { bg: '#F3F4F6', color: '#6B7280' },
    'Cancelled':   { bg: '#FEE2E2', color: '#DC2626' },
  }
  const s = map[status] || { bg: '#F3F4F6', color: '#6B7280' }
  return (
    <span className="px-2.5 py-1 rounded text-xs font-semibold" style={{ background: s.bg, color: s.color }}>{status}</span>
  )
}

const CustomerHistory = () => {
  const [reservations, setReservations] = useState([])
  const [revenues, setRevenues] = useState([])
  const [searchEmail, setSearchEmail] = useState('')
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedCustomer, setSelectedCustomer] = useState(null)

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const fetchData = useCallback(async (email) => {
    if (!email) return
    setLoading(true); setError(null)
    try {
      const [resRes, revRes] = await Promise.all([
        axios.get(backendUrl + `/api/reservation/my-reservations/${encodeURIComponent(email)}`).catch(() => ({ data: { reservations: [] } })),
        axios.get(backendUrl + '/api/revenue/list', { headers: getAuthHeaders() }).catch(() => ({ data: { revenues: [] } })),
      ])
      setReservations(resRes.data?.reservations || [])
      setRevenues(revRes.data?.revenues || [])
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load customer data')
      setReservations([])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { if (submittedEmail) fetchData(submittedEmail) }, [submittedEmail, fetchData])

  const handleSearch = (e) => {
    e.preventDefault()
    if (!searchEmail.trim()) return
    setSubmittedEmail(searchEmail.trim())
  }

  const customerReservations = useMemo(() => {
    if (!submittedEmail) return []
    return reservations
  }, [reservations, submittedEmail])

  const customerRevenues = useMemo(() => {
    if (!submittedEmail) return []
    const name = customerReservations[0]?.name || ''
    if (!name) return []
    return revenues.filter(r => (r.customerName || '').toLowerCase() === name.toLowerCase())
  }, [revenues, customerReservations])

  const checkins = customerReservations.filter(r => r.status === 'Checked In')
  const checkouts = customerReservations.filter(r => r.status === 'Checked Out')
  const cancellations = customerReservations.filter(r => r.status === 'Cancelled')

  const totalSpent = customerRevenues.filter(r => r.status === 'Completed').reduce((s, r) => s + (r.amount || 0), 0)

  return (
    <div className="fade-in-up" style={{ marginBottom: '32px' }}>
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: '#1E293B', fontFamily: "'Playfair Display', serif" }}>Customer History</h1>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>View complete customer profile including reservations, payments, and stay history</p>
      </div>

      <form onSubmit={handleSearch} className="max-w-md mb-8">
        <div className="relative">
          <MdSearch size={20} className="absolute" style={{ left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', zIndex: 1 }} />
          <input
            type="email" value={searchEmail} onChange={e => setSearchEmail(e.target.value)}
            placeholder="Search by customer email..."
            required
            className="input-field"
            style={{ paddingLeft: '44px', height: '44px', width: '100%' }}
          />
          <button type="submit" className="absolute px-4 py-1.5 rounded text-sm font-medium text-white" style={{ background: '#2563EB', right: '6px', top: '50%', transform: 'translateY(-50%)' }}>Search</button>
        </div>
      </form>

      {loading ? (
        <div className="flex flex-col items-center justify-center" style={{ padding: '80px 0', color: '#94A3B8' }}>
          <svg className="animate-spin" fill="none" viewBox="0 0 24 24" style={{ width: '28px', height: '28px', marginBottom: '12px' }}>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <p className="text-sm font-medium">Loading customer data...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center" style={{ padding: '80px 0' }}>
          <p className="text-sm font-medium mb-3" style={{ color: '#DC2626' }}>{error}</p>
          <Button variant="primary" size="sm" icon={MdRefresh} onClick={() => fetchData(submittedEmail)}>Retry</Button>
        </div>
      ) : !submittedEmail ? (
        <div className="text-center" style={{ padding: '80px 0', color: '#94A3B8' }}>
          <MdPersonSearch size={64} style={{ color: '#D1D5DB', margin: '0 auto 16px' }} />
          <p className="text-base">Enter a customer email to view their history</p>
        </div>
      ) : customerReservations.length === 0 ? (
        <div className="text-center" style={{ padding: '80px 0', color: '#94A3B8' }}>
          <MdHistory size={48} style={{ color: '#D1D5DB', margin: '0 auto 12px' }} />
          <p className="text-base font-medium">No customer found</p>
          <p className="text-sm mt-1">No reservations for this email</p>
        </div>
      ) : (
        <>
          {/* Customer Info */}
          <div className="p-5 mb-6" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
            <div className="flex items-center justify-between flex-wrap" style={{ gap: '12px' }}>
              <div>
                <h3 className="text-lg font-bold" style={{ color: '#1E293B' }}>{customerReservations[0]?.name || 'Customer'}</h3>
                <p className="text-sm" style={{ color: '#6B7280' }}>{submittedEmail}</p>
              </div>
              <div className="flex items-center" style={{ gap: '20px' }}>
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: '#1E293B' }}>{customerReservations.length}</p>
                  <p className="text-xs" style={{ color: '#6B7280' }}>Total Stays</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: '#16A34A' }}>${totalSpent.toLocaleString()}</p>
                  <p className="text-xs" style={{ color: '#6B7280' }}>Total Spent</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4" style={{ gap: '16px', marginBottom: '32px' }}>
            {[
              { label: 'Reservations', value: customerReservations.length, icon: MdHistory, color: '#2563EB', bg: '#DBEAFE' },
              { label: 'Check-Ins', value: checkins.length, icon: MdMeetingRoom, color: '#16A34A', bg: '#DCFCE7' },
              { label: 'Check-Outs', value: checkouts.length, icon: MdLogout, color: '#6B7280', bg: '#F3F4F6' },
              { label: 'Cancellations', value: cancellations.length, icon: MdClose, color: '#DC2626', bg: '#FEE2E2' },
            ].map(s => {
              const Icon = s.icon
              return (
                <div key={s.label} className="p-4" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded flex items-center justify-center" style={{ background: s.bg }}>
                      <Icon size={20} style={{ color: s.color }} />
                    </div>
                    <div>
                      <p className="text-xl font-bold" style={{ color: '#1E293B' }}>{s.value}</p>
                      <p className="text-xs" style={{ color: '#6B7280' }}>{s.label}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Reservations */}
          <div className="mb-8">
            <h3 className="font-semibold text-base mb-4" style={{ color: '#1E293B' }}>Reservation History</h3>
            <div className="overflow-hidden" style={{ border: '1px solid #E5E7EB', borderRadius: '8px', background: '#FFFFFF' }}>
              <div className="overflow-x-auto">
                <table className="w-full data-table">
                  <thead>
                    <tr>
                      <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>Room</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>Check-In</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>Check-Out</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>Guests</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>Status</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerReservations.map(r => (
                      <tr key={r._id}>
                        <td><span className="font-semibold" style={{ color: '#1E293B' }}>{r.roomName}</span></td>
                        <td>{r.checkin}</td>
                        <td>{r.checkout}</td>
                        <td>{r.guests}</td>
                        <td>{statusBadge(r.status)}</td>
                        <td>
                          <button onClick={() => setSelectedCustomer(r)} className="px-3 py-1.5 rounded text-xs font-medium transition-all hover:opacity-80" style={{ background: '#EFF6FF', color: '#2563EB' }}>View Details</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Payments */}
          {customerRevenues.length > 0 && (
            <div>
              <h3 className="font-semibold text-base mb-4" style={{ color: '#1E293B' }}>Payment History</h3>
              <div className="overflow-hidden" style={{ border: '1px solid #E5E7EB', borderRadius: '8px', background: '#FFFFFF' }}>
                <div className="overflow-x-auto">
                  <table className="w-full data-table">
                    <thead>
                      <tr>
                        <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>Transaction ID</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>Type</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>Amount</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>Date</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>Method</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerRevenues.map(r => (
                        <tr key={r._id}>
                          <td><span className="font-mono text-xs font-semibold" style={{ color: '#2563EB' }}>{r.transactionId}</span></td>
                          <td>{r.revenueType}</td>
                          <td><span className="font-semibold" style={{ color: '#16A34A' }}>${(r.amount || 0).toLocaleString()}</span></td>
                          <td>{r.date}</td>
                          <td>{r.paymentMethod}</td>
                          <td>{statusBadge(r.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Detail Modal */}
          {selectedCustomer && (
            <div className="modal-overlay" onClick={() => setSelectedCustomer(null)}>
              <div className="w-full max-w-md mx-auto fade-in-up p-6" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '10px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between pb-4 border-b flex-shrink-0" style={{ borderColor: '#E5E7EB' }}>
                  <h3 className="font-semibold text-base" style={{ color: '#1E293B' }}>Reservation Details</h3>
                  <button onClick={() => setSelectedCustomer(null)} className="p-1 rounded" style={{ color: '#94A3B8' }}><MdClose size={20} /></button>
                </div>
                <div className="overflow-y-auto pt-4" style={{ gap: '16px', display: 'flex', flexDirection: 'column' }}>
                  {[['Room', selectedCustomer.roomName], ['Guest', selectedCustomer.name], ['Email', selectedCustomer.email], ['Phone', selectedCustomer.phone || '-'], ['Check-In', selectedCustomer.checkin], ['Check-Out', selectedCustomer.checkout], ['Guests', selectedCustomer.guests], ['Status', selectedCustomer.status]].map(([label, value]) => (
                    <div key={label} className="flex items-start justify-between py-2 border-b" style={{ borderColor: '#E5E7EB' }}>
                      <span className="text-sm font-medium" style={{ color: '#6B7280' }}>{label}</span>
                      <span className="text-sm font-semibold" style={{ color: '#1E293B' }}>{value}</span>
                    </div>
                  ))}
                  {selectedCustomer.createdBy?.name && (
                    <div className="flex items-start justify-between py-2 border-b" style={{ borderColor: '#E5E7EB' }}>
                      <span className="text-sm font-medium" style={{ color: '#6B7280' }}>Booked By</span>
                      <span className="text-sm font-semibold" style={{ color: '#1E293B' }}>{selectedCustomer.createdBy.name} ({selectedCustomer.createdBy.role})</span>
                    </div>
                  )}
                  <Button variant="secondary" onClick={() => setSelectedCustomer(null)} className="w-full mt-2">Close</Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default CustomerHistory
