import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('password123', 12)

  const alice = await prisma.user.upsert({
    where: { email: 'alice@fingle.app' },
    update: {},
    create: { username: 'alice', email: 'alice@fingle.app', passwordHash: hash },
  })

  const bob = await prisma.user.upsert({
    where: { email: 'bob@fingle.app' },
    update: {},
    create: { username: 'bob', email: 'bob@fingle.app', passwordHash: hash },
  })

  await prisma.friend.upsert({
    where: { initiatorId_receiverId: { initiatorId: alice.id, receiverId: bob.id } },
    update: {},
    create: { initiatorId: alice.id, receiverId: bob.id, status: 'ACCEPTED' },
  })

  console.log('Seed complete. alice@fingle.app and bob@fingle.app both use password: password123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
