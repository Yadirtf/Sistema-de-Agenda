# Plan de Implementación: Pestaña "General" en Gestión de Citas

Este plan detalla la creación de una nueva vista "General" en el módulo de citas para proporcionar al agendador una visión global de los clientes y facilitar la toma de decisiones rápidas de reagendamiento.

## User Review Required

> [!IMPORTANT]
> La pestaña "General" se basará en la lista de **Clientes** y su **última cita registrada**. Esto es diferente a las otras pestañas que se basan principalmente en el listado de **Citas**.

## Proposed Changes

### [Web App]

#### [NEW] [GeneralClientsTab.tsx](file:///C:/Users/Celred/Desktop/PROYECT/sistemadeajendamiento/apps/web/src/components/appointments/GeneralClientsTab.tsx)
Crear un nuevo componente para encapsular la lógica de la pestaña General.
- **Buscador**: Búsqueda por nombre o cédula.
- **Filtro de Estado**: Filtrar según el estado de la *última cita* del cliente.
- **Tabla de Clientes**:
    - **Cliente**: Nombre completo y Cédula.
    - **Última Cita**: Fecha (formateada) y Estado (Badge de color).
    - **Frecuencia**: Indica si el cliente tiene un ritmo personalizado o global.
    - **Acción**: Botón "Reagendar" visible si la última cita fue "Completada", "Cancelada", "No Asistió" o si nunca ha tenido una.

#### [MODIFY] [page.tsx](file:///C:/Users/Celred/Desktop/PROYECT/sistemadeajendamiento/apps/web/src/app/(dashboard)/appointments/page.tsx)
- Añadir `general` al estado `activeTab`.
- Reordenar pestañas: General -> Seguimiento Diario -> Notificación -> Historial Anual.
- Integrar el componente `GeneralClientsTab`.
- Añadir el modal `CreateAppointmentModal` a nivel de página para ser activado desde la tabla general.

### [API]

#### [MODIFY] [clients.service.ts](file:///C:/Users/Celred/Desktop/PROYECT/sistemadeajendamiento/apps/api/src/clients/clients.service.ts)
- Actualizar el método `findAll` para permitir el filtrado por el `statusId` de la última cita si es posible, o manejarlo de manera eficiente.

---

## Detalle de la Interfaz (UX)

### Tabla General
| Columna | Descripción | Justificación |
| :--- | :--- | :--- |
| **Cliente** | Nombre + Cédula | Identificación inequívoca. |
| **Última Cita** | Fecha + Badge de Estado | Permite saber qué pasó en el último encuentro. |
| **Configuración** | Frecuencia (ej. "Cada 15 días") | Ayuda a saber cuándo debería ser la próxima. |
| **Acciones** | Botón "Reagendar" | Acción directa para clientes que terminaron su proceso o fallaron. |

### Lógica de "Reagendar"
El botón de **Reagendar** abrirá un modal que:
1. Precarga los datos del cliente.
2. Obtiene automáticamente la **Sugerencia Inteligente** basada en la semana de ingreso y la frecuencia del cliente.
3. Permite guardar la nueva cita sin salir de la vista general.

## Plan de Verificación

### Pruebas Manuales
1. Navegar a "Gestión de Citas" y verificar que la pestaña "General" es la predeterminada o la primera.
2. Realizar una búsqueda por nombre y verificar que los resultados se filtren correctamente.
3. Filtrar por estado "Completada" y verificar que solo aparezcan clientes cuya última cita tenga ese estado.
4. Hacer clic en "Reagendar" para un cliente y verificar que se abra el modal con la fecha sugerida correcta.
5. Completar un agendamiento y verificar que la tabla se actualice (la "Última Cita" ahora será la nueva).
