# Plan de Refactorización: Desacoplamiento, Seguridad y Escalabilidad

Este plan detalla las acciones técnicas necesarias para transformar el sistema en una arquitectura de "piezas de rompecabezas" totalmente desacoplada, reforzando la seguridad y optimizando el rendimiento.

## User Review Required

> [!IMPORTANT]
> Se propone la introducción del **Patrón Repository**. Esto añadirá una capa adicional de archivos, pero garantiza que si el día de mañana cambias de base de datos o de ORM (ej. de Prisma a TypeORM o a una API externa), el 90% del código permanecerá intacto.

> [!TIP]
> Usaremos **Eventos de NestJS** para la comunicación entre módulos. Esto significa que el módulo de Citas no "sabrá" que existe un módulo de Seguimiento; simplemente dirá "Cita Completada" y el sistema se encargará del resto.

## Proposed Changes

### 1. Seguridad y Robustez del API
Configuración de protecciones industriales contra ataques comunes.

#### [MODIFY] [main.ts](file:///C:/Users/Celred/Desktop/PROYECT/sistemadeajendamiento/apps/api/src/main.ts)
- Integrar `helmet` para cabeceras de seguridad.
* Configurar `ValidationPipe` con `whitelist: true` y `forbidNonWhitelisted: true`.
* Habilitar `enableCors` con orígenes restringidos.

#### [MODIFY] [app.module.ts](file:///C:/Users/Celred/Desktop/PROYECT/sistemadeajendamiento/apps/api/src/app.module.ts)
- Configurar `ThrottlerModule` (Rate Limiting) globalmente.

---

### 2. Desacoplamiento: Capa de Dominio y Mappers
Separar la "forma" de la base de datos de la "forma" que consume el Frontend.

#### [NEW] [appointment.mapper.ts](file:///C:/Users/Celred/Desktop/PROYECT/sistemadeajendamiento/apps/api/src/appointments/mappers/appointment.mapper.ts)
- Clase estática para transformar entidades de Prisma a DTOs de `@agendamiento/shared`.

#### [NEW] [scheduling.logic.ts](file:///C:/Users/Celred/Desktop/PROYECT/sistemadeajendamiento/apps/api/src/scheduling/logic/scheduling.logic.ts)
- Extraer `calculateNextSuggestion` y lógica de semanas de ingreso a funciones puras testeables.

---

### 3. Desacoplamiento: Capa de Infraestructura (Repositories)
Evitar que los servicios dependan directamente de Prisma.

#### [NEW] [appointments.repository.ts](file:///C:/Users/Celred/Desktop/PROYECT/sistemadeajendamiento/apps/api/src/appointments/appointments.repository.ts)
- Encapsular todas las llamadas a `this.prisma.appointment`.

#### [MODIFY] [appointments.service.ts](file:///C:/Users/Celred/Desktop/PROYECT/sistemadeajendamiento/apps/api/src/appointments/appointments.service.ts)
- Refactorizar para usar el `Repository`, el `Mapper` y emitir eventos.

---

### 4. Comunicación Basada en Eventos
Hacer que los módulos sean verdaderas piezas independientes.

#### [MODIFY] [follow-ups.module.ts](file:///C:/Users/Celred/Desktop/PROYECT/sistemadeajendamiento/apps/api/src/follow-ups/follow-ups.module.ts)
- Implementar un `Listener` que reaccione a cambios de estado de citas sin intervención directa del `AppointmentsService`.

---

### 5. Optimización: Caché de Catálogos
Acelerar la carga inicial del sistema.

#### [NEW] [cache.interceptor.ts](file:///C:/Users/Celred/Desktop/PROYECT/sistemadeajendamiento/apps/api/src/common/interceptors/cache.interceptor.ts)
- Interceptor para usar Redis automáticamente en endpoints de catálogos (`/catalogs/*`).

## Verification Plan

### Automated Tests
- Ejecutar `npm test` en `apps/api` para asegurar que el refactor no rompió la lógica existente.
- Pruebas unitarias para la nueva lógica extraída en `scheduling.logic.ts`.

### Manual Verification
- Verificar en el navegador/Postman que las cabeceras `X-Powered-By` han desaparecido (Helmet).
- Confirmar que al completar una cita, el registro en `FollowUp` se crea correctamente mediante el evento.
- Probar el Rate Limiting haciendo peticiones rápidas seguidas para confirmar el bloqueo temporal (429 Too Many Requests).
