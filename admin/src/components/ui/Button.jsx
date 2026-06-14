import React from 'react'

const variants = {
  primary:   { bg: '#1E293B', hover: '#0F172A', color: '#fff' },
  gold:      { bg: '#D4AF37', hover: '#B8960C', color: '#0F172A' },
  success:   { bg: '#16A34A', hover: '#15803D', color: '#fff' },
  danger:    { bg: '#DC2626', hover: '#B91C1C', color: '#fff' },
  secondary: { bg: '#64748B', hover: '#475569', color: '#fff' },
  info:      { bg: '#1E293B', hover: '#334155', color: '#fff' },
  outline:   { bg: 'transparent', hover: '#F8FAFC', color: '#1E293B', border: '#E2E8F0' },
  ghost:     { bg: 'transparent', hover: '#F8FAFC', color: '#64748B', border: 'none' },
}

const sizes = {
  sm: 'px-4 py-2.5 text-xs',
  md: 'px-5 py-3 text-sm',
  lg: 'px-6 py-3.5 text-base',
}

const Button = ({ variant = 'primary', size = 'md', loading = false, disabled = false, children, onClick, type = 'button', className = '', icon: Icon, ...props }) => {
  const v = variants[variant] || variants.primary
  const isDisabled = disabled || loading

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200 ${sizes[size]} ${className}`}
      style={{
        background: v.bg,
        color: v.color,
        border: v.border ? `1.5px solid ${v.border}` : 'none',
        opacity: isDisabled ? 0.6 : 1,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        boxShadow: variant === 'gold' ? '0 2px 8px rgba(212,175,55,0.3)' : 'none',
      }}
      onMouseEnter={e => { if (!isDisabled) e.currentTarget.style.background = v.hover }}
      onMouseLeave={e => { if (!isDisabled) e.currentTarget.style.background = v.bg }}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      )}
      {Icon && !loading && <Icon size={16} />}
      {children}
    </button>
  )
}

export default Button
