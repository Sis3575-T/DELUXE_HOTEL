import React, { useEffect, useState, useCallback, useRef } from 'react'
import axios from 'axios'
import { backendUrl, useSettings } from '../App'
import { MdSave, MdHotel, MdLocationOn, MdPhone, MdEmail, MdLanguage, MdCameraAlt, MdRefresh, MdAdd, MdClose, MdTextFields, MdCampaign, MdMail, MdWeb, MdInfo, MdContactSupport, MdCopyright, MdDelete, MdEdit, MdHistory, MdTrendingUp, MdStar } from 'react-icons/md'
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaYoutube, FaGlobe } from 'react-icons/fa'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import notify from '../components/ui/Toast'
import { getIcon, iconOptions } from '../utils/iconMap'

const platformIcons = { facebook: FaFacebook, twitter: FaTwitter, instagram: FaInstagram, linkedin: FaLinkedin, youtube: FaYoutube }

const Field = ({ label, icon: Icon, type = 'text', required, placeholder, value, error, onChange }) => (
  <div>
    <label className="block text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>
      {label} {required && <span style={{ color: '#DC2626' }}>*</span>}
    </label>
    <div className="relative">
      {Icon && <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />}
      {type === 'textarea' ? (
        <textarea className={`input-field ${error ? 'error' : ''}`} value={value} onChange={onChange} rows={3}
          style={Icon ? { paddingLeft: '36px', resize: 'vertical' } : { resize: 'vertical' }} />
      ) : type === 'select' ? (
        <select className={`input-field ${error ? 'error' : ''}`} value={value} onChange={onChange}>
          {['ETB', 'USD', 'EUR'].map(c => <option key={c} value={c}>{c} — {c === 'ETB' ? 'Ethiopian Birr' : c === 'USD' ? 'US Dollar' : 'Euro'}</option>)}
        </select>
      ) : (
        <input type={type} className={`input-field ${error ? 'error' : ''}`} value={value} onChange={onChange}
          placeholder={placeholder} style={Icon ? { paddingLeft: '36px' } : {}} />
      )}
    </div>
    {error && <p className="text-xs mt-1" style={{ color: '#DC2626' }}>{error}</p>}
  </div>
)

const defaultSocialLinks = [
  { platform: 'Facebook', url: '' },
  { platform: 'Twitter', url: '' },
  { platform: 'Instagram', url: '' },
  { platform: 'LinkedIn', url: '' },
]

