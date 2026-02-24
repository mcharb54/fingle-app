import { useEffect, useState } from 'react'
import { friendsApi } from '../api'
import type { FriendEntry, FriendRequest, PublicUser } from '../types'
import { useSocket } from '../hooks/useSocket'

export default function FriendsPage() {
  const [friends, setFriends] = useState<FriendEntry[]>([])
  const [pending, setPending] = useState<FriendRequest[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PublicUser[]>([])
  const [searching, setSearching] = useState(false)
  const [sentTo, setSentTo] = useState<Set<string>>(new Set())

  useEffect(() => {
    reload()
  }, [])

  async function reload() {
    const [fr, pr] = await Promise.all([friendsApi.getFriends(), friendsApi.getPending()])
    setFriends(fr.friends)
    setPending(pr.requests)
  }

  useSocket({
    friend_request: () => reload(),
    friend_accepted: () => reload(),
  })

  async function search() {
    if (query.trim().length < 2) return
    setSearching(true)
    try {
      const { users } = await friendsApi.search(query.trim())
      const friendIds = new Set(friends.map((f) => f.user.id))
      setResults(users.filter((u) => !friendIds.has(u.id)))
    } catch {
      /* ignore */
    } finally {
      setSearching(false)
    }
  }

  async function sendRequest(userId: string) {
    try {
      await friendsApi.sendRequest(userId)
      setSentTo((prev) => new Set([...prev, userId]))
    } catch {
      /* ignore */
    }
  }

  async function accept(friendId: string) {
    await friendsApi.accept(friendId)
    await reload()
  }

  return (
    <div className="min-h-full bg-black">
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-white/10 safe-top px-4 py-3">
        <h1 className="text-xl font-black text-white">Friends</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Search */}
        <div>
          <p className="text-gray-400 text-sm font-semibold mb-2 uppercase tracking-wider">Add friends</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search by username…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              className="flex-1 bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-brand-400 text-sm"
            />
            <button
              onClick={search}
              disabled={searching || query.trim().length < 2}
              className="bg-brand-500 hover:bg-brand-400 disabled:opacity-40 text-white font-semibold px-4 rounded-xl text-sm"
            >
              {searching ? '…' : 'Search'}
            </button>
          </div>
          {results.length > 0 && (
            <div className="mt-2 space-y-2">
              {results.map((user) => (
                <div key={user.id} className="flex items-center gap-3 bg-zinc-900 rounded-xl px-4 py-3">
                  <div className="w-9 h-9 rounded-full bg-brand-700 flex items-center justify-center font-bold flex-shrink-0">
                    {user.username[0].toUpperCase()}
                  </div>
                  <span className="flex-1 text-white font-semibold text-sm">{user.username}</span>
                  <button
                    onClick={() => sendRequest(user.id)}
                    disabled={sentTo.has(user.id)}
                    className="text-brand-400 disabled:text-gray-500 text-sm font-semibold"
                  >
                    {sentTo.has(user.id) ? 'Sent ✓' : 'Add +'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending requests */}
        {pending.length > 0 && (
          <div>
            <p className="text-gray-400 text-sm font-semibold mb-2 uppercase tracking-wider">
              Requests ({pending.length})
            </p>
            <div className="space-y-2">
              {pending.map(({ friendId, from }) => (
                <div key={friendId} className="flex items-center gap-3 bg-zinc-900 rounded-xl px-4 py-3">
                  <div className="w-9 h-9 rounded-full bg-brand-700 flex items-center justify-center font-bold flex-shrink-0">
                    {from.username[0].toUpperCase()}
                  </div>
                  <span className="flex-1 text-white font-semibold text-sm">{from.username}</span>
                  <button
                    onClick={() => accept(friendId)}
                    className="bg-brand-500 hover:bg-brand-400 text-white text-sm font-semibold px-3 py-1.5 rounded-lg"
                  >
                    Accept
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends list */}
        <div>
          <p className="text-gray-400 text-sm font-semibold mb-2 uppercase tracking-wider">
            Friends ({friends.length})
          </p>
          {friends.length === 0 ? (
            <p className="text-gray-600 text-sm">No friends yet — search above to add some.</p>
          ) : (
            <div className="space-y-2">
              {friends.map(({ friendshipId, user }) => (
                <div key={friendshipId} className="flex items-center gap-3 bg-zinc-900 rounded-xl px-4 py-3">
                  <div className="w-9 h-9 rounded-full bg-brand-700 flex items-center justify-center font-bold flex-shrink-0">
                    {user.username[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold text-sm">{user.username}</p>
                    <p className="text-gray-500 text-xs">{user.totalScore} pts</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
