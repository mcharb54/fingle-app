import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { subscribe, unsubscribe, testPush } from '../controllers/push.js'

const router = Router()

router.post('/subscribe', requireAuth, subscribe)
router.post('/unsubscribe', requireAuth, unsubscribe)
router.post('/test', requireAuth, testPush)

export default router
