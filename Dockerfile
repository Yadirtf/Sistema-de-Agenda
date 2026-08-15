# 1. Etapa de construcción
FROM node:22-slim AS builder

RUN apt-get update && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar archivos de definición
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/
COPY packages/shared/package*.json ./packages/shared/

# Instalar dependencias (incluye enlaces de workspaces)
RUN npm install

# Copiar todo el código
COPY . .

# --- PASO CRÍTICO: Compilar Shared primero ---
RUN npm run build --workspace=@agendamiento/shared

# Generar Prisma
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

# --- PASO CRÍTICO: Definir variables de entorno para el build de Next.js ---
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Compilar API y Web por separado
RUN npm run build --workspace=api
RUN npm run build --workspace=web

# 2. Etapa de ejecución
FROM node:22-slim AS runner

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copiar todo desde builder (incluyendo dist de cada app)
COPY --from=builder /app ./

EXPOSE 3000 3001
