FROM node:20-alpine AS base
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

# Run migrations then start
EXPOSE 3001
CMD ["sh", "-c", "cd backend && npx prisma migrate deploy --schema=../prisma/schema.prisma && node dist/index.js"]
