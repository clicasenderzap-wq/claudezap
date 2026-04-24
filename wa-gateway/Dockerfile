FROM node:20-slim

# Install Chromium
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-freefont-ttf \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_SKIP_DOWNLOAD=true \
    CHROME_BIN=/usr/bin/chromium

WORKDIR /app

# Copy only package.json (not lock file — deps changed completely)
COPY package.json ./
RUN npm install --production --no-fund --no-audit

COPY src ./src

EXPOSE 3001
CMD ["node", "src/app.js"]
