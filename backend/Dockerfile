FROM node:20-alpine AS base

# Fix Prisma + Alpine OpenSSL compatibility
RUN apk add --no-cache openssl openssl-dev libc6-compat

WORKDIR /app

# Copy root workspace manifest
COPY package.json ./
COPY backend/package.json ./backend/
COPY prisma ./prisma/

# Install all deps
RUN npm install --workspace=backend

# Generate Prisma client
RUN cd backend && npx prisma generate --schema=../prisma/schema.prisma

# Copy backend source
COPY backend/src ./backend/src
COPY backend/tsconfig.json ./backend/

# Build
RUN cd backend && npm run build

# Push schema then start
EXPOSE 3001
CMD ["sh", "-c", "cd backend && npx prisma db push --schema=../prisma/schema.prisma && node dist/index.js"]
