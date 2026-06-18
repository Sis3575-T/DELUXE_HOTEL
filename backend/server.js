import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import 'dotenv/config'
import connectDB from "./config/mongodb.js"
import connectCloudinary from './config/cloudinary.js'
import Admin from './models/adminModel.js'
import hotelRouter from './routes/hotelRoute.js'
import reservationRoute from './routes/reservationRoute.js'
import revenueRouter from './routes/revenueRoute.js'
import reviewRouter from './routes/reviewRoute.js'
import messageRouter from './routes/messageRoute.js'
import settingsRouter from './routes/settingsRoute.js'
import activityRouter from './routes/activityRoute.js'
import userRouter from './routes/userRoute.js'
import notificationRouter from './routes/notificationRoute.js'
import newsletterRouter from './routes/newsletterRoute.js'
import staffRouter from './routes/staffRoute.js'
import roleRouter from './routes/roleRoute.js'
import housekeepingRouter from './routes/housekeepingRoute.js'
import maintenanceRouter from './routes/maintenanceRoute.js'
import backupRouter from './routes/backupRoute.js'
import dashboardRouter from './routes/dashboardRoute.js'
import aboutRouter from './routes/aboutRoute.js'
import paymentRouter from './routes/paymentRoute.js'
import paymentConfig from './config/payment.js'

const app = express()
const port = process.env.PORT || 4000

connectCloudinary()

const seedAdmin = async () => {
  try {
    if (mongoose.connection.readyState !== 1) return
    const exists = await Admin.findOne({ email: 'sisay3575@gmail.com' })
    if (!exists) {
      await Admin.create({
        name: 'System Administrator',
        email: 'sisay3575@gmail.com',
        password: 'Sis3575@',
        role: 'Super Admin',
        forcePasswordChange: false,
      })
    }
    const defaultExists = await Admin.findOne({ email: 'admin@hotel.com' })
    if (!defaultExists) {
      await Admin.create({
        name: 'Administrator',
        email: 'admin@hotel.com',
        password: 'Admin@123',
        role: 'Super Admin',
      })
    }
  } catch (err) {
    console.error('Seed admin error:', err.message)
  }
}

connectDB().then(() => {
  if (mongoose.connection.readyState === 1) {
    seedAdmin()
  } else {
    mongoose.connection.once('connected', seedAdmin)
  }
}).catch(() => {
  mongoose.connection.once('connected', seedAdmin)
})

const isProduction = process.env.NODE_ENV === 'production'

const allowedOrigins = [
  'http://localhost:4000',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
].filter(Boolean)

const corsOptions = isProduction
  ? {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true)
        if (allowedOrigins.includes(origin)) return callback(null, true)
        if (origin.endsWith('.vercel.app')) return callback(null, true)
        if (origin.endsWith('.onrender.com')) return callback(null, true)
        if (origin.endsWith('.netlify.app')) return callback(null, true)
        callback(null, true) // allow all in production too
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'token'],
    }
  : {
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'token'],
    }

app.use(cors(corsOptions))

app.use(express.json({ limit: '50mb', verify: (req, _res, buf) => { req.rawBody = buf.toString() } }))
app.use(express.urlencoded({ extended: true, limit: '50mb', verify: (req, _res, buf) => { req.rawBody = buf.toString() } }))

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`)
  next()
})

const rateLimitMap = new Map()
const RATE_LIMIT_WINDOW = 60000
const RATE_LIMIT_MAX = 100

app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown'
  const now = Date.now()
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, [])
  }
  const timestamps = rateLimitMap.get(ip).filter(t => now - t < RATE_LIMIT_WINDOW)
  if (timestamps.length >= RATE_LIMIT_MAX) {
    return res.status(429).json({ success: false, message: 'Too many requests. Please try again later.' })
  }
  timestamps.push(now)
  rateLimitMap.set(ip, timestamps)
  next()
})

app.use('/api/hotel', hotelRouter)
app.use('/api/reservation', reservationRoute)
app.use('/api/revenue', revenueRouter)
app.use('/api/review', reviewRouter)
app.use('/api/message', messageRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/activity', activityRouter)
app.use('/api/user', userRouter)
app.use('/api/notification', notificationRouter)
app.use('/api/newsletter', newsletterRouter)
app.use('/api/staff', staffRouter)
app.use('/api/role', roleRouter)
app.use('/api/housekeeping', housekeepingRouter)
app.use('/api/maintenance', maintenanceRouter)
app.use('/api/backup', backupRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/about', aboutRouter)
app.use('/api/payment', paymentRouter)

app.get('/', (req, res) => {
  res.send("API working")
})

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ success: false, message: 'Internal server error' })
})

app.listen(port, () => {
  console.log('Server started on port: ' + port)
  paymentConfig.logConfig('[startup]')
  const pce = paymentConfig.validate()
  if (pce.length > 0) console.warn('[startup] Payment config warnings:', pce)
  else console.log('[startup] Payment configuration valid')
})
