import jwt from 'jsonwebtoken'

export const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body

        console.log('[adminLogin] incoming email:', email)
        if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
            console.error('[adminLogin] ADMIN_EMAIL or ADMIN_PASSWORD not set in environment')
            return res.json({ success: false, message: 'Server misconfiguration: admin credentials not set' })
        }

        const emailMatch = email === process.env.ADMIN_EMAIL
        const passMatch = password === process.env.ADMIN_PASSWORD
        console.log(`[adminLogin] emailMatch=${emailMatch} passMatch=${passMatch}`)

        if (emailMatch && passMatch) {
            const token = jwt.sign(email + password, process.env.JWT_SECRET)
            return res.json({ success: true, token })
        }

        return res.json({ success: false, message: 'Invalid login' })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: 'error logging in admin' })
    }
}