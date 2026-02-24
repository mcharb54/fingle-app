import 'dotenv/config'
import http from 'http'
import express from 'express'
import cors from 'cors'
import { Server } from 'socket.io'
import { initSocket } from './services/socket.js'

import authRoutes from './routes/auth.js'
import friendRoutes from './routes/friends.js'
import challengeRoutes from './routes/challenges.js'
import leaderboardRoutes from './routes/leaderboard.js'
import adminRoutes from './routes/admin.js'

const app = express()
const server = http.createServer(app)

const allowedOrigins = [
  process.env.CLIENT_URL ?? 'http://localhost:5173',
  'https://fingle.club',
  'https://www.fingle.club',
]

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

initSocket(io)

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
)
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/friends', friendRoutes)
app.use('/api/challenges', challengeRoutes)
app.use('/api/leaderboard', leaderboardRoutes)
app.use('/api/admin', adminRoutes)

app.get('/api/health', (_req, res) => res.json({ ok: true }))

const PORT = Number(process.env.PORT ?? 3001)
server.listen(PORT, () => {
  console.log(`Fingle backend running on http://localhost:${PORT}`)
})
