import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { backendUrl } from '../App'
import {
  MdCloudUpload, MdCloudDownload, MdRefresh,
  MdCheckCircle, MdWarning, MdError, MdStorage,
  MdCloud, MdSync
} from 'react-icons/md'
import Button from '../components/ui/Button'
import notify from '../components/ui/Toast'

const SyncDatabase = () => {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pushing, setPushing] = useState(false)
  const [pulling, setPulling] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    try {
      const r = await axios.get(backendUrl + '/api/sync/status', { headers: getAuthHeaders() })
      setStatus(r.data)
    } catch (err) {
      notify.error(err.response?.data?.message || err.message || 'Failed to check sync status')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  const doPush = async () => {
    setPushing(true); setConfirmAction(null)
    try {
      const r = await axios.post(backendUrl + '/api/sync/push', {}, { headers: getAuthHeaders() })
      if (r.data?.success) {
        notify.success('Data pushed to Atlas successfully!')
        await fetchStatus()
      } else notify.error(r.data?.message || 'Push failed')
    } catch (err) { notify.error(err.response?.data?.message || err.message || 'Error pushing to Atlas') }
    finally { setPushing(false) }
  }

  const doPull = async () => {
    setPulling(true); setConfirmAction(null)
    try {
      const r = await axios.post(backendUrl + '/api/sync/pull', {}, { headers: getAuthHeaders() })
      if (r.data?.success) {
        notify.success('Data pulled from Atlas successfully!')
        await fetchStatus()
      } else notify.error(r.data?.message || 'Pull failed')
    } catch (err) { notify.error(err.response?.data?.message || err.message || 'Error pulling from Atlas') }
    finally { setPulling(false) }
  }

  const renderCounts = (counts, label) => {
    if (!counts) return <p className="text-sm" style={{ color: '#9CA3AF' }}>Not available</p>
    if (counts.error) return <p className="text-sm" style={{ color: '#DC2626' }}>Error: {counts.error}</p>
    const entries = Object.entries(counts)
    if (entries.length === 0) return <p className="text-sm" style={{ color: '#9CA3AF' }}>No collections found</p>
    return (
      <div className="flex flex-wrap" style={{ gap: '6px' }}>
        {entries.map(([col, count]) => (
          <span key={col} className="px-2.5 py-1 rounded text-xs font-medium" style={{ background: '#F3F4F6', color: '#374151' }}>
            {col}: <strong>{count}</strong>
          </span>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ padding: '100px 0', color: '#94A3B8' }}>
        <svg className="animate-spin" fill="none" viewBox="0 0 24 24" style={{ width: '28px', height: '28px', marginBottom: '12px' }}>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <p className="text-sm font-medium">Checking sync status...</p>
      </div>
    )
  }

  const atlasConfigured = status?.atlas?.uri && !status?.atlas?.uri.includes('not set')
  const atlasError = status?.atlas?.counts?.error

  return (
    <div className="fade-in-up" style={{ marginBottom: '32px' }}>
      <div className="flex flex-wrap items-start justify-between" style={{ gap: '16px', marginBottom: '32px' }}>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1E293B', fontFamily: "'Playfair Display', serif" }}>Database Sync</h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>Synchronize data between local database and MongoDB Atlas</p>
        </div>
        <Button variant="secondary" size="sm" icon={MdRefresh} onClick={fetchStatus}>Refresh Status</Button>
      </div>

      {!atlasConfigured && (
        <div className="flex items-start gap-3 p-4 mb-6 rounded" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
          <MdWarning size={20} style={{ color: '#D97706', flexShrink: 0, marginTop: '1px' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: '#92400E' }}>Atlas Not Configured</p>
            <p className="text-xs mt-0.5" style={{ color: '#A16207' }}>
              Add <code className="px-1 py-0.5 rounded" style={{ background: '#FFFBEB', fontSize: '11px' }}>ATLAS_MONGODB_URI</code> to your backend/.env file to enable syncing between your local database and MongoDB Atlas.
            </p>
          </div>
        </div>
      )}

      {atlasError && (
        <div className="flex items-start gap-3 p-4 mb-6 rounded" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <MdError size={20} style={{ color: '#DC2626', flexShrink: 0, marginTop: '1px' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: '#991B1B' }}>Atlas Connection Error</p>
            <p className="text-xs mt-0.5" style={{ color: '#B91C1C' }}>{atlasError}</p>
          </div>
        </div>
      )}

      {/* Database Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '24px', marginBottom: '32px' }}>
        {/* Local DB */}
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #E5E7EB', background: '#FFFFFF' }}>
          <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
            <MdStorage size={20} style={{ color: '#2563EB' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: '#1E293B' }}>Local Database</p>
              <p className="text-xs mt-0.5 font-mono" style={{ color: '#6B7280' }}>{status?.local?.uri || 'Unknown'}</p>
            </div>
          </div>
          <div className="p-5">
            {renderCounts(status?.local?.counts, 'Local')}
          </div>
        </div>

        {/* Atlas DB */}
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #E5E7EB', background: '#FFFFFF' }}>
          <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
            <MdCloud size={20} style={{ color: atlasConfigured ? '#059669' : '#9CA3AF' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: '#1E293B' }}>MongoDB Atlas</p>
              <p className="text-xs mt-0.5 font-mono" style={{ color: '#6B7280' }}>{status?.atlas?.uri || 'Not configured'}</p>
            </div>
          </div>
          <div className="p-5">
            {renderCounts(status?.atlas?.counts, 'Atlas')}
          </div>
        </div>
      </div>

      {/* Sync Actions */}
      {atlasConfigured && !atlasError && (
        <div className="rounded-lg p-6" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
          <h2 className="text-base font-bold mb-1" style={{ color: '#1E293B' }}>Sync Actions</h2>
          <p className="text-xs mb-5" style={{ color: '#6B7280' }}>Choose direction to sync your data. This will overwrite the target database with the source data.</p>

          <div className="flex flex-wrap" style={{ gap: '16px' }}>
            <div className="flex-1 min-w-[200px] p-4 rounded-lg" style={{ border: '1px solid #E5E7EB', background: '#F9FAFB' }}>
              <MdCloudUpload size={24} style={{ color: '#2563EB', marginBottom: '8px' }} />
              <p className="text-sm font-semibold mb-1" style={{ color: '#1E293B' }}>Push to Atlas</p>
              <p className="text-xs mb-4" style={{ color: '#6B7280' }}>Copy local data to MongoDB Atlas (overwrites Atlas data)</p>
              <Button variant="primary" size="sm" icon={MdCloudUpload} loading={pushing} onClick={() => setConfirmAction('push')} disabled={!atlasConfigured}>
                Push to Atlas
              </Button>
            </div>

            <div className="flex-1 min-w-[200px] p-4 rounded-lg" style={{ border: '1px solid #E5E7EB', background: '#F9FAFB' }}>
              <MdCloudDownload size={24} style={{ color: '#D97706', marginBottom: '8px' }} />
              <p className="text-sm font-semibold mb-1" style={{ color: '#1E293B' }}>Pull from Atlas</p>
              <p className="text-xs mb-4" style={{ color: '#6B7280' }}>Copy Atlas data to local database (overwrites local data)</p>
              <Button variant="secondary" size="sm" icon={MdCloudDownload} loading={pulling} onClick={() => setConfirmAction('pull')} disabled={!atlasConfigured}>
                Pull from Atlas
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl" style={{ background: '#FFFFFF' }}>
            <div className="flex items-center gap-3 mb-4">
              <MdSync size={24} style={{ color: '#D97706' }} />
              <h3 className="text-base font-bold" style={{ color: '#1E293B' }}>
                {confirmAction === 'push' ? 'Push to Atlas' : 'Pull from Atlas'}
              </h3>
            </div>
            <p className="text-sm mb-2" style={{ color: '#374151' }}>
              {confirmAction === 'push'
                ? 'This will overwrite ALL data in MongoDB Atlas with your local database data.'
                : 'This will overwrite ALL data in your local database with MongoDB Atlas data.'}
            </p>
            <p className="text-sm font-semibold mb-5" style={{ color: '#DC2626' }}>This action cannot be undone.</p>
            <div className="flex justify-end" style={{ gap: '10px' }}>
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 rounded text-sm font-medium transition-all hover:opacity-80"
                style={{ background: '#F3F4F6', color: '#374151' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmAction === 'push' ? doPush : doPull}
                className="px-4 py-2 rounded text-sm font-medium transition-all hover:opacity-80"
                style={{ background: '#2563EB', color: '#FFFFFF' }}
              >
                {confirmAction === 'push' ? 'Push to Atlas' : 'Pull from Atlas'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SyncDatabase
