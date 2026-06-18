import express from 'express'
import {
  initializePayment,
  confirmPayment,
  verifyChapaPayment,
  handleChapaReturn,
  getAllPayments,
  getPaymentById,
  getPaymentByTransactionId,
  getPaymentsByBooking,
  verifyPayment,
  rejectPayment,
  cancelPayment,
  refundPayment,
  getPaymentStats,
  getRevenueStats,
  getPaymentByChapaTransactionId,
  testChapaConnection,
  chapaWebhook,
  getChapaChannels,
  archivePayment,
  restorePayment,
  deletePayment,
} from '../controllers/paymentControllers.js'
import adminAuth from '../middleware/adminAuth.js'

const paymentRouter = express.Router()

paymentRouter.get('/channels', getChapaChannels)
paymentRouter.post('/initialize', initializePayment)
paymentRouter.get('/test-chapa', testChapaConnection)
paymentRouter.post('/confirm', confirmPayment)
paymentRouter.get('/list', adminAuth, getAllPayments)
paymentRouter.get('/stats', adminAuth, getPaymentStats)
paymentRouter.get('/revenue', adminAuth, getRevenueStats)
paymentRouter.get('/chapa-transaction/:chapaTransactionId', adminAuth, getPaymentByChapaTransactionId)
paymentRouter.get('/chapa-return', handleChapaReturn)
paymentRouter.get('/chapa-verify/:transactionId', verifyChapaPayment)
paymentRouter.post('/chapa-webhook', chapaWebhook)
paymentRouter.get('/transaction/:transactionId', getPaymentByTransactionId)
paymentRouter.get('/booking/:bookingId', adminAuth, getPaymentsByBooking)
paymentRouter.put('/verify/:id', adminAuth, verifyPayment)
paymentRouter.put('/reject/:id', adminAuth, rejectPayment)
paymentRouter.put('/cancel/:id', adminAuth, cancelPayment)
paymentRouter.put('/refund/:id', adminAuth, refundPayment)
paymentRouter.put('/archive/:id', adminAuth, archivePayment)
paymentRouter.put('/restore/:id', adminAuth, restorePayment)
paymentRouter.delete('/delete/:id', adminAuth, deletePayment)
paymentRouter.get('/:id', adminAuth, getPaymentById)

export default paymentRouter
