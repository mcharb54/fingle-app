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
  quickDraw?: boolean
  // Sent tab only: stumper points you earned from this guess
  senderPoints?: number
  isCountCorrect: boolean
  isFingersCorrect: boolean
  fingerCountGuess: number
  whichFingersGuess: FingerName[]
  createdAt: string
}

export interface Reaction {
  id: string
  emoji: string
  userId: string
  user: { id: string; username: string }
}

export interface Comment {
  id: string
  userId: string
  text: string
  createdAt: string
  user: { id: string; username: string; avatarUrl: string | null }
}

export interface Challenge {
  id: string
  senderId: string
  receiverId: string
  // Shared by all challenges from one multi-recipient send; comments/reactions are per group
  groupId: string
  photoUrl: string
  fingerCount: number
  whichFingers: FingerName[]
  seen: boolean
  createdAt: string
  expiresAt: string | null
  sender?: PublicUser
  receiver?: PublicUser
  guess?: GuessResult | null
  reactions?: Reaction[]
  comments?: Comment[]
  // Inbox only: other friends the same fingle was sent to
  coRecipients?: PublicUser[]
  // Inbox only: how the group is doing (counts are spoiler-free)
  groupProgress?: { total: number; guessed: number; cracked: number }
  // Inbox only, after you've guessed: how the others scored (null = not guessed yet)
  coResults?: { user: PublicUser; points: number | null }[]
}

export interface Badge {
  id: string
  name: string
  description: string
  earnedAt?: string | null
}

export interface DailyStreak {
  days: number
  todayDone: boolean
  freezeUsedThisWeek: boolean
}

export interface PlayerStats {
  xp: number
  level: number
  levelStart: number
  nextLevelAt: number
  hotStreak: number
  bestHotStreak: number
  daily: DailyStreak
  guesses: number
  perfects: number
  countCorrect: number
  quickDraws: number
  sent: number
  friendGuessesOnMine: number
  stumps: number
  stumperPoints: number
  title: string
}

export interface HeadToHead {
  friend: PublicUser
  youCracked: number
  theirFingles: number
  theyCracked: number
  yourFingles: number
}

export interface GuessProgress {
  xpBefore: number
  xp: number
  level: number
  levelStart: number
  nextLevelAt: number
  hotStreak: number
  daily: DailyStreak
  newBadges: Badge[]
}

export interface FriendEntry {
  friendshipId: string
  user: PublicUser
}

export interface FriendRequest {
  friendId: string
  from: PublicUser
}
