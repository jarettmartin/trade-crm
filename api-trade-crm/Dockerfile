# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for Playwright (required for PDF generation)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto \
    wqy-zenhei

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine

WORKDIR /app

# Install only the runtime Playwright dependencies (Chromium browser binary)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto \
    wqy-zenhei

# Set Playwright browser path so it uses the system Chromium
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/bin/chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV CHROMIUM_PATH=/usr/bin/chromium-browser

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/src/invoices/templates ./src/invoices/templates

# Expose the app port
EXPOSE 3000

# Start the server
CMD ["node", "dist/main"]