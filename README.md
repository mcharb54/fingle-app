# Fingle

A Snapchat-style finger-guessing game. Friends send you a photo of their fingers — you have to guess how many (and which ones) to unlock it and earn points.

## Scoring

| Result | Points |
|---|---|
| Wrong count | 0 pts (photo still reveals) |
| Correct count | 10 pts |
| Correct count + exact fingers | 30 pts |

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Express + TypeScript + Socket.io |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT (30-day tokens) |
| Images | Cloudinary |
| Hand AI | TensorFlow.js + MediaPipe Hands (runs in browser) |

---

## Prerequisites

- Node.js 18+
- PostgreSQL running locally (or a hosted instance)
- A free [Cloudinary](https://cloudinary.com) account

---

## Setup

### 1. Clone and install

```bash
git clone <repo-url> fingle
cd fingle
npm install
```

### 2. Configure environment

Copy the example file and fill in your values:

```bash
cp .env.example backend/.env
```

Edit `backend/.env`:

```env
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/fingle"
JWT_SECRET="replace-with-a-long-random-string"
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
PORT=3001
CLIENT_URL="http://localhost:5173"
```

### 3. Create the database

```bash
createdb fingle
```

### 4. Run migrations and generate Prisma client

```bash
npm run db:migrate
# When prompted, give the migration a name like "init"
```

### 5. (Optional) Seed with test users

```bash
npm run db:seed
# Creates alice@fingle.app and bob@fingle.app (password: password123)
# They are already friends with each other
```

### 6. Start the app

```bash
npm run dev
```

This starts both servers concurrently:
- Backend: http://localhost:3001
- Frontend: http://localhost:5173 (proxies `/api` and `/socket.io` to the backend)

---

## Testing the game end-to-end

1. Open two browser windows side by side
2. **Window A** — register as `alice@fingle.app` / `password123`
3. **Window B** — register as `bob@fingle.app` / `password123`
4. In **Window A**, go to Send (📷 tab) → allow camera → take a photo → AI suggests fingers (or set manually) → send to bob
5. In **Window B**, the feed shows a locked card from alice → tap it → guess the count → if correct, pick fingers → photo reveals + points awarded
6. **Window A** receives a real-time notification that bob guessed

---

## Project Structure

```
fingle/
├── frontend/src/
│   ├── pages/          # Feed, ChallengePage, SendPage, FriendsPage, ProfilePage, LeaderboardPage
│   ├── components/     # ChallengeCard, CountPicker, FingerPicker, PointsAnimation, CameraCapture, NavBar
│   ├── hooks/          # useAuth, useSocket, useHandDetect
│   ├── context/        # AuthContext
│   ├── api/            # Typed fetch wrappers
│   └── types/          # Shared TypeScript types
├── backend/src/
│   ├── routes/         # auth, friends, challenges, leaderboard
│   ├── controllers/    # Business logic for each route group
│   ├── middleware/      # JWT auth middleware
│   ├── services/        # Cloudinary upload, Socket.io emit
│   └── lib/            # Prisma singleton
└── prisma/
    ├── schema.prisma   # Database schema
    └── seed.ts         # Test data seed script
```

---

## API Reference

### Auth
| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/api/auth/register` | `{username, email, password}` | Create account, returns JWT |
| POST | `/api/auth/login` | `{email, password}` | Login, returns JWT |
| GET | `/api/auth/me` | — | Current user (requires Bearer token) |

### Friends
| Method | Path | Description |
|---|---|---|
| GET | `/api/friends/search?q=` | Search users by username |
| GET | `/api/friends` | List accepted friends |
| GET | `/api/friends/pending` | Incoming friend requests |
| POST | `/api/friends/request` | Send friend request `{receiverId}` |
| PUT | `/api/friends/:id/accept` | Accept a request |

### Challenges
| Method | Path | Description |
|---|---|---|
| POST | `/api/challenges` | Send a challenge (multipart: photo, receiverId, fingerCount, whichFingers JSON) |
| GET | `/api/challenges/received` | Inbox |
| GET | `/api/challenges/sent` | Sent challenges |
| POST | `/api/challenges/:id/check-count` | Validate count guess without storing `{fingerCountGuess}` |
| POST | `/api/challenges/:id/guess` | Submit final guess `{fingerCountGuess, whichFingersGuess}` |

### Leaderboard
| Method | Path | Description |
|---|---|---|
| GET | `/api/leaderboard?scope=global\|friends` | Top 50 scores |
