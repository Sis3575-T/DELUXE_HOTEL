import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', default: null },
  guestId: { type: String, default: '' },
  guestName: { type: String, required: true },
  guestEmail: { type: String, default: '' },
  guestPhone: { type: String, default: '' },
  paymentMethod: {
    type: String,
    enum: [
      'Chapa', 'Telebirr', 'CBE Birr', 'Awash Bank', 'Dashen Bank',
      'Bank Transfer', 'Pay at Hotel', 'Cash Payment',
      'Visa', 'MasterCard'
    ],
    required: true
  },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'ETB' },
  status: {
    type: String,
    enum: ['Pending', 'Verification Required', 'Paid', 'Partially Paid', 'Failed', 'Refunded', 'Cancelled'],
    default: 'Pending'
  },
  referenceNumber: { type: String, default: '' },
  receipt: { type: String, default: '' },
  receiptFileType: { type: String, default: '' },
  notes: { type: String, default: '' },
  verificationStatus: {
    type: String,
    enum: ['Unverified', 'Verified', 'Rejected'],
    default: 'Unverified'
  },
  verifiedBy: { type: String, default: '' },
  verifiedAt: { type: Date, default: null },
  approvalStatus: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  approvedBy: { type: String, default: '' },
  approvedAt: { type: Date, default: null },
  paymentDate: { type: Date, default: null },
  callbackData: { type: Object, default: {} },
  chapaResponse: { type: Object, default: {} },
  chapaTransactionId: { type: String, default: '' },
  chapaChannel: { type: String, default: '' },
  webhookEvents: [{
    event: { type: String },
    data: { type: Object },
    signature: { type: String },
    receivedAt: { type: Date, default: Date.now },
  }],
  archived: { type: Boolean, default: false },
  archivedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

paymentSchema.index({ bookingId: 1 })
paymentSchema.index({ guestEmail: 1 })
paymentSchema.index({ status: 1 })
paymentSchema.index({ paymentMethod: 1 })
paymentSchema.index({ createdAt: -1 })
paymentSchema.index({ chapaTransactionId: 1 })

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema)
export default Payment
