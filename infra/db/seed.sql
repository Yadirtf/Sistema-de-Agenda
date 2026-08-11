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
INSERT INTO roles (name) VALUES
    ('Administrador'),
    ('Profesional'),
    ('Recepcionista');

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

COMMIT;
