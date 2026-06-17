import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { backendUrl } from '../App'
import { MdPeople, MdPersonAdd, MdVisibility, MdRefresh } from 'react-icons/md'
import DataTable from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'

const Guests = () => {
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    axios.get(backendUrl + '/api/reservation/get', { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } })
      .then(r => setReservations(Array.isArray(r.data) ? r.data : []))
      .catch(() => { setError('Failed to load guest data'); setReservations([]) })
      .finally(() => setLoading(false))
  }, [])

  const guestMap = {}
  reservations.forEach(r => {
    if (!r.email) return
    if (!guestMap[r.email]) {
      guestMap[r.email] = { name: r.name, email: r.email, phone: r.phone, stays: [] }
    }
    guestMap[r.email].stays.push(r)
  })
  const guests = Object.values(guestMap)

  const columns = [
    { header: '#', render: (_, idx) => (
      <span className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(37,99,235,0.1)', color: '#2563EB', display: 'inline-flex' }}>
        {idx != null ? idx + 1 : ''}
      </span>
    )},
    { header: 'Guest Name', accessor: 'name', sortable: true, render: (g) => (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0" style={{ background: '#1E293B', color: '#D4AF37' }}>
          {(g.name || '?')[0].toUpperCase()}
        </div>
        <span className="font-medium text-sm" style={{ color: '#1E293B' }}>{g.name}</span>
      </div>
    )},
    { header: 'Email', accessor: 'email', sortable: true },
    { header: 'Phone', accessor: 'phone', sortable: true, render: (g) => g.phone || '—' },
    { header: 'Total Stays', render: (g) => (
      <span className="px-2.5 py-1 rounded text-xs font-semibold" style={{ background: 'rgba(37,99,235,0.1)', color: '#2563EB' }}>
        {g.stays.length} {g.stays.length === 1 ? 'stay' : 'stays'}
      </span>
    )},
    { header: 'Actions', render: (g) => (
      <button onClick={(e) => { e.stopPropagation(); setSelected(g) }}
        className="w-9 h-9 rounded flex items-center justify-center transition-all hover:opacity-70"
        style={{ background: '#EEF2FF', color: '#6366F1' }}>
        <MdVisibility size={18} />
      </button>
    )},
  ]

  return (
    <div className="fade-in-up" style={{ marginBottom: '32px' }}>
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: '#1E293B', fontFamily: "'Playfair Display', serif" }}>Guest Management</h1>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>{guests.length} registered guests from {reservations.length} reservations</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: '20px', marginBottom: '32px' }}>
        {[
          { label: 'Total Guests', value: guests.length, icon: MdPeople },
          { label: 'New This Month', value: reservations.filter(r => {
              const d = new Date(r.checkin || r.createdAt)
              const now = new Date()
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
            }).length, icon: MdPersonAdd },
          { label: 'Avg. Stays', value: guests.length ? (reservations.length / guests.length).toFixed(1) : 0, icon: MdPeople },
          { label: 'Returning', value: guests.filter(g => g.stays.length > 1).length, icon: MdPeople },
        ].map(stat => (
          <div key={stat.label} className="p-4 card-hover" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
            <p className="text-xl font-bold" style={{ color: '#1E293B' }}>{stat.value}</p>
            <p className="text-xs mt-1" style={{ color: '#6B7280' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={guests}
        loading={loading}
        error={error}
        pageSize={8}
        searchable
        searchPlaceholder="Search by name, email or phone..."
        emptyMessage="No guests found"
      />

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Guest Details" width="max-w-md">
        {selected && (
          <>
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-2" style={{ background: '#D4AF37', color: '#0F172A' }}>
                {(selected.name || '?')[0].toUpperCase()}
              </div>
              <h3 className="font-bold text-base" style={{ color: '#1E293B' }}>{selected.name}</h3>
              <p className="text-sm" style={{ color: '#6B7280' }}>{selected.email}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                ['Total Stays', selected.stays.length],
                ['Phone', selected.phone || '—'],
              ].map(([label, val]) => (
                <div key={label} className="p-3 text-center rounded" style={{ background: '#F8FAFC', border: '1px solid #E5E7EB' }}>
                  <p className="text-lg font-bold" style={{ color: '#1E293B' }}>{val}</p>
                  <p className="text-xs" style={{ color: '#94A3B8' }}>{label}</p>
                </div>
              ))}
            </div>
            <h4 className="font-semibold text-sm mb-3" style={{ color: '#6B7280' }}>Booking History</h4>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
              {selected.stays.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded" style={{ background: '#F8FAFC', border: '1px solid #E5E7EB' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#1E293B' }}>{s.roomName}</p>
                    <p className="text-xs" style={{ color: '#94A3B8' }}>{s.checkin} → {s.checkout}</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded" style={{ background: 'rgba(37,99,235,0.1)', color: '#2563EB' }}>
                    {s.guests} guests
                  </span>
                </div>
              ))}
            </div>
            <Button variant="secondary" onClick={() => setSelected(null)} className="w-full mt-4">Close</Button>
          </>
        )}
      </Modal>
    </div>
  )
}

export default Guests
