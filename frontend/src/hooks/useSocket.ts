import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'

let socket: Socket | null = null
let socketToken: string | null = null

export function useSocket(
  handlers: Record<string, (data: unknown) => void>,
) {
  const { user } = useAuth()
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    const token = localStorage.getItem('fingle_token')

    // Drop a socket authenticated as a previous user (logout / account switch)
    if (socket && (!user || socketToken !== token)) {
      socket.disconnect()
      socket = null
      socketToken = null
    }
    if (!user || !token) return

    if (!socket) {
      const apiUrl = import.meta.env.VITE_API_URL ?? ''
      socket = io(apiUrl, { auth: { token }, path: '/socket.io' })
      socketToken = token
    }

    // Wrap each handler so it always calls the latest version from the ref
    const wrappers: Array<[string, (data: unknown) => void]> = Object.keys(handlersRef.current).map((event) => [
      event,
      (data: unknown) => handlersRef.current[event]?.(data),
    ])
    wrappers.forEach(([event, handler]) => socket!.on(event, handler))

    return () => {
      wrappers.forEach(([event, handler]) => socket?.off(event, handler))
    }
  }, [user])
}

export function getSocket(): Socket | null {
  return socket
}
