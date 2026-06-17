import jwt from "jsonwebtoken"

const adminAuth = async (req, res, next) => {
  try {
    let token = req.headers.token
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1]
    }
    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized: No token provided" })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    if (typeof decoded === 'object') {
      const emailMatch = decoded.email === process.env.ADMIN_EMAIL
      const passMatch = decoded.password === process.env.ADMIN_PASSWORD
      if (!emailMatch || !passMatch) {
        return res.status(401).json({ success: false, message: "Unauthorized: Invalid credentials" })
      }
      req.admin = {
        userId: process.env.ADMIN_EMAIL,
        name: decoded.name || process.env.ADMIN_NAME || 'Administrator',
        role: decoded.role || process.env.ADMIN_ROLE || 'Admin',
      }
    } else {
      const tokenStr = String(decoded)
      if (tokenStr !== process.env.ADMIN_EMAIL + process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ success: false, message: "Unauthorized: Invalid token" })
      }
      req.admin = {
        userId: process.env.ADMIN_EMAIL,
        name: process.env.ADMIN_NAME || 'Administrator',
        role: process.env.ADMIN_ROLE || 'Admin',
      }
    }
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: "Token expired" })
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: "Invalid token" })
    }
    return res.status(401).json({ success: false, message: "Authentication failed" })
  }
}

export default adminAuth
