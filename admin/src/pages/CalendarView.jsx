import React, { useEffect, useState, useCallback, useMemo } from 'react'
import axios from 'axios'
import { backendUrl } from '../App'
import { MdCalendarMonth, MdRefresh, MdChevronLeft, MdChevronRight, MdViewDay, MdViewWeek, MdViewModule } from 'react-icons/md'
import Button from '../components/ui/Button'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const VIEWS = [
  { key: 'monthly', icon: MdViewModule, label: 'Month' },
  { key: 'weekly', icon: MdViewWeek, label: 'Week' },
  { key: 'daily', icon: MdViewDay, label: 'Day' },
]

const CalendarView = () => {
  const [rooms, setRooms] = useState([])
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState('monthly')
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedDayReservations, setSelectedDayReservations] = useState([])

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [rRooms, rRes] = await Promise.all([
        axios.get(backendUrl + '/api/hotel/list').catch(() => ({ data: { hotels: [] } })),
        axios.get(backendUrl + '/api/reservation/get').catch(() => ({ data: [] })),
      ])
      setRooms(rRooms.data?.hotels || [])
      setReservations(Array.isArray(rRes.data) ? rRes.data : [])
    } catch (err) {
      setError(err.message || 'Failed to load'); setRooms([]); setReservations([])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfMonth = new Date(year, month, 1).getDay()

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const getReservationsForDate = useCallback((dateStr) => {
    return reservations.filter(r => {
      if (!r.checkin || !r.checkout) return false
      return r.checkin <= dateStr && r.checkout >= dateStr && ['Approved', 'Confirmed', 'Checked In', 'Pending'].includes(r.status)
    })
  }, [reservations])

  const getRoomStatusForDate = useCallback((dateStr) => {
    const activeForDate = getReservationsForDate(dateStr)
    const total = rooms.length
    const occupied = activeForDate.length
    const available = total - occupied
    return { total, occupied, available }
  }, [rooms, getReservationsForDate])

  const handleDayClick = (day) => {
    const monthStr = String(month + 1).padStart(2, '0')
    const dayStr = String(day).padStart(2, '0')
    const dateStr = `${year}-${monthStr}-${dayStr}`
    setSelectedDate(dateStr)
    setSelectedDayReservations(getReservationsForDate(dateStr))
  }

  const renderMonthly = () => {
    const calendar = []
    let dayCount = 1
    for (let i = 0; i < 6; i++) {
      const week = []
      for (let j = 0; j < 7; j++) {
        if ((i === 0 && j < firstDayOfMonth) || dayCount > daysInMonth) {
          week.push(null)
        } else {
          week.push(dayCount++)
        }
      }
      calendar.push(week)
      if (dayCount > daysInMonth) break
    }

    return (
      <div>
        <div className="grid grid-cols-7 mb-2">
          {DAYS.map(d => (
            <div key={d} className="text-center py-2 text-xs font-semibold" style={{ color: '#6B7280' }}>{d}</div>
          ))}
        </div>
        {calendar.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7" style={{ gap: '4px', marginBottom: '4px' }}>
            {week.map((day, di) => {
              if (!day) return <div key={di} />
              const monthStr = String(month + 1).padStart(2, '0')
              const dayStr = String(day).padStart(2, '0')
              const dateStr = `${year}-${monthStr}-${dayStr}`
              const status = getRoomStatusForDate(dateStr)
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedDate

              let bgColor = '#FFFFFF'
              let borderColor = '#E5E7EB'
              if (status.occupied > 0) {
                if (status.occupied === status.total) { bgColor = '#FEE2E2'; borderColor = '#FECACA' }
                else { bgColor = '#FEF3C7'; borderColor = '#FDE68A' }
              }

              return (
                <div
                  key={di}
                  onClick={() => handleDayClick(day)}
                  className="p-2 rounded cursor-pointer transition-all hover:shadow-md min-h-[80px]"
                  style={{
                    background: bgColor,
                    border: `1.5px solid ${isSelected ? '#2563EB' : isToday ? '#D4AF37' : borderColor}`,
                  }}
                >
                  <p className="text-xs font-bold mb-1" style={{ color: isToday ? '#D4AF37' : '#1E293B' }}>{day}</p>
                  <div className="flex flex-col" style={{ gap: '2px' }}>
                    <span className="text-[10px] font-medium" style={{ color: '#16A34A' }}>{status.available} free</span>
                    <span className="text-[10px] font-medium" style={{ color: '#DC2626' }}>{status.occupied} booked</span>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    )
  }

  const renderWeekly = () => {
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
    const days = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek)
      d.setDate(startOfWeek.getDate() + i)
      days.push(d)
    }

    return (
      <div>
        <div className="grid grid-cols-7 mb-4" style={{ gap: '8px' }}>
          {days.map((d, i) => {
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
            const status = getRoomStatusForDate(dateStr)
            const isToday = dateStr === todayStr
            return (
              <div key={i} className="p-3 rounded text-center cursor-pointer transition-all hover:shadow-md" style={{ background: isToday ? '#EFF6FF' : '#FFFFFF', border: `1px solid ${isToday ? '#2563EB' : '#E5E7EB'}` }}>
                <p className="text-xs font-medium" style={{ color: '#6B7280' }}>{DAYS[i]}</p>
                <p className="text-lg font-bold" style={{ color: '#1E293B' }}>{d.getDate()}</p>
                <div className="mt-2 flex flex-col" style={{ gap: '2px' }}>
                  <span className="text-[10px]" style={{ color: '#16A34A' }}>{status.available} Available</span>
                  <span className="text-[10px]" style={{ color: '#DC2626' }}>{status.occupied} Occupied</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderDaily = () => {
    const dateStr = selectedDate || todayStr
    const reservationsForDay = getReservationsForDate(dateStr)
    const status = getRoomStatusForDate(dateStr)

    return (
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Total Rooms', value: status.total, color: '#1E293B' },
            { label: 'Available', value: status.available, color: '#16A34A' },
            { label: 'Occupied', value: status.occupied, color: '#DC2626' },
          ].map(s => (
            <div key={s.label} className="p-4 text-center" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {reservationsForDay.length === 0 ? (
          <div className="text-center py-12" style={{ color: '#94A3B8' }}>
            <p className="text-sm">No reservations for this date</p>
          </div>
        ) : (
          <div className="overflow-hidden" style={{ border: '1px solid #E5E7EB', borderRadius: '8px', background: '#FFFFFF' }}>
            <div className="overflow-x-auto">
              <table className="w-full data-table">
                <thead><tr>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>Room</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>Guest</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>Check-In</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>Check-Out</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>Status</th>
                </tr></thead>
                <tbody>
                  {reservationsForDay.map(r => (
                    <tr key={r._id}>
                      <td className="font-semibold" style={{ color: '#1E293B' }}>{r.roomName}</td>
                      <td>{r.name}</td>
                      <td>{r.checkin}</td>
                      <td>{r.checkout}</td>
                      <td><span className={`px-2.5 py-1 rounded text-xs font-semibold ${r.status === 'Approved' || r.status === 'Confirmed' ? 'text-green-700 bg-green-100' : r.status === 'Pending' ? 'text-amber-700 bg-amber-100' : 'text-blue-700 bg-blue-100'}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ padding: '120px 0', color: '#94A3B8' }}>
        <svg className="animate-spin" fill="none" viewBox="0 0 24 24" style={{ width: '28px', height: '28px', marginBottom: '12px' }}>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <p className="text-sm font-medium">Loading calendar...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ padding: '120px 0' }}>
        <p className="text-sm font-medium mb-3" style={{ color: '#DC2626' }}>{error}</p>
        <Button variant="primary" size="sm" icon={MdRefresh} onClick={fetchData}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="fade-in-up" style={{ marginBottom: '32px' }}>
      <div className="flex flex-wrap items-center justify-between" style={{ gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1E293B', fontFamily: "'Playfair Display', serif" }}>Room Availability Calendar</h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>{rooms.length} rooms &bull; {reservations.length} reservations</p>
        </div>
        <Button variant="outline" size="sm" icon={MdRefresh} onClick={fetchData}>Refresh</Button>
      </div>

      {/* View Toggle */}
      <div className="flex items-center" style={{ gap: '8px', marginBottom: '20px' }}>
        {VIEWS.map(v => {
          const Icon = v.icon
          return (
            <button key={v.key} onClick={() => setView(v.key)} className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium transition-all" style={{ background: view === v.key ? '#2563EB' : '#FFFFFF', color: view === v.key ? '#fff' : '#6B7280', border: `1px solid ${view === v.key ? '#2563EB' : '#E5E7EB'}` }}>
              <Icon size={16} /> {v.label}
            </button>
          )
        })}
      </div>

      {/* Header */}
      {view !== 'daily' && (
        <div className="flex items-center justify-between mb-6 p-4" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
          <button onClick={prevMonth} className="p-2 rounded hover:bg-gray-100 transition-all"><MdChevronLeft size={24} style={{ color: '#6B7280' }} /></button>
          <h2 className="text-lg font-bold" style={{ color: '#1E293B' }}>{MONTHS[month]} {year}</h2>
          <button onClick={nextMonth} className="p-2 rounded hover:bg-gray-100 transition-all"><MdChevronRight size={24} style={{ color: '#6B7280' }} /></button>
        </div>
      )}

      {/* Calendar Content */}
      {view === 'monthly' && renderMonthly()}
      {view === 'weekly' && renderWeekly()}
      {view === 'daily' && renderDaily()}
    </div>
  )
}

export default CalendarView
