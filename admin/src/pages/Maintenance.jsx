import React, { useEffect, useState, useCallback, useMemo } from 'react'
import axios from 'axios'
import { backendUrl } from '../App'
import { MdBuild, MdAdd, MdEdit, MdDelete, MdCheck, MdSearch, MdRefresh, MdClose } from 'react-icons/md'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import notify from '../components/ui/Toast'

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']
const STATUSES = ['Pending', 'In Progress', 'Completed']

const statusBadge = (status) => {
  const map = {
    'Pending':     { bg: '#FEF3C7', color: '#D97706' },
    'In Progress': { bg: '#DBEAFE', color: '#2563EB' },
    'Completed':   { bg: '#DCFCE7', color: '#16A34A' },
  }
  const s = map[status] || { bg: '#F3F4F6', color: '#6B7280' }
  return (
    <span className="px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap" style={{ background: s.bg, color: s.color }}>{status}</span>
  )
}

const priorityBadge = (p) => {
  const map = {
    'Low':      { bg: '#F3F4F6', color: '#6B7280' },
    'Medium':   { bg: '#FEF3C7', color: '#D97706' },
    'High':     { bg: '#FEE2E2', color: '#DC2626' },
    'Critical': { bg: '#FECACA', color: '#991B1B' },
  }
  const s = map[p] || map.Medium
  return (
    <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: s.bg, color: s.color }}>{p}</span>
  )
}

