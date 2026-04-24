FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN NODE_OPTIONS="--max-old-space-size=512" npm install --production --no-fund --no-audit
COPY src ./src
EXPOSE 3001
CMD ["node", "src/app.js"]
