import mongoose from "mongoose";

const auditSubSchema = {
  userId: { type: String, default: '' },
  name: { type: String, default: '' },
  role: { type: String, default: '' },
  actionDate: { type: Date, default: Date.now },
}

const reservationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, default: '' },
  checkin: { type: String, required: true },
  checkout: { type: String, required: true },
  guests: { type: Number, required: true },
  roomName: { type: String, required: true },
  roomId: { type: String, default: '' },
  pricePerNight: { type: Number, default: 0 },
  nights: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  paymentStatus: { type: String, default: 'Pending', enum: ['Pending', 'Partially Paid', 'Paid'] },
  status: { type: String, default: 'Pending' },
  paymentMethod: { type: String, default: '' },
  createdBy: { type: auditSubSchema, default: () => ({}) },
  approvedBy: { type: auditSubSchema, default: () => ({}) },
  rejectedBy: { type: auditSubSchema, default: () => ({}) },
  checkedInBy: { type: auditSubSchema, default: () => ({}) },
  checkedOutBy: { type: auditSubSchema, default: () => ({}) },
  cancelledBy: { type: auditSubSchema, default: () => ({}) },
  updatedBy: { type: auditSubSchema, default: () => ({}) },
})

reservationSchema.index({ email: 1 })
reservationSchema.index({ roomId: 1 })
reservationSchema.index({ roomName: 1 })
reservationSchema.index({ status: 1 })
reservationSchema.index({ checkin: 1 })
reservationSchema.index({ checkout: 1 })
reservationSchema.index({ checkin: 1, checkout: 1 })
reservationSchema.index({ status: 1, checkin: 1, checkout: 1 })

export default mongoose.model("Reservation", reservationSchema)
