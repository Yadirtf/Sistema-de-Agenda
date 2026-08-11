# Sistema de Agendamiento — Plan de Implementación (v2)

Sistema full-stack para gestión de citas, clientes, seguimientos y reagendamientos. Se parte de un esquema PostgreSQL normalizado y se construye una aplicación completa con Next.js + NestJS + Docker.

---

## Cambios respecto al plan v1 (según feedback)

| Decisión | Resolución |
|---|---|
| **Contacto N:M** | ❌ Eliminado. Teléfono y email van directo en `people`. Se eliminan 4 tablas (`phone_numbers`, `email_addresses`, `person_phones`, `person_emails`). |
| **Backend** | ✅ NestJS con Fastify adapter |
| **ORM** | ✅ Prisma |
| **Auth** | ✅ JWT con refresh tokens en Redis. OAuth (Google) se implementará en una fase futura. |
| **Zona horaria** | ✅ `America/Bogota` |
| **Appointment statuses** | ✅ Solo 5: Confirmada, En Curso, Completada, Cancelada, No Asistió. Almacenados en BD, nunca hardcoded. |
| **Person statuses** | ✅ Activo, Inactivo |
| **Document types** | ✅ Cédula, Tarjeta de Identidad, Cédula de Extranjería, Pasaporte, PEP, PPT |
| **Periodos de agendamiento** | 🔄 **Rediseño mayor** — se añade sistema de configuración flexible (ver abajo) |

---

## Análisis de la Base de Datos (Actualizado)

### Diagrama Entidad-Relación

```mermaid
erDiagram
    document_types ||--o{ people : "tipo documento"
    person_statuses ||--o{ people : "estado"
    people ||--o| users : "autenticación"
    people ||--o| clients : "rol cliente"
    users ||--o{ user_roles : "roles"
    roles ||--o{ user_roles : "rol"

    scheduling_config ||--o{ scheduling_intervals : "intervalos"
    clients ||--o{ client_entries : "ingresos"
    clients ||--o| client_scheduling_config : "config individual"
    scheduling_intervals ||--o{ client_scheduling_config : "intervalo"
    entry_statuses ||--o{ client_entries : "estado"

    clients ||--o{ appointments : "citas"
    people ||--o{ appointments : "profesional"
    client_entries ||--o{ appointments : "ingreso"
    scheduling_periods ||--o{ appointments : "periodo"
    appointment_statuses ||--o{ appointments : "estado"
    appointments ||--o| appointments : "cita previa"

    appointments ||--o{ reschedulings : "original"
    appointments ||--o| reschedulings : "nueva"
    rescheduling_reasons ||--o{ reschedulings : "motivo"
    users ||--o{ reschedulings : "ejecutado por"

    clients ||--o{ follow_ups : "seguimientos"
    appointments ||--o{ follow_ups : "cita"
    users ||--o{ follow_ups : "ejecutado por"
    follow_up_types ||--o{ follow_ups : "tipo"
    period_statuses ||--o{ scheduling_periods : "estado"
```

### Cambio 1: Contacto embebido en `people`

Se eliminan las 4 tablas de contacto N:M y se añaden columnas directas:

```diff
 CREATE TABLE people (
     id                  BIGSERIAL PRIMARY KEY,
     document_type_id    BIGINT NOT NULL,
     document_number     VARCHAR(50) NOT NULL,
     first_name          VARCHAR(100) NOT NULL,
     middle_name         VARCHAR(100),
     last_name           VARCHAR(100) NOT NULL,
     second_last_name    VARCHAR(100),
     birth_date          DATE,
+    phone               VARCHAR(30),
+    email               VARCHAR(150),
     status_id           BIGINT NOT NULL,
     created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     ...
 );

-- ELIMINADAS:
- phone_numbers
- person_phones
- email_addresses
- person_emails
```

**Total de tablas**: 20 → 16 tablas + 3 nuevas = **19 tablas**.

### Cambio 2: Sistema de Agendamiento Flexible (NUEVO)

> [!IMPORTANT]
> Este es el cambio más significativo del plan. El sistema debe soportar múltiples escenarios de negocio simultáneamente.

#### Escenarios que debe soportar

