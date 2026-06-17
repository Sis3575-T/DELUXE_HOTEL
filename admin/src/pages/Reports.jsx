import React, { useEffect, useState, useCallback, useMemo } from 'react'
import axios from 'axios'
import { backendUrl } from '../App'
import {
  MdAssessment, MdRefresh, MdDownload, MdPrint, MdDateRange,
  MdAttachMoney, MdHotel, MdEventNote, MdPeople, MdBadge
} from 'react-icons/md'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Button from '../components/ui/Button'
import notify from '../components/ui/Toast'

const TABS = [
  { key: 'revenue', label: 'Revenue Report', icon: MdAttachMoney },
  { key: 'reservation', label: 'Reservation Report', icon: MdEventNote },
  { key: 'occupancy', label: 'Room Occupancy', icon: MdHotel },
  { key: 'customer', label: 'Customer Report', icon: MdPeople },
  { key: 'staff', label: 'Staff Report', icon: MdBadge },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="p-3 shadow border text-sm" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
        <p className="font-semibold mb-1" style={{ color: '#1E293B' }}>{label}</p>
        {payload.map((p, i) => (<p key={i} style={{ color: p.color }}>{p.name}: <strong>{typeof p.value === 'number' && p.value > 999 ? `$${(p.value / 1000).toFixed(0)}K` : p.value}</strong></p>))}
      </div>
    )
  }
  return null
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const Reports = () => {
  const [activeTab, setActiveTab] = useState('revenue')
  const [rooms, setRooms] = useState([])
  const [reservations, setReservations] = useState([])
  const [revenues, setRevenues] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [rRooms, rRes, rRev, rStaff] = await Promise.all([
        axios.get(backendUrl + '/api/hotel/list').catch(() => ({ data: { hotels: [] } })),
        axios.get(backendUrl + '/api/reservation/get', { headers: getAuthHeaders() }).catch(() => ({ data: [] })),
        axios.get(backendUrl + '/api/revenue/list', { headers: getAuthHeaders() }).catch(() => ({ data: { revenues: [] } })),
        axios.get(backendUrl + '/api/staff/list', { headers: getAuthHeaders() }).catch(() => ({ data: { staff: [] } })),
      ])
      setRooms(rRooms.data?.hotels || [])
      setReservations(Array.isArray(rRes.data) ? rRes.data : [])
      setRevenues(rRev.data?.revenues || [])
      setStaff(rStaff.data?.staff || [])
    } catch (err) {
      setError(err.message || 'Failed to load report data')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filteredRevenues = useMemo(() => {
    let data = revenues
    if (dateFrom) data = data.filter(r => r.date >= dateFrom)
    if (dateTo) data = data.filter(r => r.date <= dateTo)
    return data
  }, [revenues, dateFrom, dateTo])

  const filteredReservations = useMemo(() => {
    let data = reservations
    if (dateFrom) data = data.filter(r => r.checkin >= dateFrom)
    if (dateTo) data = data.filter(r => r.checkin <= dateTo)
    return data
  }, [reservations, dateFrom, dateTo])

  const revenueChartData = useMemo(() => {
    const byMonth = {}
    filteredRevenues.forEach(r => {
      if (!r.date) return
      const d = new Date(r.date)
      const key = MONTHS[d.getMonth()]
      byMonth[key] = (byMonth[key] || 0) + (Number(r.amount) || 0)
    })
    return MONTHS.map(m => ({ month: m, revenue: byMonth[m] || 0 }))
  }, [filteredRevenues])

  const reservationChartData = useMemo(() => {
    const byMonth = {}
    filteredReservations.forEach(r => {
      if (!r.checkin) return
      const d = new Date(r.checkin)
      const key = MONTHS[d.getMonth()]
      if (!byMonth[key]) byMonth[key] = { confirmed: 0, pending: 0, cancelled: 0 }
      if (['Approved', 'Confirmed', 'Checked In', 'Checked Out'].includes(r.status)) byMonth[key].confirmed++
      else if (r.status === 'Pending') byMonth[key].pending++
      else if (r.status === 'Cancelled') byMonth[key].cancelled++
    })
    return MONTHS.map(m => ({ month: m, ...byMonth[m] || { confirmed: 0, pending: 0, cancelled: 0 } }))
  }, [filteredReservations])

  const exportExcel = () => {
    let data, sheetName
    if (activeTab === 'revenue') {
      data = filteredRevenues.map(r => ({ 'Transaction ID': r.transactionId, Customer: r.customerName, Type: r.revenueType, Amount: r.amount, Date: r.date, Method: r.paymentMethod, Status: r.status }))
      sheetName = 'Revenue'
    } else if (activeTab === 'reservation') {
      data = filteredReservations.map(r => ({ Guest: r.name, Email: r.email, Room: r.roomName, 'Check-In': r.checkin, 'Check-Out': r.checkout, Guests: r.guests, Status: r.status }))
      sheetName = 'Reservations'
    } else if (activeTab === 'occupancy') {
      data = rooms.map(r => { const rs = r.status || (r.available !== false ? 'available' : 'inactive'); return { Room: r.name, Price: r.price, Status: rs === 'available' ? 'Available' : rs === 'maintenance' ? 'Maintenance' : 'Inactive', Capacity: r.capacity || '-' } })
      sheetName = 'Occupancy'
    } else if (activeTab === 'customer') {
      const customers = [...new Set(reservations.map(r => r.email))]
      data = customers.map(email => {
        const res = reservations.filter(r => r.email === email)
        return { Email: email, Name: res[0]?.name || '', Reservations: res.length, 'Total Spent': revenues.filter(r => (r.customerName || '').toLowerCase() === (res[0]?.name || '').toLowerCase()).reduce((s, r) => s + (r.amount || 0), 0) }
      })
      sheetName = 'Customers'
    } else if (activeTab === 'staff') {
      data = staff.map(s => ({ Name: s.name, ID: s.employeeId, Role: s.role, Department: s.department || '', Phone: s.phone || '', Email: s.email || '', Salary: s.salary, Status: s.status }))
      sheetName = 'Staff'
    }
    if (!data) return
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    XLSX.writeFile(wb, `AbayGrand_${sheetName}_Report.xlsx`)
    notify.success('Excel exported successfully')
  }

  const exportPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text(`Abay Grand Hotel - ${TABS.find(t => t.key === activeTab)?.label || 'Report'}`, 14, 15)
    doc.setFontSize(9)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 22)
    let head, body
    if (activeTab === 'revenue') {
      head = [['TXN ID', 'Customer', 'Type', 'Amount', 'Date', 'Method', 'Status']]
      body = filteredRevenues.map(r => [r.transactionId, r.customerName, r.revenueType, `$${r.amount}`, r.date, r.paymentMethod, r.status])
    } else if (activeTab === 'reservation') {
      head = [['Guest', 'Email', 'Room', 'Check-In', 'Check-Out', 'Guests', 'Status']]
      body = filteredReservations.map(r => [r.name, r.email, r.roomName, r.checkin, r.checkout, r.guests, r.status])
    } else if (activeTab === 'staff') {
      head = [['Name', 'ID', 'Role', 'Department', 'Phone', 'Email', 'Salary', 'Status']]
      body = staff.map(s => [s.name, s.employeeId, s.role, s.department || '-', s.phone || '-', s.email || '-', `$${s.salary}`, s.status])
    } else {
      notify.info('PDF export for this tab is not available')
      return
    }
    if (head && body) {
      autoTable(doc, { startY: 28, head: [head], body, styles: { fontSize: 8 }, headStyles: { fillColor: [30, 41, 59] } })
    }
    doc.save(`AbayGrand_${activeTab}_Report.pdf`)
    notify.success('PDF exported successfully')
  }

  const handlePrint = () => window.print()

  const renderContent = () => {
    if (loading) return (
      <div className="flex flex-col items-center justify-center" style={{ padding: '80px 0', color: '#94A3B8' }}>
        <svg className="animate-spin" fill="none" viewBox="0 0 24 24" style={{ width: '28px', height: '28px', marginBottom: '12px' }}>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <p className="text-sm font-medium">Loading report data...</p>
      </div>
    )
    if (error) return (
      <div className="flex flex-col items-center justify-center" style={{ padding: '80px 0' }}>
        <p className="text-sm font-medium mb-3" style={{ color: '#DC2626' }}>{error}</p>
        <Button variant="primary" size="sm" icon={MdRefresh} onClick={fetchData}>Retry</Button>
      </div>
    )

    switch (activeTab) {
      case 'revenue':
        return (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-4" style={{ gap: '16px', marginBottom: '24px' }}>
              {[
                { label: 'Total Revenue', value: `$${filteredRevenues.reduce((s, r) => s + (Number(r.amount) || 0), 0).toLocaleString()}`, color: '#1E293B' },
                { label: 'Transactions', value: filteredRevenues.length, color: '#2563EB' },
                { label: 'Completed', value: filteredRevenues.filter(r => r.status === 'Completed').length, color: '#16A34A' },
                { label: 'Pending', value: filteredRevenues.filter(r => r.status === 'Pending').length, color: '#D97706' },
              ].map(s => (
                <div key={s.label} className="p-4" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                  <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{s.label}</p>
                </div>
              ))}
            </div>
            <div className="p-5" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
              <h3 className="font-semibold mb-4" style={{ color: '#1E293B' }}>Monthly Revenue Trend</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={revenueChartData} barCategoryGap="40%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" name="Revenue" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      case 'reservation':
        return (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-4" style={{ gap: '16px', marginBottom: '24px' }}>
              {[
                { label: 'Total Reservations', value: filteredReservations.length, color: '#1E293B' },
                { label: 'Approved', value: filteredReservations.filter(r => ['Approved', 'Confirmed', 'Checked In', 'Checked Out'].includes(r.status)).length, color: '#16A34A' },
                { label: 'Pending', value: filteredReservations.filter(r => r.status === 'Pending').length, color: '#D97706' },
                { label: 'Cancelled', value: filteredReservations.filter(r => r.status === 'Cancelled').length, color: '#DC2626' },
              ].map(s => (
                <div key={s.label} className="p-4" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                  <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{s.label}</p>
                </div>
              ))}
            </div>
            <div className="p-5" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
              <h3 className="font-semibold mb-4" style={{ color: '#1E293B' }}>Reservation Statistics</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={reservationChartData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="confirmed" name="Approved" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" name="Pending" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cancelled" name="Cancelled" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      case 'occupancy':
        const total = rooms.length || 1
        const getRoomStatus = (r) => r.status || (r.available !== false ? 'available' : 'inactive')
        const availableCount = rooms.filter(r => getRoomStatus(r) === 'available').length
        const maintenanceCount = rooms.filter(r => getRoomStatus(r) === 'maintenance').length
        const inactiveCount = rooms.filter(r => getRoomStatus(r) === 'inactive').length
        const occupiedCount = total - availableCount - maintenanceCount - inactiveCount
        const occupancyData = [
          { name: 'Occupied', value: Math.round((occupiedCount / total) * 100), color: '#1E293B' },
          { name: 'Available', value: Math.round((availableCount / total) * 100), color: '#D4AF37' },
          { name: 'Maintenance', value: Math.round((maintenanceCount / total) * 100), color: '#94A3B8' },
        ]
        return (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: '16px', marginBottom: '24px' }}>
              {[
                { label: 'Total Rooms', value: total, color: '#1E293B' },
                { label: 'Available', value: available, color: '#16A34A' },
                { label: 'Occupied', value: occupied, color: '#DC2626' },
              ].map(s => (
                <div key={s.label} className="p-4" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                  <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{s.label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '20px' }}>
              <div className="p-5" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                <h3 className="font-semibold mb-4" style={{ color: '#1E293B' }}>Room Occupancy</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={occupancyData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                      {occupancyData.map((e, i) => (<Cell key={i} fill={e.color} />))}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v}%`]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center" style={{ gap: '20px', marginTop: '12px' }}>
                  {occupancyData.map(d => (
                    <div key={d.name} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded" style={{ background: d.color }} />
                      <span style={{ color: '#6B7280' }}>{d.name}: {d.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-5" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                <h3 className="font-semibold mb-4" style={{ color: '#1E293B' }}>Room List</h3>
                <div className="flex flex-col" style={{ gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                  {rooms.map(r => (
                    <div key={r._id} className="flex items-center justify-between py-2 px-3 rounded" style={{ background: '#F9FAFB' }}>
                      <span className="text-sm font-medium" style={{ color: '#1E293B' }}>{r.name}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${r.status === 'maintenance' ? 'bg-yellow-100 text-yellow-700' : r.status === 'inactive' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{r.status === 'maintenance' ? 'Maintenance' : r.status === 'inactive' ? 'Inactive' : 'Available'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      case 'customer':
        const customerMap = {}
        reservations.forEach(r => {
          if (!customerMap[r.email]) customerMap[r.email] = { name: r.name, email: r.email, count: 0, spent: 0 }
          customerMap[r.email].count++
        })
        revenues.filter(r => r.status === 'Completed').forEach(r => {
          const email = Object.keys(customerMap).find(e => customerMap[e].name.toLowerCase() === (r.customerName || '').toLowerCase())
          if (email) customerMap[email].spent += (r.amount || 0)
        })
        const customers = Object.values(customerMap)
        return (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: '16px', marginBottom: '24px' }}>
              <div className="p-4" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                <p className="text-xl font-bold" style={{ color: '#1E293B' }}>{customers.length}</p>
                <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Total Customers</p>
              </div>
              <div className="p-4" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                <p className="text-xl font-bold" style={{ color: '#2563EB' }}>{reservations.length}</p>
                <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Total Reservations</p>
              </div>
              <div className="p-4" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                <p className="text-xl font-bold" style={{ color: '#16A34A' }}>${customers.reduce((s, c) => s + c.spent, 0).toLocaleString()}</p>
                <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Total Revenue from Customers</p>
              </div>
            </div>
            <div className="overflow-hidden" style={{ border: '1px solid #E5E7EB', borderRadius: '8px', background: '#FFFFFF' }}>
              <div className="overflow-x-auto">
                <table className="w-full data-table">
                  <thead><tr>
                    <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>Name</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>Email</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>Reservations</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>Total Spent</th>
                  </tr></thead>
                  <tbody>
                    {customers.map(c => (
                      <tr key={c.email}>
                        <td className="font-medium" style={{ color: '#1E293B' }}>{c.name}</td>
                        <td style={{ color: '#6B7280' }}>{c.email}</td>
                        <td><span className="font-semibold">{c.count}</span></td>
                        <td><span className="font-semibold" style={{ color: '#16A34A' }}>${c.spent.toLocaleString()}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      case 'staff':
        return (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-4" style={{ gap: '16px', marginBottom: '24px' }}>
              {[
                { label: 'Total Staff', value: staff.length, color: '#1E293B' },
                { label: 'Active', value: staff.filter(s => s.status === 'Active').length, color: '#16A34A' },
                { label: 'Inactive', value: staff.filter(s => s.status === 'Inactive').length, color: '#DC2626' },
                { label: 'On Leave', value: staff.filter(s => s.status === 'On Leave').length, color: '#D97706' },
              ].map(s => (
                <div key={s.label} className="p-4" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                  <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{s.label}</p>
                </div>
              ))}
            </div>
            <div className="overflow-hidden" style={{ border: '1px solid #E5E7EB', borderRadius: '8px', background: '#FFFFFF' }}>
              <div className="overflow-x-auto">
                <table className="w-full data-table">
                  <thead><tr>
                    <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>Name</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>ID</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>Role</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>Department</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>Salary</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>Status</th>
                  </tr></thead>
                  <tbody>
                    {staff.map(s => (
                      <tr key={s._id}>
                        <td className="font-medium" style={{ color: '#1E293B' }}>{s.name}</td>
                        <td className="font-mono text-xs" style={{ color: '#2563EB' }}>{s.employeeId}</td>
                        <td><span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: '#F3F0FF', color: '#7C3AED' }}>{s.role}</span></td>
                        <td style={{ color: '#6B7280' }}>{s.department || '-'}</td>
                        <td className="font-semibold" style={{ color: '#16A34A' }}>${(s.salary || 0).toLocaleString()}</td>
                        <td><span className={`px-2.5 py-1 rounded text-xs font-semibold ${s.status === 'Active' ? 'bg-green-100 text-green-700' : s.status === 'Inactive' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{s.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="fade-in-up" style={{ marginBottom: '32px' }}>
      <div className="flex flex-wrap items-start justify-between" style={{ gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1E293B', fontFamily: "'Playfair Display', serif" }}>Reports</h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>Generate, export, and print reports</p>
        </div>
        <div className="flex items-center" style={{ gap: '8px' }}>
          <Button variant="outline" size="sm" icon={MdDownload} onClick={exportExcel}>Export Excel</Button>
          <Button variant="outline" size="sm" icon={MdDownload} onClick={exportPDF}>Export PDF</Button>
          <Button variant="outline" size="sm" icon={MdPrint} onClick={handlePrint}>Print</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center" style={{ gap: '8px', marginBottom: '24px' }}>
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium transition-all" style={{ background: activeTab === tab.key ? '#2563EB' : '#FFFFFF', color: activeTab === tab.key ? '#fff' : '#6B7280', border: `1px solid ${activeTab === tab.key ? '#2563EB' : '#E5E7EB'}` }}>
              <Icon size={16} /> {tab.label}
            </button>
          )
        })}
      </div>

      {/* Date Range Filter */}
      <div className="flex flex-wrap items-center" style={{ gap: '12px', marginBottom: '24px' }}>
        <MdDateRange size={18} style={{ color: '#6B7280' }} />
        <input type="date" className="input-field" style={{ width: 'auto' }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="From" />
        <span style={{ color: '#94A3B8' }}>to</span>
        <input type="date" className="input-field" style={{ width: 'auto' }} value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="To" />
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo('') }} className="text-xs font-medium px-3 py-1.5 rounded" style={{ background: '#F3F4F6', color: '#6B7280' }}>Clear</button>
        )}
      </div>

      {renderContent()}
    </div>
  )
}

export default Reports
