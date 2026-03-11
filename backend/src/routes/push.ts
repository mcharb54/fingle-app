import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { subscribe, unsubscribe } from '../controllers/push.js'

const router = Router()

router.post('/subscribe', requireAuth, subscribe)
router.post('/unsubscribe', requireAuth, unsubscribe)

export default router
