# Build stage
FROM node:20-alpine AS builder

# Install Web3-specific dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl \
    ca-certificates \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies with Web3 optimizations
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install Web3-specific runtime dependencies
RUN apk add --no-cache \
    curl \
    ca-certificates \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Security hardening
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Generate Prisma Client for production
RUN npx prisma generate

# Create non-root user and set permissions
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Health check with Web3 endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health/web3 || exit 1

# Expose port
EXPOSE 8000

# Web3-specific environment variables
ENV NODE_ENV=production
ENV WEB3_NETWORK=mainnet
ENV SOLANA_RPC_URL=${SOLANA_RPC_URL}
ENV ETHEREUM_RPC_URL=${ETHEREUM_RPC_URL}
ENV INFURA_PROJECT_ID=${INFURA_PROJECT_ID}
ENV ALCHEMY_API_KEY=${ALCHEMY_API_KEY}
ENV SMART_CONTRACT_ADDRESSES=${SMART_CONTRACT_ADDRESSES}
ENV JWT_SECRET=${JWT_SECRET}
ENV ENCRYPTION_KEY=${ENCRYPTION_KEY}

# Use dumb-init as PID 1
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main.js"]
