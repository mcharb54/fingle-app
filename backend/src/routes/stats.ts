import { Router } from 'express'
import { getMyStats } from '../controllers/stats.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/me', requireAuth, getMyStats)

export default router
