import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import Admin from '../models/adminModel.js'

const loginRateLimitMap = new Map()
const LOGIN_RATE_LIMIT_WINDOW = 15 * 60 * 1000
const LOGIN_RATE_LIMIT_MAX = 5

const checkLoginRateLimit = (ip) => {
  const now = Date.now()
  if (!loginRateLimitMap.has(ip)) {
    loginRateLimitMap.set(ip, [])
  }
  const timestamps = loginRateLimitMap.get(ip).filter(t => now - t < LOGIN_RATE_LIMIT_WINDOW)
  if (timestamps.length >= LOGIN_RATE_LIMIT_MAX) {
    return { blocked: true, retryAfter: Math.ceil((timestamps[0] + LOGIN_RATE_LIMIT_WINDOW - now) / 1000) }
  }
  timestamps.push(now)
  loginRateLimitMap.set(ip, timestamps)
  return { blocked: false }
}

export const adminLogin = async (req, res) => {
  try {
    const ip = req.ip || req.connection.remoteAddress || 'unknown'
    const rateCheck = checkLoginRateLimit(ip)
    if (rateCheck.blocked) {
      return res.status(429).json({
        success: false,
        message: `Too many login attempts. Try again in ${rateCheck.retryAfter} seconds.`
      })
    }

    const { email, password } = req.body

    console.log(`[login] Login attempt for: ${email}`)

    if (!email || !password) {
      console.log('[login] Missing email or password')
      return res.json({ success: false, message: 'Email and password are required' })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      console.log('[login] Invalid email format')
      return res.json({ success: false, message: 'Invalid Email or Password' })
    }

    let admin = await Admin.findOne({ email: email.toLowerCase() })
    if (!admin) {
      console.log(`[login] Admin NOT FOUND in DB for: ${email.toLowerCase()}`)
      const totalAdmins = await Admin.countDocuments()
      console.log(`[login] Total admins in DB: ${totalAdmins}`)

      if (totalAdmins === 0) {
        console.log('[login] No admins exist - attempting emergency seed')
        try {
          await Admin.create([
            {
              name: 'System Administrator',
              email: 'sisay3575@gmail.com',
              password: 'Sis3575@',
              role: 'Super Admin',
            },
            {
              name: 'Administrator',
              email: 'admin@hotel.com',
              password: 'Admin@123',
              role: 'Super Admin',
            }
          ])
          console.log('[login] Emergency seed created 2 admin accounts')
          admin = await Admin.findOne({ email: email.toLowerCase() })
          if (admin) {
            console.log(`[login] Retry FOUND admin after emergency seed`)
          }
        } catch (seedErr) {
          console.error('[login] Emergency seed failed:', seedErr.message)
        }
      }

      if (!admin) {
        return res.json({ success: false, message: 'Invalid Email or Password' })
      }
    }
    console.log(`[login] Admin FOUND: ${admin.email}, role: ${admin.role}`)

    const isMatch = await admin.comparePassword(password)
    console.log(`[login] Password match: ${isMatch}`)
    if (!isMatch) {
      return res.json({ success: false, message: 'Invalid Email or Password' })
    }

    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    loginRateLimitMap.delete(ip)

    res.json({
      success: true,
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        forcePasswordChange: admin.forcePasswordChange,
      }
    })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: 'Error logging in' })
  }
}

export const verifyToken = async (req, res) => {
  res.json({ success: true, admin: req.admin })
}

export const setupAdmin = async (req, res) => {
  try {
    const state = mongoose.connection.readyState
    const stateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' }
    const dbStatus = stateMap[state] || 'unknown'

    let adminCount = 0
    let admins = []
    let createResult = null

    if (state === 1) {
      adminCount = await Admin.countDocuments()
      admins = await Admin.find({}).select('email name role forcePasswordChange')

      const targetEmail = 'sisay3575@gmail.com'
      const existing = admins.find(a => a.email === targetEmail)
      if (!existing) {
        await Admin.create({
          name: 'System Administrator',
          email: targetEmail,
          password: 'Sis3575@',
          role: 'Super Admin',
          forcePasswordChange: false,
        })
        createResult = `Created ${targetEmail}`
        admins = await Admin.find({}).select('email name role forcePasswordChange')
        adminCount = admins.length
      } else {
        createResult = `${targetEmail} already exists`
      }
    }

    res.json({
      success: true,
      dbConnection: dbStatus,
      adminCount,
      admins: admins.map(a => ({ email: a.email, name: a.name, role: a.role })),
      createResult,
    })
  } catch (error) {
    res.json({ success: false, message: error.message, stack: error.stack })
  }
}
