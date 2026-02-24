import { Router } from 'express'
import { requireAdmin } from '../middleware/admin.js'
import { getUsers, deleteUser, toggleBan, updateUser, clearLeaderboard } from '../controllers/admin.js'

const router = Router()

router.get('/users', requireAdmin, getUsers)
router.delete('/users/:id', requireAdmin, deleteUser)
router.put('/users/:id/ban', requireAdmin, toggleBan)
router.put('/users/:id', requireAdmin, updateUser)
router.post('/leaderboard/reset', requireAdmin, clearLeaderboard)

export default router
