export type FingerName = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky'

export interface User {
  id: string
  username: string
  email: string
  avatarUrl: string | null
  totalScore: number
  emailVerified: boolean
  isAdmin: boolean
  isBanned: boolean
  createdAt: string
}

export interface AdminUser {
  id: string
  username: string
  email: string
  avatarUrl: string | null
  totalScore: number
  emailVerified: boolean
  isAdmin: boolean
  isBanned: boolean
  createdAt: string
}

export interface PublicUser {
  id: string
  username: string
  avatarUrl: string | null
  totalScore: number
}

export interface GuessResult {
  points: number
  isCountCorrect: boolean
  isFingersCorrect: boolean
  fingerCountGuess: number
  whichFingersGuess: FingerName[]
  createdAt: string
}

export interface Challenge {
  id: string
  senderId: string
  receiverId: string
  photoUrl: string
  fingerCount: number
  whichFingers: FingerName[]
  seen: boolean
  createdAt: string
  expiresAt: string | null
  sender?: PublicUser
  receiver?: PublicUser
  guess?: GuessResult | null
}

export interface FriendEntry {
  friendshipId: string
  user: PublicUser
}

export interface FriendRequest {
  friendId: string
  from: PublicUser
}