| Escenario | Ejemplo | Solución |
|---|---|---|
| Intervalo fijo global | "Todos mis clientes vienen cada 15 días" | `scheduling_config.default_interval_id` |
| Intervalo fijo individual | "Este cliente viene cada mes, este otro cada 15 días" | `client_scheduling_config.interval_id` |
| Sin intervalo fijo | "Cada cliente tiene su propio ritmo" | `scheduling_config.allow_custom_dates = TRUE` |
| Auto-sugerencia de próxima cita | Al completar cita → sugerir fecha automática | Lógica backend basada en intervalo + semana de ingreso |
| Respeto de semana de ingreso | No sobrecargar otras semanas | Cálculo: siguiente fecha cae en la misma semana relativa del mes |

#### Nuevas tablas

```sql
-- ============================================================
-- INTERVALOS DE AGENDAMIENTO (catálogo)
-- ============================================================

CREATE TABLE scheduling_intervals (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    days            INT NOT NULL,
    description     TEXT
);

-- Seed:
-- (1, 'Quincenal', 15, 'Cada 15 días')
-- (2, 'Mensual', 30, 'Cada mes')
-- (3, 'Bimensual', 60, 'Cada 2 meses')
-- (4, 'Trimestral', 90, 'Cada 3 meses')

-- ============================================================
-- CONFIGURACIÓN GLOBAL DE AGENDAMIENTO
-- (1 registro por instalación/negocio)
-- ============================================================

CREATE TABLE scheduling_config (
    id                      BIGSERIAL PRIMARY KEY,
    default_interval_id     BIGINT NOT NULL,
    allow_client_override   BOOLEAN NOT NULL DEFAULT TRUE,
    auto_suggest_next       BOOLEAN NOT NULL DEFAULT TRUE,
    respect_entry_week      BOOLEAN NOT NULL DEFAULT TRUE,
    working_days            SMALLINT[] NOT NULL DEFAULT '{1,2,3,4,5}',
    business_start_time     TIME NOT NULL DEFAULT '08:00',
    business_end_time       TIME NOT NULL DEFAULT '18:00',
    slot_duration_minutes   INT NOT NULL DEFAULT 30,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_config_interval
        FOREIGN KEY (default_interval_id)
        REFERENCES scheduling_intervals(id)
);

-- ============================================================
-- CONFIGURACIÓN POR CLIENTE (override del global)
-- ============================================================

CREATE TABLE client_scheduling_config (
    id              BIGSERIAL PRIMARY KEY,
    client_id       BIGINT NOT NULL UNIQUE,
    interval_id     BIGINT NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_client_config_client
        FOREIGN KEY (client_id)
        REFERENCES clients(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_client_config_interval
        FOREIGN KEY (interval_id)
        REFERENCES scheduling_intervals(id)
);
```

#### Lógica de auto-sugerencia de próxima cita

Cuando una cita se marca como **"Completada"**:

```
1. Obtener intervalo del cliente:
   - Si tiene `client_scheduling_config` → usar ese intervalo
   - Si no → usar `scheduling_config.default_interval_id`

2. Calcular fecha sugerida:
   - fecha_sugerida = cita_completada.fecha + intervalo.days

3. Si `respect_entry_week = TRUE`:
   - Obtener semana_ingreso del cliente (derivada de client_entries.entry_date)
   - Ajustar fecha_sugerida a la misma semana relativa del mes
     Ejemplo: si el cliente ingresó la 2da semana del mes y el intervalo
     es mensual, la siguiente cita cae en la 2da semana del próximo mes

4. Si la fecha cae en día no laboral → mover al siguiente día laboral

5. Retornar al frontend:
   {
     "suggested_date": "2026-09-14T10:00:00-05:00",
     "interval_used": "Mensual (30 días)",
     "is_override": false,
     "can_change": true
   }

6. El dueño/profesional confirma o elige otra fecha
```

> [!TIP]
> El frontend mostrará un modal tras completar una cita con la fecha sugerida pre-seleccionada en un mini-calendario. El dueño solo presiona "Confirmar" o ajusta la fecha manualmente.

---

## Seed Data Confirmado

