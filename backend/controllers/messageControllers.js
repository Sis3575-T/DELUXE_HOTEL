import Message from '../models/messageModels.js'
import { createNotification } from './notificationControllers.js'

const createMessage = async (req, res) => {
  try {
    const { name, email, phone, subject, message, date } = req.body

    if (!name || !email || !subject || !message || !date) {
      return res.status(400).json({ success: false, message: 'Name, email, subject, message, and date are required' })
    }

    const msg = new Message({
      name, email, phone: phone || '', subject, message, date,
    })

    await msg.save()
    createNotification({
      type: 'new_message',
      message: `New message from ${name}: ${subject}`,
      relatedId: msg._id.toString(),
      relatedModel: 'Message',
    })
    res.json({ success: true, message: 'Message created successfully', msg })
  } catch (error) {
    console.error('createMessage error:', error?.message || error)
    res.status(500).json({ success: false, message: 'Error creating message' })
  }
}

const getAllMessages = async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 })
    res.json({ success: true, messages })
  } catch (error) {
    console.error('getAllMessages error:', error?.message || error)
    res.status(500).json({ success: false, message: 'Error fetching messages' })
  }
}

const getMessageById = async (req, res) => {
  try {
    const { id } = req.params
    const msg = await Message.findById(id)
    if (!msg) {
      return res.status(404).json({ success: false, message: 'Message not found' })
    }
    res.json({ success: true, msg })
  } catch (error) {
    console.error('getMessageById error:', error?.message || error)
    res.status(500).json({ success: false, message: 'Error fetching message' })
  }
}

const updateMessage = async (req, res) => {
  try {
    const { id } = req.params
    const { name, email, phone, subject, message, date, read } = req.body

    const updateData = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (subject !== undefined) updateData.subject = subject
    if (message !== undefined) updateData.message = message
    if (date !== undefined) updateData.date = date
    if (read !== undefined) updateData.read = read

    const updated = await Message.findByIdAndUpdate(id, updateData, { new: true })
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Message not found' })
    }

    res.json({ success: true, message: 'Message updated successfully', msg: updated })
  } catch (error) {
    console.error('updateMessage error:', error?.message || error)
    res.status(500).json({ success: false, message: 'Error updating message' })
  }
}

const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params
    const deleted = await Message.findByIdAndDelete(id)
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Message not found' })
    }
    res.json({ success: true, message: 'Message deleted successfully' })
  } catch (error) {
    console.error('deleteMessage error:', error?.message || error)
    res.status(500).json({ success: false, message: 'Error deleting message' })
  }
}

const replyMessage = async (req, res) => {
  try {
    const { id } = req.params
    const { reply } = req.body
    if (!reply?.trim()) {
      return res.status(400).json({ success: false, message: 'Reply content is required' })
    }
    const updated = await Message.findByIdAndUpdate(id, {
      reply: reply.trim(),
      repliedAt: new Date().toISOString().split('T')[0],
    }, { new: true })
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Message not found' })
    }
    res.json({ success: true, message: 'Reply sent successfully', msg: updated })
  } catch (error) {
    console.error('replyMessage error:', error?.message || error)
    res.status(500).json({ success: false, message: 'Error sending reply' })
  }
}

export { createMessage, getAllMessages, getMessageById, updateMessage, deleteMessage, replyMessage }
