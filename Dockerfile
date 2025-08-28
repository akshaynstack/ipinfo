# Multi-stage Dockerfile for Hono + Prisma + TypeScript

# ---- Builder ----
FROM node:20-alpine AS builder

# Enable pnpm via corepack
RUN corepack enable

# Recommended Alpine deps for Prisma and Node
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Install deps first (better layer caching)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Generate Prisma client (no DB connection needed)
COPY prisma ./prisma
RUN pnpm prisma generate

# Copy source and build
COPY tsconfig.json ./tsconfig.json
COPY src ./src
COPY GeoLite2-Country.mmdb ./GeoLite2-Country.mmdb
RUN pnpm run build

# Prune to production dependencies only
RUN pnpm prune --prod


# ---- Runtime ----
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Install runtime deps required by Prisma on Alpine
RUN apk add --no-cache libc6-compat openssl

# Copy production node_modules, built files, and required assets
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/GeoLite2-Country.mmdb ./GeoLite2-Country.mmdb
COPY package.json ./

# Expose the port used by the Hono server
EXPOSE 8787

# Start the app
CMD ["node", "dist/index.js"]
