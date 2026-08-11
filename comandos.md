# Comandos del Proyecto - Sistema de Agendamiento

Este archivo contiene los comandos principales para la gestión, ejecución y despliegue del proyecto (Monorepo Next.js + NestJS).

## 1. Infraestructura y Contenedores (Docker)
El proyecto utiliza Docker para los servicios de base de datos y caché.

| Acción | Comando |
| :--- | :--- |
| **Levantar servicios** (Postgres + Redis) | `npm run docker:up` |
| **Detener servicios** | `npm run docker:down` |
| **Ver logs de contenedores** | `npm run docker:logs` |

---

## 2. Desarrollo y Ejecución
Comandos para ejecutar las aplicaciones en modo desarrollo.

| Acción | Comando |
| :--- | :--- |
| **Instalar dependencias** | `npm install` |
| **Ejecutar todo el sistema** (API + Web) | `npm run dev` |
| **Ejecutar solo el Backend** (NestJS) | `npm run dev:api` |
| **Ejecutar solo el Frontend** (Next.js) | `npm run dev:web` |

---

## 3. Base de Datos (Prisma)
Gestión del esquema y los datos en PostgreSQL.

| Acción | Comando |
| :--- | :--- |
| **Ejecutar migraciones** | `npm run db:migrate` |
| **Sincronizar esquema** (Push) | `npm run db:push:api` |
| **Cargar datos iniciales** (Seed) | `npm run db:seed` |
| **Abrir Prisma Studio** (Explorador GUI) | `npm run db:studio` |

---

## 4. Compilación y Calidad (Build & Lint)
Comandos para preparar el proyecto para producción y verificar errores.

| Acción | Comando |
| :--- | :--- |
| **Compilar todo el proyecto** | `npm run build` |
| **Compilar Backend** | `npm run build:api` |
| **Compilar Frontend** | `npm run build:web` |
| **Compilar shared library** | `npm run build:shared` |
| **Ejecutar Linter** | `npm run lint` |
| **Verificación de tipos TS** | `npm run type-check` |

---

## Flujo de Inicio Rápido
1. Asegúrate de tener un archivo `.env` configurado en la raíz.
2. Instala dependencias: `npm install`
3. Levanta la infraestructura: `npm run docker:up`
4. Prepara la base de datos: `npm run db:migrate` y `npm run db:seed`
5. Inicia el desarrollo: `npm run dev`
