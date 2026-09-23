#!/usr/bin/env bash
# Copy the production database into the local dev database (read-only against prod).
#
#   npm run db:pull-prod
#
# Useful for rehearsing a deploy (e.g. the startup backfill) on real data.
# Push subscriptions and email/reset tokens are wiped from the copy so local
# testing can never notify real users or reuse their links.
#
# Needs the Railway CLI, logged in and linked (`railway login && railway link`).
# RAILWAY_DB_SERVICE overrides the Postgres service name (default: Postgres).
set -euo pipefail

DB_SERVICE="${RAILWAY_DB_SERVICE:-Postgres}"
LOCAL_CONTAINER=fingle-local-db
cd "$(dirname "$0")/.."

command -v railway >/dev/null || { echo "✖ Railway CLI not installed (brew install railway)"; exit 1; }

PROD_URL=$(railway variables --service "$DB_SERVICE" --json | node -e '
  let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
    const v = JSON.parse(s)
    // The internal DATABASE_URL (*.railway.internal) is unreachable from this machine
    process.stdout.write(v.DATABASE_PUBLIC_URL ?? "")
  })')
[ -n "$PROD_URL" ] || { echo "✖ No DATABASE_PUBLIC_URL on Railway service '$DB_SERVICE' (enable its public TCP proxy, or set RAILWAY_DB_SERVICE)"; exit 1; }

echo "This replaces your LOCAL database with a copy of production ($(node -e 'console.log(new URL(process.argv[1]).host)' "$PROD_URL"))."
read -r -p "Continue? [y/N] " answer
[[ "$answer" =~ ^[Yy]$ ]] || exit 0

npm run db:up --silent

echo "• Resetting local database"
docker exec -i "$LOCAL_CONTAINER" psql -q -U fingle -d fingle -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'

echo "• Copying production data"
docker run --rm postgres:17-alpine pg_dump --no-owner --no-acl "$PROD_URL" \
  | docker exec -i "$LOCAL_CONTAINER" psql -q -U fingle -d fingle -v ON_ERROR_STOP=1 >/dev/null

echo "• Scrubbing push subscriptions and email tokens"
docker exec -i "$LOCAL_CONTAINER" psql -q -U fingle -d fingle -c \
  'DELETE FROM "PushSubscription"; DELETE FROM "EmailVerificationToken"; DELETE FROM "PasswordResetToken";'

echo "✔ Local database now mirrors production. Log in with your real account; run \`npm run dev\` to start."
echo "  Apply schema changes on top with \`npm run db:push\` (the backfill runs when the backend boots)."
