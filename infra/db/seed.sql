-- ============================================================
-- SISTEMA DE AGENDAMIENTO
-- Datos semilla (seed)
-- ============================================================

SET timezone = 'America/Bogota';

BEGIN;

-- Tipos de documento
INSERT INTO document_types (name) VALUES
    ('Cédula de Ciudadanía'),
    ('Tarjeta de Identidad'),
    ('Cédula de Extranjería'),
    ('Pasaporte'),
    ('Permiso Especial de Permanencia (PEP)'),
    ('Permiso por Protección Temporal (PPT)');

-- Roles
INSERT INTO roles (name, description, is_system) VALUES
    ('Administrador', 'Acceso total al sistema. Gestiona usuarios, roles y configuración.', TRUE),
    ('Profesional',   'Visualiza y gestiona sus propias citas asignadas.', TRUE),
    ('Asistente',     'Gestiona citas y clientes. Acceso operativo al sistema.', TRUE);

-- Estados de persona
INSERT INTO person_statuses (name) VALUES
    ('Activo'),
    ('Inactivo');

-- Estados de ingreso
INSERT INTO entry_statuses (name) VALUES
    ('Activo'),
    ('Inactivo'),
    ('Finalizado');

-- Estados de periodo
INSERT INTO period_statuses (name) VALUES
    ('Abierto'),
    ('Cerrado'),
    ('En Curso');

-- Estados de cita (solo estos 5, desde BD)
INSERT INTO appointment_statuses (name) VALUES
    ('Confirmada'),
    ('En Curso'),
    ('Completada'),
    ('Cancelada'),
    ('No Asistió');

-- Tipos de seguimiento
INSERT INTO follow_up_types (name) VALUES
    ('Llamada telefónica'),
    ('Mensaje WhatsApp'),
    ('Correo electrónico'),
    ('Visita presencial');

-- Motivos de reagendamiento
INSERT INTO rescheduling_reasons (name, description) VALUES
    ('Solicitud del cliente', 'El cliente solicitó cambio de fecha'),
    ('Inasistencia', 'El cliente no asistió y se reprograma'),
    ('Fuerza mayor', 'Evento externo impide la cita'),
    ('Cambio de profesional', 'Se reasigna a otro profesional'),
    ('Error de agendamiento', 'Se agendó incorrectamente');

-- Intervalos de agendamiento
INSERT INTO scheduling_intervals (name, days, description) VALUES
    ('Quincenal', 15, 'Cada 15 días'),
    ('Mensual', 30, 'Cada mes'),
    ('Bimensual', 60, 'Cada 2 meses'),
    ('Trimestral', 90, 'Cada 3 meses');

-- Configuración global por defecto (intervalo mensual)
INSERT INTO scheduling_config (
    default_interval_id,
    allow_client_override,
    auto_suggest_next,
    respect_entry_week,
    working_days,
    business_start_time,
    business_end_time,
    slot_duration_minutes
) VALUES (
    2,      -- Mensual (id=2)
    TRUE,
    TRUE,
    TRUE,
    '{1,2,3,4,5}',
    '08:00',
    '18:00',
    30
);

-- ============================================================
-- Usuario administrador por defecto
-- Email: admin@agendamiento.com
-- Password: Admin123!
-- (hash generado con bcrypt, rounds=10)
-- ============================================================

-- Persona del admin
INSERT INTO people (
    document_type_id, document_number, first_name, last_name,
    phone, email, status_id
) VALUES (
    1, '0000000000', 'Administrador', 'Sistema',
    '0000000000', 'admin@agendamiento.com', 1
);

-- Usuario admin
INSERT INTO users (person_id, email, password_hash) VALUES (
    1,
    'admin@agendamiento.com',
    '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36PqEzPKNRnQY0GF/JWfS6i'
    -- Password: Admin123!
);

-- Asignar rol Administrador
INSERT INTO user_roles (user_id, role_id) VALUES (1, 1);

-- ============================================================
-- Permisos del sistema
-- ============================================================

INSERT INTO permissions (name, label, module) VALUES
    ('dashboard:read',         'Ver dashboard',            'dashboard'),
    ('appointments:read',      'Ver citas',                'appointments'),
    ('appointments:create',    'Crear citas',              'appointments'),
    ('appointments:update',    'Editar citas',             'appointments'),
    ('appointments:delete',    'Eliminar citas',           'appointments'),
    ('appointments:status',    'Cambiar estado de citas',  'appointments'),
    ('clients:read',           'Ver clientes',             'clients'),
    ('clients:create',         'Crear clientes',           'clients'),
    ('clients:update',         'Editar clientes',          'clients'),
    ('clients:delete',         'Eliminar clientes',        'clients'),
    ('follow_ups:read',        'Ver seguimientos',         'follow_ups'),
    ('follow_ups:create',      'Crear seguimientos',       'follow_ups'),
    ('users:read',             'Ver usuarios',             'users'),
    ('users:create',           'Crear usuarios',           'users'),
    ('users:update',           'Editar usuarios',          'users'),
    ('users:delete',           'Eliminar usuarios',        'users'),
    ('roles:read',             'Ver roles',                'roles'),
    ('roles:create',           'Crear roles',              'roles'),
    ('roles:update',           'Editar roles',             'roles'),
    ('roles:delete',           'Eliminar roles',           'roles'),
    ('settings:read',          'Ver configuración',        'settings'),
    ('settings:update',        'Editar configuración',     'settings');

-- ============================================================
-- Asignar permisos a roles base
-- ============================================================

-- Administrador: todos los permisos
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'Administrador'), p.id
FROM permissions p;

-- Asistente
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'Asistente'), p.id
FROM permissions p
WHERE p.name IN (
    'dashboard:read',
    'appointments:read',
    'appointments:create',
    'appointments:update',
    'appointments:status',
    'clients:read',
    'clients:create',
    'clients:update',
    'follow_ups:read',
    'follow_ups:create'
);

-- Profesional
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'Profesional'), p.id
FROM permissions p
WHERE p.name IN (
    'dashboard:read',
    'appointments:read',
    'appointments:status'
);

COMMIT;
