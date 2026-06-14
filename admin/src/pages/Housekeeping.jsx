import React, { useEffect, useState, useCallback, useMemo } from 'react'
import axios from 'axios'
import { backendUrl } from '../App'
import {
  MdCleaningServices, MdAdd, MdEdit, MdDelete, MdCheck,
  MdSearch, MdRefresh, MdClose, MdVisibility
} from 'react-icons/md'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import notify from '../components/ui/Toast'

const STATUSES = ['Clean', 'Dirty', 'Cleaning In Progress', 'Out Of Service']

const statusBadge = (status) => {
  const map = {
    'Clean':                { bg: '#DCFCE7', color: '#16A34A' },
    'Dirty':                { bg: '#FEE2E2', color: '#DC2626' },
    'Cleaning In Progress': { bg: '#FEF3C7', color: '#D97706' },
    'Out Of Service':       { bg: '#F3F4F6', color: '#6B7280' },
  }
  const s = map[status] || { bg: '#F3F4F6', color: '#6B7280' }
  return (
    <span className="px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap" style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  )
}

const Housekeeping = () => {
  const [tasks, setTasks] = useState([])
  const [rooms, setRooms] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [filterStatus, setFilterStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [viewItem, setViewItem] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saveLoading, setSaveLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [formRoomId, setFormRoomId] = useState('')
  const [formRoomName, setFormRoomName] = useState('')
  const [formAssignedTo, setFormAssignedTo] = useState('')
  const [formStatus, setFormStatus] = useState('Dirty')
  const [formNotes, setFormNotes] = useState('')
  const [errors, setErrors] = useState({})

  const PAGE_SIZE = 8

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [tRes, rRes, sRes] = await Promise.all([
        axios.get(backendUrl + '/api/housekeeping/list', { headers: getAuthHeaders() }),
        axios.get(backendUrl + '/api/hotel/list').catch(() => ({ data: { hotels: [] } })),
        axios.get(backendUrl + '/api/staff/list', { headers: getAuthHeaders() }).catch(() => ({ data: { staff: [] } })),
      ])
      setTasks(tRes.data?.tasks || [])
      setRooms(rRes.data?.hotels || [])
      setStaff(sRes.data?.staff || [])
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load data')
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = useMemo(() => {
    let result = tasks
    if (filterStatus) result = result.filter(t => t.status === filterStatus)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(t =>
        (t.roomName || '').toLowerCase().includes(q) ||
        (t.assignedTo || '').toLowerCase().includes(q) ||
        (t.status || '').toLowerCase().includes(q)
      )
    }
    return result
  }, [tasks, search, filterStatus])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey] ?? ''; const bVal = b[sortKey] ?? ''
      return sortDir === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal))
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  const SortIcon = ({ column }) => {
    if (sortKey !== column) return <span className="ml-1" style={{ color: '#94A3B8', opacity: 0.4 }}>&#8597;</span>
    return <span className="ml-1" style={{ color: '#2563EB' }}>{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>
  }

  const pendingTasks = tasks.filter(t => t.status !== 'Clean').length
  const cleanTasks = tasks.filter(t => t.status === 'Clean').length

  const openAdd = () => {
    setEditItem(null); setErrors({}); setFormRoomId(''); setFormRoomName(''); setFormAssignedTo(''); setFormStatus('Dirty'); setFormNotes(''); setShowModal(true)
  }

  const openEdit = (item) => {
    setEditItem(item); setErrors({}); setFormRoomId(item.roomId || ''); setFormRoomName(item.roomName || '')
    setFormAssignedTo(item.assignedTo || ''); setFormStatus(item.status || 'Dirty'); setFormNotes(item.notes || ''); setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaveLoading(true)
    try {
      const body = { roomId: formRoomId, roomName: formRoomName, assignedTo: formAssignedTo, status: formStatus, notes: formNotes }
      if (editItem) {
        const r = await axios.put(backendUrl + `/api/housekeeping/update/${editItem._id}`, body, { headers: getAuthHeaders() })
        if (!r.data?.success) { notify.error(r.data?.message || 'Update failed'); return }
        notify.success('Task updated')
      } else {
        const r = await axios.post(backendUrl + '/api/housekeeping/add', body, { headers: getAuthHeaders() })
        if (!r.data?.success) { notify.error(r.data?.message || 'Create failed'); return }
        notify.success('Cleaning task created')
      }
      setShowModal(false)
      await fetchData()
    } catch (err) {
      notify.error(err.response?.data?.message || err.message || 'Error saving task')
    } finally {
      setSaveLoading(false)
    }
  }

  const deleteTask = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const r = await axios.delete(backendUrl + `/api/housekeeping/delete/${deleteTarget._id}`, { headers: getAuthHeaders() })
      if (r.data?.success) notify.success('Task deleted')
      setDeleteTarget(null); await fetchData()
    } catch (err) {
      notify.error(err.response?.data?.message || err.message || 'Delete error')
      setDeleteTarget(null)
    } finally { setDeleteLoading(false) }
  }

  const markClean = async (task) => {
    try {
      const r = await axios.put(backendUrl + `/api/housekeeping/update/${task._id}`, { status: 'Clean' }, { headers: getAuthHeaders() })
      if (r.data?.success) { notify.success('Marked as clean'); await fetchData() }
    } catch (err) { notify.error('Error updating task') }
  }

  const columns = [
    { header: () => <div className="flex items-center gap-1 cursor-pointer select-none" onClick={() => handleSort('roomName')}>Room <SortIcon column="roomName" /></div>, render: (r) => <span className="font-semibold" style={{ color: '#1E293B' }}>{r.roomName || '—'}</span> },
    { header: () => <div className="flex items-center gap-1 cursor-pointer select-none" onClick={() => handleSort('assignedTo')}>Assigned To <SortIcon column="assignedTo" /></div>, render: (r) => r.assignedTo || <span className="text-xs" style={{ color: '#D1D5DB' }}>Unassigned</span> },
    { header: 'Status', render: (r) => statusBadge(r.status) },
    { header: 'Notes', render: (r) => r.notes || <span className="text-xs" style={{ color: '#D1D5DB' }}>—</span> },
    { header: 'Actions', render: (r) => (
      <div className="flex items-center" style={{ gap: '10px', whiteSpace: 'nowrap' }}>
        {r.status !== 'Clean' && (
          <button onClick={(e) => { e.stopPropagation(); markClean(r) }} className="w-9 h-9 rounded flex items-center justify-center transition-all hover:opacity-80" style={{ background: '#F0FDF4', color: '#16A34A' }} title="Mark Clean"><MdCheck size={18} /></button>
        )}
        <button onClick={(e) => { e.stopPropagation(); openEdit(r) }} className="w-9 h-9 rounded flex items-center justify-center transition-all hover:opacity-80" style={{ background: '#EFF6FF', color: '#2563EB' }} title="Edit"><MdEdit size={18} /></button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(r) }} className="w-9 h-9 rounded flex items-center justify-center transition-all hover:opacity-80" style={{ background: '#FEF2F2', color: '#DC2626' }} title="Delete"><MdDelete size={18} /></button>
      </div>
    )},
  ]

  return (
    <div className="fade-in-up" style={{ marginBottom: '32px' }}>
      <div className="flex flex-wrap items-start justify-between" style={{ gap: '16px', marginBottom: '32px' }}>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1E293B', fontFamily: "'Playfair Display', serif" }}>Housekeeping Management</h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>{pendingTasks} pending, {cleanTasks} clean</p>
        </div>
        <Button variant="primary" size="sm" icon={MdAdd} onClick={openAdd}>Create Task</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4" style={{ gap: '16px', marginBottom: '24px' }}>
        {[{ label: 'Pending Tasks', value: pendingTasks, color: '#D97706', bg: '#FEF3C7' },
          { label: 'Clean Rooms', value: cleanTasks, color: '#16A34A', bg: '#DCFCE7' },
          { label: 'In Progress', value: tasks.filter(t => t.status === 'Cleaning In Progress').length, color: '#2563EB', bg: '#DBEAFE' },
          { label: 'Out of Service', value: tasks.filter(t => t.status === 'Out Of Service').length, color: '#6B7280', bg: '#F3F4F6' },
        ].map(s => (
          <div key={s.label} className="p-4" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter + Search */}
      <div className="flex flex-wrap items-center" style={{ gap: '12px', marginBottom: '16px' }}>
        <div className="relative" style={{ maxWidth: '360px', flex: '1 1 200px' }}>
          <MdSearch size={18} className="absolute" style={{ left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', zIndex: 1 }} />
          <input type="text" placeholder="Search tasks..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="input-field" style={{ paddingLeft: '44px', height: '42px', width: '100%' }} />
        </div>
        <select className="input-field" style={{ width: 'auto', minWidth: '160px' }} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden" style={{ border: '1px solid #E5E7EB', borderRadius: '8px', background: '#FFFFFF' }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center" style={{ padding: '80px 0', color: '#94A3B8' }}>
            <svg className="animate-spin" fill="none" viewBox="0 0 24 24" style={{ width: '28px', height: '28px', marginBottom: '12px' }}>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <p className="text-sm font-medium">Loading tasks...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center" style={{ padding: '80px 0' }}>
            <p className="text-sm font-medium mb-3" style={{ color: '#DC2626' }}>{error}</p>
            <Button variant="primary" size="sm" icon={MdRefresh} onClick={fetchData}>Retry</Button>
          </div>
        ) : paginated.length === 0 ? (
          <div className="text-center" style={{ padding: '80px 0', color: '#94A3B8' }}>
            <MdCleaningServices size={40} style={{ color: '#D1D5DB', margin: '0 auto 12px' }} />
            <p className="text-base font-medium">No tasks found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full data-table">
                <thead><tr>{columns.map((col, i) => (<th key={i} style={{ position: 'sticky', top: 0, zIndex: 10 }}>{typeof col.header === 'function' ? col.header() : col.header}</th>))}</tr></thead>
                <tbody>{paginated.map(row => (<tr key={row._id}>{columns.map((col, j) => (<td key={j}>{col.render ? col.render(row) : row[col.accessor] ?? '-'}</td>))}</tr>))}</tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t" style={{ borderColor: '#E5E7EB' }}>
                <p className="text-xs" style={{ color: '#94A3B8' }}>{sorted.length} results</p>
                <div className="flex items-center" style={{ gap: '6px' }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 rounded flex items-center justify-center disabled:opacity-40 transition-all text-sm" style={{ border: '1px solid #E5E7EB', color: '#6B7280' }}>&lsaquo;</button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button key={i + 1} onClick={() => setPage(i + 1)} className="w-8 h-8 rounded text-xs font-medium transition-all" style={{ background: page === i + 1 ? '#2563EB' : '#FFFFFF', color: page === i + 1 ? '#fff' : '#6B7280', border: `1px solid ${page === i + 1 ? '#2563EB' : '#E5E7EB'}` }}>{i + 1}</button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-8 h-8 rounded flex items-center justify-center disabled:opacity-40 transition-all text-sm" style={{ border: '1px solid #E5E7EB', color: '#6B7280' }}>&rsaquo;</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Edit Task' : 'Create Cleaning Task'} width="max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: '16px' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '16px' }}>
            <div>
              <label className="block text-xs font-semibold" style={{ color: '#6B7280', marginBottom: '6px' }}>Room</label>
              <select className="input-field" value={formRoomId} onChange={e => { const room = rooms.find(r => r._id === e.target.value); setFormRoomId(e.target.value); setFormRoomName(room?.name || '') }}>
                <option value="">Select Room</option>
                {rooms.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold" style={{ color: '#6B7280', marginBottom: '6px' }}>Assign To</label>
              <select className="input-field" value={formAssignedTo} onChange={e => setFormAssignedTo(e.target.value)}>
                <option value="">Unassigned</option>
                {staff.filter(s => s.role === 'Housekeeping' || s.role === 'Hotel Manager').map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '16px' }}>
            <div>
              <label className="block text-xs font-semibold" style={{ color: '#6B7280', marginBottom: '6px' }}>Status</label>
              <select className="input-field" value={formStatus} onChange={e => setFormStatus(e.target.value)}>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold" style={{ color: '#6B7280', marginBottom: '6px' }}>Notes</label>
            <textarea className="input-field" value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Additional notes..." rows={2} />
          </div>
          <div className="flex" style={{ gap: '10px', paddingTop: '8px' }}>
            <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" variant="success" icon={MdCheck} loading={saveLoading} className="flex-1">{editItem ? 'Update Task' : 'Create Task'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={deleteTask} title="Delete Task" message={`Delete cleaning task?`} confirmLabel="Delete" variant="danger" loading={deleteLoading} />
    </div>
  )
}

export default Housekeeping