const Maintenance = () => {
  const [requests, setRequests] = useState([])
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
  const [formIssue, setFormIssue] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formAssignedTo, setFormAssignedTo] = useState('')
  const [formPriority, setFormPriority] = useState('Medium')
  const [formStatus, setFormStatus] = useState('Pending')
  const [errors, setErrors] = useState({})

  const PAGE_SIZE = 8

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [mRes, rRes, sRes] = await Promise.all([
        axios.get(backendUrl + '/api/maintenance/list', { headers: getAuthHeaders() }),
        axios.get(backendUrl + '/api/hotel/list').catch(() => ({ data: { hotels: [] } })),
        axios.get(backendUrl + '/api/staff/list', { headers: getAuthHeaders() }).catch(() => ({ data: { staff: [] } })),
      ])
      setRequests(mRes.data?.requests || [])
      setRooms(rRes.data?.hotels || [])
      setStaff(sRes.data?.staff || [])
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load data'); setRequests([])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const pendingCount = requests.filter(r => r.status !== 'Completed').length
  const completedCount = requests.filter(r => r.status === 'Completed').length

  const filtered = useMemo(() => {
    let result = requests
    if (filterStatus) result = result.filter(r => r.status === filterStatus)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(r =>
        (r.issue || '').toLowerCase().includes(q) || (r.roomName || '').toLowerCase().includes(q) ||
        (r.assignedTo || '').toLowerCase().includes(q) || (r.priority || '').toLowerCase().includes(q)
      )
    }
    return result
  }, [requests, search, filterStatus])

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

  const openAdd = () => {
    setEditItem(null); setErrors({}); setFormRoomId(''); setFormRoomName(''); setFormIssue('')
    setFormDescription(''); setFormAssignedTo(''); setFormPriority('Medium'); setFormStatus('Pending'); setShowModal(true)
  }

  const openEdit = (item) => {
    setEditItem(item); setErrors({}); setFormRoomId(item.roomId || ''); setFormRoomName(item.roomName || '')
    setFormIssue(item.issue || ''); setFormDescription(item.description || '')
    setFormAssignedTo(item.assignedTo || ''); setFormPriority(item.priority || 'Medium'); setFormStatus(item.status || 'Pending'); setShowModal(true)
  }

  const validate = () => {
    const errs = {}
    if (!formIssue.trim()) errs.issue = 'Issue is required'
    setErrors(errs); return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSaveLoading(true)
    try {
      const body = { roomId: formRoomId, roomName: formRoomName, issue: formIssue.trim(), description: formDescription.trim(), assignedTo: formAssignedTo, priority: formPriority, status: formStatus }
      if (editItem) {
        const r = await axios.put(backendUrl + `/api/maintenance/update/${editItem._id}`, body, { headers: getAuthHeaders() })
        if (!r.data?.success) { notify.error(r.data?.message || 'Update failed'); return }
        notify.success('Request updated')
      } else {
        const r = await axios.post(backendUrl + '/api/maintenance/add', body, { headers: getAuthHeaders() })
        if (!r.data?.success) { notify.error(r.data?.message || 'Create failed'); return }
        notify.success('Maintenance request created')
      }
      setShowModal(false); await fetchData()
    } catch (err) { notify.error(err.response?.data?.message || err.message || 'Error saving') }
    finally { setSaveLoading(false) }
  }

  const deleteRequest = async () => {
    if (!deleteTarget) return; setDeleteLoading(true)
    try {
      const r = await axios.delete(backendUrl + `/api/maintenance/delete/${deleteTarget._id}`, { headers: getAuthHeaders() })
      if (r.data?.success) notify.success('Request deleted')
      setDeleteTarget(null); await fetchData()
    } catch (err) { notify.error(err.response?.data?.message || err.message || 'Delete error'); setDeleteTarget(null) }
    finally { setDeleteLoading(false) }
  }

  const columns = [
    { header: () => <div className="flex items-center gap-1 cursor-pointer select-none" onClick={() => handleSort('issue')}>Issue <SortIcon column="issue" /></div>, render: (r) => <span className="font-semibold" style={{ color: '#1E293B' }}>{r.issue}</span> },
    { header: () => <div className="flex items-center gap-1 cursor-pointer select-none" onClick={() => handleSort('roomName')}>Room <SortIcon column="roomName" /></div>, render: (r) => r.roomName || <span className="text-xs" style={{ color: '#D1D5DB' }}>—</span> },
    { header: () => <div className="flex items-center gap-1 cursor-pointer select-none" onClick={() => handleSort('assignedTo')}>Assigned To <SortIcon column="assignedTo" /></div>, render: (r) => r.assignedTo || <span className="text-xs" style={{ color: '#D1D5DB' }}>Unassigned</span> },
    { header: () => <div className="flex items-center gap-1 cursor-pointer select-none" onClick={() => handleSort('priority')}>Priority <SortIcon column="priority" /></div>, render: (r) => priorityBadge(r.priority) },
    { header: 'Status', render: (r) => statusBadge(r.status) },
    { header: 'Actions', render: (r) => (
      <div className="flex items-center" style={{ gap: '10px', whiteSpace: 'nowrap' }}>
        {r.status !== 'Completed' && (
          <button onClick={(e) => { e.stopPropagation(); axios.put(backendUrl + `/api/maintenance/update/${r._id}`, { status: 'Completed' }, { headers: getAuthHeaders() }).then(() => { notify.success('Marked completed'); fetchData() }).catch(() => notify.error('Error')) }} className="w-9 h-9 rounded flex items-center justify-center transition-all hover:opacity-80" style={{ background: '#F0FDF4', color: '#16A34A' }} title="Mark Completed"><MdCheck size={18} /></button>
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
          <h1 className="text-xl font-bold" style={{ color: '#1E293B', fontFamily: "'Playfair Display', serif" }}>Maintenance Management</h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>{pendingCount} pending, {completedCount} completed</p>
        </div>
        <Button variant="primary" size="sm" icon={MdAdd} onClick={openAdd}>New Request</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Pending', value: requests.filter(r => r.status === 'Pending').length, color: '#D97706' },
          { label: 'In Progress', value: requests.filter(r => r.status === 'In Progress').length, color: '#2563EB' },
          { label: 'Completed', value: completedCount, color: '#16A34A' },
        ].map(s => (
          <div key={s.label} className="p-4" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center" style={{ gap: '12px', marginBottom: '16px' }}>
        <div className="relative" style={{ maxWidth: '360px', flex: '1 1 200px' }}>
          <MdSearch size={18} className="absolute" style={{ left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', zIndex: 1 }} />
          <input type="text" placeholder="Search requests..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="input-field" style={{ paddingLeft: '44px', height: '42px', width: '100%' }} />
        </div>
        <select className="input-field" style={{ width: 'auto', minWidth: '160px' }} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="overflow-hidden" style={{ border: '1px solid #E5E7EB', borderRadius: '8px', background: '#FFFFFF' }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center" style={{ padding: '80px 0', color: '#94A3B8' }}>
            <svg className="animate-spin" fill="none" viewBox="0 0 24 24" style={{ width: '28px', height: '28px', marginBottom: '12px' }}>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <p className="text-sm font-medium">Loading maintenance requests...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center" style={{ padding: '80px 0' }}>
            <p className="text-sm font-medium mb-3" style={{ color: '#DC2626' }}>{error}</p>
            <Button variant="primary" size="sm" icon={MdRefresh} onClick={fetchData}>Retry</Button>
          </div>
        ) : paginated.length === 0 ? (
          <div className="text-center" style={{ padding: '80px 0', color: '#94A3B8' }}>
            <MdBuild size={40} style={{ color: '#D1D5DB', margin: '0 auto 12px' }} />
            <p className="text-base font-medium">No requests found</p>
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

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Edit Request' : 'New Maintenance Request'} width="max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: '16px' }}>
          <div>
            <label className="block text-xs font-semibold" style={{ color: '#6B7280', marginBottom: '6px' }}>Issue <span style={{ color: '#DC2626' }}>*</span></label>
            <input className={`input-field ${errors.issue ? 'error' : ''}`} value={formIssue} onChange={e => setFormIssue(e.target.value)} placeholder="Describe the issue briefly" />
            {errors.issue && <p className="text-xs mt-1" style={{ color: '#DC2626' }}>{errors.issue}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '16px' }}>
            <div>
              <label className="block text-xs font-semibold" style={{ color: '#6B7280', marginBottom: '6px' }}>Room</label>
              <select className="input-field" value={formRoomId} onChange={e => { const room = rooms.find(r => r._id === e.target.value); setFormRoomId(e.target.value); setFormRoomName(room?.name || '') }}>
                <option value="">Select Room</option>
                {rooms.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold" style={{ color: '#6B7280', marginBottom: '6px' }}>Priority</label>
              <select className="input-field" value={formPriority} onChange={e => setFormPriority(e.target.value)}>{PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}</select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '16px' }}>
            <div>
              <label className="block text-xs font-semibold" style={{ color: '#6B7280', marginBottom: '6px' }}>Assign Technician</label>
              <select className="input-field" value={formAssignedTo} onChange={e => setFormAssignedTo(e.target.value)}>
                <option value="">Unassigned</option>
                {staff.filter(s => s.role === 'Maintenance' || s.role === 'Hotel Manager').map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold" style={{ color: '#6B7280', marginBottom: '6px' }}>Status</label>
              <select className="input-field" value={formStatus} onChange={e => setFormStatus(e.target.value)}>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold" style={{ color: '#6B7280', marginBottom: '6px' }}>Description</label>
            <textarea className="input-field" value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Detailed description..." rows={2} />
          </div>
          <div className="flex" style={{ gap: '10px', paddingTop: '8px' }}>
            <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" variant="success" icon={MdCheck} loading={saveLoading} className="flex-1">{editItem ? 'Update Request' : 'Create Request'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={deleteRequest} title="Delete Request" message="Delete this maintenance request?" confirmLabel="Delete" variant="danger" loading={deleteLoading} />
    </div>
  )
}

export default Maintenance
