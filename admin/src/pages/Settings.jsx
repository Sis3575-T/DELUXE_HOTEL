import React, { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { backendUrl, useSettings } from '../App'
import { MdSave, MdHotel, MdLocationOn, MdPhone, MdEmail, MdLanguage, MdCameraAlt, MdRefresh, MdAdd, MdClose, MdTextFields, MdCampaign, MdMail, MdWeb, MdInfo, MdContactSupport, MdCopyright } from 'react-icons/md'
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaYoutube, FaGlobe } from 'react-icons/fa'
import Button from '../components/ui/Button'
import notify from '../components/ui/Toast'

const platformIcons = { facebook: FaFacebook, twitter: FaTwitter, instagram: FaInstagram, linkedin: FaLinkedin, youtube: FaYoutube }

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
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

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
          tagline: s.tagline || '', heroButtonText: s.heroButtonText || '',
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
      let body
      let headers = getAuthHeaders()
      if (logo || aboutImage) {
        const fd = new FormData()
        if (logo) fd.append('logo', logo)
        if (aboutImage) fd.append('aboutImage', aboutImage)
        Object.entries(form).forEach(([k, v]) => {
          if (k === 'socialLinks') {
            fd.append(k, JSON.stringify(v))
          } else {
            fd.append(k, v)
          }
        })
        body = fd
        headers = { ...headers, 'Content-Type': 'multipart/form-data' }
      } else {
        body = form
      }
      const r = await axios.put(backendUrl + '/api/settings/update', body, { headers })
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

  const Field = ({ label, field, icon: Icon, type = 'text', required, placeholder }) => (
    <div>
      <label className="block text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>
        {label} {required && <span style={{ color: '#DC2626' }}>*</span>}
      </label>
      <div className="relative">
        {Icon && <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />}
        {type === 'textarea' ? (
          <textarea className={`input-field ${errors[field] ? 'error' : ''}`} value={form[field]} onChange={handleChange(field)} rows={3}
            style={Icon ? { paddingLeft: '36px', resize: 'vertical' } : { resize: 'vertical' }} />
        ) : type === 'select' ? (
          <select className={`input-field ${errors[field] ? 'error' : ''}`} value={form[field]} onChange={handleChange(field)}>
            {['ETB', 'USD', 'EUR'].map(c => <option key={c} value={c}>{c} — {c === 'ETB' ? 'Ethiopian Birr' : c === 'USD' ? 'US Dollar' : 'Euro'}</option>)}
          </select>
        ) : (
          <input type={type} className={`input-field ${errors[field] ? 'error' : ''}`} value={form[field]} onChange={handleChange(field)}
            placeholder={placeholder} style={Icon ? { paddingLeft: '36px' } : {}} />
        )}
      </div>
      {errors[field] && <p className="text-xs mt-1" style={{ color: '#DC2626' }}>{errors[field]}</p>}
    </div>
  )

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
                style={{ border: '2px dashed #E5E7EB', background: '#F8FAFC' }}>
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
                <Field label="Hotel Name" field="hotelName" required />
              </div>
              <div className="sm:col-span-2">
                <Field label="Description" field="description" type="textarea" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 card-hover" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#1E293B' }}>
            <MdLocationOn size={16} style={{ color: '#2563EB' }} /> Contact Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><Field label="Address" field="address" icon={MdLocationOn} required /></div>
            <Field label="Phone" field="phone" icon={MdPhone} required />
            <Field label="Email" field="email" icon={MdEmail} type="email" required />
            <div className="sm:col-span-2"><Field label="Website" field="website" icon={MdLanguage} type="url" /></div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><Field label="Tagline" field="tagline" placeholder="Where Luxury Meets Comfort" /></div>
            <Field label="Button Text" field="heroButtonText" placeholder="BOOK YOUR STAY" />
          </div>
        </div>

        <div className="p-5 card-hover" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#1E293B' }}>
            <MdMail size={16} style={{ color: '#2563EB' }} /> Newsletter
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><Field label="Title" field="newsletterTitle" placeholder="Sign Up for Exclusive Offers" /></div>
            <Field label="Button Text" field="newsletterButtonText" placeholder="Join Now" />
            <Field label="Input Placeholder" field="newsletterPlaceholder" placeholder="Enter your email" />
          </div>
        </div>

        <div className="p-5 card-hover" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#1E293B' }}>
            <MdWeb size={16} style={{ color: '#2563EB' }} /> Section Headings
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><Field label="Rooms Section Title" field="roomsSectionTitle" placeholder="Book your stay and relax in luxury" /></div>
            <Field label="Facility Section Title" field="facilityTitle" placeholder="Facilities & Services" />
            <Field label="Facility Subtitle" field="facilitySubtitle" placeholder="Services" />
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
                  style={{ border: '2px dashed #E5E7EB', background: '#F8FAFC' }}>
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
              <Field label="Page Title" field="aboutTitle" placeholder="About Deluxe Hotels" />
              <Field label="Subtitle" field="aboutSubtitle" placeholder="Experience the pinnacle of luxury..." />
              <div className="sm:col-span-2"><Field label="Content" field="aboutContent" type="textarea" /></div>
            </div>
          </div>

        <div className="p-5 card-hover" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#1E293B' }}>
            <MdContactSupport size={16} style={{ color: '#2563EB' }} /> Contact Page
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Page Title" field="contactTitle" placeholder="Contact Us" />
            <Field label="Subtitle" field="contactSubtitle" placeholder="Get in touch with us" />
          </div>
        </div>

        <div className="p-5 card-hover" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#1E293B' }}>
            <MdCopyright size={16} style={{ color: '#2563EB' }} /> Footer
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <Field label="Copyright Text" field="copyrightText" placeholder="Leave empty to use hotel name" />
          </div>
        </div>

        <div className="p-5 card-hover" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
          <h3 className="font-semibold mb-4" style={{ color: '#1E293B' }}>Hotel Policies</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Check-in Time" field="checkinTime" type="time" />
            <Field label="Check-out Time" field="checkoutTime" type="time" />
            <Field label="Currency" field="currency" type="select" />
            <Field label="Tax Rate (%)" field="taxRate" type="number" required />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pb-8">
          <Button variant="secondary" onClick={() => fetchSettings()}>Reset</Button>
          <Button type="submit" variant="primary" icon={MdSave} loading={saving} size="lg">Save Settings</Button>
        </div>
      </form>
    </div>
  )
}

export default Settings
