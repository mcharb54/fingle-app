import { Router } from 'express'
import { searchUsers, sendRequest, acceptRequest, getFriends, getPendingRequests, getMembers } from '../controllers/friends.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth)

router.get('/search', searchUsers)
router.get('/members', getMembers)
router.get('/', getFriends)
router.get('/pending', getPendingRequests)
router.post('/request', sendRequest)
router.put('/:id/accept', acceptRequest)

export default router
