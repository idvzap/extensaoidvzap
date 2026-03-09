# Stage 1: Build do frontend
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Servidor de produção
FROM node:20-alpine

WORKDIR /app

# Copia dependências do backend
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Copia o código do servidor
COPY server/index.js ./server/

# Copia o build do frontend
COPY --from=builder /app/dist ./dist

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "server/index.js"]
