import { Router } from 'express'
import {
  register,
  login,
  me,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
  changeUsername,
} from '../controllers/auth.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.get('/me', requireAuth, me)
router.get('/verify-email', verifyEmail)
router.post('/resend-verification', requireAuth, resendVerification)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)
router.put('/change-password', requireAuth, changePassword)
router.put('/change-username', requireAuth, changeUsername)

export default router
