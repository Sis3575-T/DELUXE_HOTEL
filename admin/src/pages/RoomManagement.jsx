import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { backendUrl } from '../App'
import { MdAdd, MdEdit, MdDelete, MdCloudUpload, MdSearch, MdCheck } from 'react-icons/md'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import notify from '../components/ui/Toast'

const ROOM_TYPES = ['Standard', 'Deluxe', 'Suite', 'Presidential', 'Family', 'Twin', 'Single']
const PAGE_SIZE = 6

const RoomManagement = ({ token }) => {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editRoom, setEditRoom] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saveLoading, setSaveLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [roomType, setRoomType] = useState('Standard')
  const [capacity, setCapacity] = useState(2)
  const [available, setAvailable] = useState(true)
  const [image, setImage] = useState(null)
  const [images, setImages] = useState([])
  const [errors, setErrors] = useState({})

  const getAuthHeaders = () => {
    const t = localStorage.getItem('adminToken')
    return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'multipart/form-data' } : { 'Content-Type': 'multipart/form-data' }
  }

  const fetchRooms = async () => {
    setLoading(true)
    try {
      const r = await axios.get(backendUrl + '/api/hotel/list')
      setRooms(r.data?.hotels || [])
    } catch {
      setRooms([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRooms() }, [])

  const openAdd = () => {
    setEditRoom(null)
    setName('')
    setDescription('')
    setPrice('')
    setRoomType('Standard')
    setCapacity(2)
    setAvailable(true)
    setImage(null)
    setImages([])
    setErrors({})
    setShowModal(true)
  }

  const openEdit = (room) => {
    setEditRoom(room)
    setName(room.name || '')
    setDescription(room.description || '')
    setPrice(room.price || '')
    setRoomType(room.roomType || 'Standard')
    setCapacity(room.capacity || 2)
    setAvailable(room.available !== false)
    setImage(null)
    setImages([])
    setErrors({})
    setShowModal(true)
  }

  const validate = () => {
    const errs = {}
    if (!name.trim()) errs.name = 'Room name is required'
    if (!price || Number(price) <= 0) errs.price = 'Valid price is required'
    if (!description.trim()) errs.description = 'Description is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSaveLoading(true)
    try {
      const fd = new FormData()
      const allImages = image ? [image, ...images] : images
      if (allImages.length > 0) {
        allImages.forEach((file) => fd.append('images', file))
      } else if (!editRoom) {
        notify.error('At least one room image is required')
        setSaveLoading(false)
        return
      }
      fd.append('name', name)
      fd.append('description', description)
      fd.append('price', price)
      fd.append('roomType', roomType)
      fd.append('capacity', String(capacity))
      fd.append('available', String(available))
      if (editRoom) fd.append('id', editRoom._id)

      const url = editRoom ? backendUrl + '/api/hotel/edit' : backendUrl + '/api/hotel/add'
      const res = await axios.post(url, fd, {
        headers: getAuthHeaders(),
      })
      if (res.data?.success) {
        notify.success(editRoom ? 'Room updated successfully' : 'Room added successfully')
        setShowModal(false)
        await fetchRooms()
      } else {
        notify.error(res.data?.message || 'Error saving room')
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error saving room'
      notify.error(msg)
    } finally {
      setSaveLoading(false)
    }
  }

  const deleteRoom = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const res = await axios.post(backendUrl + '/api/hotel/remove', { id: deleteTarget._id }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.data?.success) {
        notify.success('Room deleted successfully')
      } else {
        notify.error(res.data?.message || 'Failed to delete room')
      }
      setDeleteTarget(null)
      await fetchRooms()
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Delete error'
      notify.error(msg)
      setDeleteTarget(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  const filtered = rooms.filter(r =>
    !search ||
    (r.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.roomType || '').toLowerCase().includes(search.toLowerCase())
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="fade-in-up" style={{ marginBottom: '32px' }}>
      <div className="flex flex-wrap items-center justify-between" style={{ gap: '16px', marginBottom: '32px' }}>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1E293B', fontFamily: "'Playfair Display', serif" }}>Room Management</h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>{rooms.length} rooms total</p>
        </div>
        <Button variant="gold" icon={MdAdd} onClick={openAdd}>Add New Room</Button>
      </div>

      {/* Search bar */}
      <div className="relative" style={{ maxWidth: '320px', marginBottom: '32px' }}>
        <MdSearch size={16} className="absolute" style={{ left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', zIndex: 1 }} />
        <input
          type="text"
          placeholder="Search by name or room type..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="input-field"
          style={{ paddingLeft: '44px', height: '40px' }}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center" style={{ padding: '80px 0', color: '#94A3B8' }}>
          <svg className="animate-spin" fill="none" viewBox="0 0 24 24" style={{ width: '24px', height: '24px', marginRight: '8px' }}>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Loading rooms...
        </div>
      ) : paginated.length === 0 ? (
        <div className="text-center" style={{ padding: '80px 0', color: '#94A3B8' }}>
          <p className="text-base font-medium">No rooms found</p>
          <p className="text-sm mt-1">Add your first room to get started</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3" style={{ gap: '24px' }}>
            {paginated.map(room => (
              <div
                key={room._id}
                className="overflow-hidden card-hover"
                style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
              >
                <div className="relative" style={{ height: '180px', background: '#F8FAFC', overflow: 'hidden' }}>
                  {room.image ? (
                    <img src={room.image} alt={room.name} className="w-full h-full" style={{ objectFit: 'cover' }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: '#1E293B' }}>
                      <span style={{ fontSize: '2rem' }}>{'\uD83C\uDFE8'}</span>
                    </div>
                  )}
                  <div className="absolute" style={{ top: '12px', right: '12px' }}>
                    <span
                      className="px-2.5 py-1 rounded text-xs font-semibold"
                      style={{
                        background: room.available !== false ? '#DCFCE7' : '#FEE2E2',
                        color: room.available !== false ? '#16A34A' : '#DC2626',
                      }}
                    >
                      {room.available !== false ? 'Available' : 'Occupied'}
                    </span>
                  </div>
                  <div className="absolute" style={{ top: '12px', left: '12px' }}>
                    <span
                      className="px-2.5 py-1 rounded text-xs font-semibold"
                      style={{ background: '#1E293B', color: '#FFFFFF' }}
                    >
                      {room.roomType || 'Standard'}
                    </span>
                  </div>
                </div>
                <div style={{ padding: '24px' }}>
                  <div className="flex items-start justify-between" style={{ marginBottom: '12px' }}>
                    <div>
                      <h3 className="font-semibold" style={{ color: '#1E293B' }}>{room.name}</h3>
                      <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Capacity: {room.capacity || 2} guests</p>
                    </div>
                    <p className="font-bold text-lg" style={{ color: '#D4AF37' }}>
                      ETB {room.price}
                      <span className="text-xs font-normal" style={{ color: '#94A3B8' }}>/night</span>
                    </p>
                  </div>
                  {room.images?.length > 1 && (
                    <div className="flex gap-1 mb-3">
                      {room.images.slice(0, 4).map((img, i) => (
                        <div key={i} className="w-10 h-10 rounded overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {room.images.length > 4 && (
                        <div className="w-10 h-10 rounded flex items-center justify-center text-xs font-bold" style={{ background: '#1E293B', color: '#D4AF37' }}>
                          +{room.images.length - 4}
                        </div>
                      )}
                    </div>
                  )}
                  {room.description && (
                    <p className="text-xs" style={{ color: '#6B7280', marginBottom: '16px' }}>{room.description}</p>
                  )}
                  <div className="flex" style={{ gap: '10px' }}>
                    <Button variant="primary" size="sm" icon={MdEdit} onClick={() => openEdit(room)} className="flex-1">Edit</Button>
                    <Button variant="danger" size="sm" icon={MdDelete} onClick={() => setDeleteTarget(room)} className="flex-1">Delete</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center" style={{ gap: '8px', marginTop: '32px' }}>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
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
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editRoom ? 'Edit Room' : 'Add New Room'} width="max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: '16px' }}>
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#6B7280' }}>Room Images</label>
            <label
              className="flex flex-col items-center justify-center cursor-pointer transition-all rounded-lg mb-3"
              style={{ height: '120px', border: '2px dashed var(--border)', background: 'var(--bg-subtle)' }}
            >
              {image ? (
                <img src={URL.createObjectURL(image)} alt="preview" className="h-full w-full object-cover rounded-lg" />
              ) : editRoom?.image ? (
                <img src={editRoom.image} alt="current" className="h-full w-full object-cover rounded-lg" />
              ) : (
                <div className="text-center">
                  <MdCloudUpload size={28} style={{ color: '#D4AF37' }} className="mx-auto" />
                  <p className="text-xs mt-2 font-medium" style={{ color: 'var(--text-muted)' }}>Primary image (required)</p>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={e => setImage(e.target.files?.[0] ?? null)} />
            </label>
            <label
              className="flex flex-col items-center justify-center cursor-pointer transition-all rounded-lg p-4"
              style={{ border: '2px dashed var(--border)', background: 'var(--bg-subtle)' }}
            >
              <MdCloudUpload size={22} style={{ color: 'var(--text-muted)' }} />
              <p className="text-xs mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>Add additional images (optional)</p>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => setImages(Array.from(e.target.files || []))}
              />
            </label>
            {(images.length > 0 || editRoom?.images?.length > 0) && (
              <div className="flex flex-wrap gap-2 mt-3">
                {images.map((file, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
                {!images.length && editRoom?.images?.map((url, i) => (
                  <div key={i} className="w-16 h-16 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold" style={{ color: '#6B7280', marginBottom: '6px' }}>
              Room Name <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              className={`input-field ${errors.name ? 'error' : ''}`}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Deluxe King Suite 201"
              required
            />
            {errors.name && <p className="text-xs mt-1" style={{ color: '#DC2626' }}>{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold" style={{ color: '#6B7280', marginBottom: '6px' }}>
              Description <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <textarea
              className={`input-field ${errors.description ? 'error' : ''}`}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the room features..."
              rows={3}
            />
            {errors.description && <p className="text-xs mt-1" style={{ color: '#DC2626' }}>{errors.description}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '16px' }}>
            <div>
              <label className="block text-xs font-semibold" style={{ color: '#6B7280', marginBottom: '6px' }}>
                Price/Night (ETB) <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="number"
                className={`input-field ${errors.price ? 'error' : ''}`}
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="199"
                required
                min="0"
              />
              {errors.price && <p className="text-xs mt-1" style={{ color: '#DC2626' }}>{errors.price}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold" style={{ color: '#6B7280', marginBottom: '6px' }}>Capacity</label>
              <input type="number" className="input-field" value={capacity} onChange={e => setCapacity(e.target.value)} min="1" max="10" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '16px' }}>
            <div>
              <label className="block text-xs font-semibold" style={{ color: '#6B7280', marginBottom: '6px' }}>Room Type</label>
              <select className="input-field" value={roomType} onChange={e => setRoomType(e.target.value)}>
                {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold" style={{ color: '#6B7280', marginBottom: '6px' }}>Availability</label>
              <select className="input-field" value={available} onChange={e => setAvailable(e.target.value === 'true')}>
                <option value="true">Available</option>
                <option value="false">Occupied</option>
              </select>
            </div>
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
              {editRoom ? 'Update Room' : 'Add Room'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteRoom}
        title="Delete Room"
        message={`Delete ${deleteTarget?.name}? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  )
}

export default RoomManagement