```sql
-- document_types
INSERT INTO document_types (name) VALUES
  ('Cédula de Ciudadanía'),
  ('Tarjeta de Identidad'),
  ('Cédula de Extranjería'),
  ('Pasaporte'),
  ('Permiso Especial de Permanencia (PEP)'),
  ('Permiso por Protección Temporal (PPT)');

-- roles
INSERT INTO roles (name) VALUES
  ('Administrador'),
  ('Profesional'),
  ('Recepcionista');

-- person_statuses
INSERT INTO person_statuses (name) VALUES
  ('Activo'),
  ('Inactivo');

-- entry_statuses
INSERT INTO entry_statuses (name) VALUES
  ('Activo'),
  ('Inactivo'),
  ('Finalizado');

-- period_statuses
INSERT INTO period_statuses (name) VALUES
  ('Abierto'),
  ('Cerrado'),
  ('En Curso');

-- appointment_statuses (solo estas 5, almacenadas en BD)
INSERT INTO appointment_statuses (name) VALUES
  ('Confirmada'),
  ('En Curso'),
  ('Completada'),
  ('Cancelada'),
  ('No Asistió');

-- follow_up_types
INSERT INTO follow_up_types (name) VALUES
  ('Llamada telefónica'),
  ('Mensaje WhatsApp'),
  ('Correo electrónico'),
  ('Visita presencial');

-- rescheduling_reasons
INSERT INTO rescheduling_reasons (name, description) VALUES
  ('Solicitud del cliente', 'El cliente solicitó cambio de fecha'),
  ('Inasistencia', 'El cliente no asistió y se reprograma'),
  ('Fuerza mayor', 'Evento externo impide la cita'),
  ('Cambio de profesional', 'Se reasigna a otro profesional'),
  ('Error de agendamiento', 'Se agendó incorrectamente');

-- scheduling_intervals
INSERT INTO scheduling_intervals (name, days, description) VALUES
  ('Quincenal', 15, 'Cada 15 días'),
  ('Mensual', 30, 'Cada mes'),
  ('Bimensual', 60, 'Cada 2 meses'),
  ('Trimestral', 90, 'Cada 3 meses');
```

---

## Proposed Changes

### Estructura del Monorepo

```
sistemadeajendamiento/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── package.json              ← Raíz con npm workspaces
├── README.md
│
├── apps/
│   ├── web/                    ← Next.js 15 (Frontend)
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   ├── tsconfig.json
│   │   ├── public/
│   │   └── src/
│   │       ├── app/            ← App Router (páginas)
│   │       ├── components/     ← Componentes UI reutilizables
│   │       ├── lib/            ← Utilidades, API client, hooks
│   │       ├── stores/         ← Estado global (Zustand)
│   │       └── types/          ← Tipos TypeScript
│   │
│   └── api/                    ← NestJS + Fastify (Backend)
│       ├── package.json
│       ├── tsconfig.json
│       ├── nest-cli.json
│       └── src/
│           ├── main.ts
│           ├── app.module.ts
│           ├── common/         ← Guards, filters, pipes, decorators
│           ├── config/         ← Configuración por entorno
│           ├── prisma/         ← Prisma service + schema
│           ├── auth/           ← Módulo autenticación (JWT + refresh)
│           ├── users/          ← Módulo usuarios
│           ├── people/         ← Módulo personas (con phone/email)
│           ├── clients/        ← Módulo clientes + config de agendamiento
│           ├── appointments/   ← Módulo citas + auto-sugerencia
│           ├── scheduling/     ← Módulo periodos + configuración global
│           ├── reschedulings/  ← Módulo reagendamientos
│           ├── follow-ups/     ← Módulo seguimientos
│           └── catalogs/       ← Módulo catálogos unificado
│
├── packages/
│   └── shared/                 ← Tipos y validación compartida
│       ├── package.json
│       └── src/
│           ├── types/
│           ├── constants/
│           └── validators/     ← Zod schemas compartidos
│
└── infra/
    ├── docker/
    │   ├── Dockerfile.api
    │   ├── Dockerfile.web
    │   └── nginx.conf
    └── db/
        ├── init.sql            ← Esquema actualizado (19 tablas)
        └── seed.sql            ← Datos semilla confirmados
```

---

### Componente 1: Infraestructura (Docker + PostgreSQL + Redis)

#### [NEW] [docker-compose.yml](file:///c:/Users/Celred/Desktop/PROYECT/sistemadeajendamiento/docker-compose.yml)

Servicios:
- **postgres**: PostgreSQL 16 Alpine, `timezone = America/Bogota`, volumen persistente, init con `init.sql` + `seed.sql`
- **redis**: Redis 7 Alpine, para refresh tokens y cache
- **api**: NestJS dev con hot-reload
- **web**: Next.js dev con hot-reload

