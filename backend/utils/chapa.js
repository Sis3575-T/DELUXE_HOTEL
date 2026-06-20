import crypto from 'crypto'
import paymentConfig from '../config/payment.js'

const CHAPA_API = paymentConfig.chapaApiUrl
const CHAPA_WEBHOOK_SECRET = paymentConfig.chapaWebhookSecret
const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1000

const chapaHeaders = () => ({
  'Authorization': `Bearer ${paymentConfig.chapaSecretKey}`,
  'Content-Type': 'application/json',
})

function toStr(v) {
  if (!v) return ''
  if (typeof v === 'string') return v
  try { return JSON.stringify(v) } catch { return String(v) }
}

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
  const configErrors = paymentConfig.validate()
  if (configErrors.length > 0) {
    console.error('[chapa] Configuration errors:', configErrors)
    const err = new Error('Chapa configuration error: ' + configErrors.join('; '))
    err.status = 500
    err.configErrors = configErrors
    throw err
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      let bodyPreview = ''
      if (options.body) {
        try { bodyPreview = JSON.stringify(JSON.parse(options.body), null, 2) } catch { bodyPreview = options.body }
      }
      console.log(`[chapa] Request attempt ${attempt}/${MAX_RETRIES}: ${options.method || 'GET'} ${url}`)
      console.log(`[chapa] Request headers: Authorization: Bearer ${paymentConfig.chapaSecretKey ? paymentConfig.chapaSecretKey.substring(0, 12) + '...' : 'NOT SET'}`)
      if (bodyPreview) console.log(`[chapa] Request body:\n${bodyPreview}`)

      const res = await fetch(url, {
        ...options,
        headers: { ...chapaHeaders(), ...options.headers },
      })

      let data
      try {
        data = await res.json()
      } catch {
        const text = await res.text()
        console.error(`[chapa] Non-JSON response (${res.status}): ${text.substring(0, 500)}`)
        const err = new Error(`Chapa API returned non-JSON response (status ${res.status})`)
        err.status = res.status
        err.rawResponse = text.substring(0, 500)
        throw err
      }

      console.log(`[chapa] Response status: ${res.status}`)
      console.log(`[chapa] Response body:\n${JSON.stringify(data, null, 2)}`)

      if (!res.ok) {
        const chapaMsg = toStr(data.message) || toStr(data.msg) || toStr(data.detail) || toStr(data.error) || ''
        const errMsg = chapaMsg || `Chapa API error: ${res.status}`
        console.error(`[chapa] API error (${res.status}): ${errMsg}`)
        const err = new Error(errMsg)
        err.status = res.status
        err.chapaData = data
        throw err
      }

      return data
    } catch (error) {
      if (error.configErrors) throw error

      const isLastAttempt = attempt === MAX_RETRIES
      if (isLastAttempt || !isRetryable(error)) {
        if (isLastAttempt) {
          console.error(`[chapa] All ${MAX_RETRIES} attempts failed. Last error:`, error.message)
          if (error.chapaData) {
            console.error('[chapa] Last Chapa response data:', JSON.stringify(error.chapaData, null, 2))
          }
        }
        throw error
      }
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1)
      console.warn(`[chapa] Attempt ${attempt}/${MAX_RETRIES} failed (${error.message}). Retrying in ${delay}ms...`)
      await sleep(delay)
    }
  }
}

