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

    // Wrap each handler so it always calls the latest version from the ref
    const wrappers: Array<[string, (data: unknown) => void]> = Object.keys(handlersRef.current).map((event) => [
      event,
      (data: unknown) => handlersRef.current[event]?.(data),
    ])
    wrappers.forEach(([event, handler]) => socket!.on(event, handler))

    return () => {
      wrappers.forEach(([event, handler]) => socket!.off(event, handler))
    }
  }, [user])
}

export function getSocket(): Socket | null {
  return socket
}
