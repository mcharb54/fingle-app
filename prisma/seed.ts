import 'dotenv/config'
import { randomUUID } from 'crypto'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const NAMES = ['alice', 'bob', 'carol', 'dave'] as const
// Served by the Vite dev server, so the seed doesn't depend on Cloudinary
const SEED_PHOTO = '/icon-512.png'

async function main() {
  const hash = await bcrypt.hash('password123', 12)

  const users = await Promise.all(
    NAMES.map((username) =>
      prisma.user.upsert({
        where: { email: `${username}@fingle.app` },
        update: {},
        create: { username, email: `${username}@fingle.app`, passwordHash: hash, emailVerified: true },
      }),
    ),
  )
  const [alice, ...others] = users

  // Everyone is friends with everyone
  for (const [i, a] of users.entries()) {
    for (const b of users.slice(i + 1)) {
      await prisma.friend.upsert({
        where: { initiatorId_receiverId: { initiatorId: a.id, receiverId: b.id } },
        update: {},
        create: { initiatorId: a.id, receiverId: b.id, status: 'ACCEPTED' },
      })
    }
  }

  // A multi-recipient fingle from alice, for trying the shared comment/reaction thread
  const hasGroup = await prisma.challenge.findFirst({ where: { senderId: alice.id, photoUrl: SEED_PHOTO } })
  if (!hasGroup) {
    const groupId = randomUUID()
    await prisma.challenge.createMany({
      data: others.map((u) => ({
        senderId: alice.id,
        receiverId: u.id,
        groupId,
        photoUrl: SEED_PHOTO,
        fingerCount: 2,
        whichFingers: ['index', 'middle'],
      })),
    })
  }

  console.log(`Seed complete. ${NAMES.map((n) => `${n}@fingle.app`).join(', ')} all use password: password123`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
