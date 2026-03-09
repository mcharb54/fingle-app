import 'dotenv/config'
import http from 'http'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
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

// Security headers (HSTS, X-Content-Type-Options, X-Frame-Options, etc.)
// Note: CSRF via csurf is not needed here — API uses Bearer token auth in
// Authorization header, not cookies, so cross-origin requests cannot include
// the token. helmet covers the remaining header-based mitigations.
app.use(helmet())

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
)
app.use(express.json())

// Strict rate limit for auth endpoints — brute-force / abuse protection
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
})
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)
app.use('/api/auth/forgot-password', authLimiter)

// General rate limit for all other API routes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
})
app.use('/api', globalLimiter)

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
