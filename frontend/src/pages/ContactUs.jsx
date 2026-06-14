import React, { useState } from 'react'
import axios from 'axios'
import { backendUrl } from '../App'
import { MdPhone, MdEmail, MdLocationOn, MdAccessTime } from 'react-icons/md'
import { useSettings } from '../context/SettingsContext'

const ContactUs = () => {
  const { settings } = useSettings()
  const address = settings?.address || '123 Luxury Avenue, Addis Ababa, Ethiopia'
  const contactTitle = settings?.contactTitle || 'Contact Us'
  const contactSubtitle = settings?.contactSubtitle || 'Get in touch with us'
  const phone = settings?.phone || '+251 11 123 4567'
  const email = settings?.email || 'info@deluxehotels.com'
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', subject: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState(null)
  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setErrors(prev => ({ ...prev, [e.target.name]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!formData.name.trim()) errs.name = 'Name is required'
    if (!formData.email.trim()) errs.email = 'Email is required'
    if (!formData.subject.trim()) errs.subject = 'Subject is required'
    if (!formData.message.trim()) errs.message = 'Message is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setNotification(null)
    try {
      const res = await axios.post(`${backendUrl}/api/message/add`, { ...formData, date: new Date().toISOString().split('T')[0] })
      if (res.data?.success) {
        setNotification({ type: 'success', message: 'Message sent successfully! We will get back to you soon.' })
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' })
      } else {
        setNotification({ type: 'error', message: res.data?.message || 'Failed to send message' })
      }
    } catch {
      setNotification({ type: 'error', message: 'Error sending message. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#F8FAFC' }}>
      <div className="relative h-[300px] bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white">{contactTitle}</h1>
          <p className="text-lg mt-3" style={{ color: '#D4AF37' }}>{contactSubtitle}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-16">
        {notification && (
          <div className={`mb-6 p-4 rounded text-sm font-medium ${notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {notification.message}
            <button onClick={() => setNotification(null)} className="float-right font-bold">&times;</button>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-10">
          <div className="md:col-span-2">
            <h2 className="text-2xl font-bold mb-6" style={{ color: '#1E293B' }}>Send Us a Message</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <input type="text" name="name" placeholder="Full Name" value={formData.name} onChange={handleChange}
                    className="w-full p-3 border rounded-lg outline-none text-sm transition-all"
                    style={{ border: '1.5px solid #E5E7EB', background: '#FFFFFF', color: '#1E293B' }} />
                  {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
                </div>
                <div>
                  <input type="email" name="email" placeholder="Email Address" value={formData.email} onChange={handleChange}
                    className="w-full p-3 border rounded-lg outline-none text-sm transition-all"
                    style={{ border: '1.5px solid #E5E7EB', background: '#FFFFFF', color: '#1E293B' }} />
                  {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <input type="tel" name="phone" placeholder="Phone Number (optional)" value={formData.phone} onChange={handleChange}
                    className="w-full p-3 border rounded-lg outline-none text-sm transition-all"
                    style={{ border: '1.5px solid #E5E7EB', background: '#FFFFFF', color: '#1E293B' }} />
                </div>
                <div>
                  <input type="text" name="subject" placeholder="Subject" value={formData.subject} onChange={handleChange}
                    className="w-full p-3 border rounded-lg outline-none text-sm transition-all"
                    style={{ border: '1.5px solid #E5E7EB', background: '#FFFFFF', color: '#1E293B' }} />
                  {errors.subject && <p className="text-xs text-red-600 mt-1">{errors.subject}</p>}
                </div>
              </div>
              <div>
                <textarea name="message" rows="5" placeholder="Your Message" value={formData.message} onChange={handleChange}
                  className="w-full p-3 border rounded-lg outline-none text-sm transition-all resize-none"
                  style={{ border: '1.5px solid #E5E7EB', background: '#FFFFFF', color: '#1E293B' }} />
                {errors.message && <p className="text-xs text-red-600 mt-1">{errors.message}</p>}
              </div>
              <button type="submit" disabled={loading}
                className="px-8 py-3 rounded-lg text-sm font-bold text-white transition-all hover:opacity-80 disabled:opacity-60"
                style={{ background: '#2563EB' }}>
                {loading ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-6" style={{ color: '#1E293B' }}>Contact Information</h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#EFF6FF' }}>
                  <MdLocationOn size={24} style={{ color: '#2563EB' }} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: '#1E293B' }}>Address</h3>
                  <p className="text-sm mt-1" style={{ color: '#6B7280' }}>{address}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#EFF6FF' }}>
                  <MdPhone size={24} style={{ color: '#2563EB' }} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: '#1E293B' }}>Phone</h3>
                  <p className="text-sm mt-1" style={{ color: '#6B7280' }}>{phone}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#EFF6FF' }}>
                  <MdEmail size={24} style={{ color: '#2563EB' }} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: '#1E293B' }}>Email</h3>
                  <p className="text-sm mt-1" style={{ color: '#6B7280' }}>{email}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#EFF6FF' }}>
                  <MdAccessTime size={24} style={{ color: '#2563EB' }} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: '#1E293B' }}>Working Hours</h3>
                  <p className="text-sm mt-1" style={{ color: '#6B7280' }}>24/7 Reception</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ContactUs
