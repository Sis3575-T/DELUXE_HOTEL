import jwt from "jsonwebtoken"
import Admin from "../models/adminModel.js"

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
    const admin = await Admin.findById(decoded.id).select('-password')
    if (!admin) {
      return res.status(401).json({ success: false, message: "Unauthorized: Admin not found" })
    }

    req.admin = {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
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
