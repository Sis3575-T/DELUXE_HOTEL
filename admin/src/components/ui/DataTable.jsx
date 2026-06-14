import React, { useState, useMemo } from 'react'
import { MdChevronLeft, MdChevronRight, MdArrowUpward, MdArrowDownward, MdSearch, MdRefresh } from 'react-icons/md'
import Button from './Button'

const DataTable = ({
  columns,
  data,
  pageSize = 10,
  searchable = true,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No data found',
  loading = false,
  error = null,
  onRetry,
  onRowClick,
  stickyHeader = true,
}) => {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  const filtered = useMemo(() => {
    if (!search) return data
    const q = search.toLowerCase()
    return data.filter(row =>
      columns.some(col => {
        if (col.accessor) {
          const val = row[col.accessor]
          if (val) {
            const str = typeof val === 'object' ? JSON.stringify(val) : String(val)
            if (str.toLowerCase().includes(q)) return true
          }
        }
        return false
      })
    )
  }, [data, search, columns])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey] ?? ''
      const bVal = b[sortKey] ?? ''
      const aStr = typeof aVal === 'object' ? '' : String(aVal)
      const bStr = typeof bVal === 'object' ? '' : String(bVal)
      const cmp = aStr.localeCompare(bStr, undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize)

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  return (
    <div
      className="overflow-hidden rounded-xl"
      style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}
    >
      {searchable && (
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="relative max-w-xs">
            <MdSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="input-field"
              style={{ paddingLeft: '2.75rem' }}
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full data-table" style={{ background: 'var(--bg-card)' }}>
          <thead>
            <tr>
              {columns.map((col, i) => (
                  <th
                    key={col.accessor || i}
                    className={col.sortable ? 'cursor-pointer select-none' : ''}
                    style={{
                      ...(stickyHeader ? { position: 'sticky', top: 0, zIndex: 10 } : {}),
                      ...(col.width ? { width: col.width } : {}),
                      ...(col.thStyle || {}),
                    }}
                    onClick={() => col.sortable && col.accessor && handleSort(col.accessor)}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.accessor && (
                      sortDir === 'asc' ? <MdArrowUpward size={12} /> : <MdArrowDownward size={12} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-16" style={{ color: '#94A3B8' }}>
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Loading...
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12">
                  <p className="text-sm font-medium mb-2" style={{ color: '#DC2626' }}>{error}</p>
                  {onRetry && <Button variant="primary" size="sm" icon={MdRefresh} onClick={onRetry}>Retry</Button>}
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-16" style={{ color: '#94A3B8' }}>
                  <p className="text-sm">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              paginated.map((row, i) => (
                <tr
                  key={row._id || row.id || i}
                  onClick={() => onRowClick && onRowClick(row)}
                  style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  {columns.map((col, j) => (
                    <td key={j} style={{ ...(col.tdStyle || {}) }}>
                      {col.render ? col.render(row) : row[col.accessor] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div
          className="flex items-center justify-between px-5 py-4 border-t"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
        >
          <p className="text-xs" style={{ color: '#94A3B8' }}>
            {sorted.length} results
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded disabled:opacity-40 transition-all"
              style={{ border: '1px solid #E5E7EB', color: '#6B7280' }}
            >
              <MdChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => setPage(i + 1)}
                className="w-7 h-7 rounded text-xs font-medium transition-all"
                style={{
                  background: page === i + 1 ? '#1E293B' : 'transparent',
                  color: page === i + 1 ? '#D4AF37' : 'var(--text-secondary)',
                  border: `1px solid ${page === i + 1 ? '#1E293B' : 'var(--border)'}`,
                }}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded disabled:opacity-40 transition-all"
              style={{ border: '1px solid #E5E7EB', color: '#6B7280' }}
            >
              <MdChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataTable
