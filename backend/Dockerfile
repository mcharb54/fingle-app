FROM node:20-alpine AS base
WORKDIR /app

# Copy root workspace manifest
COPY package.json ./
COPY backend/package.json ./backend/
COPY prisma ./prisma/

# Install all deps (needed for prisma generate)
RUN npm install --workspace=backend

# Generate Prisma client
RUN npx --prefix backend prisma generate --schema=../prisma/schema.prisma

# Copy backend source
COPY backend/src ./backend/src
COPY backend/tsconfig.json ./backend/

# Build
RUN npm run build --workspace=backend

# Run migrations then start
EXPOSE 3001
CMD ["sh", "-c", "npx --prefix backend prisma migrate deploy --schema=../prisma/schema.prisma && node backend/dist/index.js"]
