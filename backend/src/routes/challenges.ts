import { Router } from 'express'
import { createChallenge, getReceivedChallenges, getSentChallenges, submitGuess, checkCount, upload } from '../controllers/challenges.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth)

router.post('/', upload.single('photo'), createChallenge)
router.get('/received', getReceivedChallenges)
router.get('/sent', getSentChallenges)
router.post('/:id/check-count', checkCount)
router.post('/:id/guess', submitGuess)

export default router