#### [NEW] [.env.example](file:///c:/Users/Celred/Desktop/PROYECT/sistemadeajendamiento/.env.example)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/agendamiento
REDIS_URL=redis://localhost:6379
JWT_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
TZ=America/Bogota
NEXT_PUBLIC_API_URL=http://localhost:3001
```

#### [NEW] [infra/db/init.sql](file:///c:/Users/Celred/Desktop/PROYECT/sistemadeajendamiento/infra/db/init.sql)

Esquema SQL actualizado: 19 tablas (sin las 4 de contacto N:M, con las 3 nuevas de configuración de agendamiento).

#### [NEW] [infra/db/seed.sql](file:///c:/Users/Celred/Desktop/PROYECT/sistemadeajendamiento/infra/db/seed.sql)

Datos semilla confirmados para todos los catálogos.

#### [NEW] [infra/docker/Dockerfile.api](file:///c:/Users/Celred/Desktop/PROYECT/sistemadeajendamiento/infra/docker/Dockerfile.api) + [Dockerfile.web](file:///c:/Users/Celred/Desktop/PROYECT/sistemadeajendamiento/infra/docker/Dockerfile.web)

Multi-stage builds optimizados (Node 20 Alpine).

---

### Componente 2: Backend — NestJS + Fastify + Prisma

#### [NEW] apps/api/src/prisma/schema.prisma

Prisma schema completo con 19 modelos. Extracto de los cambios clave:

```prisma
model People {
  id              BigInt    @id @default(autoincrement())
  documentTypeId  BigInt    @map("document_type_id")
  documentNumber  String    @map("document_number") @db.VarChar(50)
  firstName       String    @map("first_name") @db.VarChar(100)
  middleName      String?   @map("middle_name") @db.VarChar(100)
  lastName        String    @map("last_name") @db.VarChar(100)
  secondLastName  String?   @map("second_last_name") @db.VarChar(100)
  birthDate       DateTime? @map("birth_date") @db.Date
  phone           String?   @db.VarChar(30)
  email           String?   @db.VarChar(150)
  statusId        BigInt    @map("status_id")
  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime  @default(now()) @updatedAt @map("updated_at") @db.Timestamptz

  documentType DocumentType  @relation(fields: [documentTypeId], references: [id])
  status       PersonStatus  @relation(fields: [statusId], references: [id])
  user         User?
  client       Client?
  appointments Appointment[] @relation("ProfessionalAppointments")

  @@unique([documentTypeId, documentNumber])
  @@index([lastName, firstName])
  @@map("people")
}

model SchedulingInterval {
  id          BigInt  @id @default(autoincrement())
  name        String  @unique @db.VarChar(100)
  days        Int
  description String? @db.Text

  configs       SchedulingConfig[]
  clientConfigs ClientSchedulingConfig[]

  @@map("scheduling_intervals")
}

model SchedulingConfig {
  id                  BigInt   @id @default(autoincrement())
  defaultIntervalId   BigInt   @map("default_interval_id")
  allowClientOverride Boolean  @default(true) @map("allow_client_override")
  autoSuggestNext     Boolean  @default(true) @map("auto_suggest_next")
  respectEntryWeek    Boolean  @default(true) @map("respect_entry_week")
  workingDays         Int[]    @default([1, 2, 3, 4, 5]) @map("working_days")
  businessStartTime   DateTime @default(dbgenerated("'08:00'::time")) @map("business_start_time") @db.Time
  businessEndTime     DateTime @default(dbgenerated("'18:00'::time")) @map("business_end_time") @db.Time
  slotDurationMinutes Int      @default(30) @map("slot_duration_minutes")
  createdAt           DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt           DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz

  defaultInterval SchedulingInterval @relation(fields: [defaultIntervalId], references: [id])

  @@map("scheduling_config")
}

model ClientSchedulingConfig {
  id         BigInt   @id @default(autoincrement())
  clientId   BigInt   @unique @map("client_id")
  intervalId BigInt   @map("interval_id")
  notes      String?  @db.Text
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz

  client   Client             @relation(fields: [clientId], references: [id], onDelete: Cascade)
  interval SchedulingInterval @relation(fields: [intervalId], references: [id])

  @@map("client_scheduling_config")
}
```

#### Módulos NestJS

| Módulo | Endpoints principales | Notas |
|---|---|---|
| **auth** | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` | JWT access (15min) + refresh (7d) en Redis |
| **users** | CRUD `/users`, `GET /users/me` | Solo admins crean usuarios |
| **people** | CRUD `/people`, búsqueda por documento | Incluye `phone` y `email` directos |
| **clients** | CRUD `/clients`, `GET /clients/:id/entries`, `PUT /clients/:id/scheduling-config` | Config de agendamiento individual por cliente |
| **appointments** | CRUD `/appointments`, `POST /appointments/:id/complete`, `GET /appointments/suggest-next/:clientId` | **Auto-sugerencia de próxima cita** al completar |
| **scheduling** | CRUD `/scheduling-periods`, `GET/PUT /scheduling/config`, CRUD `/scheduling/intervals` | Config global + intervalos |
| **reschedulings** | `POST /reschedulings`, historial | Transacción atómica: crea nueva cita + registra reagendamiento |
| **follow-ups** | CRUD `/follow-ups`, filtros por cliente/cita | Registra quién realizó el seguimiento |
| **catalogs** | `GET /catalogs/:type` | Endpoint unificado para catálogos. Lee de BD, nunca hardcoded |