const Settings = () => {
  const { refreshSettings } = useSettings()
  const [form, setForm] = useState({
    hotelName: '', address: '', phone: '', email: '', website: '',
    socialLinks: [],
    description: '', tagline: '', heroButtonText: '',
    newsletterTitle: '', newsletterButtonText: '', newsletterPlaceholder: '',
    roomsSectionTitle: '', facilityTitle: '', facilitySubtitle: '',
    aboutTitle: '', aboutSubtitle: '', aboutContent: '', aboutImage: '',
    contactTitle: '', contactSubtitle: '', copyrightText: '',
    checkinTime: '14:00', checkoutTime: '12:00', currency: 'ETB', taxRate: '15',
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [logo, setLogo] = useState(null)
  const [aboutImage, setAboutImage] = useState(null)
  const [heroImage, setHeroImage] = useState(null)
  const [logoDragOver, setLogoDragOver] = useState(false)
  const [heroDragOver, setHeroDragOver] = useState(false)
  const [aboutDragOver, setAboutDragOver] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  // About content management
  const [aboutData, setAboutData] = useState({ facilities: [], amenities: [], history: '', stats: { luxuryRooms: '50+', happyGuests: '200+', yearsExperience: '15+', guestRating: '4.8' } })
  const [aboutLoading, setAboutLoading] = useState(false)
  const [facilityModal, setFacilityModal] = useState(null)
  const [amenityModal, setAmenityModal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const deleteTargetRef = useRef(null)
  const [deleteType, setDeleteType] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [formFacility, setFormFacility] = useState({ icon: 'FaConciergeBell', title: '', desc: '' })
  const [formAmenity, setFormAmenity] = useState({ icon: 'FaWifi', title: '', desc: '' })
  const [formHistory, setFormHistory] = useState('')
  const [formStats, setFormStats] = useState({ luxuryRooms: '', happyGuests: '', yearsExperience: '', guestRating: '' })
  const [historySaving, setHistorySaving] = useState(false)
  const [statsSaving, setStatsSaving] = useState(false)

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await axios.get(backendUrl + '/api/settings', { headers: getAuthHeaders() })
      if (r.data?.success && r.data?.settings) {
        const s = r.data.settings
        const socialLinks = s.socialLinks?.length > 0
          ? s.socialLinks.map(l => ({ platform: l.platform || '', url: l.url || '' }))
          : defaultSocialLinks
        setForm({
          hotelName: s.hotelName || '', address: s.address || '', phone: s.phone || '', email: s.email || '', website: s.website || '',
          socialLinks,
          description: s.description || '',
          tagline: s.tagline || '', heroButtonText: s.heroButtonText || '', heroImage: s.heroImage || '',
          newsletterTitle: s.newsletterTitle || '', newsletterButtonText: s.newsletterButtonText || '', newsletterPlaceholder: s.newsletterPlaceholder || '',
          roomsSectionTitle: s.roomsSectionTitle || '', facilityTitle: s.facilityTitle || '', facilitySubtitle: s.facilitySubtitle || '',
          aboutTitle: s.aboutTitle || '', aboutSubtitle: s.aboutSubtitle || '', aboutContent: s.aboutContent || '', aboutImage: s.aboutImage || '',
          contactTitle: s.contactTitle || '', contactSubtitle: s.contactSubtitle || '', copyrightText: s.copyrightText || '',
          checkinTime: s.checkinTime || '14:00', checkoutTime: s.checkoutTime || '12:00',
          currency: s.currency || 'ETB', taxRate: s.taxRate || '15',
        })
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load settings'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const fetchAboutData = useCallback(async () => {
    setAboutLoading(true)
    try {
      const r = await axios.get(backendUrl + '/api/about/get', { headers: getAuthHeaders() })
      if (r.data?.success && r.data?.about) {
        setAboutData(r.data.about)
        setFormHistory(r.data.about.history || '')
        setFormStats({
          luxuryRooms: r.data.about.stats?.luxuryRooms || '50+',
          happyGuests: r.data.about.stats?.happyGuests || '200+',
          yearsExperience: r.data.about.stats?.yearsExperience || '15+',
          guestRating: r.data.about.stats?.guestRating || '4.8',
        })
      }
    } catch {
      notify.error('Failed to load about content')
    } finally {
      setAboutLoading(false)
    }
  }, [])

  useEffect(() => { fetchAboutData() }, [fetchAboutData])

  const openAddFacility = () => {
    setFacilityModal({ mode: 'add' })
    setFormFacility({ icon: 'FaConciergeBell', title: '', desc: '' })
  }

  const openEditFacility = (item) => {
    setFacilityModal({ mode: 'edit', id: item._id })
    setFormFacility({ icon: item.icon || 'FaConciergeBell', title: item.title, desc: item.desc })
  }

  const handleSaveFacility = async () => {
    if (!formFacility.title.trim() || !formFacility.desc.trim()) {
      notify.error('Title and description are required')
      return
    }
    try {
      const headers = getAuthHeaders()
      if (facilityModal.mode === 'add') {
        const r = await axios.post(backendUrl + '/api/about/facility/add', formFacility, { headers })
        if (r.data?.success) { notify.success('Facility added'); setAboutData(r.data.about) }
      } else {
        const r = await axios.put(backendUrl + `/api/about/facility/update/${facilityModal.id}`, formFacility, { headers })
        if (r.data?.success) { notify.success('Facility updated'); setAboutData(r.data.about) }
      }
      setFacilityModal(null)
    } catch (err) {
      notify.error(err.response?.data?.message || 'Error saving facility')
    }
  }

  const openAddAmenity = () => {
    setAmenityModal({ mode: 'add' })
    setFormAmenity({ icon: 'FaWifi', title: '', desc: '' })
  }

  const openEditAmenity = (item) => {
    setAmenityModal({ mode: 'edit', id: item._id })
    setFormAmenity({ icon: item.icon || 'FaWifi', title: item.title, desc: item.desc })
  }

  const handleSaveAmenity = async () => {
    if (!formAmenity.title.trim() || !formAmenity.desc.trim()) {
      notify.error('Title and description are required')
      return
    }
    try {
      const headers = getAuthHeaders()
      if (amenityModal.mode === 'add') {
        const r = await axios.post(backendUrl + '/api/about/amenity/add', formAmenity, { headers })
        if (r.data?.success) { notify.success('Amenity added'); setAboutData(r.data.about) }
      } else {
        const r = await axios.put(backendUrl + `/api/about/amenity/update/${amenityModal.id}`, formAmenity, { headers })
        if (r.data?.success) { notify.success('Amenity updated'); setAboutData(r.data.about) }
      }
      setAmenityModal(null)
    } catch (err) {
      notify.error(err.response?.data?.message || 'Error saving amenity')
    }
  }

  const confirmDelete = (id, type) => {
    deleteTargetRef.current = id
    setDeleteTarget(id)
    setDeleteType(type)
  }

  const handleDelete = async () => {
    const id = deleteTargetRef.current
    if (!id) return
    setDeleteLoading(true)
    try {
      const headers = getAuthHeaders()
      const endpoint = deleteType === 'facility'
        ? `/api/about/facility/delete/${id}`
        : `/api/about/amenity/delete/${id}`
      const r = await axios.delete(backendUrl + endpoint, { headers })
      if (r.data?.success) {
        notify.success(deleteType === 'facility' ? 'Facility deleted' : 'Amenity deleted')
        setAboutData(r.data.about)
        deleteTargetRef.current = null
        setDeleteTarget(null)
      } else {
        notify.error(r.data?.message || 'Delete failed')
      }
    } catch (err) {
      notify.error(err.response?.data?.message || 'Delete failed')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleSaveHistory = async () => {
    setHistorySaving(true)
    try {
      const r = await axios.put(backendUrl + '/api/about/history/update', { history: formHistory }, { headers: getAuthHeaders() })
      if (r.data?.success) { notify.success('History updated'); setAboutData(r.data.about) }
    } catch (err) {
      notify.error(err.response?.data?.message || 'Error saving history')
    } finally {
      setHistorySaving(false)
    }
  }

  const handleSaveStats = async () => {
    setStatsSaving(true)
    try {
      const r = await axios.put(backendUrl + '/api/about/stats/update', formStats, { headers: getAuthHeaders() })
      if (r.data?.success) { notify.success('Stats updated'); setAboutData(r.data.about) }
    } catch (err) {
      notify.error(err.response?.data?.message || 'Error saving stats')
    } finally {
      setStatsSaving(false)
    }
  }

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  const addSocialLink = () => {
    console.log('addSocialLink invoked')
    notify.info('Adding link...')
    setForm(prev => ({ ...prev, socialLinks: [...(prev.socialLinks || []), { platform: '', url: '' }] }))
  }

  const removeSocialLink = (index) => {
    setForm(prev => ({ ...prev, socialLinks: prev.socialLinks.filter((_, i) => i !== index) }))
  }

  const handleSocialChange = (index, field) => (e) => {
    setForm(prev => {
      const updated = [...prev.socialLinks]
      updated[index] = { ...updated[index], [field]: e.target.value }
      return { ...prev, socialLinks: updated }
    })
  }

  const validate = () => {
    const errs = {}
    if (!form.hotelName.trim()) errs.hotelName = 'Hotel name is required'
    if (!form.address.trim()) errs.address = 'Address is required'
    if (!form.phone.trim()) errs.phone = 'Phone is required'
    if (!form.email.trim()) errs.email = 'Email is required'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email format'
    if (!form.taxRate || Number(form.taxRate) < 0) errs.taxRate = 'Valid tax rate is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      let headers = getAuthHeaders()
      let r
      if (logo || aboutImage || heroImage) {
        const fd = new FormData()
        if (logo) fd.append('logo', logo)
        if (aboutImage) fd.append('aboutImage', aboutImage)
        if (heroImage) fd.append('heroImage', heroImage)
        Object.entries(form).forEach(([k, v]) => {
          if (k === 'socialLinks') {
            fd.append(k, JSON.stringify(v))
          } else {
            fd.append(k, v)
          }
        })
        r = await axios.put(backendUrl + '/api/settings/update-files', fd, { headers })
      } else {
        r = await axios.put(backendUrl + '/api/settings/update', form, { headers })
      }
      if (r.data?.success) {
        notify.success('Settings saved successfully!')
        refreshSettings()
      } else {
        notify.error(r.data?.message || 'Save failed')
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error saving settings'
      notify.error(msg)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ padding: '80px 0', color: '#94A3B8' }}>
        <svg className="animate-spin" fill="none" viewBox="0 0 24 24" style={{ width: '28px', height: '28px', marginBottom: '12px' }}>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <p className="text-sm font-medium">Loading settings...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ padding: '80px 0' }}>
        <p className="text-sm font-medium mb-3" style={{ color: '#DC2626' }}>{error}</p>
        <Button variant="primary" size="sm" icon={MdRefresh} onClick={fetchSettings}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="fade-in-up" style={{ marginBottom: '32px' }}>
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: '#1E293B', fontFamily: "'Playfair Display', serif" }}>Hotel Settings</h1>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>Manage your hotel's configuration and preferences</p>
      </div>

      <form onSubmit={handleSave} className="max-w-4xl flex flex-col gap-5">
        <div className="p-5 card-hover" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#1E293B' }}>
            <MdHotel size={16} style={{ color: '#2563EB' }} /> Branding
          </h3>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0">
              <label className="block text-xs font-semibold mb-2" style={{ color: '#6B7280' }}>Hotel Logo</label>
              <label className="flex flex-col items-center justify-center w-32 h-32 cursor-pointer transition-all rounded"
                style={{
                  border: `2px dashed ${logoDragOver ? '#D4AF37' : '#E5E7EB'}`,
                  background: logoDragOver ? 'rgba(212, 175, 55, 0.05)' : '#F8FAFC',
                }}
                onDragOver={e => { e.preventDefault(); setLogoDragOver(true) }}
                onDragLeave={() => setLogoDragOver(false)}
                onDrop={e => { e.preventDefault(); setLogoDragOver(false); const f = e.dataTransfer.files?.[0]; if (f?.type?.startsWith('image/')) setLogo(f) }}
              >
                {logo ? (
                  <img src={URL.createObjectURL(logo)} alt="preview" className="w-full h-full object-cover rounded" />
                ) : (
                  <div className="text-center p-3">
                    <div className="w-12 h-12 rounded flex items-center justify-center font-bold text-base mx-auto mb-2"
                      style={{ background: '#D4AF37', color: '#0F172A' }}>
                      AG
                    </div>
                    <MdCameraAlt size={16} style={{ color: '#94A3B8' }} className="mx-auto" />
                    <p className="text-[10px] mt-0.5" style={{ color: '#94A3B8' }}>Upload Logo</p>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={e => setLogo(e.target.files?.[0] ?? null)} />
              </label>
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Field label="Hotel Name" value={form.hotelName} error={errors.hotelName} onChange={handleChange('hotelName')} required />
              </div>
              <div className="sm:col-span-2">
                <Field label="Description" value={form.description} error={errors.description} onChange={handleChange('description')} type="textarea" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 card-hover" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#1E293B' }}>
            <MdLocationOn size={16} style={{ color: '#2563EB' }} /> Contact Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><Field label="Address" value={form.address} error={errors.address} onChange={handleChange('address')} icon={MdLocationOn} required /></div>
            <Field label="Phone" value={form.phone} error={errors.phone} onChange={handleChange('phone')} icon={MdPhone} required />
            <Field label="Email" value={form.email} error={errors.email} onChange={handleChange('email')} icon={MdEmail} type="email" required />
            <div className="sm:col-span-2"><Field label="Website" value={form.website} error={errors.website} onChange={handleChange('website')} icon={MdLanguage} type="url" /></div>
          </div>
        </div>

        <div className="p-5 card-hover" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold" style={{ color: '#1E293B' }}>Social Media Links</h3>
            <Button type="button" variant="secondary" size="sm" icon={MdAdd} onClick={addSocialLink}>Add Link</Button>
          </div>
          {form.socialLinks.length === 0 ? (
            <p className="text-sm" style={{ color: '#94A3B8' }}>No social media links added yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {form.socialLinks.map((link, index) => {
                const Icon = platformIcons[link.platform?.toLowerCase()] || FaGlobe
                return (
                  <div key={index} className="flex items-start gap-2 p-3 rounded" style={{ background: '#F8FAFC', border: '1px solid #E5E7EB' }}>
                    <div className="flex-shrink-0 pt-2">
                      <Icon size={18} style={{ color: '#2563EB' }} />
                    </div>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Platform</label>
                        <input type="text" className="input-field" value={link.platform} onChange={handleSocialChange(index, 'platform')}
                          placeholder="e.g. YouTube" style={{ height: '42px' }} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>URL</label>
                        <input type="url" className="input-field" value={link.url} onChange={handleSocialChange(index, 'url')}
                          placeholder="https://youtube.com/..." style={{ height: '42px' }} />
                      </div>
                    </div>
                    <button type="button" onClick={() => removeSocialLink(index)}
                      className="flex-shrink-0 p-1 rounded transition-all mt-2"
                      style={{ color: '#DC2626' }} title="Remove">
                      <MdClose size={16} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="p-5 card-hover" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#1E293B' }}>
            <MdCampaign size={16} style={{ color: '#2563EB' }} /> Hero Section
          </h3>
          <div className="flex flex-col md:flex-row gap-6 mb-4">
            <div className="flex-shrink-0">
              <label className="block text-xs font-semibold mb-2" style={{ color: '#6B7280' }}>Background Image</label>
              <label className="flex flex-col items-center justify-center w-32 h-32 cursor-pointer transition-all rounded"
                style={{
                  border: `2px dashed ${heroDragOver ? '#D4AF37' : '#E5E7EB'}`,
                  background: heroDragOver ? 'rgba(212, 175, 55, 0.05)' : '#F8FAFC',
                }}
                onDragOver={e => { e.preventDefault(); setHeroDragOver(true) }}
                onDragLeave={() => setHeroDragOver(false)}
                onDrop={e => { e.preventDefault(); setHeroDragOver(false); const f = e.dataTransfer.files?.[0]; if (f?.type?.startsWith('image/')) setHeroImage(f) }}
              >
                {heroImage ? (
                  <img src={URL.createObjectURL(heroImage)} alt="preview" className="w-full h-full object-cover rounded" />
                ) : form.heroImage ? (
                  <img src={form.heroImage} alt="Hero" className="w-full h-full object-cover rounded" />
                ) : (
                  <div className="text-center p-3">
                    <MdCameraAlt size={24} style={{ color: '#94A3B8' }} className="mx-auto mb-1" />
                    <p className="text-[10px]" style={{ color: '#94A3B8' }}>Upload Image</p>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={e => setHeroImage(e.target.files?.[0] ?? null)} />
              </label>
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-xs" style={{ color: '#94A3B8' }}>Recommended size: 1920x1080px</p>
              <p className="text-xs" style={{ color: '#94A3B8' }}>This image will appear as the full-screen hero background on the website.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><Field label="Tagline" value={form.tagline} error={errors.tagline} onChange={handleChange('tagline')} placeholder="Where Luxury Meets Comfort" /></div>
            <Field label="Button Text" value={form.heroButtonText} error={errors.heroButtonText} onChange={handleChange('heroButtonText')} placeholder="BOOK YOUR STAY" />
          </div>
        </div>

        <div className="p-5 card-hover" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#1E293B' }}>
            <MdMail size={16} style={{ color: '#2563EB' }} /> Newsletter
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><Field label="Title" value={form.newsletterTitle} error={errors.newsletterTitle} onChange={handleChange('newsletterTitle')} placeholder="Sign Up for Exclusive Offers" /></div>
            <Field label="Button Text" value={form.newsletterButtonText} error={errors.newsletterButtonText} onChange={handleChange('newsletterButtonText')} placeholder="Join Now" />
            <Field label="Input Placeholder" value={form.newsletterPlaceholder} error={errors.newsletterPlaceholder} onChange={handleChange('newsletterPlaceholder')} placeholder="Enter your email" />
          </div>
        </div>

        <div className="p-5 card-hover" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#1E293B' }}>
            <MdWeb size={16} style={{ color: '#2563EB' }} /> Section Headings
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><Field label="Rooms Section Title" value={form.roomsSectionTitle} error={errors.roomsSectionTitle} onChange={handleChange('roomsSectionTitle')} placeholder="Book your stay and relax in luxury" /></div>
            <Field label="Facility Section Title" value={form.facilityTitle} error={errors.facilityTitle} onChange={handleChange('facilityTitle')} placeholder="Facilities & Services" />
            <Field label="Facility Subtitle" value={form.facilitySubtitle} error={errors.facilitySubtitle} onChange={handleChange('facilitySubtitle')} placeholder="Services" />
          </div>
        </div>

          <div className="p-5 card-hover" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
            <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#1E293B' }}>
              <MdInfo size={16} style={{ color: '#2563EB' }} /> About Page
            </h3>
            <div className="flex flex-col md:flex-row gap-6 mb-4">
              <div className="flex-shrink-0">
                <label className="block text-xs font-semibold mb-2" style={{ color: '#6B7280' }}>About Image</label>
                <label className="flex flex-col items-center justify-center w-32 h-32 cursor-pointer transition-all rounded"
                  style={{
                    border: `2px dashed ${aboutDragOver ? '#D4AF37' : '#E5E7EB'}`,
                    background: aboutDragOver ? 'rgba(212, 175, 55, 0.05)' : '#F8FAFC',
                  }}
                  onDragOver={e => { e.preventDefault(); setAboutDragOver(true) }}
                  onDragLeave={() => setAboutDragOver(false)}
                  onDrop={e => { e.preventDefault(); setAboutDragOver(false); const f = e.dataTransfer.files?.[0]; if (f?.type?.startsWith('image/')) setAboutImage(f) }}
                >
                  {aboutImage ? (
                    <img src={URL.createObjectURL(aboutImage)} alt="preview" className="w-full h-full object-cover rounded" />
                  ) : form.aboutImage ? (
                    <img src={form.aboutImage} alt="About" className="w-full h-full object-cover rounded" />
                  ) : (
                    <div className="text-center p-3">
                      <MdCameraAlt size={24} style={{ color: '#94A3B8' }} className="mx-auto mb-1" />
                      <p className="text-[10px]" style={{ color: '#94A3B8' }}>Upload Image</p>
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={e => setAboutImage(e.target.files?.[0] ?? null)} />
                </label>
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-xs" style={{ color: '#94A3B8' }}>Recommended size: 800x600px</p>
                <p className="text-xs" style={{ color: '#94A3B8' }}>This image will appear on the About Us page alongside your content.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Page Title" value={form.aboutTitle} error={errors.aboutTitle} onChange={handleChange('aboutTitle')} placeholder="About Deluxe Hotels" />
              <Field label="Subtitle" value={form.aboutSubtitle} error={errors.aboutSubtitle} onChange={handleChange('aboutSubtitle')} placeholder="Experience the pinnacle of luxury..." />
              <div className="sm:col-span-2"><Field label="Content" value={form.aboutContent} error={errors.aboutContent} onChange={handleChange('aboutContent')} type="textarea" /></div>
            </div>
          </div>

        {/* Facilities & Services */}
        <div className="p-5 card-hover" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2" style={{ color: '#1E293B' }}>
              <MdHotel size={16} style={{ color: '#2563EB' }} /> Facilities & Services
            </h3>
            <Button type="button" variant="secondary" size="sm" icon={MdAdd} onClick={openAddFacility}>Add Facility</Button>
          </div>
          {aboutLoading ? (
            <p className="text-sm" style={{ color: '#94A3B8' }}>Loading...</p>
          ) : aboutData.facilities.length === 0 ? (
            <p className="text-sm" style={{ color: '#94A3B8' }}>No facilities added yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {aboutData.facilities.map((item, idx) => {
                const Icon = getIcon(item.icon)
                return (
                  <div key={item._id || idx} className="flex items-center gap-3 p-3 rounded" style={{ background: '#F8FAFC', border: '1px solid #E5E7EB' }}>
                    <div className="flex-shrink-0 w-8 h-8 rounded flex items-center justify-center" style={{ background: '#EFF6FF' }}>
                      {Icon ? <Icon size={16} style={{ color: '#2563EB' }} /> : <MdHotel size={16} style={{ color: '#2563EB' }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: '#1E293B' }}>{item.title}</p>
                      <p className="text-xs truncate" style={{ color: '#6B7280' }}>{item.desc}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button type="button" onClick={() => openEditFacility(item)} className="w-8 h-8 rounded flex items-center justify-center transition-all hover:opacity-70" style={{ color: '#2563EB' }}><MdEdit size={16} /></button>
                      <button type="button" onClick={() => confirmDelete(item._id, 'facility')} className="w-8 h-8 rounded flex items-center justify-center transition-all hover:opacity-70" style={{ color: '#DC2626' }}><MdDelete size={16} /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Our Amenities */}
        <div className="p-5 card-hover" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2" style={{ color: '#1E293B' }}>
              <MdStar size={16} style={{ color: '#2563EB' }} /> Our Amenities
            </h3>
            <Button type="button" variant="secondary" size="sm" icon={MdAdd} onClick={openAddAmenity}>Add Amenity</Button>
          </div>
          {aboutLoading ? (
            <p className="text-sm" style={{ color: '#94A3B8' }}>Loading...</p>
          ) : aboutData.amenities.length === 0 ? (
            <p className="text-sm" style={{ color: '#94A3B8' }}>No amenities added yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {aboutData.amenities.map((item, idx) => {
                const Icon = getIcon(item.icon)
                return (
                  <div key={item._id || idx} className="flex items-center gap-3 p-3 rounded" style={{ background: '#F8FAFC', border: '1px solid #E5E7EB' }}>
                    <div className="flex-shrink-0 w-8 h-8 rounded flex items-center justify-center" style={{ background: '#EFF6FF' }}>
                      {Icon ? <Icon size={16} style={{ color: '#2563EB' }} /> : <MdStar size={16} style={{ color: '#2563EB' }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: '#1E293B' }}>{item.title}</p>
                      <p className="text-xs truncate" style={{ color: '#6B7280' }}>{item.desc}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button type="button" onClick={() => openEditAmenity(item)} className="w-8 h-8 rounded flex items-center justify-center transition-all hover:opacity-70" style={{ color: '#2563EB' }}><MdEdit size={16} /></button>
                      <button type="button" onClick={() => confirmDelete(item._id, 'amenity')} className="w-8 h-8 rounded flex items-center justify-center transition-all hover:opacity-70" style={{ color: '#DC2626' }}><MdDelete size={16} /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Hotel History / Our Story */}
        <div className="p-5 card-hover" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#1E293B' }}>
            <MdHistory size={16} style={{ color: '#2563EB' }} /> Hotel History / Our Story
          </h3>
          <div className="flex flex-col gap-3">
            <textarea className="input-field" value={formHistory} onChange={e => setFormHistory(e.target.value)} rows={5} placeholder="Write about the hotel's history..." style={{ resize: 'vertical' }} />
            <div className="flex justify-end">
              <Button type="button" variant="primary" size="sm" icon={MdSave} onClick={handleSaveHistory} loading={historySaving}>Save History</Button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="p-5 card-hover" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#1E293B' }}>
            <MdTrendingUp size={16} style={{ color: '#2563EB' }} /> Statistics
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Luxury Rooms</label>
              <input type="text" className="input-field" value={formStats.luxuryRooms} onChange={e => setFormStats(p => ({ ...p, luxuryRooms: e.target.value }))} placeholder="e.g. 50+" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Happy Guests</label>
              <input type="text" className="input-field" value={formStats.happyGuests} onChange={e => setFormStats(p => ({ ...p, happyGuests: e.target.value }))} placeholder="e.g. 200+" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Years Experience</label>
              <input type="text" className="input-field" value={formStats.yearsExperience} onChange={e => setFormStats(p => ({ ...p, yearsExperience: e.target.value }))} placeholder="e.g. 15+" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Guest Rating</label>
              <input type="text" className="input-field" value={formStats.guestRating} onChange={e => setFormStats(p => ({ ...p, guestRating: e.target.value }))} placeholder="e.g. 4.8" />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button type="button" variant="primary" size="sm" icon={MdSave} onClick={handleSaveStats} loading={statsSaving}>Save Stats</Button>
          </div>
        </div>

        <div className="p-5 card-hover" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#1E293B' }}>
            <MdContactSupport size={16} style={{ color: '#2563EB' }} /> Contact Page
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Page Title" value={form.contactTitle} error={errors.contactTitle} onChange={handleChange('contactTitle')} placeholder="Contact Us" />
            <Field label="Subtitle" value={form.contactSubtitle} error={errors.contactSubtitle} onChange={handleChange('contactSubtitle')} placeholder="Get in touch with us" />
          </div>
        </div>

        <div className="p-5 card-hover" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#1E293B' }}>
            <MdCopyright size={16} style={{ color: '#2563EB' }} /> Footer
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <Field label="Copyright Text" value={form.copyrightText} error={errors.copyrightText} onChange={handleChange('copyrightText')} placeholder="Leave empty to use hotel name" />
          </div>
        </div>

        <div className="p-5 card-hover" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
          <h3 className="font-semibold mb-4" style={{ color: '#1E293B' }}>Hotel Policies</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Check-in Time" value={form.checkinTime} error={errors.checkinTime} onChange={handleChange('checkinTime')} type="time" />
            <Field label="Check-out Time" value={form.checkoutTime} error={errors.checkoutTime} onChange={handleChange('checkoutTime')} type="time" />
            <Field label="Currency" value={form.currency} error={errors.currency} onChange={handleChange('currency')} type="select" />
            <Field label="Tax Rate (%)" value={form.taxRate} error={errors.taxRate} onChange={handleChange('taxRate')} type="number" required />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pb-8">
          <Button variant="secondary" onClick={() => fetchSettings()}>Reset</Button>
          <Button type="submit" variant="primary" icon={MdSave} loading={saving} size="lg">Save Settings</Button>
        </div>

        {/* Facility Modal */}
        <Modal open={!!facilityModal} onClose={() => setFacilityModal(null)} title={facilityModal?.mode === 'add' ? 'Add Facility' : 'Edit Facility'} width="max-w-lg">
          <div className="flex flex-col" style={{ gap: '16px' }}>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Icon</label>
              <select className="input-field" value={formFacility.icon} onChange={e => setFormFacility(p => ({ ...p, icon: e.target.value }))}>
                {iconOptions.map(group => (
                  <optgroup key={group.group} label={group.group}>
                    {group.icons.map(iconName => {
                      const Icon = getIcon(iconName)
                      return <option key={iconName} value={iconName}>{iconName}</option>
                    })}
                  </optgroup>
                ))}
              </select>
              <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: '#6B7280' }}>
                <span>Preview:</span>
                <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: '#EFF6FF' }}>
                  {(() => { const Icon = getIcon(formFacility.icon); return Icon ? <Icon size={16} style={{ color: '#2563EB' }} /> : null })()}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Title <span style={{ color: '#DC2626' }}>*</span></label>
              <input className="input-field" value={formFacility.title} onChange={e => setFormFacility(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Swimming Pool" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Description <span style={{ color: '#DC2626' }}>*</span></label>
              <textarea className="input-field" value={formFacility.desc} onChange={e => setFormFacility(p => ({ ...p, desc: e.target.value }))} rows={3} placeholder="Description of this facility" />
            </div>
            <div className="flex" style={{ gap: '10px' }}>
              <Button variant="secondary" onClick={() => setFacilityModal(null)} className="flex-1">Cancel</Button>
              <Button variant="primary" icon={MdSave} onClick={handleSaveFacility} className="flex-1">Save</Button>
            </div>
          </div>
        </Modal>

        {/* Amenity Modal */}
        <Modal open={!!amenityModal} onClose={() => setAmenityModal(null)} title={amenityModal?.mode === 'add' ? 'Add Amenity' : 'Edit Amenity'} width="max-w-lg">
          <div className="flex flex-col" style={{ gap: '16px' }}>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Icon</label>
              <select className="input-field" value={formAmenity.icon} onChange={e => setFormAmenity(p => ({ ...p, icon: e.target.value }))}>
                {iconOptions.map(group => (
                  <optgroup key={group.group} label={group.group}>
                    {group.icons.map(iconName => {
                      const Icon = getIcon(iconName)
                      return <option key={iconName} value={iconName}>{iconName}</option>
                    })}
                  </optgroup>
                ))}
              </select>
              <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: '#6B7280' }}>
                <span>Preview:</span>
                <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: '#EFF6FF' }}>
                  {(() => { const Icon = getIcon(formAmenity.icon); return Icon ? <Icon size={16} style={{ color: '#2563EB' }} /> : null })()}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Title <span style={{ color: '#DC2626' }}>*</span></label>
              <input className="input-field" value={formAmenity.title} onChange={e => setFormAmenity(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Free Wi-Fi" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Description <span style={{ color: '#DC2626' }}>*</span></label>
              <textarea className="input-field" value={formAmenity.desc} onChange={e => setFormAmenity(p => ({ ...p, desc: e.target.value }))} rows={3} placeholder="Description of this amenity" />
            </div>
            <div className="flex" style={{ gap: '10px' }}>
              <Button variant="secondary" onClick={() => setAmenityModal(null)} className="flex-1">Cancel</Button>
              <Button variant="primary" icon={MdSave} onClick={handleSaveAmenity} className="flex-1">Save</Button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirm */}
        <ConfirmDialog
          open={!!deleteTarget}
          onClose={() => { deleteTargetRef.current = null; setDeleteTarget(null) }}
          onConfirm={handleDelete}
          title={deleteType === 'facility' ? 'Delete Facility' : 'Delete Amenity'}
          message={`Delete this ${deleteType}? This cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          loading={deleteLoading}
        />
      </form>
    </div>
  )
}

export default Settings
