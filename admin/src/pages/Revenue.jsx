import React, { useEffect, useState, useCallback, useMemo } from 'react'
import axios from 'axios'
import { backendUrl } from '../App'
import {
  MdSearch, MdAttachMoney, MdAdd, MdEdit, MdDelete,
  MdVisibility, MdClose, MdCheck, MdDownload, MdRefresh
} from 'react-icons/md'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import StatCard from '../components/ui/StatCard'
import notify from '../components/ui/Toast'

const REVENUE_TYPES = ['Room Booking', 'Food & Beverage', 'Event', 'Spa', 'Other']
const PAYMENT_METHODS = ['Cash', 'Card', 'Mobile Money', 'Bank Transfer']
const STATUSES = ['Completed', 'Pending', 'Refunded']

const statusBadge = (status) => {
  const map = {
    'Completed': { bg: '#DCFCE7', color: '#16A34A' },
    'Pending':   { bg: '#FEF3C7', color: '#D97706' },
    'Refunded':  { bg: '#FEE2E2', color: '#DC2626' },
  }
  const s = map[status] || { bg: '#F3F4F6', color: '#6B7280' }
  return (
    <span className="px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap" style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  )
}

const Revenue = () => {
  const [revenues, setRevenues] = useState([])
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [viewItem, setViewItem] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saveLoading, setSaveLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [formCustomer, setFormCustomer] = useState('')
  const [formRoom, setFormRoom] = useState('')
  const [formType, setFormType] = useState('Room Booking')
  const [formAmount, setFormAmount] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formMethod, setFormMethod] = useState('Cash')
  const [formStatus, setFormStatus] = useState('Completed')
  const [formDescription, setFormDescription] = useState('')
  const [errors, setErrors] = useState({})

  const PAGE_SIZE = 8

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const fetchRevenues = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [revRes, resRes] = await Promise.all([
        axios.get(backendUrl + '/api/revenue/list', { headers: getAuthHeaders() }),
        axios.get(backendUrl + '/api/reservation/get', { headers: getAuthHeaders() }).catch(() => ({ data: [] })),
      ])
      setRevenues(revRes.data?.revenues || [])
      setReservations(Array.isArray(resRes.data) ? resRes.data : [])
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load revenue data'
      setError(msg)
      setRevenues([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRevenues() }, [fetchRevenues])

  // Dashboard calculations from real data
  const dashboard = useMemo(() => {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    const weekStartStr = weekStart.toISOString().split('T')[0]

    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`

    const completed = revenues.filter(r => r.status === 'Completed')

    const total = completed.reduce((s, r) => s + r.amount, 0)
    const daily = completed.filter(r => r.date === todayStr).reduce((s, r) => s + r.amount, 0)
    const weekly = completed.filter(r => r.date >= weekStartStr).reduce((s, r) => s + r.amount, 0)
    const monthly = completed.filter(r =>
      r.date && r.date.startsWith(currentMonthStr)
    ).reduce((s, r) => s + r.amount, 0)
    const pending = revenues.filter(r => r.status === 'Pending').reduce((s, r) => s + r.amount, 0)
    const refunds = revenues.filter(r => r.status === 'Refunded').reduce((s, r) => s + Math.abs(r.amount), 0)
    const roomRevenue = completed.filter(r => r.revenueType === 'Room Booking').reduce((s, r) => s + r.amount, 0)
    const foodRevenue = completed.filter(r => r.revenueType === 'Food & Beverage').reduce((s, r) => s + r.amount, 0)
    const eventRevenue = completed.filter(r => r.revenueType === 'Event').reduce((s, r) => s + r.amount, 0)

    return { total, daily, weekly, monthly, pending, refunds, roomRevenue, foodRevenue, eventRevenue }
  }, [revenues])

  // Chart data grouped by month
  const chartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const grouped = {}
    revenues.filter(r => r.status === 'Completed').forEach(r => {
      if (!r.date) return
      const parts = r.date.split('-')
      if (parts.length < 2) return
      const m = parseInt(parts[1], 10) - 1
      const key = months[m] || parts[1]
      grouped[key] = (grouped[key] || 0) + r.amount
    })
    return months.map(m => ({ month: m, revenue: grouped[m] || 0 }))
  }, [revenues])

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div className="p-3 shadow border text-sm" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
          <p className="font-semibold mb-1" style={{ color: '#1E293B' }}>{label}</p>
          <p style={{ color: '#2563EB' }}>Revenue: <strong>${payload[0].value.toLocaleString()}</strong></p>
        </div>
      )
    }
    return null
  }

  // Staff lookup from reservations
  const staffLookup = useMemo(() => {
    const map = {}
    reservations.forEach(r => {
      const key = (r.name || '').toLowerCase().trim()
      if (key && !map[key]) {
        map[key] = {
          approvedBy: r.approvedBy?.name || '',
          checkedInBy: r.checkedInBy?.name || '',
          checkedOutBy: r.checkedOutBy?.name || '',
        }
      }
    })
    return map
  }, [reservations])

  // Search filter
  const filtered = useMemo(() => {
    if (!search) return revenues
    const q = search.toLowerCase()
    return revenues.filter(r =>
      (r.transactionId || '').toLowerCase().includes(q) ||
      (r.customerName || '').toLowerCase().includes(q) ||
      (r.roomNumber || '').toLowerCase().includes(q) ||
      (r.revenueType || '').toLowerCase().includes(q) ||
      (r.paymentMethod || '').toLowerCase().includes(q) ||
      (r.date || '').toLowerCase().includes(q) ||
      (r.status || '').toLowerCase().includes(q)
    )
  }, [revenues, search])

  // Sorting
  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey] ?? ''
      const bVal = b[sortKey] ?? ''
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  const SortIcon = ({ column }) => {
    if (sortKey !== column) return <span className="ml-1" style={{ color: '#94A3B8', opacity: 0.4 }}>&#8597;</span>
    return <span className="ml-1" style={{ color: '#2563EB' }}>{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>
  }

  // CRUD
  const openAdd = () => {
    setEditItem(null)
    setFormCustomer('')
    setFormRoom('')
    setFormType('Room Booking')
    setFormAmount('')
    setFormDate(new Date().toISOString().split('T')[0])
    setFormMethod('Cash')
    setFormStatus('Completed')
    setFormDescription('')
    setErrors({})
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditItem(item)
    setFormCustomer(item.customerName || '')
    setFormRoom(item.roomNumber || '')
    setFormType(item.revenueType || 'Room Booking')
    setFormAmount(String(item.amount || ''))
    setFormDate(item.date || '')
    setFormMethod(item.paymentMethod || 'Cash')
    setFormStatus(item.status || 'Completed')
    setFormDescription(item.description || '')
    setErrors({})
    setShowModal(true)
  }

  const validate = () => {
    const errs = {}
    if (!formCustomer.trim()) errs.customer = 'Customer name is required'
    if (!formAmount || Number(formAmount) <= 0) errs.amount = 'Valid amount is required'
    if (!formDate) errs.date = 'Date is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSaveLoading(true)
    try {
      const body = {
        customerName: formCustomer.trim(),
        roomNumber: formRoom.trim(),
        revenueType: formType,
        amount: Number(formAmount),
        date: formDate,
        paymentMethod: formMethod,
        status: formStatus,
        description: formDescription.trim(),
      }

      if (editItem) {
        const r = await axios.put(backendUrl + `/api/revenue/update/${editItem._id}`, body, { headers: getAuthHeaders() })
        if (r.data?.success) {
          notify.success('Revenue record updated successfully')
        } else {
          notify.error(r.data?.message || 'Update failed')
          return
        }
      } else {
        const r = await axios.post(backendUrl + '/api/revenue/add', body, { headers: getAuthHeaders() })
        if (r.data?.success) {
          notify.success('Revenue record added successfully')
        } else {
          notify.error(r.data?.message || 'Add failed')
          return
        }
      }
      setShowModal(false)
      await fetchRevenues()
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error saving revenue record'
      notify.error(msg)
    } finally {
      setSaveLoading(false)
    }
  }

  const deleteRevenue = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const r = await axios.delete(backendUrl + `/api/revenue/delete/${deleteTarget._id}`, { headers: getAuthHeaders() })
      if (r.data?.success) {
        notify.success('Revenue record deleted successfully')
      } else {
        notify.error(r.data?.message || 'Delete failed')
      }
      setDeleteTarget(null)
      await fetchRevenues()
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Delete error'
      notify.error(msg)
      setDeleteTarget(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(sorted.map(r => {
      const staff = staffLookup[(r.customerName || '').toLowerCase().trim()]
      return {
        'Transaction ID': r.transactionId,
        'Customer Name': r.customerName,
        'Room Number': r.roomNumber || '-',
        'Revenue Type': r.revenueType,
        Amount: r.amount,
        Date: r.date,
        'Payment Method': r.paymentMethod,
        Status: r.status,
        'Approved By': staff?.approvedBy || '',
        'Checked In By': staff?.checkedInBy || '',
        'Checked Out By': staff?.checkedOutBy || '',
      }
    }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Revenue')
    XLSX.writeFile(wb, 'AbayGrand_Revenue.xlsx')
    notify.success('Excel exported successfully')
  }

  const exportPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text('Abay Grand Hotel - Revenue Report', 14, 15)
    doc.setFontSize(9)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 22)
    autoTable(doc, {
      startY: 28,
      head: [['TXN ID', 'Customer', 'Room', 'Type', 'Amount', 'Date', 'Method', 'Status', 'Approved By', 'Checked In By', 'Checked Out By']],
      body: sorted.map(r => {
        const staff = staffLookup[(r.customerName || '').toLowerCase().trim()]
        return [
          r.transactionId,
          r.customerName,
          r.roomNumber || '-',
          r.revenueType,
          `$${(r.amount ?? 0).toLocaleString()}`,
          r.date,
          r.paymentMethod,
          r.status,
          staff?.approvedBy || '',
          staff?.checkedInBy || '',
          staff?.checkedOutBy || '',
        ]
      }),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 41, 59] },
    })
    doc.save('AbayGrand_Revenue.pdf')
    notify.success('PDF exported successfully')
  }

  const columns = [
    {
      header: () => (
        <div className="flex items-center gap-1 cursor-pointer select-none" onClick={() => handleSort('transactionId')}>
          Transaction ID <SortIcon column="transactionId" />
        </div>
      ),
      render: (r) => (
        <span className="font-mono text-xs font-semibold" style={{ color: '#2563EB' }}>
          {r.transactionId}
        </span>
      ),
    },
    {
      header: () => (
        <div className="flex items-center gap-1 cursor-pointer select-none" onClick={() => handleSort('customerName')}>
          Customer <SortIcon column="customerName" />
        </div>
      ),
      accessor: 'customerName',
    },
    {
      header: () => (
        <div className="flex items-center gap-1 cursor-pointer select-none" onClick={() => handleSort('roomNumber')}>
          Room <SortIcon column="roomNumber" />
        </div>
      ),
      render: (r) => r.roomNumber || '-',
    },
    {
      header: () => (
        <div className="flex items-center gap-1 cursor-pointer select-none" onClick={() => handleSort('revenueType')}>
          Revenue Type <SortIcon column="revenueType" />
        </div>
      ),
      render: (r) => (
        <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: '#EFF6FF', color: '#2563EB' }}>
          {r.revenueType}
        </span>
      ),
    },
    {
      header: () => (
        <div className="flex items-center gap-1 cursor-pointer select-none" onClick={() => handleSort('amount')}>
          Amount <SortIcon column="amount" />
        </div>
      ),
      render: (r) => (
        <span className="font-bold text-sm" style={{ color: '#16A34A' }}>${(r.amount ?? 0).toLocaleString()}</span>
      ),
    },
    {
      header: () => (
        <div className="flex items-center gap-1 cursor-pointer select-none" onClick={() => handleSort('date')}>
          Date <SortIcon column="date" />
        </div>
      ),
      accessor: 'date',
    },
    {
      header: () => (
        <div className="flex items-center gap-1 cursor-pointer select-none" onClick={() => handleSort('paymentMethod')}>
          Method <SortIcon column="paymentMethod" />
        </div>
      ),
      render: (r) => r.paymentMethod,
    },
    {
      header: () => (
        <div className="flex items-center gap-1 cursor-pointer select-none" onClick={() => handleSort('status')}>
          Status <SortIcon column="status" />
        </div>
      ),
      render: (r) => statusBadge(r.status),
    },
    {
      header: 'Approved By',
      render: (r) => {
        const staff = staffLookup[(r.customerName || '').toLowerCase().trim()]
        return staff?.approvedBy ? (
          <span className="text-xs font-medium" style={{ color: '#16A34A' }}>{staff.approvedBy}</span>
        ) : <span className="text-xs" style={{ color: '#D1D5DB' }}>—</span>
      },
    },
    {
      header: 'Checked In By',
      render: (r) => {
        const staff = staffLookup[(r.customerName || '').toLowerCase().trim()]
        return staff?.checkedInBy ? (
          <span className="text-xs font-medium" style={{ color: '#2563EB' }}>{staff.checkedInBy}</span>
        ) : <span className="text-xs" style={{ color: '#D1D5DB' }}>—</span>
      },
    },
    {
      header: 'Checked Out By',
      render: (r) => {
        const staff = staffLookup[(r.customerName || '').toLowerCase().trim()]
        return staff?.checkedOutBy ? (
          <span className="text-xs font-medium" style={{ color: '#6B7280' }}>{staff.checkedOutBy}</span>
        ) : <span className="text-xs" style={{ color: '#D1D5DB' }}>—</span>
      },
    },
    {
      header: 'Actions',
      render: (r) => (
        <div className="flex items-center" style={{ gap: '10px', whiteSpace: 'nowrap' }}>
          <button
            onClick={(e) => { e.stopPropagation(); setViewItem(r) }}
            className="w-9 h-9 rounded flex items-center justify-center transition-all hover:opacity-80"
            style={{ background: '#EEF2FF', color: '#6366F1' }}
            title="View"
          >
            <MdVisibility size={18} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(r) }}
            className="w-9 h-9 rounded flex items-center justify-center transition-all hover:opacity-80"
            style={{ background: '#EFF6FF', color: '#2563EB' }}
            title="Edit"
          >
            <MdEdit size={18} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(r) }}
            className="w-9 h-9 rounded flex items-center justify-center transition-all hover:opacity-80"
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
    <div className="fade-in-up" style={{ marginBottom: '32px' }}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between" style={{ gap: '16px', marginBottom: '32px' }}>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1E293B', fontFamily: "'Playfair Display', serif" }}>Revenue Management</h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>Real-time financial data from {revenues.length} records</p>
        </div>
        <div className="flex items-center flex-wrap" style={{ gap: '10px' }}>
          <Button variant="outline" size="sm" icon={MdDownload} onClick={exportExcel}>Export Excel</Button>
          <Button variant="outline" size="sm" icon={MdDownload} onClick={exportPDF}>Export PDF</Button>
          <Button variant="primary" size="sm" icon={MdAdd} onClick={openAdd}>Add Revenue</Button>
        </div>
      </div>

      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard label="Daily Revenue" value={`ETB ${dashboard.daily.toLocaleString()}`} change="today" up={dashboard.daily > 0} icon={MdAttachMoney} color="#16A34A" />
        <StatCard label="Weekly Revenue" value={`ETB ${dashboard.weekly.toLocaleString()}`} change="this week" up={dashboard.weekly > 0} icon={MdAttachMoney} color="#2563EB" />
        <StatCard label="Monthly Revenue" value={`ETB ${dashboard.monthly.toLocaleString()}`} change="this month" up={dashboard.monthly > 0} icon={MdAttachMoney} color="#D4AF37" accent="#1E293B" />
        <StatCard label="Total Revenue" value={`ETB ${dashboard.total.toLocaleString()}`} change="all time" up={true} icon={MdAttachMoney} color="#1E293B" accent="#D4AF37" />
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: '16px', marginBottom: '32px' }}>
        <div className="p-4" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
          <p className="text-xs font-medium" style={{ color: '#6B7280', marginBottom: '4px' }}>Room Bookings</p>
          <p className="text-xl font-bold" style={{ color: '#D4AF37' }}>ETB {dashboard.roomRevenue.toLocaleString()}</p>
        </div>
        <div className="p-4" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
          <p className="text-xs font-medium" style={{ color: '#6B7280', marginBottom: '4px' }}>Food & Beverage</p>
          <p className="text-xl font-bold" style={{ color: '#16A34A' }}>ETB {dashboard.foodRevenue.toLocaleString()}</p>
        </div>
        <div className="p-4" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
          <p className="text-xs font-medium" style={{ color: '#6B7280', marginBottom: '4px' }}>Events</p>
          <p className="text-xl font-bold" style={{ color: '#D97706' }}>ETB {dashboard.eventRevenue.toLocaleString()}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="p-5" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', marginBottom: '32px' }}>
        <div className="mb-4">
          <h3 className="font-semibold" style={{ color: '#1E293B' }}>Monthly Revenue Trend</h3>
          <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Completed revenue grouped by month</p>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} barCategoryGap="40%">
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="revenue" name="Revenue" fill="#D4AF37" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Search */}
      <div className="relative" style={{ maxWidth: '400px', marginBottom: '16px' }}>
        <MdSearch size={18} className="absolute" style={{ left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', zIndex: 1 }} />
        <input
          type="text"
          placeholder="Search revenue records..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="input-field"
          style={{ paddingLeft: '44px', height: '42px' }}
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden" style={{ border: '1px solid #E5E7EB', borderRadius: '8px', background: '#FFFFFF' }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center" style={{ padding: '80px 0', color: '#94A3B8' }}>
            <svg className="animate-spin" fill="none" viewBox="0 0 24 24" style={{ width: '28px', height: '28px', marginBottom: '12px' }}>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <p className="text-sm font-medium">Loading revenue data...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center" style={{ padding: '80px 0' }}>
            <p className="text-sm font-medium mb-3" style={{ color: '#DC2626' }}>{error}</p>
            <Button variant="primary" size="sm" icon={MdRefresh} onClick={fetchRevenues}>Retry</Button>
          </div>
        ) : paginated.length === 0 ? (
          <div className="text-center" style={{ padding: '80px 0', color: '#94A3B8' }}>
            <MdAttachMoney size={40} style={{ color: '#D1D5DB', margin: '0 auto 12px' }} />
            <p className="text-base font-medium">No revenue records found</p>
            <p className="text-sm mt-1">{search ? 'Try a different search term' : 'Add your first revenue record to get started'}</p>
            {!search && (
              <Button variant="primary" size="sm" icon={MdAdd} onClick={openAdd} className="mt-4">Add Revenue</Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full data-table">
                <thead>
                  <tr>
                    {columns.map((col, i) => (
                      <th key={i} style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        {typeof col.header === 'function' ? col.header() : col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((row, i) => (
                    <tr key={row._id || i}>
                      {columns.map((col, j) => (
                        <td key={j}>
                          {col.render ? col.render(row) : row[col.accessor] ?? '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t" style={{ borderColor: '#E5E7EB' }}>
                <p className="text-xs" style={{ color: '#94A3B8' }}>{sorted.length} results</p>
                <div className="flex items-center" style={{ gap: '6px' }}>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-8 h-8 rounded flex items-center justify-center disabled:opacity-40 transition-all text-sm"
                    style={{ border: '1px solid #E5E7EB', color: '#6B7280' }}
                  >
                    &lsaquo;
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setPage(i + 1)}
                      className="w-8 h-8 rounded text-xs font-medium transition-all"
                      style={{
                        background: page === i + 1 ? '#2563EB' : '#FFFFFF',
                        color: page === i + 1 ? '#fff' : '#6B7280',
                        border: `1px solid ${page === i + 1 ? '#2563EB' : '#E5E7EB'}`,
                      }}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="w-8 h-8 rounded flex items-center justify-center disabled:opacity-40 transition-all text-sm"
                    style={{ border: '1px solid #E5E7EB', color: '#6B7280' }}
                  >
                    &rsaquo;
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* View Modal */}
      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title="Revenue Details" width="max-w-md">
        {viewItem && (
          <div className="flex flex-col" style={{ gap: '16px' }}>
            {[
              ['Transaction ID', viewItem.transactionId],
              ['Customer Name', viewItem.customerName],
              ['Room Number', viewItem.roomNumber || '-'],
              ['Revenue Type', viewItem.revenueType],
              ['Amount', `$${(viewItem.amount ?? 0).toLocaleString()}`],
              ['Date', viewItem.date],
              ['Payment Method', viewItem.paymentMethod],
              ['Status', viewItem.status],
              ['Description', viewItem.description || '-'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start justify-between py-3 border-b" style={{ borderColor: '#E5E7EB' }}>
                <span className="text-sm font-medium" style={{ color: '#6B7280' }}>{label}</span>
                <span className="text-sm font-semibold" style={{ color: '#1E293B' }}>{value}</span>
              </div>
            ))}
            <Button variant="secondary" onClick={() => setViewItem(null)} className="w-full">Close</Button>
          </div>
        )}
      </Modal>

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Edit Revenue' : 'Add Revenue'} width="max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: '16px' }}>
          <div>
            <label className="block text-xs font-semibold" style={{ color: '#6B7280', marginBottom: '6px' }}>
              Customer Name <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              className={`input-field ${errors.customer ? 'error' : ''}`}
              value={formCustomer}
              onChange={e => setFormCustomer(e.target.value)}
              placeholder="Enter customer name"
            />
            {errors.customer && <p className="text-xs mt-1" style={{ color: '#DC2626' }}>{errors.customer}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '16px' }}>
            <div>
              <label className="block text-xs font-semibold" style={{ color: '#6B7280', marginBottom: '6px' }}>Room Number</label>
              <input className="input-field" value={formRoom} onChange={e => setFormRoom(e.target.value)} placeholder="e.g. 201" />
            </div>
            <div>
              <label className="block text-xs font-semibold" style={{ color: '#6B7280', marginBottom: '6px' }}>
                Revenue Type <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select className="input-field" value={formType} onChange={e => setFormType(e.target.value)}>
                {REVENUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '16px' }}>
            <div>
              <label className="block text-xs font-semibold" style={{ color: '#6B7280', marginBottom: '6px' }}>
                Amount ($) <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="number"
                className={`input-field ${errors.amount ? 'error' : ''}`}
                value={formAmount}
                onChange={e => setFormAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              {errors.amount && <p className="text-xs mt-1" style={{ color: '#DC2626' }}>{errors.amount}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold" style={{ color: '#6B7280', marginBottom: '6px' }}>
                Date <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="date"
                className={`input-field ${errors.date ? 'error' : ''}`}
                value={formDate}
                onChange={e => setFormDate(e.target.value)}
              />
              {errors.date && <p className="text-xs mt-1" style={{ color: '#DC2626' }}>{errors.date}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '16px' }}>
            <div>
              <label className="block text-xs font-semibold" style={{ color: '#6B7280', marginBottom: '6px' }}>
                Payment Method <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select className="input-field" value={formMethod} onChange={e => setFormMethod(e.target.value)}>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold" style={{ color: '#6B7280', marginBottom: '6px' }}>Status</label>
              <select className="input-field" value={formStatus} onChange={e => setFormStatus(e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold" style={{ color: '#6B7280', marginBottom: '6px' }}>Description</label>
            <textarea
              className="input-field"
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          <div className="flex" style={{ gap: '10px', paddingTop: '8px' }}>
            <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
            <Button
              type="submit"
              variant="success"
              icon={MdCheck}
              loading={saveLoading}
              className="flex-1"
            >
              {editItem ? 'Update Revenue' : 'Add Revenue'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteRevenue}
        title="Delete Revenue Record"
        message={`Delete revenue record ${deleteTarget?.transactionId} for ${deleteTarget?.customerName}? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  )
}

export default Revenue