#### Endpoint clave: Auto-sugerencia de próxima cita

```
POST /appointments/:id/complete
→ Marca la cita como "Completada"
→ Calcula automáticamente la próxima fecha sugerida
→ Retorna:

{
  "completed_appointment": { ... },
  "next_appointment_suggestion": {
    "suggested_date": "2026-09-14T10:00:00-05:00",
    "suggested_end": "2026-09-14T10:30:00-05:00",
    "interval": { "name": "Mensual", "days": 30 },
    "is_client_override": false,
    "entry_week": 2,
    "adjusted_for_entry_week": true,
    "adjusted_for_working_day": false
  }
}

// El frontend muestra un modal:
// "La próxima cita para [Cliente] sería el 14 de septiembre a las 10:00 AM"
// [Confirmar]  [Elegir otra fecha]
```

#### Seguridad y Cross-Cutting

- **Guards**: `JwtAuthGuard`, `RolesGuard` (RBAC con decorador `@Roles('Administrador', 'Profesional')`)
- **Pipes**: `ZodValidationPipe` para validación con schemas compartidos
- **Filters**: `HttpExceptionFilter` global, formato de error consistente
- **Interceptors**: `TransformInterceptor`, `LoggingInterceptor`
- **Rate Limiting**: `@nestjs/throttler` con almacenamiento en Redis
- **Timezone**: Toda la lógica temporal usa `America/Bogota` vía `date-fns-tz`

---

### Componente 3: Frontend — Next.js 15 + React + TypeScript

#### Páginas (App Router)

```
src/app/
├── (auth)/
│   ├── login/page.tsx                ← Inicio de sesión
│   └── layout.tsx                    ← Layout sin sidebar
├── (dashboard)/
│   ├── layout.tsx                    ← Layout con sidebar + header
│   ├── page.tsx                      ← Dashboard (métricas del día)
│   ├── appointments/
│   │   ├── page.tsx                  ← Calendario + lista de citas
│   │   ├── [id]/page.tsx             ← Detalle de cita
│   │   └── new/page.tsx              ← Crear cita
│   ├── clients/
│   │   ├── page.tsx                  ← Lista de clientes
│   │   ├── [id]/page.tsx             ← Perfil completo del cliente
│   │   │                               (historial, config agendamiento)
│   │   └── new/page.tsx              ← Registrar cliente
│   ├── scheduling/
│   │   ├── page.tsx                  ← Periodos de agendamiento
│   │   └── config/page.tsx           ← Configuración global
│   ├── follow-ups/
│   │   └── page.tsx                  ← Panel de seguimientos
│   ├── users/
│   │   └── page.tsx                  ← Gestión de usuarios (admin)
│   └── settings/
│       └── page.tsx                  ← Catálogos + configuración
```

#### Flujos clave de UI

**1. Completar cita → Sugerir siguiente**

```
[Cita en curso] → Click "Completar" →
  Modal aparece:
  ┌──────────────────────────────────────────┐
  │  ✅ Cita completada                      │
  │                                          │
  │  Próxima cita sugerida:                  │
  │  📅 Lunes, 14 de septiembre 2026         │
  │  🕐 10:00 AM                             │
  │  📋 Intervalo: Mensual (30 días)         │
  │                                          │
  │  [📅 Elegir otra fecha]                  │
  │                                          │
  │  [Confirmar cita]    [Agendar después]   │
  └──────────────────────────────────────────┘
```

**2. Configuración de agendamiento (admin)**

```
Configuración Global:
┌──────────────────────────────────────────┐
│  Intervalo por defecto: [Mensual ▾]      │
│  ☑ Permitir intervalo por cliente        │
│  ☑ Auto-sugerir próxima cita             │
│  ☑ Respetar semana de ingreso            │
│                                          │
│  Horario laboral: 08:00 - 18:00          │
│  Días laborales: L M Mi J V             │
│  Duración de cita: [30 min ▾]            │
└──────────────────────────────────────────┘
```

