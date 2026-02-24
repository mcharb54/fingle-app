import type { AdminUser, Challenge, FriendEntry, FriendRequest, PublicUser, User, FingerName } from '../types'

const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api'

function getToken(): string | null {
  return localStorage.getItem('fingle_token')
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Request failed')
  return data as T
}

// Auth
export const authApi = {
  register: (username: string, email: string, password: string) =>
    request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    }),
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ user: User }>('/auth/me'),
  verifyEmail: (token: string) =>
    request<{ message: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`),
  resendVerification: () =>
    request<{ message: string }>('/auth/resend-verification', { method: 'POST' }),
  forgotPassword: (email: string) =>
    request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, password: string) =>
    request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
}

// Friends
export const friendsApi = {
  search: (q: string) => request<{ users: PublicUser[] }>(`/friends/search?q=${encodeURIComponent(q)}`),
  getFriends: () => request<{ friends: FriendEntry[] }>('/friends'),
  getPending: () => request<{ requests: FriendRequest[] }>('/friends/pending'),
  sendRequest: (receiverId: string) =>
    request<{ friend: unknown }>('/friends/request', {
      method: 'POST',
      body: JSON.stringify({ receiverId }),
    }),
  accept: (id: string) =>
    request<{ friend: unknown }>(`/friends/${id}/accept`, { method: 'PUT' }),
}

// Challenges
export const challengesApi = {
  send: (formData: FormData) =>
    request<{ challenge: Challenge }>('/challenges', { method: 'POST', body: formData }),
  getReceived: () => request<{ challenges: Challenge[] }>('/challenges/received'),
  getSent: () => request<{ challenges: Challenge[] }>('/challenges/sent'),
  checkCount: (challengeId: string, fingerCountGuess: number) =>
    request<{ isCorrect: boolean }>(`/challenges/${challengeId}/check-count`, {
      method: 'POST',
      body: JSON.stringify({ fingerCountGuess }),
    }),
  guess: (challengeId: string, fingerCountGuess: number, whichFingersGuess: FingerName[]) =>
    request<{
      guess: unknown
      result: {
        points: number
        isCountCorrect: boolean
        isFingersCorrect: boolean
        correctCount: number
        correctFingers: FingerName[]
        photoUrl: string
      }
    }>(`/challenges/${challengeId}/guess`, {
      method: 'POST',
      body: JSON.stringify({ fingerCountGuess, whichFingersGuess }),
    }),
}

// Leaderboard
export const leaderboardApi = {
  get: (scope: 'global' | 'friends' = 'global') =>
    request<{ leaderboard: PublicUser[] }>(`/leaderboard?scope=${scope}`),
}

// Admin
export const adminApi = {
  getUsers: () => request<{ users: AdminUser[] }>('/admin/users'),
  deleteUser: (id: string) => request<{ message: string }>(`/admin/users/${id}`, { method: 'DELETE' }),
  toggleBan: (id: string) => request<{ user: AdminUser }>(`/admin/users/${id}/ban`, { method: 'PUT' }),
  updateUser: (id: string, data: { username?: string; email?: string; totalScore?: number }) =>
    request<{ user: AdminUser }>(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
}
