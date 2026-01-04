# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Runtime drizzle-kit config
COPY drizzle.config.cjs ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY src ./src
COPY tsconfig.json tsconfig.build.json ./
COPY scripts ./scripts

# Build TypeScript
RUN pnpm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy entire project
COPY . .

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["pnpm", "start"]
