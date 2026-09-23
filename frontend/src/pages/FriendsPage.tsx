import { useEffect, useState } from 'react'
import { friendsApi } from '../api'
import type { FriendEntry, FriendRequest, PublicUser } from '../types'
import { useSocket } from '../hooks/useSocket'
import Avatar from '../components/ui/Avatar'
import Icon from '../components/ui/Icon'
import { useStats } from '../hooks/useStats'

export default function FriendsPage() {
  const [friends, setFriends] = useState<FriendEntry[]>([])
  const [pending, setPending] = useState<FriendRequest[]>([])
  const [members, setMembers] = useState<PublicUser[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PublicUser[]>([])
  const [searching, setSearching] = useState(false)
  const [sentTo, setSentTo] = useState<Set<string>>(new Set())
  const { headToHead } = useStats()
  const rivalry = new Map(headToHead.map((h) => [h.friend.id, h]))

  useEffect(() => {
    reload()
  }, [])

  async function reload() {
    const [fr, pr] = await Promise.all([friendsApi.getFriends(), friendsApi.getPending()])
    setFriends(fr.friends)
    setPending(pr.requests)
    friendsApi.getMembers().then((mr) => setMembers(mr.users)).catch(() => {})
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
    <div className="quiet min-h-full">
      <div className="sticky top-0 z-10 paper-bar safe-top px-4 pt-3 pb-2 border-b-2 border-dashed border-pen-faint">
        <h1 className="page-title"><span className="hi">friends</span></h1>
      </div>

      <div className="px-5 py-5 space-y-7">
        {/* Search */}
        <section>
          <p className="margin-label mb-2">Add friends</p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              search()
            }}
            className="flex gap-2"
          >
            <input
              id="friend-search"
              type="text"
              placeholder="Search by username"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="field flex-1"
            />
            <button type="submit" disabled={searching || query.trim().length < 2} className="btn-pen px-4" aria-label="Search">
              <Icon name="search" className="w-5 h-5" />
            </button>
          </form>
          {results.length > 0 && (
            <ul className="mt-2 divide-y divide-dashed divide-pen-faint">
              {results.map((user) => (
                <PersonRow key={user.id} user={user}>
                  <AddButton sent={sentTo.has(user.id)} onClick={() => sendRequest(user.id)} />
                </PersonRow>
              ))}
            </ul>
          )}
        </section>

        {/* Pending requests */}
        {pending.length > 0 && (
          <section>
            <p className="margin-label mb-2">Requests ({pending.length})</p>
            <ul className="sticky-note divide-y divide-dashed divide-pen-faint py-1">
              {pending.map(({ friendId, from }) => (
                <PersonRow key={friendId} user={from}>
                  <button onClick={() => accept(friendId)} className="btn-pen px-4 py-2">Accept</button>
                </PersonRow>
              ))}
            </ul>
          </section>
        )}

        {/* Friends list */}
        <section>
          <p className="margin-label mb-2">Friends ({friends.length})</p>
          {friends.length === 0 ? (
            <p className="text-pen-soft">No friends yet. Search above to add some.</p>
          ) : (
            <ul className="divide-y divide-dashed divide-pen-faint">
              {friends.map(({ friendshipId, user }) => {
                const h = rivalry.get(user.id)
                const played = h && h.theirFingles + h.yourFingles > 0
                return (
                  <PersonRow
                    key={friendshipId}
                    user={user}
                    sub={
                      played
                        ? [
                            h.theirFingles > 0 && `You cracked ${h.youCracked} of ${h.theirFingles}`,
                            h.yourFingles > 0 && `they cracked ${h.theyCracked} of ${h.yourFingles}`,
                          ].filter(Boolean).join(' · ').replace(/^./, (c) => c.toUpperCase())
                        : `${user.totalScore} pts`
                    }
                  />
                )
              })}
            </ul>
          )}
        </section>

        {/* Other members */}
        {members.length > 0 && (
          <section>
            <p className="margin-label mb-2">Other players</p>
            <ul className="divide-y divide-dashed divide-pen-faint">
              {members.map((user) => (
                <PersonRow key={user.id} user={user} sub={`${user.totalScore} pts`}>
                  {pending.some((p) => p.from.id === user.id) ? (
                    <span className="text-pen-soft text-sm font-bold">Wants to be friends</span>
                  ) : (
                    <AddButton sent={sentTo.has(user.id)} onClick={() => sendRequest(user.id)} />
                  )}
                </PersonRow>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}

function PersonRow({ user, sub, children }: { user: PublicUser; sub?: string; children?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <Avatar name={user.username} />
      <div className="flex-1 min-w-0">
        <p className="font-bold truncate">{user.username}</p>
        {sub && <p className="text-pen-soft text-sm">{sub}</p>}
      </div>
      {children}
    </li>
  )
}

function AddButton({ sent, onClick }: { sent: boolean; onClick: () => void }) {
  return sent ? (
    <span className="flex items-center gap-1 text-pen-soft text-sm font-bold">
      <Icon name="check" className="w-4 h-4" /> Request sent
    </span>
  ) : (
    <button onClick={onClick} className="btn-outline px-4 py-2">Add</button>
  )
}
