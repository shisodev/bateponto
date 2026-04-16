FROM node:20-alpine

WORKDIR /app

# Instala dependências primeiro (aproveita cache do Docker)
COPY package*.json ./
RUN npm ci --omit=dev

# Copia o código fonte
COPY src/ ./src/

# Diretório para o volume do banco de dados
RUN mkdir -p /data

EXPOSE 3001

ENV NODE_ENV=production \
    PORT=3001 \
    DB_PATH=/data/bateponto.db

CMD ["node", "src/server.js"]
