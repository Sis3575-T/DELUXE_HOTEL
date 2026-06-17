import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({
  hotelName: { type: String, default: 'Abay Grand Hotel' },
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  website: { type: String, default: '' },
  socialLinks: [{
    platform: { type: String, default: '' },
    url: { type: String, default: '' },
  }],
  description: { type: String, default: '' },
  tagline: { type: String, default: 'Where Luxury Meets Comfort' },
  heroButtonText: { type: String, default: 'BOOK YOUR STAY' },
  newsletterTitle: { type: String, default: 'Sign Up for Exclusive Offers' },
  newsletterButtonText: { type: String, default: 'Join Now' },
  newsletterPlaceholder: { type: String, default: 'Enter your email' },
  roomsSectionTitle: { type: String, default: 'Book your stay and relax in luxury' },
  facilityTitle: { type: String, default: 'Facilities & Services' },
  facilitySubtitle: { type: String, default: 'Services' },
  aboutTitle: { type: String, default: 'About Deluxe Hotels' },
  aboutSubtitle: { type: String, default: 'Experience the pinnacle of luxury and comfort' },
  aboutContent: { type: String, default: '' },
  aboutImage: { type: String, default: '' },
  contactTitle: { type: String, default: 'Contact Us' },
  contactSubtitle: { type: String, default: 'Get in touch with us' },
  copyrightText: { type: String, default: '' },
  checkinTime: { type: String, default: '14:00' },
  checkoutTime: { type: String, default: '12:00' },
  currency: { type: String, default: 'ETB' },
  taxRate: { type: String, default: '15' },
  logo: { type: String, default: '' },
  heroImage: { type: String, default: '' },
})

settingsSchema.index({ hotelName: 1 })

const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema)
export default Settings
