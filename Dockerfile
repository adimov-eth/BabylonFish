FROM oven/bun:1 as builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ai/package.json ./packages/ai/
COPY packages/telegram/package.json ./packages/telegram/

# Install pnpm
RUN curl -f https://get.pnpm.io/v6.16.js | node - add --global pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build packages
RUN pnpm build

# Production stage
FROM oven/bun:1

WORKDIR /app

# Copy built files and dependencies
COPY --from=builder /app/packages/ai/dist ./packages/ai/dist
COPY --from=builder /app/packages/telegram/dist ./packages/telegram/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/*/package.json ./packages/

# Set environment variables
ENV NODE_ENV=production

# Start the Telegram bot
CMD ["bun", "packages/telegram/dist/index.js"] 