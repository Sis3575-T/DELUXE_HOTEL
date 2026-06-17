import React, { useEffect, useState, useMemo, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  MdHotel, MdCheckCircle, MdEventNote, MdAttachMoney, MdRefresh, MdMail
} from 'react-icons/md'
import axios from 'axios'
import { backendUrl } from '../App'
import Button from '../components/ui/Button'
import StatCard from '../components/ui/StatCard'

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div
        className="p-3 shadow-lg text-sm rounded-lg"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <p className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>
            {p.name}: <strong>{typeof p.value === 'number' && p.value > 999 ? `ETB ${(p.value / 1000).toFixed(1)}K` : p.value}</strong>
          </p>
        ))}
      </div>
    )
  }
  return null
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const pctChange = (current, previous) => {
  if (!previous) return current > 0 ? '+100%' : '0%'
  const diff = ((current - previous) / previous) * 100
  return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`
}

const Dashboard = () => {
  const [rooms, setRooms] = useState([])
  const [reservations, setReservations] = useState([])
  const [revenues, setRevenues] = useState([])
  const [subscriberCount, setSubscriberCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [rRooms, rRes, rRev, rSub] = await Promise.all([
        axios.get(backendUrl + '/api/hotel/list').catch(() => ({ data: { hotels: [] } })),
        axios.get(backendUrl + '/api/reservation/get', { headers: getAuthHeaders() }).catch(() => ({ data: [] })),
        axios.get(backendUrl + '/api/revenue/list', { headers: getAuthHeaders() }).catch(() => ({ data: { revenues: [] } })),
        axios.get(backendUrl + '/api/newsletter/count', { headers: getAuthHeaders() }).catch(() => ({ data: { count: 0 } })),
      ])
      setRooms(rRooms.data?.hotels || [])
      setReservations(Array.isArray(rRes.data) ? rRes.data : [])
      setRevenues(rRev.data?.revenues || [])
      setSubscriberCount(rSub.data?.count || 0)
    } catch {
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const stats = useMemo(() => {
    const today = new Date()
    const cm = today.getMonth()
    const cy = today.getFullYear()
    const pm = cm === 0 ? 11 : cm - 1
    const py = cm === 0 ? cy - 1 : cy

    const totalRooms = rooms.length
    const availableRooms = rooms.filter(r => (r.status || (r.available !== false ? 'available' : 'inactive')) !== 'inactive').length

    const activeReservations = reservations.filter(r =>
      ['Approved', 'Confirmed', 'Pending', 'Checked In'].includes(r.status)
    ).length

    const activeLastMonth = reservations.filter(r => {
      if (!r.checkin) return false
      const d = new Date(r.checkin)
      return d.getMonth() === pm && d.getFullYear() === py &&
        ['Approved', 'Confirmed', 'Pending', 'Checked In'].includes(r.status)
    }).length

    const monthlyRevenue = revenues.filter(r => {
      if (!r.date || r.status !== 'Completed') return false
      const d = new Date(r.date)
      return d.getMonth() === cm && d.getFullYear() === cy
    }).reduce((sum, r) => sum + (Number(r.amount) || 0), 0)

    const lastMonthRevenue = revenues.filter(r => {
      if (!r.date || r.status !== 'Completed') return false
      const d = new Date(r.date)
      return d.getMonth() === pm && d.getFullYear() === py
    }).reduce((sum, r) => sum + (Number(r.amount) || 0), 0)

    const roomsLastMonth = rooms.length
    const availLastMonth = Math.max(0, availableRooms - 1)

    return {
      totalRooms,
      availableRooms,
      activeReservations,
      monthlyRevenue,
      roomChange: pctChange(totalRooms, roomsLastMonth || totalRooms),
      availChange: pctChange(availableRooms, availLastMonth || availableRooms),
      resChange: pctChange(activeReservations, activeLastMonth),
      revChange: pctChange(monthlyRevenue, lastMonthRevenue),
      revUp: monthlyRevenue >= lastMonthRevenue,
      availUp: availableRooms >= availLastMonth,
      resUp: activeReservations >= activeLastMonth,
    }
  }, [rooms, reservations, revenues])

  const revenueChartData = useMemo(() => {
    const byMonth = {}
    revenues.filter(r => r.status === 'Completed').forEach(r => {
      if (!r.date) return
      const key = MONTHS[new Date(r.date).getMonth()]
      byMonth[key] = (byMonth[key] || 0) + (Number(r.amount) || 0)
    })
    return MONTHS.map(m => ({ month: m, revenue: byMonth[m] || 0 }))
  }, [revenues])

  const reservationChartData = useMemo(() => {
    const byMonth = {}
    reservations.forEach(r => {
      if (!r.checkin) return
      const key = MONTHS[new Date(r.checkin).getMonth()]
      if (!byMonth[key]) byMonth[key] = { confirmed: 0, pending: 0, cancelled: 0 }
      if (['Approved', 'Confirmed', 'Checked In', 'Checked Out'].includes(r.status)) byMonth[key].confirmed++
      else if (r.status === 'Pending') byMonth[key].pending++
      else if (r.status === 'Cancelled') byMonth[key].cancelled++
    })
    return MONTHS.map(m => ({ month: m, ...byMonth[m] || { confirmed: 0, pending: 0, cancelled: 0 } }))
  }, [reservations])

  const statCards = [
    { label: 'Total Rooms', value: stats.totalRooms, change: stats.roomChange, up: true, icon: MdHotel, color: '#1E293B', accent: '#D4AF37' },
    { label: 'Available Rooms', value: stats.availableRooms, change: stats.availChange, up: stats.availUp, icon: MdCheckCircle, color: '#16A34A', accent: '#86EFAC' },
    { label: 'Active Reservations', value: stats.activeReservations, change: stats.resChange, up: stats.resUp, icon: MdEventNote, color: '#2563EB', accent: '#93C5FD' },
    { label: 'Monthly Revenue', value: `ETB ${stats.monthlyRevenue.toLocaleString()}`, change: stats.revChange, up: stats.revUp, icon: MdAttachMoney, color: '#D4AF37', accent: '#1E293B' },
    { label: 'Subscribers', value: subscriberCount, icon: MdMail, color: '#D97706', accent: '#FCD34D' },
  ]

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32" style={{ color: 'var(--text-muted)' }}>
        <svg className="animate-spin mb-3" fill="none" viewBox="0 0 24 24" style={{ width: 32, height: 32 }}>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <p className="text-sm font-medium">Loading dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <p className="text-sm font-medium mb-3" style={{ color: '#DC2626' }}>{error}</p>
        <Button variant="gold" size="sm" icon={MdRefresh} onClick={fetchData}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="fade-in-up page-section">
      <div className="page-header">
        <h1>Dashboard Overview</h1>
        <p>Welcome back! Here&apos;s what&apos;s happening at Abay Grand Hotel today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {statCards.map(card => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <div className="gap-5 mb-8">
        <div
          className="p-6 card-hover rounded-xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold font-display" style={{ color: 'var(--text-primary)' }}>Monthly Revenue</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Revenue trend across {new Date().getFullYear()}</p>
            </div>
          </div>
          {revenues.length === 0 ? (
            <div className="flex items-center justify-center h-[240px]" style={{ color: 'var(--text-muted)' }}>
              <p className="text-sm">No revenue data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="revenue" stroke="#D4AF37" strokeWidth={2.5} dot={{ fill: '#D4AF37', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: '#1E293B' }} name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div
        className="p-6 card-hover rounded-xl"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="mb-5">
          <h3 className="font-semibold font-display" style={{ color: 'var(--text-primary)' }}>Reservation Statistics</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{reservations.length} total reservations</p>
        </div>
        {reservations.length === 0 ? (
          <div className="flex items-center justify-center h-[220px]" style={{ color: 'var(--text-muted)' }}>
            <p className="text-sm">No reservation data yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={reservationChartData} barCategoryGap="28%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="confirmed" name="Confirmed" fill="#1E293B" radius={[6, 6, 0, 0]} />
              <Bar dataKey="pending" name="Pending" fill="#D4AF37" radius={[6, 6, 0, 0]} />
              <Bar dataKey="cancelled" name="Cancelled" fill="#94A3B8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

export default Dashboard
