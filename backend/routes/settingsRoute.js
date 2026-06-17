import express from 'express'
import { getSettings, updateSettings, updateSettingsJson, getPublicSettings } from '../controllers/settingsControllers.js'
import adminAuth from '../middleware/adminAuth.js'
import multer from 'multer'

const upload = multer({ dest: 'uploads/' })
const settingsRouter = express.Router()

settingsRouter.get('/', adminAuth, getSettings)
settingsRouter.get('/public', getPublicSettings)
settingsRouter.put('/update', adminAuth, updateSettingsJson)
settingsRouter.put('/update-files', adminAuth, upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'aboutImage', maxCount: 1 }, { name: 'heroImage', maxCount: 1 }]), updateSettings)

export default settingsRouter
