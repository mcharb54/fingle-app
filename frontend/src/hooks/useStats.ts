import { useCallback, useEffect, useState } from 'react'
import { statsApi } from '../api'
import type { Badge, HeadToHead, PlayerStats } from '../types'

export function useStats() {
  const [stats, setStats] = useState<PlayerStats | null>(null)
  const [badges, setBadges] = useState<Badge[]>([])
  const [headToHead, setHeadToHead] = useState<HeadToHead[]>([])

  const refresh = useCallback(async () => {
    try {
      const res = await statsApi.me()
      setStats(res.stats)
      setBadges(res.badges)
      setHeadToHead(res.headToHead)
    } catch {
      // Progress is decoration — the game works without it
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { stats, badges, headToHead, refresh }
}
