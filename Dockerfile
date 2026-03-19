FROM mcr.microsoft.com/playwright:v1.49.0-noble

# Explicitly run build steps as root
USER root

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy source
COPY src/ ./src/

# Hand ownership to pwuser for runtime
RUN chown -R pwuser:pwuser /app

# Set environment
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Expose port (Railway overrides via PORT env var)
EXPOSE 3000

# Railway manages health checks via /api/health — no Docker HEALTHCHECK needed

# Run as non-root for security
USER pwuser

CMD ["node", "src/index.js"]
