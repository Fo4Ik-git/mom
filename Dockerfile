# 1. Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# 2. Build
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_APP_URL=http://localhost:3004
ARG NEXT_PUBLIC_APP_REQUEST_SECRET=
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_REQUEST_SECRET=$NEXT_PUBLIC_APP_REQUEST_SECRET

RUN npx prisma generate
RUN npm run build:docker

# 3. Prisma CLI + deps (for migrate deploy in production)
FROM node:20-alpine AS migrate
RUN apk add --no-cache openssl
WORKDIR /migrate
COPY prisma ./prisma
RUN printf '%s\n' \
  '{"name":"migrate","private":true,"dependencies":{"prisma":"6.19.3"}}' \
  > package.json \
  && npm install --omit=dev

# 4. Production
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/build/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/build/static ./build/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=migrate --chown=nextjs:nodejs /migrate/node_modules ./migrate/node_modules
COPY scripts/docker-entrypoint.sh scripts/docker-seed-admin.mjs /app/scripts/

RUN chmod +x /app/scripts/docker-entrypoint.sh \
  && mkdir -p /app/prisma /app/scripts \
  && chown -R nextjs:nodejs /app/prisma /app/migrate /app/scripts

USER nextjs

EXPOSE 3000

ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
