FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --production --omit=optional --no-fund --no-audit
COPY src ./src
EXPOSE 3001
CMD ["node", "src/app.js"]
