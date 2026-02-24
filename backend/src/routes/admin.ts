import { Router } from 'express'
import { requireAdmin } from '../middleware/admin.js'
import { getUsers, deleteUser, toggleBan, updateUser } from '../controllers/admin.js'

const router = Router()

router.get('/users', requireAdmin, getUsers)
router.delete('/users/:id', requireAdmin, deleteUser)
router.put('/users/:id/ban', requireAdmin, toggleBan)
router.put('/users/:id', requireAdmin, updateUser)

export default router
