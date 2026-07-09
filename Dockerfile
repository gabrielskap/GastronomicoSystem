# Stage 1: Build the application
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package configuration
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy application source code
COPY . .

# Build the frontend and backend bundle
RUN npm run build

# Stage 2: Run the application
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy package configuration for production installation
COPY package*.json ./

# Install only production dependencies (since server.cjs uses external dependencies)
RUN npm ci --omit=dev

# Copy only the built assets and bundled server from the builder stage
COPY --from=builder /app/dist ./dist

# Expose port (default to 3000, can be overridden by PORT env var)
EXPOSE 3000

# Start the application
CMD ["node", "dist/server.cjs"]
