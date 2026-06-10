import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '.env') })

console.log('Using MONGODB_URI:', process.env.MONGODB_URI)
import connectDB from './config/mongodb.js'
import connectCloudinary from './config/cloudinary.js'
import hotelRouter from './routes/hotelRoute.js'

const app = express()
const port = process.env.PORT || 4000
connectDB()
connectCloudinary()
app.use(cors())
app.use(express.json())
// Log incoming requests for debugging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()}  ${req.method} ${req.originalUrl}`)
    next()
})

app.use('/api/hotel', hotelRouter)

app.get('/', (req, res) => {
    res.send("API working")
})
app.listen(port, () => console.log('server started on port : ' + port))