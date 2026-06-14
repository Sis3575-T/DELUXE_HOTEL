import express from 'express'
import cors from 'cors'
import  'dotenv/config'
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

/*
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '.env') })

console.log('Using MONGODB_URI:', process.env.MONGODB_URI)
import connectDB from './config/mongodb.js'
import connectCloudinary from './config/cloudinary.js'
import hotelRouter from './routes/hotelRoute.js'*/

const app = express()
const port = process.env.PORT || 4000
connectDB().then(async () => {
  try {
    const { syncAllRoomStatuses } = await import('./controllers/reservationControllers.js')
    await syncAllRoomStatuses()
    console.log('Room availability statuses synchronized')
  } catch (err) {
    console.error('Room status sync on startup:', err?.message || err)
  }
})
connectCloudinary()
app.use(cors())
app.use(express.json())
// Log incoming requests for debugging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()}  ${req.method} ${req.originalUrl}`)
    next()
})

app.use('/api/hotel', hotelRouter)
app.use('/api/reservation',reservationRoute)
app.use('/api/revenue', revenueRouter)
app.use('/api/review', reviewRouter)
app.use('/api/message', messageRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/activity', activityRouter)
app.use('/api/user',userRouter)
app.use('/api/notification', notificationRouter)
app.use('/api/newsletter', newsletterRouter)
app.use('/api/staff', staffRouter)
app.use('/api/role', roleRouter)
app.use('/api/housekeeping', housekeepingRouter)
app.use('/api/maintenance', maintenanceRouter)
app.use('/api/backup', backupRouter)
app.use('/api/dashboard', dashboardRouter)

app.get('/', (req, res) => {
    res.send("API working")
})
app.listen(port, () => console.log('server started on port : ' + port))