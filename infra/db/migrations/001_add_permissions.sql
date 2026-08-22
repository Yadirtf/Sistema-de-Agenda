-- ============================================================
-- MIGRACIÓN 001: Sistema de Permisos RBAC
-- Aplicar sobre BD existente (no destructiva)
-- PostgreSQL 16 · Zona horaria: America/Bogota
-- ============================================================

SET timezone = 'America/Bogota';

BEGIN;

-- ============================================================
-- 1. EXTENDER TABLA ROLES
-- ============================================================

ALTER TABLE roles
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS is_system   BOOLEAN NOT NULL DEFAULT FALSE;

-- Marcar los roles base como is_system (no eliminables)
UPDATE roles SET description = 'Acceso total al sistema. Gestiona usuarios, roles y configuración.',  is_system = TRUE WHERE name = 'Administrador';
UPDATE roles SET description = 'Gestiona citas y clientes. Acceso operativo al sistema.',             is_system = TRUE WHERE name = 'Recepcionista';
UPDATE roles SET description = 'Visualiza y gestiona sus propias citas asignadas.',                   is_system = TRUE WHERE name = 'Profesional';

-- Renombrar Recepcionista → Asistente
UPDATE roles SET name = 'Asistente' WHERE name = 'Recepcionista';

-- ============================================================
-- 2. CREAR TABLA permissions
-- ============================================================

CREATE TABLE IF NOT EXISTS permissions (
    id      BIGSERIAL PRIMARY KEY,
    name    VARCHAR(100) NOT NULL UNIQUE,   -- 'appointments:read'
    label   VARCHAR(150) NOT NULL,          -- 'Ver citas'
    module  VARCHAR(100) NOT NULL           -- 'appointments'
);

-- ============================================================
-- 3. CREAR TABLA role_permissions (N:M)
-- ============================================================

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id       BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,

    PRIMARY KEY (role_id, permission_id),

    CONSTRAINT fk_role_permissions_role
        FOREIGN KEY (role_id)
        REFERENCES roles(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_role_permissions_permission
        FOREIGN KEY (permission_id)
        REFERENCES permissions(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role
    ON role_permissions (role_id);

CREATE INDEX IF NOT EXISTS idx_role_permissions_permission
    ON role_permissions (permission_id);

-- ============================================================
-- 4. SEED DE PERMISOS DEL SISTEMA
-- ============================================================

INSERT INTO permissions (name, label, module) VALUES
    -- Dashboard
    ('dashboard:read',         'Ver dashboard',            'dashboard'),
    -- Citas
    ('appointments:read',      'Ver citas',                'appointments'),
    ('appointments:create',    'Crear citas',              'appointments'),
    ('appointments:update',    'Editar citas',             'appointments'),
    ('appointments:delete',    'Eliminar citas',           'appointments'),
    ('appointments:status',    'Cambiar estado de citas',  'appointments'),
    -- Clientes
    ('clients:read',           'Ver clientes',             'clients'),
    ('clients:create',         'Crear clientes',           'clients'),
    ('clients:update',         'Editar clientes',          'clients'),
    ('clients:delete',         'Eliminar clientes',        'clients'),
    -- Seguimientos
    ('follow_ups:read',        'Ver seguimientos',         'follow_ups'),
    ('follow_ups:create',      'Crear seguimientos',       'follow_ups'),
    -- Usuarios
    ('users:read',             'Ver usuarios',             'users'),
    ('users:create',           'Crear usuarios',           'users'),
    ('users:update',           'Editar usuarios',          'users'),
    ('users:delete',           'Eliminar usuarios',        'users'),
    -- Roles
    ('roles:read',             'Ver roles',                'roles'),
    ('roles:create',           'Crear roles',              'roles'),
    ('roles:update',           'Editar roles',             'roles'),
    ('roles:delete',           'Eliminar roles',           'roles'),
    -- Configuración
    ('settings:read',          'Ver configuración',        'settings'),
    ('settings:update',        'Editar configuración',     'settings')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 5. ASIGNAR PERMISOS A ROLES BASE
-- ============================================================

-- Helper: asignar todos los permisos al Administrador
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM roles WHERE name = 'Administrador'),
    p.id
FROM permissions p
ON CONFLICT DO NOTHING;

-- Permisos del Asistente
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM roles WHERE name = 'Asistente'),
    p.id
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
)
ON CONFLICT DO NOTHING;

-- Permisos del Profesional
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM roles WHERE name = 'Profesional'),
    p.id
FROM permissions p
WHERE p.name IN (
    'dashboard:read',
    'appointments:read',
    'appointments:status'
)
ON CONFLICT DO NOTHING;

COMMIT;
