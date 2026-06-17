import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import connectDB from "./config/mongodb.js"
import connectCloudinary from './config/cloudinary.js'
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

const app = express()
const port = process.env.PORT || 4000

connectDB()
connectCloudinary()

const allowedOrigins = [
  'http://localhost:4000',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  process.env.FRONTEND_URL,
].filter(Boolean)

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'token'],
}))

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

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

app.listen(port, () => console.log('Server started on port: ' + port))
