import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, default: '' },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  date: { type: String, required: true },
  read: { type: Boolean, default: false },
  reply: { type: String, default: '' },
  repliedAt: { type: String, default: '' },
  createdAt: { type: Number, default: Date.now }
})

const Message = mongoose.models.Message || mongoose.model('Message', messageSchema)
export default Message
