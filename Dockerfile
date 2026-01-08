# Multi-stage Dockerfile for QCX - Optimized for Google Cloud Build and Production
# Uses pinned Bun v1.3.5-alpine for reproducible builds (January 2026)

# Stage 1: Install dependencies
FROM oven/bun:1.3.5-alpine AS deps

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies (frozen lockfile for reproducibility)
RUN bun install --frozen-lockfile

# Stage 2: Build the Next.js application
FROM oven/bun:1.3.5-alpine AS builder

WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the application (standalone output)
RUN bun run build

# Stage 3: Production runtime (minimal image running with Bun)
FROM oven/bun:1.3.5-alpine AS runner

WORKDIR /app

# Create non-root group and user, with nextjs belonging to nodejs group
RUN addgroup -g 1001 -S nodejs \
    && adduser -S -u 1001 -G nodejs nextjs

# Environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy standalone build output (optimized for minimal size)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Copy static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Copy public folder
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check (uses Bun to fetch; adjust /api/health if your endpoint differs)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD ["bun", "--eval", "fetch('http://localhost:3000/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"]

# Run the standalone server with Bun (fully compatible in Bun 1.3+)
CMD ["bun", "server.js"]
