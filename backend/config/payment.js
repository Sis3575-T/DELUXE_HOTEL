const paymentConfig = {
  get backendUrl() {
    return process.env.BACKEND_URL || 'http://localhost:4000'
  },
  get frontendUrl() {
    return process.env.FRONTEND_URL || 'http://localhost:5173'
  },
  get chapaApiUrl() {
    return process.env.CHAPA_API_URL || 'https://api.chapa.co/v1'
  },
  get chapaSecretKey() {
    return process.env.CHAPA_SECRET_KEY
  },
  get chapaPublicKey() {
    return process.env.CHAPA_PUBLIC_KEY
  },
  get chapaEncryptionKey() {
    return process.env.CHAPA_ENCRYPTION_KEY
  },
  get chapaWebhookSecret() {
    return process.env.CHAPA_WEBHOOK_SECRET
  },
  get chapaCallbackUrl() {
    return process.env.CHAPA_CALLBACK_URL || `${this.backendUrl}/api/payment/chapa-webhook`
  },
  get chapaReturnUrl() {
    return process.env.CHAPA_RETURN_URL || `${this.backendUrl}/api/payment/chapa-return`
  },
  get chapaFrontendUrl() {
    return process.env.CHAPA_FRONTEND_URL || `${this.frontendUrl}/payment/result`
  },
  get isLiveMode() {
    const key = this.chapaSecretKey || ''
    return key.startsWith('CHASECK_LIVE')
  },
  get mode() {
    return this.isLiveMode ? 'LIVE' : 'TEST'
  },
  supportedMethods: [
    'Chapa', 'Telebirr', 'CBE Birr', 'Awash Bank', 'Dashen Bank',
    'Bank Transfer', 'Pay at Hotel', 'Cash Payment', 'Visa', 'MasterCard',
  ],
  chapaChannels: [
    'Telebirr', 'CBE Birr', 'Visa', 'MasterCard',
    'Mobile Banking', 'Internet Banking', 'Amole',
    'Awash Bank', 'Dashen Bank', 'Abyssinia Bank',
    'Wegagen Bank', 'Nib Bank', 'Hibret Bank',
    'United Bank', 'Zemen Bank', 'Cooperative Bank',
  ],
  get apiHeaders() {
    return {
      'Authorization': `Bearer ${this.chapaSecretKey}`,
      'Content-Type': 'application/json',
    }
  },

  logConfig(prefix = '[paymentConfig]') {
    const sk = this.chapaSecretKey
    const pk = this.chapaPublicKey
    const ek = this.chapaEncryptionKey
    console.log(`${prefix} BACKEND_URL: ${this.backendUrl}`)
    console.log(`${prefix} FRONTEND_URL: ${this.frontendUrl}`)
    console.log(`${prefix} CHAPA_SECRET_KEY present: ${!!sk} (prefix: ${sk ? sk.substring(0, 12) + '...' : 'N/A'})`)
    console.log(`${prefix} CHAPA_PUBLIC_KEY present: ${!!pk} (prefix: ${pk ? pk.substring(0, 12) + '...' : 'N/A'})`)
    console.log(`${prefix} CHAPA_ENCRYPTION_KEY present: ${!!ek}`)
    console.log(`${prefix} CHAPA_API_URL: ${this.chapaApiUrl}`)
    console.log(`${prefix} CHAPA_CALLBACK_URL: ${this.chapaCallbackUrl}`)
    console.log(`${prefix} CHAPA_RETURN_URL: ${this.chapaReturnUrl}`)
    console.log(`${prefix} CHAPA_FRONTEND_URL: ${this.chapaFrontendUrl}`)
    console.log(`${prefix} Mode: ${this.mode}`)
    console.log(`${prefix} Webhook secret present: ${!!this.chapaWebhookSecret}`)
  },

  validate() {
    const errors = []
    if (!this.chapaSecretKey) errors.push('CHAPA_SECRET_KEY is not set')
    if (!this.chapaPublicKey) errors.push('CHAPA_PUBLIC_KEY is not set')
    if (!this.chapaApiUrl) errors.push('CHAPA_API_URL is not set')
    if (!this.chapaCallbackUrl) errors.push('CHAPA_CALLBACK_URL is not set')
    if (!this.chapaReturnUrl) errors.push('CHAPA_RETURN_URL is not set')
    try { new URL(this.chapaApiUrl) } catch { errors.push(`CHAPA_API_URL is not a valid URL: ${this.chapaApiUrl}`) }
    try { new URL(this.chapaCallbackUrl) } catch { errors.push(`CHAPA_CALLBACK_URL is not a valid URL: ${this.chapaCallbackUrl}`) }
    try { new URL(this.chapaReturnUrl) } catch { errors.push(`CHAPA_RETURN_URL is not a valid URL: ${this.chapaReturnUrl}`) }
    try { new URL(this.chapaFrontendUrl) } catch { errors.push(`CHAPA_FRONTEND_URL is not a valid URL: ${this.chapaFrontendUrl}`) }
    return errors
  },
}

export default paymentConfig
