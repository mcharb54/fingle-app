import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'

let socket: Socket | null = null

export function useSocket(
  handlers: Record<string, (data: unknown) => void>,
) {
  const { user } = useAuth()
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    if (!user) return

    if (!socket) {
      const apiUrl = import.meta.env.VITE_API_URL ?? ''
      const token = localStorage.getItem('fingle_token') ?? ''
      socket = io(apiUrl, { auth: { token }, path: '/socket.io' })
    }

    const entries = Object.entries(handlersRef.current)
    entries.forEach(([event, handler]) => socket!.on(event, handler))

    return () => {
      entries.forEach(([event, handler]) => socket!.off(event, handler))
    }
  }, [user])
}

export function getSocket(): Socket | null {
  return socket
}
