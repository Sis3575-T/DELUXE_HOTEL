const paymentConfig = {
  get chapaApiUrl() {
    return process.env.CHAPA_API_URL || 'https://api.chapa.co/v1'
  },
  get chapaSecretKey() {
    return process.env.CHAPA_SECRET_KEY
  },
  get chapaPublicKey() {
    return process.env.CHAPA_PUBLIC_KEY
  },
  get chapaWebhookSecret() {
    return process.env.CHAPA_WEBHOOK_SECRET
  },
  get chapaCallbackUrl() {
    return process.env.CHAPA_CALLBACK_URL || 'http://localhost:4000/api/payment/chapa-webhook'
  },
  get chapaReturnUrl() {
    return process.env.CHAPA_RETURN_URL || 'http://localhost:5173/payment/result'
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
}

export default paymentConfig
