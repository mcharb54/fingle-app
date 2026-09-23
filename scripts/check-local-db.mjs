// Refuses to start the dev backend against a non-local database.
// `railway run` or a copied .env can silently point local dev at production;
// dotenv won't override variables that are already set, so check both sources.
import { readFileSync } from 'fs'

function fromEnvFile(key) {
  try {
    const line = readFileSync(new URL('../backend/.env', import.meta.url), 'utf8')
      .split('\n')
      .find((l) => l.trim().startsWith(`${key}=`))
    return line?.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')
  } catch {
    return undefined
  }
}

const url = process.env.DATABASE_URL ?? fromEnvFile('DATABASE_URL')
if (!url) {
  console.error('✖ DATABASE_URL is not set. Run `npm run local:setup` first.')
  process.exit(1)
}

const host = new URL(url).hostname
if (!['localhost', '127.0.0.1', '::1'].includes(host) && process.env.ALLOW_REMOTE_DB !== '1') {
  console.error(`✖ Refusing to run the dev backend against a remote database (${host}).`)
  console.error('  Local dev writes data, runs the startup backfill, and sends push notifications.')
  console.error('  Use `npm run db:up` for a local DB, or set ALLOW_REMOTE_DB=1 if you really mean it.')
  process.exit(1)
}
