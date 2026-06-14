import express from 'express'
import {
  createMessage,
  getAllMessages,
  getMessageById,
  updateMessage,
  deleteMessage,
  replyMessage
} from '../controllers/messageControllers.js'
import adminAuth from '../middleware/adminAuth.js'

const messageRouter = express.Router()

messageRouter.post('/add', createMessage)
messageRouter.get('/list', adminAuth, getAllMessages)
messageRouter.get('/:id', adminAuth, getMessageById)
messageRouter.put('/update/:id', adminAuth, updateMessage)
messageRouter.put('/reply/:id', adminAuth, replyMessage)
messageRouter.delete('/delete/:id', adminAuth, deleteMessage)

export default messageRouter
