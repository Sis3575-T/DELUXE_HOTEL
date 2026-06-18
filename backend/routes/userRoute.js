import express from 'express'
import { adminLogin, verifyToken, setupAdmin } from '../controllers/userControllers.js'
import adminAuth from '../middleware/adminAuth.js'
const userRouter = express.Router()
userRouter.post('/admin', adminLogin)
userRouter.get('/verify', adminAuth, verifyToken)
userRouter.get('/setup', setupAdmin)
export default userRouter