async function initializeTransaction({ amount, currency, email, first_name, last_name, tx_ref, callback_url, return_url, customization, channels }) {
  const configErrors = paymentConfig.validate()
  if (configErrors.length > 0) {
    console.error('[chapa:initializeTransaction] Configuration errors:', configErrors)
    const err = new Error('Payment gateway configuration error')
    err.status = 500
    err.configErrors = configErrors
    throw err
  }

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
      title: (customization?.title || 'Hotel Booking').substring(0, 16),
      description: customization?.description || 'Room reservation payment',
    },
  }

  if (channels && Array.isArray(channels) && channels.length > 0) {
    body.options = { channels }
  }

  console.log('[chapa:initializeTransaction] Payload validation:')
  console.log(`  amount: ${body.amount} (type: ${typeof body.amount})`)
  console.log(`  currency: ${body.currency}`)
  console.log(`  email: "${body.email}" (present: ${!!body.email})`)
  console.log(`  first_name: "${body.first_name}"`)
  console.log(`  last_name: "${body.last_name}"`)
  console.log(`  tx_ref: ${body.tx_ref}`)
  console.log(`  callback_url: ${body.callback_url}`)
  console.log(`  return_url: ${body.return_url}`)

  const fieldErrors = []
  if (!body.amount || Number(body.amount) <= 0) fieldErrors.push('amount must be > 0')
  if (!body.email) fieldErrors.push('email is required')
  if (!body.tx_ref) fieldErrors.push('tx_ref is required')
  if (!body.callback_url) fieldErrors.push('callback_url is required')
  if (!body.return_url) fieldErrors.push('return_url is required')
  try { new URL(body.callback_url) } catch { fieldErrors.push(`callback_url invalid: ${body.callback_url}`) }
  try { new URL(body.return_url) } catch { fieldErrors.push(`return_url invalid: ${body.return_url}`) }

  if (fieldErrors.length > 0) {
    console.error('[chapa:initializeTransaction] Field validation errors:', fieldErrors)
    const err = new Error(fieldErrors.join('; '))
    err.status = 400
    err.validationErrors = fieldErrors
    throw err
  }

  return chapaRequest('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

async function verifyTransaction(tx_ref) {
  console.log(`[chapa:verifyTransaction] Verifying tx_ref: ${tx_ref}`)
  const result = await chapaRequest(`/transaction/verify/${tx_ref}`)
  console.log(`[chapa:verifyTransaction] Result:`, JSON.stringify(result, null, 2))
  return result
}

function verifyWebhookSignature(rawBody, signature) {
  if (!signature) {
    console.warn('[chapa:verifyWebhook] No signature header provided')
    return false
  }

  const secret = CHAPA_WEBHOOK_SECRET || paymentConfig.chapaSecretKey
  if (!secret) {
    console.error('[chapa:verifyWebhook] No webhook secret or CHAPA_SECRET_KEY configured')
    return false
  }

  const hash = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')

  try {
    const hashBuf = Buffer.from(hash, 'utf8')
    const sigBuf = Buffer.from(signature, 'utf8')
    if (hashBuf.length !== sigBuf.length) {
      console.warn(`[chapa:verifyWebhook] Signature length mismatch: computed=${hashBuf.length}, received=${sigBuf.length}`)
      console.warn(`[chapa:verifyWebhook] Computed hash: ${hash}`)
      console.warn(`[chapa:verifyWebhook] Received sig: ${signature}`)
      return hash === signature
    }
    return crypto.timingSafeEqual(hashBuf, sigBuf)
  } catch (err) {
    console.error('[chapa:verifyWebhook] Signature comparison error:', err.message)
    return hash === signature
  }
}

async function generateTxRef(prefix = 'BOOK') {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = crypto.randomBytes(4).toString('hex').toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

async function directCharge({ type, amount, currency, email, first_name, last_name, tx_ref, mobile, callback_url, return_url }) {
  const configErrors = paymentConfig.validate()
  if (configErrors.length > 0) {
    console.error('[chapa:directCharge] Configuration errors:', configErrors)
    const err = new Error('Payment gateway configuration error')
    err.status = 500
    err.configErrors = configErrors
    throw err
  }

  const body = {
    amount: String(amount),
    currency: currency || 'ETB',
    email: email || '',
    first_name: first_name || '',
    last_name: last_name || '',
    tx_ref,
    mobile,
    callback_url: callback_url || paymentConfig.chapaCallbackUrl,
    return_url: return_url || paymentConfig.chapaReturnUrl,
  }

  const fieldErrors = []
  if (!body.amount || Number(body.amount) <= 0) fieldErrors.push('amount must be > 0')
  if (!body.tx_ref) fieldErrors.push('tx_ref is required')
  if (!body.mobile) fieldErrors.push('mobile number is required')
  if (!body.callback_url) fieldErrors.push('callback_url is required')
  if (!body.return_url) fieldErrors.push('return_url is required')
  try { new URL(body.callback_url) } catch { fieldErrors.push(`callback_url invalid: ${body.callback_url}`) }
  try { new URL(body.return_url) } catch { fieldErrors.push(`return_url invalid: ${body.return_url}`) }

  if (fieldErrors.length > 0) {
    console.error('[chapa:directCharge] Field validation errors:', fieldErrors)
    const err = new Error(fieldErrors.join('; '))
    err.status = 400
    err.validationErrors = fieldErrors
    throw err
  }

  return chapaRequest(`/charges?type=${type}`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

async function authorizeDirectCharge({ reference, client, type }) {
  const configErrors = paymentConfig.validate()
  if (configErrors.length > 0) {
    console.error('[chapa:authorizeDirectCharge] Configuration errors:', configErrors)
    const err = new Error('Payment gateway configuration error')
    err.status = 500
    err.configErrors = configErrors
    throw err
  }

  const body = { reference, client }
  return chapaRequest(`/validate?type=${type}`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

const MOBILE_MONEY_CHANNELS = ['Telebirr', 'CBE Birr', 'M-Pesa', 'Amole', 'Awash Birr', 'Ebirr']

function isMobileMoneyChannel(channel) {
  return MOBILE_MONEY_CHANNELS.some(c => c.toLowerCase() === (channel || '').toLowerCase())
}

function getDirectChargeType(channel) {
  const map = {
    'telebirr': 'telebirr',
    'cbe birr': 'cbebirr',
    'm-pesa': 'mpesa',
    'amole': 'amole',
    'awash birr': 'awashbirr',
    'ebirr': 'ebirr',
  }
  return map[(channel || '').toLowerCase()] || ''
}

export {
  initializeTransaction,
  verifyTransaction,
  verifyWebhookSignature,
  generateTxRef,
  chapaRequest,
  directCharge,
  authorizeDirectCharge,
  isMobileMoneyChannel,
  getDirectChargeType,
}
