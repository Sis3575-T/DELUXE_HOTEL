import React from 'react'
import { MdTrendingUp, MdTrendingDown } from 'react-icons/md'

const StatCard = ({ label, value, change, up = true, icon: Icon, color = '#1E293B', accent = '#D4AF37' }) => (
  <div
    className="p-5 card-hover relative overflow-hidden group"
    style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
    }}
  >
    <div
      className="absolute top-0 left-0 w-full h-1 transition-all duration-300 group-hover:h-1.5"
      style={{ background: `linear-gradient(90deg, ${accent}, ${color})` }}
    />
    <div className="flex items-start justify-between mb-4">
      <div
        className="w-11 h-11 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
        style={{ background: `${color}12`, border: `1px solid ${color}20` }}
      >
        <Icon size={22} style={{ color }} />
      </div>
      {change != null && (
        <span
          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{
            background: up ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)',
            color: up ? '#16A34A' : '#DC2626',
          }}
        >
          {up ? <MdTrendingUp size={13} /> : <MdTrendingDown size={13} />}
          {change}
        </span>
      )}
    </div>
    <p className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{value}</p>
    <p className="text-sm mt-1 font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
  </div>
)

export default StatCard
