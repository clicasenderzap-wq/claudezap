FROM node:20-slim

# Install Google Chrome Stable via direct .deb download
RUN apt-get update && apt-get install -y wget fonts-freefont-ttf --no-install-recommends \
    && wget -q -O /tmp/chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
    && apt-get install -y /tmp/chrome.deb \
    && rm /tmp/chrome.deb \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_SKIP_DOWNLOAD=true \
    CHROME_BIN=/usr/bin/google-chrome-stable

WORKDIR /app

# Copy only package.json (not lock file — deps changed completely)
COPY package.json ./
RUN npm install --production --no-fund --no-audit

COPY src ./src

EXPOSE 3001
CMD ["node", "src/app.js"]