**3. Perfil de cliente → Config individual**

```
Perfil de Juan Pérez:
┌──────────────────────────────────────────┐
│  Agendamiento personalizado:             │
│  ☑ Usar intervalo personalizado          │
│  Intervalo: [Quincenal (15 días) ▾]      │
│  Nota: "Tratamiento intensivo fase 1"    │
└──────────────────────────────────────────┘
```

#### Diseño y UX

- **Design System**: Paleta HSL curada (slate/zinc oscuro + indigo/violet como acento), tipografía Inter
- **Tema oscuro/claro**: `next-themes`, persistido en localStorage
- **Componentes UI**: Botones, inputs, selects, modales, tablas, cards con glassmorphism sutil, badges de estado con colores semánticos
- **Calendario de citas**: Vista semanal/diaria, las citas sugeridas aparecen con borde punteado
- **Dashboard**: KPIs (citas hoy, completadas, canceladas, no asistió), gráficos Recharts
- **Animaciones**: Framer Motion para transiciones y micro-interacciones
- **Responsivo**: Mobile-first, sidebar colapsable, calendario adaptativo

#### Estado y Datos

- **Server Components** para datos estáticos (catálogos, config global)
- **TanStack Query** para cache y sincronización de datos mutables
- **Zustand** para estado UI (sidebar, filtros, theme)
- **API Client**: Wrapper fetch con interceptores para JWT auto-refresh

---

### Componente 4: Paquete Compartido

#### [NEW] packages/shared/

- **Tipos TypeScript** derivados del schema Prisma + DTOs de API
- **Schemas Zod** para validación compartida frontend ↔ backend
- **Constantes**: Nunca se hardcodean estados ni catálogos, pero sí los nombres de los endpoints, keys de query, etc.

---

## Fases de Implementación

### Fase 1 — Cimientos (Semana 1-2)
1. Scaffolding del monorepo con npm workspaces
2. Docker Compose con PostgreSQL 16 (tz=America/Bogota) + Redis 7
3. NestJS con Fastify adapter + Prisma schema completo (19 modelos)
4. Migración inicial + seed de todos los catálogos
5. Módulo auth completo (login, JWT, refresh tokens en Redis, RBAC)
6. Next.js scaffolding con layout base, design system, tema oscuro/claro

### Fase 2 — CRUD Core (Semana 3-4)
7. API: Módulos people (con phone/email directo), users, clients, catalogs
8. Frontend: Login premium, Dashboard shell, CRUD personas/clientes
9. Paquete shared con Zod schemas

### Fase 3 — Agendamiento Flexible (Semana 5-7)
10. API: Configuración global de agendamiento (intervalos, horarios, días)
11. API: Config individual por cliente (override de intervalo)
12. API: Módulo appointments con lógica de auto-sugerencia
13. API: Módulo scheduling-periods
14. Frontend: Calendario de citas con vistas semana/día
15. Frontend: Modal de auto-sugerencia al completar cita
16. Frontend: Pantalla de configuración de agendamiento
17. Frontend: Config individual en perfil de cliente

### Fase 4 — Operaciones (Semana 8-9)
18. API: Módulo reschedulings (transacción atómica)
19. API: Módulo follow-ups
20. Frontend: Flujo de reagendamiento con selección de motivo
21. Frontend: Panel de seguimientos
22. Frontend: Dashboard completo con métricas y gráficos

### Fase 5 — Pulido (Semana 10)
23. Animaciones, transiciones, responsive final
24. Testing (unitario backend, E2E endpoints críticos)
25. Dockerfiles de producción optimizados
26. Documentación API con Swagger/OpenAPI

---

## Verification Plan

### Automated Tests

```bash
# Backend - Unit tests (servicios, lógica de auto-sugerencia)
cd apps/api && npm run test

# Backend - E2E tests (flujo completo de agendamiento)
cd apps/api && npm run test:e2e

# Frontend - Component tests
cd apps/web && npm run test

# Lint + Type checking
npm run lint && npm run type-check
```

### Manual Verification

- `docker-compose up` → 4 servicios levantan correctamente
- Flujo completo: login → crear cliente → configurar intervalo → agendar → completar → confirmar sugerencia automática → reagendar → seguimiento
- Verificar que la auto-sugerencia respeta: intervalo del cliente, semana de ingreso, días laborales
- Verificar RBAC: usuario sin rol admin no accede a configuración global
- Verificar responsive en móvil
- Verificar que catálogos se leen de BD (cambiar un nombre en BD → se refleja en UI sin redeploy)
