import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'

let io: Server

export function initSocket(server: Server): void {
  io = server

  // Authenticate every socket connection with the user's JWT
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token as string | undefined
    if (!token) {
      return next(new Error('Authentication required'))
    }
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!, {
        algorithms: ['HS256'],
      }) as { userId: string }
      socket.data.userId = payload.userId
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string
    socket.join(`user:${userId}`)

    socket.on('disconnect', () => {
      // cleanup handled automatically by socket.io room management
    })
  })
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  if (!io) return
  io.to(`user:${userId}`).emit(event, data)
}
