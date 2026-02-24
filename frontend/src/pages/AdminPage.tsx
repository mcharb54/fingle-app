import { useEffect, useState, FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { adminApi } from '../api'
import type { AdminUser } from '../types'

export default function AdminPage() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ username: '', email: '', totalScore: '' })
  const [editError, setEditError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    setError('')
    try {
      const { users } = await adminApi.getUsers()
      setUsers(users)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string, username: string) {
    if (!confirm(`Permanently delete @${username}? This cannot be undone.`)) return
    setActionLoading(id + ':delete')
    try {
      await adminApi.deleteUser(id)
      setUsers((prev) => prev.filter((u) => u.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleToggleBan(id: string) {
    setActionLoading(id + ':ban')
    try {
      const { user: updated } = await adminApi.toggleBan(id)
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ban toggle failed')
    } finally {
      setActionLoading(null)
    }
  }

  function startEdit(u: AdminUser) {
    setEditingId(u.id)
    setEditForm({ username: u.username, email: u.email, totalScore: String(u.totalScore) })
    setEditError('')
  }

  async function handleEditSubmit(e: FormEvent, id: string) {
    e.preventDefault()
    setEditError('')
    setActionLoading(id + ':edit')
    try {
      const { user: updated } = await adminApi.updateUser(id, {
        username: editForm.username,
        email: editForm.email,
        totalScore: Number(editForm.totalScore),
      })
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)))
      setEditingId(null)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setActionLoading(null)
    }
  }

  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-black">
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <a href="/" className="text-gray-400 hover:text-white text-sm">
          ← Back
        </a>
        <h1 className="text-xl font-black text-white flex-1">Admin Panel</h1>
        <span className="text-xs text-brand-400 font-semibold">{users.length} users</span>
      </div>

      <div className="p-4 max-w-3xl mx-auto space-y-4">
        {/* Search */}
        <input
          type="text"
          placeholder="Search by username or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-brand-400"
        />

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 rounded-xl p-3 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-400 py-12">Loading users…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-500 py-12">No users found</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((u) => (
              <div
                key={u.id}
                className={`bg-zinc-900 rounded-2xl overflow-hidden border ${u.isBanned ? 'border-red-500/40' : 'border-white/5'}`}
              >
                {/* User header row */}
                <div className="flex items-center gap-3 p-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-brand-700 flex items-center justify-center text-sm font-black text-white flex-shrink-0">
                    {u.username[0].toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-bold text-sm">{u.username}</span>
                      {u.isAdmin && (
                        <span className="text-xs bg-brand-500/20 text-brand-300 border border-brand-500/40 rounded-full px-2 py-0.5">
                          admin
                        </span>
                      )}
                      {u.isBanned && (
                        <span className="text-xs bg-red-500/20 text-red-300 border border-red-500/40 rounded-full px-2 py-0.5">
                          banned
                        </span>
                      )}
                      {u.emailVerified && (
                        <span className="text-xs text-green-400">✓</span>
                      )}
                    </div>
                    <p className="text-gray-400 text-xs truncate">{u.email}</p>
                    <p className="text-gray-500 text-xs">
                      {u.totalScore} pts · joined {new Date(u.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Action buttons — hidden for self */}
                  {u.id !== me?.id && !u.isAdmin && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => startEdit(u)}
                        className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleBan(u.id)}
                        disabled={actionLoading === u.id + ':ban'}
                        className={`text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                          u.isBanned
                            ? 'bg-green-500/20 hover:bg-green-500/30 text-green-300'
                            : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300'
                        }`}
                      >
                        {actionLoading === u.id + ':ban'
                          ? '…'
                          : u.isBanned
                          ? 'Unban'
                          : 'Ban'}
                      </button>
                      <button
                        onClick={() => handleDelete(u.id, u.username)}
                        disabled={actionLoading === u.id + ':delete'}
                        className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {actionLoading === u.id + ':delete' ? '…' : 'Delete'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Inline edit form */}
                {editingId === u.id && (
                  <form
                    onSubmit={(e) => handleEditSubmit(e, u.id)}
                    className="border-t border-white/10 px-4 pb-4 pt-3 space-y-3"
                  >
                    {editError && (
                      <div className="bg-red-500/20 border border-red-500 text-red-300 rounded-xl p-3 text-xs">
                        {editError}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-gray-500 text-xs mb-1 block">Username</label>
                        <input
                          type="text"
                          value={editForm.username}
                          onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
                          required
                          className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-400"
                        />
                      </div>
                      <div>
                        <label className="text-gray-500 text-xs mb-1 block">Score</label>
                        <input
                          type="number"
                          value={editForm.totalScore}
                          onChange={(e) => setEditForm((f) => ({ ...f, totalScore: e.target.value }))}
                          required
                          min={0}
                          className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-400"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-gray-500 text-xs mb-1 block">Email</label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                        required
                        className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-400"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={actionLoading === u.id + ':edit'}
                        className="flex-1 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white font-bold py-2 rounded-xl text-sm transition-colors"
                      >
                        {actionLoading === u.id + ':edit' ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-4 border border-white/10 text-gray-400 hover:text-white rounded-xl text-sm transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
