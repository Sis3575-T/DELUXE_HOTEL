import React, { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { backendUrl } from '../App'
import { MdSearch, MdVisibility, MdCheckCircle, MdCancel, MdRefresh, MdAccountBalance, MdPayment, MdDateRange, MdTrendingUp, MdArchive, MdUnarchive, MdDeleteForever } from 'react-icons/md'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import notify from '../components/ui/Toast'

const STATUS_COLORS = {
  'Pending': '#D97706',
  'Verification Required': '#2563EB',
  'Paid': '#059669',
  'Partially Paid': '#7C3AED',
  'Failed': '#DC2626',
  'Refunded': '#6B7280',
  'Cancelled': '#9CA3AF',
}

const STATUS_OPTIONS = ['all', 'Pending', 'Verification Required', 'Paid', 'Partially Paid', 'Failed', 'Refunded', 'Cancelled']
const METHOD_OPTIONS = ['all', 'Chapa', 'Telebirr', 'CBE Birr', 'Awash Bank', 'Dashen Bank', 'Bank Transfer', 'Pay at Hotel', 'Cash Payment']

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0)
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return dateStr
  }
}

const Payments = () => {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [detailModal, setDetailModal] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [revenuePeriod, setRevenuePeriod] = useState('all')
  const [revenueStart, setRevenueStart] = useState('')
  const [revenueEnd, setRevenueEnd] = useState('')
  const [revenueStats, setRevenueStats] = useState(null)
  const [methodBreakdown, setMethodBreakdown] = useState([])
  const [dailyBreakdown, setDailyBreakdown] = useState([])
  const [revenueLoading, setRevenueLoading] = useState(false)
  const [datePreset, setDatePreset] = useState('all')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (methodFilter !== 'all') params.append('method', methodFilter)
      if (search) params.append('search', search)
      if (showArchived) params.append('showArchived', 'true')
      if (datePreset === 'custom') {
        if (dateStart) params.append('startDate', dateStart)
        if (dateEnd) params.append('endDate', dateEnd)
      } else if (datePreset !== 'all') {
        const now = new Date()
        let start
        if (datePreset === 'thisMonth') start = new Date(now.getFullYear(), now.getMonth(), 1)
        else if (datePreset === 'lastMonth') start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        else if (datePreset === 'thisYear') start = new Date(now.getFullYear(), 0, 1)
        if (start) params.append('startDate', start.toISOString())
      }
      params.append('page', page)
      params.append('limit', '20')

      const r = await axios.get(backendUrl + '/api/payment/list?' + params.toString(), { headers: getAuthHeaders() })
      if (r.data?.success) {
        setPayments(r.data.payments || [])
        setTotal(r.data.total || 0)
        setTotalPages(r.data.totalPages || 1)
      }
    } catch {
      notify.error('Failed to fetch payments')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, methodFilter, search, page, showArchived, datePreset, dateStart, dateEnd])

  const fetchStats = useCallback(async () => {
    try {
      const r = await axios.get(backendUrl + '/api/payment/stats', { headers: getAuthHeaders() })
      if (r.data?.success) setStats(r.data.stats)
    } catch {}
  }, [])

  const fetchRevenue = useCallback(async () => {
    setRevenueLoading(true)
    try {
      const params = new URLSearchParams()
      if (revenuePeriod === 'custom' && revenueStart && revenueEnd) {
        params.append('startDate', revenueStart)
        params.append('endDate', revenueEnd)
      } else if (revenuePeriod !== 'all') {
        params.append('period', revenuePeriod)
      } else {
        setRevenueStats(null)
        setMethodBreakdown([])
        setDailyBreakdown([])
        setRevenueLoading(false)
        return
      }
      const r = await axios.get(backendUrl + '/api/payment/revenue?' + params.toString(), { headers: getAuthHeaders() })
      if (r.data?.success) {
        setRevenueStats(r.data.stats)
        setMethodBreakdown(r.data.methodBreakdown || [])
        setDailyBreakdown(r.data.dailyBreakdown || [])
      }
    } catch {
      notify.error('Failed to fetch revenue stats')
    } finally {
      setRevenueLoading(false)
    }
  }, [revenuePeriod, revenueStart, revenueEnd])

  useEffect(() => { fetchPayments() }, [fetchPayments])
  useEffect(() => { fetchStats() }, [fetchStats])
  useEffect(() => { fetchRevenue() }, [fetchRevenue])

  useEffect(() => { setPage(1) }, [statusFilter, methodFilter, search, showArchived, datePreset, dateStart, dateEnd])

  const openDetail = (payment) => {
    setSelectedPayment(payment)
    setDetailModal(true)
  }

  const handleVerify = async (id) => {
    try {
      const r = await axios.put(backendUrl + '/api/payment/verify/' + id, {}, { headers: getAuthHeaders() })
      if (r.data?.success) {
        notify.success('Payment verified successfully')
        setDetailModal(false)
        fetchPayments()
        fetchStats()
      } else {
        notify.error(r.data?.message || 'Verification failed')
      }
    } catch (err) {
      notify.error(err.response?.data?.message || 'Verification failed')
    }
    setConfirmAction(null)
  }

  const handleReject = async (id) => {
    try {
      const r = await axios.put(backendUrl + '/api/payment/reject/' + id, { reason: 'Payment rejected by admin' }, { headers: getAuthHeaders() })
      if (r.data?.success) {
        notify.success('Payment rejected')
        setDetailModal(false)
        fetchPayments()
        fetchStats()
      } else {
        notify.error(r.data?.message || 'Failed to reject payment')
      }
    } catch (err) {
      notify.error(err.response?.data?.message || 'Failed to reject payment')
    }
    setConfirmAction(null)
  }

  const handleRefund = async (id) => {
    try {
      const r = await axios.put(backendUrl + '/api/payment/refund/' + id, {}, { headers: getAuthHeaders() })
      if (r.data?.success) {
        notify.success('Payment refunded')
        setDetailModal(false)
        fetchPayments()
        fetchStats()
      } else {
        notify.error(r.data?.message || 'Refund failed')
      }
    } catch (err) {
      notify.error(err.response?.data?.message || 'Refund failed')
    }
    setConfirmAction(null)
  }

  const handleCancel = async (id) => {
    try {
      const r = await axios.put(backendUrl + '/api/payment/cancel/' + id, {}, { headers: getAuthHeaders() })
      if (r.data?.success) {
        notify.success('Payment cancelled')
        setDetailModal(false)
        fetchPayments()
        fetchStats()
      } else {
        notify.error(r.data?.message || 'Cancel failed')
      }
    } catch (err) {
      notify.error(err.response?.data?.message || 'Cancel failed')
    }
    setConfirmAction(null)
  }

  const handleArchive = async (id) => {
    try {
      const r = await axios.put(backendUrl + '/api/payment/archive/' + id, {}, { headers: getAuthHeaders() })
      if (r.data?.success) {
        notify.success('Payment archived')
        setDetailModal(false)
        fetchPayments()
        fetchStats()
      } else {
        notify.error(r.data?.message || 'Archive failed')
      }
    } catch (err) {
      notify.error(err.response?.data?.message || 'Archive failed')
    }
    setConfirmAction(null)
  }

  const handleRestore = async (id) => {
    try {
      const r = await axios.put(backendUrl + '/api/payment/restore/' + id, {}, { headers: getAuthHeaders() })
      if (r.data?.success) {
        notify.success('Payment restored')
        setDetailModal(false)
        fetchPayments()
        fetchStats()
      } else {
        notify.error(r.data?.message || 'Restore failed')
      }
    } catch (err) {
      notify.error(err.response?.data?.message || 'Restore failed')
    }
    setConfirmAction(null)
  }

  const handleDelete = async (id) => {
    try {
      const r = await axios.delete(backendUrl + '/api/payment/delete/' + id, { headers: getAuthHeaders() })
      if (r.data?.success) {
        notify.success('Payment permanently deleted')
        setDetailModal(false)
        fetchPayments()
        fetchStats()
      } else {
        notify.error(r.data?.message || 'Delete failed')
      }
    } catch (err) {
      notify.error(err.response?.data?.message || 'Delete failed')
    }
    setConfirmAction(null)
  }

  return (
    <div className="fade-in-up" style={{ marginBottom: '32px' }}>
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: '#1E293B', fontFamily: "'Playfair Display', serif" }}>Payment Management</h1>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>Manage and verify guest payments across all methods</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-lg" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
            <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Total Revenue</p>
            <p className="text-lg font-bold" style={{ color: '#059669' }}>ETB {formatCurrency(stats.totalAmount)}</p>
            <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>{stats.totalPayments || 0} payments</p>
          </div>
          <div className="p-4 rounded-lg" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
            <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Paid</p>
            <p className="text-lg font-bold" style={{ color: '#059669' }}>ETB {formatCurrency(stats.totalPaid)}</p>
            <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>{stats.paidCount || 0} transactions</p>
          </div>
          <div className="p-4 rounded-lg" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
            <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Pending</p>
            <p className="text-lg font-bold" style={{ color: '#D97706' }}>ETB {formatCurrency(stats.totalPending)}</p>
            <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>{stats.pendingCount || 0} awaiting action</p>
          </div>
          <div className="p-4 rounded-lg" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
            <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Failed / Refunded</p>
            <p className="text-lg font-bold" style={{ color: '#DC2626' }}>{(stats.failedCount || 0) + (stats.refundedCount || 0)}</p>
            <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>{stats.failedCount || 0} failed, {stats.refundedCount || 0} refunded</p>
          </div>
        </div>
      )}

      {/* Revenue Stats */}
      <div className="mb-6 p-4 rounded-lg" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: '#1E293B' }}>
            <MdTrendingUp size={16} style={{ color: '#059669' }} /> Revenue Statistics
          </h3>
          <div className="flex items-center gap-2">
            <select className="input-field" value={revenuePeriod}
              onChange={e => { setRevenuePeriod(e.target.value); if (e.target.value !== 'custom') { setRevenueStart(''); setRevenueEnd('') } }}
              style={{ height: '32px', fontSize: '12px', minWidth: '120px' }}>
              <option value="all">All Time</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom Range</option>
            </select>
            {revenuePeriod === 'custom' && (
              <>
                <input type="date" value={revenueStart} onChange={e => setRevenueStart(e.target.value)}
                  className="input-field" style={{ height: '32px', fontSize: '12px', width: '130px' }} />
                <span className="text-xs" style={{ color: '#9CA3AF' }}>to</span>
                <input type="date" value={revenueEnd} onChange={e => setRevenueEnd(e.target.value)}
                  className="input-field" style={{ height: '32px', fontSize: '12px', width: '130px' }} />
              </>
            )}
            <Button variant="secondary" size="sm" icon={MdRefresh} onClick={fetchRevenue}
              style={{ height: '32px', fontSize: '12px' }}>Load</Button>
          </div>
        </div>
        {revenueLoading ? (
          <div className="text-center py-4" style={{ color: '#94A3B8' }}>
            <svg className="animate-spin inline mr-2" fill="none" viewBox="0 0 24 24" style={{ width: '16px', height: '16px' }}>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Loading revenue...
          </div>
        ) : revenueStats ? (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div className="p-3 rounded" style={{ background: '#F0FDF4', border: '1px solid #DCFCE7' }}>
                <p className="text-xs font-medium" style={{ color: '#16A34A' }}>Total Revenue</p>
                <p className="text-lg font-bold" style={{ color: '#059669' }}>ETB {formatCurrency(revenueStats.totalRevenue)}</p>
              </div>
              <div className="p-3 rounded" style={{ background: '#EFF6FF', border: '1px solid #DBEAFE' }}>
                <p className="text-xs font-medium" style={{ color: '#2563EB' }}>Transactions</p>
                <p className="text-lg font-bold" style={{ color: '#2563EB' }}>{revenueStats.totalTransactions}</p>
              </div>
              <div className="p-3 rounded" style={{ background: '#F5F3FF', border: '1px solid #EDE9FE' }}>
                <p className="text-xs font-medium" style={{ color: '#7C3AED' }}>Average</p>
                <p className="text-lg font-bold" style={{ color: '#7C3AED' }}>ETB {formatCurrency(revenueStats.averageTransaction)}</p>
              </div>
              <div className="p-3 rounded" style={{ background: '#FFF7ED', border: '1px solid #FFEDD5' }}>
                <p className="text-xs font-medium" style={{ color: '#EA580C' }}>Max Transaction</p>
                <p className="text-lg font-bold" style={{ color: '#EA580C' }}>ETB {formatCurrency(revenueStats.maxTransaction || 0)}</p>
              </div>
            </div>
            {methodBreakdown.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-semibold mb-1.5" style={{ color: '#6B7280' }}>By Payment Method</p>
                <div className="flex flex-wrap gap-2">
                  {methodBreakdown.map(m => (
                    <span key={m._id} className="px-2 py-1 rounded text-xs" style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', color: '#374151' }}>
                      {m._id}: <strong>ETB {formatCurrency(m.total)}</strong> ({m.count} txns)
                    </span>
                  ))}
                </div>
              </div>
            )}
            {dailyBreakdown.length > 0 && (
              <details className="text-xs" style={{ color: '#6B7280' }}>
                <summary className="cursor-pointer font-medium" style={{ color: '#2563EB' }}>View Daily Breakdown</summary>
                <div className="mt-2 max-h-32 overflow-y-auto" style={{ border: '1px solid #E5E7EB', borderRadius: '4px' }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: '#F8FAFC' }}>
                        <th className="text-left p-1.5 font-semibold" style={{ color: '#6B7280' }}>Date</th>
                        <th className="text-right p-1.5 font-semibold" style={{ color: '#6B7280' }}>Revenue</th>
                        <th className="text-right p-1.5 font-semibold" style={{ color: '#6B7280' }}>Transactions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyBreakdown.map(d => (
                        <tr key={d._id} style={{ borderTop: '1px solid #F3F4F6' }}>
                          <td className="p-1.5" style={{ color: '#374151' }}>{d._id}</td>
                          <td className="p-1.5 text-right font-medium" style={{ color: '#059669' }}>ETB {formatCurrency(d.total)}</td>
                          <td className="p-1.5 text-right" style={{ color: '#6B7280' }}>{d.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </div>
        ) : revenuePeriod !== 'all' ? (
          <p className="text-sm text-center py-2" style={{ color: '#94A3B8' }}>No revenue data for selected period</p>
        ) : null}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative" style={{ minWidth: '200px', flex: '1 1 200px' }}>
          <MdSearch size={16} className="absolute" style={{ left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', zIndex: 1 }} />
          <input type="text" placeholder="Search by name, email, transaction ID..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="input-field" style={{ paddingLeft: '44px', height: '40px' }} />
        </div>
        <select className="input-field" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ height: '40px', minWidth: '160px' }}>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s}</option>)}
        </select>
        <select className="input-field" value={methodFilter} onChange={e => setMethodFilter(e.target.value)}
          style={{ height: '40px', minWidth: '160px' }}>
          {METHOD_OPTIONS.map(m => <option key={m} value={m}>{m === 'all' ? 'All Methods' : m}</option>)}
        </select>
        <select className="input-field" value={datePreset} onChange={e => setDatePreset(e.target.value)}
          style={{ height: '40px', minWidth: '140px' }}>
          <option value="all">All Dates</option>
          <option value="thisMonth">This Month</option>
          <option value="lastMonth">Last Month</option>
          <option value="thisYear">This Year</option>
          <option value="custom">Custom Range</option>
        </select>
        {datePreset === 'custom' && (
          <>
            <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)}
              className="input-field" style={{ height: '40px', width: '140px' }} />
            <span className="text-xs" style={{ color: '#9CA3AF' }}>to</span>
            <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)}
              className="input-field" style={{ height: '40px', width: '140px' }} />
          </>
        )}
        <label className="flex items-center gap-2 text-xs cursor-pointer select-none" style={{ color: '#6B7280', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)}
            style={{ accentColor: '#2563EB' }} />
          Show Archived
        </label>
        <Button variant="secondary" size="sm" icon={MdRefresh} onClick={() => { fetchPayments(); fetchStats() }}>Refresh</Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center" style={{ padding: '80px 0', color: '#94A3B8' }}>
          <svg className="animate-spin" fill="none" viewBox="0 0 24 24" style={{ width: '24px', height: '24px', marginRight: '8px' }}>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Loading payments...
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center" style={{ padding: '80px 0', color: '#94A3B8' }}>
          <MdPayment size={48} className="mx-auto mb-3" style={{ opacity: 0.4 }} />
          <p className="text-base font-medium">No payments found</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid #E5E7EB' }}>
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E5E7EB' }}>
                <th className="text-left text-xs font-semibold p-3" style={{ color: '#6B7280' }}>Transaction ID</th>
                <th className="text-left text-xs font-semibold p-3" style={{ color: '#6B7280' }}>Guest</th>
                <th className="text-left text-xs font-semibold p-3" style={{ color: '#6B7280' }}>Method</th>
                <th className="text-right text-xs font-semibold p-3" style={{ color: '#6B7280' }}>Amount</th>
                <th className="text-center text-xs font-semibold p-3" style={{ color: '#6B7280' }}>Status</th>
                <th className="text-left text-xs font-semibold p-3" style={{ color: '#6B7280' }}>Date</th>
                <th className="text-center text-xs font-semibold p-3" style={{ color: '#6B7280' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment._id} style={{ borderBottom: '1px solid #E5E7EB', background: '#FFFFFF', opacity: payment.archived ? 0.55 : 1 }}
                  className="hover:opacity-80 cursor-pointer" onClick={() => openDetail(payment)}>
                  <td className="p-3 text-sm font-mono" style={{ color: '#1E293B' }}>{payment.transactionId}</td>
                  <td className="p-3">
                    <p className="text-sm font-medium" style={{ color: '#1E293B' }}>{payment.guestName}</p>
                    {payment.guestEmail && <p className="text-xs" style={{ color: '#6B7280' }}>{payment.guestEmail}</p>}
                  </td>
                  <td className="p-3 text-sm" style={{ color: '#6B7280' }}>{payment.paymentMethod}</td>
                  <td className="p-3 text-sm text-right font-semibold" style={{ color: '#1E293B' }}>ETB {formatCurrency(payment.amount)}</td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{
                      background: STATUS_COLORS[payment.status] || '#6B7280',
                      color: '#FFFFFF',
                    }}>{payment.status}</span>
                    {payment.archived && (
                      <span className="ml-1 px-1.5 py-0.5 rounded text-xs font-semibold" style={{ background: '#6B7280', color: '#FFFFFF', opacity: 0.6 }}>A</span>
                    )}
                  </td>
                  <td className="p-3 text-sm" style={{ color: '#6B7280' }}>{formatDate(payment.createdAt)}</td>
                  <td className="p-3 text-center">
                    <button onClick={(e) => { e.stopPropagation(); openDetail(payment) }}
                      className="p-1.5 rounded transition-all hover:opacity-70" style={{ color: '#2563EB' }} title="View Details">
                      <MdVisibility size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <span className="text-xs" style={{ color: '#6B7280' }}>Page {page} of {totalPages} ({total} total)</span>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} onClick={() => setPage(i + 1)}
                className="w-8 h-8 rounded text-xs font-medium transition-all" style={{
                  background: page === i + 1 ? '#2563EB' : '#FFFFFF',
                  color: page === i + 1 ? '#fff' : '#6B7280',
                  border: '1px solid ' + (page === i + 1 ? '#2563EB' : '#E5E7EB'),
                }}>{i + 1}</button>
            ))}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Modal open={detailModal} onClose={() => setDetailModal(false)} title="Payment Details" width="max-w-2xl">
            {selectedPayment && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Transaction ID</p>
                <p className="text-sm font-mono" style={{ color: '#1E293B' }}>{selectedPayment.transactionId}</p>
              </div>
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Status</p>
                <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{
                  background: STATUS_COLORS[selectedPayment.status] || '#6B7280',
                  color: '#FFFFFF',
                }}>{selectedPayment.status}</span>
              </div>
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Guest Name</p>
                <p className="text-sm" style={{ color: '#1E293B' }}>{selectedPayment.guestName}</p>
              </div>
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Email</p>
                <p className="text-sm" style={{ color: '#1E293B' }}>{selectedPayment.guestEmail || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Phone</p>
                <p className="text-sm" style={{ color: '#1E293B' }}>{selectedPayment.guestPhone || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Payment Method</p>
                <p className="text-sm" style={{ color: '#1E293B' }}>{selectedPayment.paymentMethod}</p>
              </div>
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Amount</p>
                <p className="text-sm font-semibold" style={{ color: '#1E293B' }}>{selectedPayment.currency || 'ETB'} {formatCurrency(selectedPayment.amount)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Payment Date</p>
                <p className="text-sm" style={{ color: '#1E293B' }}>{formatDate(selectedPayment.paymentDate)}</p>
              </div>
              {selectedPayment.referenceNumber && (
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Reference Number</p>
                  <p className="text-sm font-mono" style={{ color: '#1E293B' }}>{selectedPayment.referenceNumber}</p>
                </div>
              )}
              {selectedPayment.chapaTransactionId && (
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Chapa Transaction ID</p>
                  <p className="text-sm font-mono" style={{ color: '#1E293B' }}>{selectedPayment.chapaTransactionId}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Verification</p>
                <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{
                  background: selectedPayment.verificationStatus === 'Verified' ? '#059669' : selectedPayment.verificationStatus === 'Rejected' ? '#DC2626' : '#D97706',
                  color: '#FFFFFF',
                }}>{selectedPayment.verificationStatus || 'Unverified'}</span>
              </div>
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Archived</p>
                <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{
                  background: selectedPayment.archived ? '#6B7280' : '#059669',
                  color: '#FFFFFF',
                }}>{selectedPayment.archived ? 'Yes' : 'No'}</span>
              </div>
            </div>

            {selectedPayment.paymentMethod === 'Chapa' && selectedPayment.chapaResponse && (
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: '#6B7280' }}>Chapa Response Details</p>
                <details className="text-xs" style={{ color: '#6B7280' }}>
                  <summary className="cursor-pointer font-medium" style={{ color: '#2563EB' }}>View Chapa API Response</summary>
                  <pre className="mt-2 p-3 rounded overflow-auto max-h-48" style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', fontSize: '11px', lineHeight: '1.5' }}>
                    {JSON.stringify(selectedPayment.chapaResponse, null, 2)}
                  </pre>
                </details>
              </div>
            )}

            {selectedPayment.webhookEvents?.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: '#6B7280' }}>Webhook Events ({selectedPayment.webhookEvents.length})</p>
                <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                  {selectedPayment.webhookEvents.map((ev, i) => (
                    <div key={i} className="text-xs p-2 rounded" style={{ background: '#F8FAFC', border: '1px solid #E5E7EB' }}>
                      <span className="font-medium">{ev.event}</span>
                      <span className="ml-2" style={{ color: '#9CA3AF' }}>{new Date(ev.receivedAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedPayment.receipt && (
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: '#6B7280' }}>Receipt</p>
                {selectedPayment.receipt.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <img src={selectedPayment.receipt} alt="Receipt" className="max-w-full rounded-lg" style={{ maxHeight: '300px', border: '1px solid #E5E7EB' }} />
                ) : (
                  <a href={selectedPayment.receipt} target="_blank" rel="noopener noreferrer" className="text-sm underline" style={{ color: '#2563EB' }}>View Receipt</a>
                )}
              </div>
            )}

            {selectedPayment.notes && (
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Notes</p>
                <p className="text-sm" style={{ color: '#6B7280' }}>{selectedPayment.notes}</p>
              </div>
            )}

            {(selectedPayment.status === 'Pending' || selectedPayment.status === 'Verification Required') && (
              <div className="flex gap-3 pt-2 border-t" style={{ borderColor: '#E5E7EB' }}>
                <Button variant="success" icon={MdCheckCircle} onClick={() => setConfirmAction('verify')}>
                  Verify & Approve
                </Button>
                <Button variant="danger" icon={MdCancel} onClick={() => setConfirmAction('reject')}>
                  Reject
                </Button>
              </div>
            )}
            {selectedPayment.status === 'Paid' && (
              <div className="flex gap-3 pt-2 border-t" style={{ borderColor: '#E5E7EB' }}>
                <Button variant="danger" icon={MdCancel} onClick={() => setConfirmAction('refund')}>
                  Refund
                </Button>
              </div>
            )}
            {(selectedPayment.status === 'Pending' || selectedPayment.status === 'Verification Required') && (
              <div className="pt-2">
                <Button variant="secondary" icon={MdCancel} onClick={() => setConfirmAction('cancel')}>
                  Cancel Payment
                </Button>
              </div>
            )}
            <div className="flex gap-3 pt-2 border-t" style={{ borderColor: '#E5E7EB' }}>
              {!selectedPayment.archived ? (
                <Button variant="secondary" icon={MdArchive} onClick={() => setConfirmAction('archive')}>
                  Archive
                </Button>
              ) : (
                <>
                  <Button variant="secondary" icon={MdUnarchive} onClick={() => handleRestore(selectedPayment._id)}>
                    Restore
                  </Button>
                  <Button variant="danger" icon={MdDeleteForever} onClick={() => setConfirmAction('delete')}>
                    Delete Permanently
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Action */}
      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (confirmAction === 'verify') handleVerify(selectedPayment._id)
          else if (confirmAction === 'reject') handleReject(selectedPayment._id)
          else if (confirmAction === 'refund') handleRefund(selectedPayment._id)
          else if (confirmAction === 'cancel') handleCancel(selectedPayment._id)
          else if (confirmAction === 'archive') handleArchive(selectedPayment._id)
          else if (confirmAction === 'delete') handleDelete(selectedPayment._id)
        }}
        title={
          confirmAction === 'verify' ? 'Verify Payment' :
          confirmAction === 'reject' ? 'Reject Payment' :
          confirmAction === 'refund' ? 'Refund Payment' :
          confirmAction === 'archive' ? 'Archive Payment' :
          confirmAction === 'delete' ? 'Delete Payment Permanently' : 'Cancel Payment'
        }
        message={
          confirmAction === 'verify' ? `Verify payment ${selectedPayment?.transactionId}? This will mark it as paid and confirm the associated booking.` :
          confirmAction === 'reject' ? `Reject payment ${selectedPayment?.transactionId}?` :
          confirmAction === 'refund' ? `Refund payment ${selectedPayment?.transactionId}? This action cannot be undone.` :
          confirmAction === 'archive' ? `Archive payment ${selectedPayment?.transactionId}? It will be hidden from the default list.` :
          confirmAction === 'delete' ? `Permanently delete payment ${selectedPayment?.transactionId}? This action cannot be undone.` :
          `Cancel payment ${selectedPayment?.transactionId}?`
        }
        confirmLabel={
          confirmAction === 'verify' ? 'Verify' :
          confirmAction === 'reject' ? 'Reject' :
          confirmAction === 'refund' ? 'Refund' :
          confirmAction === 'archive' ? 'Archive' :
          confirmAction === 'delete' ? 'Delete' : 'Cancel'
        }
        variant={
          confirmAction === 'verify' ? 'primary' :
          confirmAction === 'delete' ? 'danger' :
          confirmAction === 'archive' ? 'secondary' :
          confirmAction === 'refund' ? 'danger' :
          confirmAction === 'reject' ? 'danger' : 'secondary'
        }
        loading={false}
      />
    </div>
  )
}

export default Payments
