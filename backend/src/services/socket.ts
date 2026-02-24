import { Server } from 'socket.io'

let io: Server

export function initSocket(server: Server): void {
  io = server

  io.on('connection', (socket) => {
    const userId = socket.handshake.auth.userId as string | undefined
    if (userId) {
      socket.join(`user:${userId}`)
    }

    socket.on('disconnect', () => {
      // cleanup handled automatically by socket.io room management
    })
  })
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  if (!io) return
  io.to(`user:${userId}`).emit(event, data)
}
