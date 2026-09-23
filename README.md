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
- Docker (runs the local Postgres)
- Optional: [Railway CLI](https://docs.railway.com/guides/cli) (`brew install railway`), to pull Cloudinary credentials and copy production data

---

## Local development

```bash
npm install
railway login && railway link   # optional, once — see below
npm run local:setup
npm run dev
```

`local:setup` writes `backend/.env` and `frontend/.env.development.local`, starts Postgres in Docker (`localhost:5433`), applies the schema, and seeds four friends: `alice`, `bob`, `carol`, `dave` (all `@fingle.app`, password `password123`). It also seeds a fingle alice sent to the other three, so you can try the shared comment thread. It is safe to re-run; secrets are kept and an existing `backend/.env` is backed up to `backend/.env.bak`.

- Frontend: http://localhost:5173 (proxies `/api` and `/socket.io` to the local backend)
- Backend: http://localhost:3001

### What comes from Railway

Only the Cloudinary credentials, so sending a photo works. Test uploads go to the `fingle-dev/` folder instead of the production one. Without the Railway CLI, fill in the `CLOUDINARY_*` values in `backend/.env` by hand. If the backend is a different service from the one you linked, use `RAILWAY_SERVICE=<name> npm run local:setup`.

Everything else is local on purpose:
- **Database**: local Docker Postgres.
- **JWT secret**: generated locally.
- **VAPID push keys**: generated locally. Push notifications work on `localhost` in Chrome.
- **Email**: no Resend key. Verification and password-reset links are printed in the backend console.

**Don't run the dev backend with `railway run`.** It injects the production `DATABASE_URL`, and `dotenv` won't override a variable that's already set. As a guard, `npm run dev` and `npm run db:seed` refuse to start against a non-local database unless `ALLOW_REMOTE_DB=1` is set.

### Testing against a copy of production data

```bash
npm run db:pull-prod   # read-only against prod; replaces your local DB (asks first)
npm run db:push        # apply your branch's schema changes on top
npm run dev            # startup backfills run here, against the copy
```

The copy has push subscriptions and email/reset tokens removed, so local testing can't notify real users. Log in with your real account. If the database service isn't named `Postgres`, set `RAILWAY_DB_SERVICE=<name>`. The service needs a public TCP proxy (`DATABASE_PUBLIC_URL`).

### Other commands

| Command | What it does |
|---|---|
| `npm run db:up` / `db:down` | Start / stop local Postgres (data persists in a Docker volume) |
| `npm run db:push` | Apply `prisma/schema.prisma` to the local DB (what production does on boot) |
| `npm run db:seed` | Re-run the seed (idempotent) |
| `npm run db:studio` | Browse the local DB |
| `VITE_PROXY_TARGET=https://api.fingle.club npm run dev:frontend` | Local UI against the **production** API (real data) |

---

## Testing the game end-to-end

1. Open two browser windows side by side
2. **Window A** — log in as `alice@fingle.app` / `password123`
3. **Window B** — log in as `bob@fingle.app` / `password123` (use a private window so the sessions don't share storage)
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
