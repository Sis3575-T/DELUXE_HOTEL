import express from 'express'
import { pushToAtlas, pullFromAtlas, syncStatus } from '../controllers/syncController.js'
import adminAuth from '../middleware/adminAuth.js'

const router = express.Router()

router.post('/push', adminAuth, pushToAtlas)
router.post('/pull', adminAuth, pullFromAtlas)
router.get('/status', adminAuth, syncStatus)

export default router
