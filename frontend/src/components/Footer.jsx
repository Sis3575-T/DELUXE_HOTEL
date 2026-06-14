import React, { useState } from 'react'
import axios from 'axios'
import { backendUrl } from '../App'
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaYoutube, FaPinterest, FaWhatsapp, FaGlobe } from 'react-icons/fa'
import { useSettings } from '../context/SettingsContext'
const Footer = () => {
  const { settings } = useSettings()
  const hotelName = settings?.hotelName || 'DELUXE HOTELS'
  const socialLinks = settings?.socialLinks || []
  const newsletterTitle = settings?.newsletterTitle || 'Sign Up for Exclusive Offers'
  const newsletterButtonText = settings?.newsletterButtonText || 'Join Now'
  const newsletterPlaceholder = settings?.newsletterPlaceholder || 'Enter your email'
  const copyrightText = settings?.copyrightText || `\u00A9 ${new Date().getFullYear()} ${hotelName}. All rights reserved.`

  const iconMap = {
    facebook: FaFacebook, twitter: FaTwitter, instagram: FaInstagram,
    linkedin: FaLinkedin, youtube: FaYoutube, pinterest: FaPinterest, whatsapp: FaWhatsapp,
  }
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterMsg, setNewsletterMsg] = useState('')
  const [newsletterLoading, setNewsletterLoading] = useState(false)

  const handleNewsletter = async (e) => {
    e.preventDefault()
    if (!newsletterEmail.trim()) return
    setNewsletterLoading(true)
    setNewsletterMsg('')
    try {
      const res = await axios.post(`${backendUrl}/api/newsletter/subscribe`, { email: newsletterEmail.trim() })
      if (res.data?.success) {
        setNewsletterMsg(res.data.message || 'Subscribed successfully!')
        setNewsletterEmail('')
      } else {
        setNewsletterMsg(res.data?.message || 'Subscription failed')
      }
    } catch {
      setNewsletterMsg('Error subscribing. Please try again.')
    } finally {
      setNewsletterLoading(false)
    }
  }

  return (
    <div id="footer-contact" className= 'flex flex-col gap-12 px-16 py-16 bg-black text-white'>
      {/* top section */}
      <div className= 'grid place-content-center '>
        <h2 className="text-4xl font-bold">{newsletterTitle}</h2>
        <form onSubmit={handleNewsletter} className='flex items-center justify-center max-w-xl mx-auto w-full'>
          <input type="email" placeholder={newsletterPlaceholder} value={newsletterEmail} onChange={e => setNewsletterEmail(e.target.value)} className="flex-grow px-10 py-4 border-2 border-r-0 border-lime-500 rounded-l-full outline-none text-sm bg-white" style={{ color: '#000' }} />
          <button type="submit" disabled={newsletterLoading} className="bg-lime-400 hover:bg-lime-600 text-white font-bold py-4 px-8 rounded-r-full disabled:opacity-60">{newsletterLoading ? 'Subscribing...' : newsletterButtonText}</button>
        </form>
        {newsletterMsg && <p className="text-sm text-center mt-2 text-lime-400">{newsletterMsg}</p>}
      </div>
      {/* bottom section */}
      <div className= 'flex justify-center gap-4 mt-3 text-lime-500'>
        {socialLinks.filter(l => l.url).map((link, i) => {
          const Icon = iconMap[link.platform?.toLowerCase()] || FaGlobe
          return (
            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" title={link.platform}>
              <Icon className="text-3xl cursor-pointer hover:text-lime-400" />
            </a>
          )
        })}
      </div>
      <p className="text-center">{copyrightText}</p>
    </div>
  )
}

export default Footer
