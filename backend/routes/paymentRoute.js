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
} from '../controllers/paymentControllers.js'
import adminAuth from '../middleware/adminAuth.js'

const paymentRouter = express.Router()

paymentRouter.post('/initialize', initializePayment)
paymentRouter.get('/test-chapa', testChapaConnection)
paymentRouter.post('/confirm', confirmPayment)
paymentRouter.get('/list', adminAuth, getAllPayments)
paymentRouter.get('/stats', adminAuth, getPaymentStats)
paymentRouter.get('/revenue', adminAuth, getRevenueStats)
paymentRouter.get('/chapa-transaction/:chapaTransactionId', adminAuth, getPaymentByChapaTransactionId)
paymentRouter.get('/:id', adminAuth, getPaymentById)
paymentRouter.get('/transaction/:transactionId', getPaymentByTransactionId)
paymentRouter.get('/booking/:bookingId', adminAuth, getPaymentsByBooking)
paymentRouter.put('/verify/:id', adminAuth, verifyPayment)
paymentRouter.put('/reject/:id', adminAuth, rejectPayment)
paymentRouter.put('/cancel/:id', adminAuth, cancelPayment)
paymentRouter.put('/refund/:id', adminAuth, refundPayment)
paymentRouter.post('/chapa-webhook', chapaWebhook)
paymentRouter.get('/chapa-verify/:transactionId', verifyChapaPayment)
paymentRouter.get('/chapa-return', handleChapaReturn)

export default paymentRouter
