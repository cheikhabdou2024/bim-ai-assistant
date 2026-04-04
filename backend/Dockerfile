# ─────────────────────────────────────────────────────────────
# BIM AI Backend — Dockerfile (multi-stage)
# ─────────────────────────────────────────────────────────────

# ── Stage 1: Dependencies ─────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
# Install ALL deps (including devDeps for Prisma generate)
RUN npm ci

# ── Stage 2: Builder ──────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build NestJS — fail explicitly if dist/main.js is not produced
RUN npm run build && test -f dist/main.js || (echo "ERROR: nest build did not produce dist/main.js" && exit 1)

# ── Stage 3: Production ───────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Non-root user
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nestjs

# Only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built app + Prisma artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "dist/main"]
