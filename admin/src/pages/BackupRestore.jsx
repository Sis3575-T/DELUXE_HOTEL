import React, { useEffect, useState, useCallback, useMemo } from 'react'
import axios from 'axios'
import { backendUrl } from '../App'
import {
  MdBackup, MdRestore, MdDownload, MdDelete, MdRefresh,
  MdCloudUpload, MdCheckCircle, MdWarning
} from 'react-icons/md'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import notify from '../components/ui/Toast'

const BackupRestore = () => {
  const [backups, setBackups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)
  const [restoreTarget, setRestoreTarget] = useState(null)
  const [restoreLoading, setRestoreLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const fetchBackups = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const r = await axios.get(backendUrl + '/api/backup/list', { headers: getAuthHeaders() })
      setBackups(r.data?.backups || [])
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load backups')
      setBackups([])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchBackups() }, [fetchBackups])

  const createBackup = async () => {
    setCreating(true)
    try {
      const r = await axios.post(backendUrl + '/api/backup/create', {}, { headers: getAuthHeaders() })
      if (r.data?.success) {
        notify.success('Backup created successfully')
        await fetchBackups()
      } else notify.error(r.data?.message || 'Backup failed')
    } catch (err) { notify.error(err.response?.data?.message || err.message || 'Error creating backup') }
    finally { setCreating(false) }
  }

  const downloadBackup = async (backup) => {
    try {
      const r = await axios.get(backendUrl + `/api/backup/download/${backup._id}`, { headers: getAuthHeaders(), responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = backup.filename || `backup-${backup._id}.json`
      a.click()
      URL.revokeObjectURL(url)
      notify.success('Backup downloaded')
    } catch (err) { notify.error('Error downloading backup') }
  }

  const restoreBackup = async () => {
    if (!restoreTarget) return
    setRestoreLoading(true)
    try {
      const r = await axios.post(backendUrl + `/api/backup/restore/${restoreTarget._id}`, {}, { headers: getAuthHeaders() })
      if (r.data?.success) notify.success('Backup restored successfully!')
      else notify.error(r.data?.message || 'Restore failed')
      setRestoreTarget(null)
    } catch (err) { notify.error(err.response?.data?.message || err.message || 'Error restoring backup') }
    finally { setRestoreLoading(false) }
  }

  const deleteBackup = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const r = await axios.delete(backendUrl + `/api/backup/delete/${deleteTarget._id}`, { headers: getAuthHeaders() })
      if (r.data?.success) notify.success('Backup deleted')
      setDeleteTarget(null); await fetchBackups()
    } catch (err) { notify.error(err.response?.data?.message || err.message || 'Delete error'); setDeleteTarget(null) }
    finally { setDeleteLoading(false) }
  }

  const formatDate = (ts) => {
    if (!ts) return '-'
    const d = new Date(ts)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  return (
    <div className="fade-in-up" style={{ marginBottom: '32px' }}>
      <div className="flex flex-wrap items-start justify-between" style={{ gap: '16px', marginBottom: '32px' }}>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1E293B', fontFamily: "'Playfair Display', serif" }}>Backup & Restore</h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>Create, download, and restore database backups</p>
        </div>
        <Button variant="primary" size="sm" icon={MdCloudUpload} loading={creating} onClick={createBackup}>Create Backup</Button>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-3 p-4 mb-6 rounded" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
        <MdWarning size={20} style={{ color: '#D97706', flexShrink: 0, marginTop: '1px' }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: '#92400E' }}>Important</p>
          <p className="text-xs mt-0.5" style={{ color: '#A16207' }}>Restoring a backup will overwrite all current data in the selected collections. This action cannot be undone.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center" style={{ padding: '80px 0', color: '#94A3B8' }}>
          <svg className="animate-spin" fill="none" viewBox="0 0 24 24" style={{ width: '28px', height: '28px', marginBottom: '12px' }}>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <p className="text-sm font-medium">Loading backups...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center" style={{ padding: '80px 0' }}>
          <p className="text-sm font-medium mb-3" style={{ color: '#DC2626' }}>{error}</p>
          <Button variant="primary" size="sm" icon={MdRefresh} onClick={fetchBackups}>Retry</Button>
        </div>
      ) : backups.length === 0 ? (
        <div className="text-center" style={{ padding: '80px 0', color: '#94A3B8' }}>
          <MdBackup size={48} style={{ color: '#D1D5DB', margin: '0 auto 16px' }} />
          <p className="text-base font-medium">No backups yet</p>
          <p className="text-sm mt-1">Create your first backup to protect your data</p>
          <Button variant="primary" size="sm" icon={MdCloudUpload} onClick={createBackup} loading={creating} className="mt-4">Create Backup</Button>
        </div>
      ) : (
        <div className="overflow-hidden" style={{ border: '1px solid #E5E7EB', borderRadius: '8px', background: '#FFFFFF' }}>
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>Filename</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>Date</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>Size</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>Collections</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map(b => (
                  <tr key={b._id}>
                    <td><span className="font-mono text-xs font-semibold" style={{ color: '#2563EB' }}>{b.filename}</span></td>
                    <td className="text-sm" style={{ color: '#6B7280' }}>{formatDate(b.createdAt)}</td>
                    <td className="text-sm" style={{ color: '#6B7280' }}>{formatSize(b.size)}</td>
                    <td>
                      <div className="flex flex-wrap" style={{ gap: '4px' }}>
                        {(b.collections || []).map(c => (
                          <span key={c} className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ background: '#EFF6FF', color: '#2563EB' }}>{c}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center" style={{ gap: '8px' }}>
                        <button onClick={() => downloadBackup(b)} className="w-8 h-8 rounded flex items-center justify-center transition-all hover:opacity-80" style={{ background: '#F0FDF4', color: '#16A34A' }} title="Download"><MdDownload size={16} /></button>
                        <button onClick={() => setRestoreTarget(b)} className="w-8 h-8 rounded flex items-center justify-center transition-all hover:opacity-80" style={{ background: '#FEF3C7', color: '#D97706' }} title="Restore"><MdRestore size={16} /></button>
                        <button onClick={() => setDeleteTarget(b)} className="w-8 h-8 rounded flex items-center justify-center transition-all hover:opacity-80" style={{ background: '#FEF2F2', color: '#DC2626' }} title="Delete"><MdDelete size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!restoreTarget} onClose={() => setRestoreTarget(null)} onConfirm={restoreBackup} title="Restore Backup" message={`Restore backup "${restoreTarget?.filename}"? This will overwrite all current data in the selected collections and cannot be undone.`} confirmLabel="Restore" variant="danger" loading={restoreLoading} />
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={deleteBackup} title="Delete Backup" message={`Delete backup "${deleteTarget?.filename}"?`} confirmLabel="Delete" variant="danger" loading={deleteLoading} />
    </div>
  )
}

export default BackupRestore
