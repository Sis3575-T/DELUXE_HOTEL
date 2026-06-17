import crypto from 'crypto'
import paymentConfig from '../config/payment.js'

const CHAPA_API = paymentConfig.chapaApiUrl
const CHAPA_WEBHOOK_SECRET = paymentConfig.chapaWebhookSecret
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

const chapaHeaders = () => ({
  'Authorization': `Bearer ${paymentConfig.chapaSecretKey}`,
  'Content-Type': 'application/json',
})

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isRetryable(error) {
  if (error.status >= 500) return true
  if (!error.status) return true
  return false
}

async function chapaRequest(endpoint, options = {}) {
  const url = `${CHAPA_API}${endpoint}`

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        headers: { ...chapaHeaders(), ...options.headers },
      })
      const data = await res.json()
      if (!res.ok) {
        const err = new Error(data.message || `Chapa API error: ${res.status}`)
        err.status = res.status
        err.chapaData = data
        throw err
      }
      return data
    } catch (error) {
      const isLastAttempt = attempt === MAX_RETRIES
      if (isLastAttempt || !isRetryable(error)) {
        throw error
      }
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1)
      console.error(`Chapa API attempt ${attempt}/${MAX_RETRIES} failed. Retrying in ${delay}ms...`, error.message)
      await sleep(delay)
    }
  }
}

async function initializeTransaction({ amount, currency, email, first_name, last_name, tx_ref, callback_url, return_url, customization, channels }) {
  const body = {
    amount: String(amount),
    currency: currency || 'ETB',
    email: email || '',
    first_name: first_name || '',
    last_name: last_name || '',
    tx_ref,
    callback_url: callback_url || paymentConfig.chapaCallbackUrl,
    return_url: return_url || paymentConfig.chapaReturnUrl,
    customization: {
      title: customization?.title || 'Hotel Booking Payment',
      description: customization?.description || 'Room reservation payment',
    },
  }
  if (channels && Array.isArray(channels) && channels.length > 0) {
    body.options = { channels }
  }
  return chapaRequest('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

async function verifyTransaction(tx_ref) {
  return chapaRequest(`/transaction/verify/${tx_ref}`)
}

function verifyWebhookSignature(rawBody, signature) {
  if (!CHAPA_WEBHOOK_SECRET || !signature) return false
  const hash = crypto.createHmac('sha256', CHAPA_WEBHOOK_SECRET).update(rawBody).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature))
}

function generateTxRef(prefix = 'BOOK') {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = crypto.randomBytes(4).toString('hex').toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

export {
  initializeTransaction,
  verifyTransaction,
  verifyWebhookSignature,
  generateTxRef,
  chapaRequest,
}
