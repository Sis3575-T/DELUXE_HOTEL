import React, { useEffect, useState, useCallback, useMemo } from 'react'
import axios from 'axios'
import { backendUrl } from '../App'
import {
  MdSearch, MdVisibility, MdEdit, MdDelete, MdClose,
  MdCheck, MdDownload, MdThumbUp, MdBlock, MdMeetingRoom, MdLogout
} from 'react-icons/md'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import DataTable from '../components/ui/DataTable'
import notify from '../components/ui/Toast'

const STATUSES = ['All', 'Pending', 'Approved', 'Confirmed', 'Rejected', 'Checked In', 'Checked Out', 'Cancelled']

const normalizeStatus = (s) => s === 'Confirmed' ? 'Approved' : s

const statusBadge = (status) => {
  const normalized = normalizeStatus(status)
  const display = normalized === 'Approved' ? 'Confirmed' : (status || 'Pending')
  const map = {
    'Pending':     { bg: '#FEF3C7', color: '#D97706', cls: 'badge-pending' },
    'Approved':    { bg: '#DCFCE7', color: '#16A34A', cls: 'badge-confirmed' },
    'Rejected':    { bg: '#FEE2E2', color: '#DC2626', cls: 'badge-cancelled' },
    'Checked In':  { bg: '#DBEAFE', color: '#2563EB', cls: 'badge-checked-in' },
    'Checked Out': { bg: '#F1F5F9', color: '#64748B', cls: 'badge-checked-out' },
    'Cancelled':   { bg: '#FEE2E2', color: '#DC2626', cls: 'badge-cancelled' },
  }
  const s = map[normalized] || { bg: '#F3F4F6', color: '#6B7280', cls: '' }
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${s.cls}`} style={{ background: s.bg, color: s.color }}>
      {display}
    </span>
  )
}

const extractRoomNumber = (roomName) => {
  if (!roomName) return '—'
  const match = String(roomName).match(/\b(\d{2,4})\b/)
  return match ? match[1] : roomName.split(' ').pop() || roomName
}

const formatDate = (d) => {
  if (!d) return ''
  const date = new Date(d)
  if (isNaN(date.getTime())) return String(d)
  return date.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const AuditEntry = ({ label, data }) => {
  if (!data || !data.userId) return null
  return (
    <div className="flex items-start justify-between py-3 border-b" style={{ borderColor: '#E5E7EB' }}>
      <span className="text-xs font-medium" style={{ color: '#6B7280', minWidth: '110px' }}>{label}</span>
      <div className="text-right">
        <p className="text-xs font-semibold" style={{ color: '#1E293B' }}>{data.name}</p>
        <p className="text-[10px]" style={{ color: '#94A3B8' }}>{data.role} &middot; {formatDate(data.actionDate)}</p>
      </div>
    </div>
  )
}

const Reservation = () => {
  const [reservations, setReservations] = useState([])
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterStatus, setFilterStatus] = useState('All')
  const [selected, setSelected] = useState(null)
  const [viewModal, setViewModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [editLoading, setEditLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [dateConflictMsg, setDateConflictMsg] = useState('')

  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formRoom, setFormRoom] = useState('')
  const [formCheckin, setFormCheckin] = useState('')
  const [formCheckout, setFormCheckout] = useState('')
  const [formGuests, setFormGuests] = useState(1)
  const [formStatus, setFormStatus] = useState('Pending')
  const [errors, setErrors] = useState({})

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const fetchReservations = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [resRes, roomsRes] = await Promise.all([
        axios.get(backendUrl + '/api/reservation/get'),
        axios.get(backendUrl + '/api/hotel/list').catch(() => ({ data: { hotels: [] } })),
      ])
      setReservations(Array.isArray(resRes.data) ? resRes.data : [])
      setRooms(roomsRes.data?.hotels || [])
    } catch {
      setError('Failed to load reservations')
      setReservations([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchReservations() }, [fetchReservations])

  const enhancedReservations = useMemo(() =>
    reservations.map(r => ({
      ...r,
      createdByName: r.createdBy?.name || '',
      approvedByName: r.approvedBy?.name || '',
      rejectedByName: r.rejectedBy?.name || '',
      checkedInByName: r.checkedInBy?.name || '',
      checkedOutByName: r.checkedOutBy?.name || '',
      cancelledByName: r.cancelledBy?.name || '',
      updatedByName: r.updatedBy?.name || '',
    })),
    [reservations]
  )

  const filtered = filterStatus === 'All'
    ? enhancedReservations
    : enhancedReservations.filter(r => normalizeStatus(r.status || 'Pending') === normalizeStatus(filterStatus))

  const handleAction = async (id, action, successMsg) => {
    setActionLoading(id)
    try {
      const res = await axios.put(`${backendUrl}/api/reservation/${action}/${id}`, {}, { headers: getAuthHeaders() })
      if (res.data?.success) {
        notify.success(successMsg)
        await fetchReservations()
      } else {
        notify.error(res.data?.message || `${action} failed`)
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || `${action} failed`
      notify.error(msg)
    } finally {
      setActionLoading(null)
    }
  }

  const openEdit = (res) => {
    setSelected(res)
    setFormName(res.name || '')
    setFormEmail(res.email || '')
    setFormPhone(res.phone || '')
    setFormRoom(res.roomName || '')
    setFormCheckin(res.checkin || '')
    setFormCheckout(res.checkout || '')
    setFormGuests(res.guests || 1)
    setFormStatus(res.status || 'Pending')
    setErrors({})
    setEditModal(true)
  }

  const validateEdit = () => {
    const errs = {}
    if (!formName.trim()) errs.name = 'Guest name is required'
    if (!formEmail.trim()) errs.email = 'Email is required'
    if (!formRoom.trim()) errs.room = 'Room is required'
    if (!formCheckin) errs.checkin = 'Check-in date is required'
    if (!formCheckout) errs.checkout = 'Check-out date is required'
    if (!formGuests || formGuests < 1) errs.guests = 'At least 1 guest required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleEdit = async () => {
    if (!validateEdit() || !selected) return
    setDateConflictMsg('')
    setEditLoading(true)
    try {
      const roomId = selected.roomId || rooms.find(r => r.name === formRoom)?._id || ''
      const checkRes = await axios.get(`${backendUrl}/api/reservation/check-availability`, {
        params: { roomId, checkin: formCheckin, checkout: formCheckout }
      })
      if (checkRes.data?.success && !checkRes.data.available) {
        setDateConflictMsg('This room is already booked for the selected dates.')
        setEditLoading(false)
        return
      }
      const res = await axios.put(`${backendUrl}/api/reservation/update/${selected._id}`, {
        name: formName, email: formEmail, phone: formPhone,
        roomName: formRoom, checkin: formCheckin, checkout: formCheckout,
        guests: formGuests,
      }, { headers: getAuthHeaders() })
      if (res.data?.success) {
        notify.success('Reservation updated successfully')
        setEditModal(false)
        setSelected(null)
        await fetchReservations()
      } else {
        notify.error(res.data?.message || 'Update failed')
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error updating reservation'
      notify.error(msg)
    } finally {
      setEditLoading(false)
    }
  }

  const deleteReservation = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const res = await axios.delete(`${backendUrl}/api/reservation/delete/${deleteTarget._id}`, {
        headers: getAuthHeaders(),
      })
      notify.success(res.data?.message || 'Reservation deleted')
      setDeleteTarget(null)
      await fetchReservations()
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Delete failed'
      notify.error(msg)
      setDeleteTarget(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map((r, i) => ({
      'Booking ID': `#${String(i + 1001).padStart(4, '0')}`,
      'Guest Name': r.name,
      Email: r.email,
      Phone: r.phone,
      Room: r.roomName,
      'Check-in': r.checkin,
      'Check-out': r.checkout,
      Guests: r.guests,
      Status: r.status || 'Pending',
      'Approved By': r.approvedBy?.name || '',
      'Rejected By': r.rejectedBy?.name || '',
      'Checked In By': r.checkedInBy?.name || '',
      'Checked Out By': r.checkedOutBy?.name || '',
      'Cancelled By': r.cancelledBy?.name || '',
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Reservations')
    XLSX.writeFile(wb, 'AbayGrand_Reservations.xlsx')
    notify.success('Excel exported successfully')
  }

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(14)
    doc.text('Abay Grand Hotel - Reservations', 14, 15)
    doc.setFontSize(9)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 22)
    autoTable(doc, {
      startY: 28,
      head: [['ID', 'Guest', 'Room', 'Check-in', 'Check-out', 'Guests', 'Status', 'Approved By', 'Checked In By', 'Checked Out By']],
      body: filtered.map((r, i) => [
        `#${String(i + 1001).padStart(4, '0')}`,
        r.name,
        r.roomName,
        r.checkin,
        r.checkout,
        r.guests,
        r.status || 'Pending',
        r.approvedBy?.name || '',
        r.checkedInBy?.name || '',
        r.checkedOutBy?.name || '',
      ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [30, 41, 59] },
    })
    doc.save('AbayGrand_Reservations.pdf')
    notify.success('PDF exported successfully')
  }

  const actionButtons = (r) => {
    const status = normalizeStatus(r.status || 'Pending')
    const loading = actionLoading === r._id
    const spin = (
      <svg className="animate-spin" fill="none" viewBox="0 0 24 24" style={{ width: '16px', height: '16px' }}>
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
    )
    const btn = (title, color, bg, icon, action, msg) => (
      <button
        onClick={(e) => { e.stopPropagation(); handleAction(r._id, action, msg) }}
        disabled={actionLoading === r._id}
        className="w-9 h-9 rounded flex items-center justify-center transition-all hover:opacity-80 disabled:opacity-50"
        style={{ background: bg, color }}
        title={title}
      >
        {actionLoading === r._id ? spin : icon}
      </button>
    )

    switch (status) {
      case 'Pending':
        return (
          <div className="flex items-center" style={{ gap: '8px', whiteSpace: 'nowrap' }}>
            {btn('Approve', '#16A34A', '#F0FDF4', <MdThumbUp size={18} />, 'approve', 'Reservation approved')}
            {btn('Reject', '#DC2626', '#FEF2F2', <MdBlock size={18} />, 'reject', 'Reservation rejected')}
            {btn('Cancel', '#6B7280', '#F3F4F6', <MdClose size={18} />, 'cancel', 'Reservation cancelled')}
          </div>
        )
      case 'Approved':
        return (
          <div className="flex items-center" style={{ gap: '8px', whiteSpace: 'nowrap' }}>
            {btn('Check In', '#2563EB', '#EFF6FF', <MdMeetingRoom size={18} />, 'checkin', 'Guest checked in')}
            {btn('Cancel', '#6B7280', '#F3F4F6', <MdClose size={18} />, 'cancel', 'Reservation cancelled')}
          </div>
        )
      case 'Checked In':
        return (
          <div className="flex items-center" style={{ gap: '8px', whiteSpace: 'nowrap' }}>
            {btn('Check Out', '#6B7280', '#F3F4F6', <MdLogout size={18} />, 'checkout', 'Guest checked out')}
          </div>
        )
      case 'Checked Out':
        return <span className="text-xs font-medium" style={{ color: '#16A34A' }}>Completed</span>
      case 'Rejected':
        return <span className="text-xs font-medium" style={{ color: '#DC2626' }}>Rejected</span>
      case 'Cancelled':
        return <span className="text-xs font-medium" style={{ color: '#DC2626' }}>Cancelled</span>
      default:
        return <span className="text-xs" style={{ color: '#D1D5DB' }}>—</span>
    }
  }

  const roomLookup = useMemo(() => {
    const map = {}
    rooms.forEach(r => { map[(r.name || '').toLowerCase()] = r })
    return map
  }, [rooms])

  const getRoomInfo = (roomName) => {
    const room = roomLookup[(roomName || '').toLowerCase()]
    return {
      number: extractRoomNumber(roomName),
      type: room?.roomType || 'Standard',
    }
  }

  const columns = [
    {
      header: 'Booking ID',
      accessor: '_id',
      sortable: true,
      width: 110,
      render: (r) => (
        <span className="font-mono text-xs font-semibold" style={{ color: '#D4AF37' }}>
          #{String(r._id).slice(-6).toUpperCase()}
        </span>
      ),
    },
    {
      header: 'Guest Name',
      accessor: 'name',
      sortable: true,
      render: (r) => (
        <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{r.name}</span>
      ),
    },
    {
      header: 'Room Number',
      render: (r) => (
        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{getRoomInfo(r.roomName).number}</span>
      ),
    },
    {
      header: 'Room Type',
      render: (r) => (
        <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'rgba(30,41,59,0.08)', color: '#1E293B' }}>
          {getRoomInfo(r.roomName).type}
        </span>
      ),
    },
    { header: 'Check-in', accessor: 'checkin', sortable: true },
    { header: 'Check-out', accessor: 'checkout', sortable: true },
    { header: 'Guests', accessor: 'guests', sortable: true },
    { header: 'Status', accessor: 'status', sortable: true, render: (r) => statusBadge(r.status || 'Pending') },
    {
      header: 'Actions',
      width: 280,
      render: (r) => (
        <div className="flex items-center" style={{ gap: '6px', whiteSpace: 'nowrap' }}>
          <button
            onClick={(e) => { e.stopPropagation(); setSelected(r); setViewModal(true) }}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-105"
            style={{ background: 'rgba(212,175,55,0.12)', color: '#B8960C' }}
            title="View"
          >
            <MdVisibility size={18} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(r) }}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-105"
            style={{ background: 'rgba(30,41,59,0.08)', color: '#1E293B' }}
            title="Edit"
          >
            <MdEdit size={18} />
          </button>
          {actionButtons(r)}
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(r) }}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-105"
            style={{ background: '#FEF2F2', color: '#DC2626' }}
            title="Delete"
          >
            <MdDelete size={18} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="fade-in-up page-section">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="page-header mb-0">
          <h1>Reservations</h1>
          <p>{filtered.length} total reservations</p>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <Button variant="outline" size="sm" icon={MdDownload} onClick={exportExcel}>Export Excel</Button>
          <Button variant="outline" size="sm" icon={MdDownload} onClick={exportPDF}>Export PDF</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`filter-pill ${filterStatus === s ? 'active' : ''}`}
          >
            {s === 'Approved' ? 'Confirmed' : s}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        error={error}
        onRetry={fetchReservations}
        pageSize={8}
        searchable
        searchPlaceholder="Search by customer name, room, booking ID..."
        emptyMessage="No reservations found"
      />

      <Modal open={viewModal} onClose={() => setViewModal(false)} title="Reservation Details" width="max-w-lg">
        {selected && (
          <div className="flex flex-col" style={{ gap: '4px' }}>
            <div className="flex flex-col" style={{ gap: '4px' }}>
              {[
                ['Guest Name', selected.name],
                ['Email', selected.email],
                ['Phone', selected.phone],
                ['Room', selected.roomName],
                ['Guests', selected.guests],
                ['Check-in', selected.checkin],
                ['Check-out', selected.checkout],
                ['Status', selected.status || 'Pending'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between py-3 border-b" style={{ borderColor: '#E5E7EB' }}>
                  <span className="text-sm font-medium" style={{ color: '#6B7280' }}>{label}</span>
                  <span className="text-sm font-semibold" style={{ color: '#1E293B' }}>{value || '\u2014'}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
              <h4 className="text-sm font-bold mb-1" style={{ color: '#1E293B' }}>Reservation Activity</h4>
              <p className="text-xs mb-3" style={{ color: '#94A3B8' }}>Audit trail of all actions on this reservation</p>
              <AuditEntry label="Created By" data={selected.createdBy} />
              <AuditEntry label="Approved By" data={selected.approvedBy} />
              <AuditEntry label="Rejected By" data={selected.rejectedBy} />
              <AuditEntry label="Checked In By" data={selected.checkedInBy} />
              <AuditEntry label="Checked Out By" data={selected.checkedOutBy} />
              <AuditEntry label="Cancelled By" data={selected.cancelledBy} />
              <AuditEntry label="Last Updated By" data={selected.updatedBy} />
            </div>

            <Button variant="secondary" onClick={() => setViewModal(false)} className="w-full mt-4">Close</Button>
          </div>
        )}
      </Modal>

      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Reservation" width="max-w-lg">
        <div className="flex flex-col" style={{ gap: '16px' }}>
          <div>
            <label className="block text-xs font-semibold" style={{ color: '#6B7280', marginBottom: '6px' }}>
              Guest Name <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input className={`input-field ${errors.name ? 'error' : ''}`} value={formName} onChange={e => setFormName(e.target.value)} placeholder="Enter guest name" />
            {errors.name && <p className="text-xs mt-1" style={{ color: '#DC2626' }}>{errors.name}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '16px' }}>
            <div>
              <label className="block text-xs font-semibold" style={{ color: '#6B7280', marginBottom: '6px' }}>
                Email <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input className={`input-field ${errors.email ? 'error' : ''}`} value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="guest@email.com" />
              {errors.email && <p className="text-xs mt-1" style={{ color: '#DC2626' }}>{errors.email}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold" style={{ color: '#6B7280', marginBottom: '6px' }}>Phone</label>
              <input className="input-field" value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="+251 911 000 000" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold" style={{ color: '#6B7280', marginBottom: '6px' }}>
              Room <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input className={`input-field ${errors.room ? 'error' : ''}`} value={formRoom} onChange={e => setFormRoom(e.target.value)} placeholder="e.g. Deluxe Suite 201" />
            {errors.room && <p className="text-xs mt-1" style={{ color: '#DC2626' }}>{errors.room}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '16px' }}>
            <div>
              <label className="block text-xs font-semibold" style={{ color: '#6B7280', marginBottom: '6px' }}>
                Check-in <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input type="date" className={`input-field ${errors.checkin ? 'error' : ''}`} value={formCheckin} onChange={e => setFormCheckin(e.target.value)} />
              {errors.checkin && <p className="text-xs mt-1" style={{ color: '#DC2626' }}>{errors.checkin}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold" style={{ color: '#6B7280', marginBottom: '6px' }}>
                Check-out <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input type="date" className={`input-field ${errors.checkout ? 'error' : ''}`} value={formCheckout} onChange={e => setFormCheckout(e.target.value)} />
              {errors.checkout && <p className="text-xs mt-1" style={{ color: '#DC2626' }}>{errors.checkout}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '16px' }}>
            <div>
              <label className="block text-xs font-semibold" style={{ color: '#6B7280', marginBottom: '6px' }}>
                Guests <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input type="number" min="1" className={`input-field ${errors.guests ? 'error' : ''}`} value={formGuests} onChange={e => setFormGuests(Number(e.target.value))} />
              {errors.guests && <p className="text-xs mt-1" style={{ color: '#DC2626' }}>{errors.guests}</p>}
            </div>
          </div>
          {dateConflictMsg && (
            <p className="text-xs" style={{ color: '#DC2626', textAlign: 'center' }}>{dateConflictMsg}</p>
          )}
          <div className="flex" style={{ gap: '10px', paddingTop: '8px' }}>
            <Button variant="secondary" onClick={() => setEditModal(false)} className="flex-1">Cancel</Button>
            <Button variant="success" icon={MdCheck} loading={editLoading} onClick={handleEdit} className="flex-1">Save Changes</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteReservation}
        title="Delete Reservation"
        message={`Delete reservation for ${deleteTarget?.name}? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  )
}

export default Reservation
