FROM node:20-slim

# Install Google Chrome Stable (newer and more compatible than system Chromium)
RUN apt-get update && apt-get install -y wget gnupg fonts-freefont-ttf --no-install-recommends \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update && apt-get install -y google-chrome-stable --no-install-recommends \
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
