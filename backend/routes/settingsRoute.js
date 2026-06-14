import express from 'express'
import { getSettings, updateSettings, getPublicSettings } from '../controllers/settingsControllers.js'
import adminAuth from '../middleware/adminAuth.js'
import multer from 'multer'

const upload = multer({ dest: 'uploads/' })
const settingsRouter = express.Router()

settingsRouter.get('/', adminAuth, getSettings)
settingsRouter.get('/public', getPublicSettings)
settingsRouter.put('/update', adminAuth, upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'aboutImage', maxCount: 1 }]), updateSettings)

export default settingsRouter
