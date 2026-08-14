# 1. Etapa de construcción
FROM node:22-slim AS builder

# Instalar dependencias necesarias para Prisma y compilación
RUN apt-get update && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar archivos de definición de paquetes
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/
COPY packages/shared/package*.json ./packages/shared/

# Instalar todas las dependencias
RUN npm install

# Copiar el código fuente
COPY . .

# Generar Cliente de Prisma
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

# Compilar Shared, API y Web
RUN npm run build

# 2. Etapa de ejecución (Imagen ligera)
FROM node:22-slim AS runner

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copiar solo lo necesario desde la etapa de construcción
COPY --from=builder /app ./

EXPOSE 3000 3001

# El comando de inicio dependerá de si es API o WEB, lo manejaremos en docker-compose
