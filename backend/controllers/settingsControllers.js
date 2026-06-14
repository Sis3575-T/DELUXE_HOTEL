import Settings from '../models/settingsModels.js'
import { v2 as cloudinary } from "cloudinary";

const defaultSettings = {
  hotelName: 'Abay Grand Hotel',
  address: 'Bole Road, Addis Ababa, Ethiopia',
  phone: '+251 11 554 4000',
  email: 'info@abaygrand.com',
  website: 'https://abaygrand.com',
  socialLinks: [
    { platform: 'Facebook', url: 'https://facebook.com/abaygrand' },
    { platform: 'Twitter', url: 'https://twitter.com/abaygrand' },
    { platform: 'Instagram', url: 'https://instagram.com/abaygrand' },
    { platform: 'LinkedIn', url: 'https://linkedin.com/company/abaygrand' },
  ],
  description: 'Experience luxury at the heart of Addis Ababa. Abay Grand Hotel offers world-class accommodations, fine dining, and exceptional service.',
  tagline: 'Where Luxury Meets Comfort',
  heroButtonText: 'BOOK YOUR STAY',
  newsletterTitle: 'Sign Up for Exclusive Offers',
  newsletterButtonText: 'Join Now',
  newsletterPlaceholder: 'Enter your email',
  roomsSectionTitle: 'Book your stay and relax in luxury',
  facilityTitle: 'Facilities & Services',
  facilitySubtitle: 'Services',
  aboutTitle: 'About Deluxe Hotels',
  aboutSubtitle: 'Experience the pinnacle of luxury and comfort',
  aboutContent: '',
  aboutImage: '',
  contactTitle: 'Contact Us',
  contactSubtitle: 'Get in touch with us',
  copyrightText: '',
  checkinTime: '14:00',
  checkoutTime: '12:00',
  currency: 'ETB',
  taxRate: '15',
}

const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne()
    if (!settings) {
      settings = await Settings.create(defaultSettings)
    } else {
      await migrateSettings()
    }
    res.json({ success: true, settings })
  } catch (error) {
    console.error('getSettings error:', error?.message || error)
    res.status(500).json({ success: false, message: 'Error fetching settings' })
  }
}

const migrateOldSocialFields = (settings) => {
  const oldFields = ['facebook', 'twitter', 'instagram', 'linkedin']
  const hasOldData = oldFields.some(f => settings[f])
  if (hasOldData && (!settings.socialLinks || settings.socialLinks.length === 0)) {
    const links = []
    const map = { facebook: 'Facebook', twitter: 'Twitter', instagram: 'Instagram', linkedin: 'LinkedIn' }
    oldFields.forEach(f => {
      if (settings[f]) links.push({ platform: map[f], url: settings[f] })
    })
    settings.socialLinks = links
    return true
  }
  return false
}

const updateSettings = async (req, res) => {
  try {
    const updateData = {}
    const fields = [
      'hotelName', 'address', 'phone', 'email', 'website',
      'description', 'tagline', 'heroButtonText',
      'newsletterTitle', 'newsletterButtonText', 'newsletterPlaceholder',
      'roomsSectionTitle', 'facilityTitle', 'facilitySubtitle',
      'aboutTitle', 'aboutSubtitle', 'aboutContent', 'aboutImage',
      'contactTitle', 'contactSubtitle', 'copyrightText',
      'checkinTime', 'checkoutTime', 'currency', 'taxRate'
    ]
    fields.forEach(f => {
      if (req.body[f] !== undefined) updateData[f] = req.body[f]
    })

    if (req.body.socialLinks !== undefined) {
      updateData.socialLinks = typeof req.body.socialLinks === 'string'
        ? JSON.parse(req.body.socialLinks)
        : req.body.socialLinks
    }

    if (req.files?.logo?.[0]) {
      const result = await cloudinary.uploader.upload(req.files.logo[0].path, { resource_type: 'image' })
      updateData.logo = result?.secure_url || result?.secureUrl || ''
    }
    if (req.files?.aboutImage?.[0]) {
      const result = await cloudinary.uploader.upload(req.files.aboutImage[0].path, { resource_type: 'image' })
      updateData.aboutImage = result?.secure_url || result?.secureUrl || ''
    }

    let settings = await Settings.findOne()
    if (!settings) {
      settings = await Settings.create({ ...defaultSettings, ...updateData })
    } else {
      settings = await Settings.findByIdAndUpdate(settings._id, updateData, { new: true })
    }

    res.json({ success: true, message: 'Settings updated successfully', settings })
  } catch (error) {
    console.error('updateSettings error:', error?.message || error)
    res.status(500).json({ success: false, message: 'Error updating settings' })
  }
}

const migrateSettings = async () => {
  const settings = await Settings.findOne()
  if (settings && migrateOldSocialFields(settings)) {
    await settings.save()
  }
}

const getPublicSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne()
    if (!settings) {
      settings = await Settings.create(defaultSettings)
    } else {
      await migrateSettings()
    }
    res.json({ success: true, settings })
  } catch (error) {
    console.error('getPublicSettings error:', error?.message || error)
    res.status(500).json({ success: false, message: 'Error fetching settings' })
  }
}

export { getSettings, updateSettings, getPublicSettings }
