-- ============================================================
-- SISTEMA DE AGENDAMIENTO
-- PostgreSQL 16
-- Esquema normalizado (19 tablas)
-- Zona horaria: America/Bogota
-- ============================================================

SET timezone = 'America/Bogota';

BEGIN;

-- ============================================================
-- 1. CATÁLOGOS
-- ============================================================

-- Tipos de documento
CREATE TABLE document_types (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE
);

-- Roles de usuario
CREATE TABLE roles (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE
);

-- Estados de personas
CREATE TABLE person_statuses (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE
);

-- Estados de ingreso
CREATE TABLE entry_statuses (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE
);

-- Estados de periodo de agendamiento
CREATE TABLE period_statuses (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE
);

-- Estados de cita
CREATE TABLE appointment_statuses (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE
);

-- Motivos de reagendamiento
CREATE TABLE rescheduling_reasons (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL UNIQUE,
    description     TEXT
);

-- Tipos de seguimiento
CREATE TABLE follow_up_types (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE
);

-- Intervalos de agendamiento
CREATE TABLE scheduling_intervals (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    days            INT NOT NULL,
    description     TEXT
);

-- ============================================================
-- 2. PERSONAS (contacto embebido)
-- ============================================================

CREATE TABLE people (
    id                  BIGSERIAL PRIMARY KEY,
    document_type_id    BIGINT NOT NULL,
    document_number     VARCHAR(50) NOT NULL,
    first_name          VARCHAR(100) NOT NULL,
    middle_name         VARCHAR(100),
    last_name           VARCHAR(100) NOT NULL,
    second_last_name    VARCHAR(100),
    birth_date          DATE,
    phone               VARCHAR(30),
    email               VARCHAR(150),
    status_id           BIGINT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_people_document_type
        FOREIGN KEY (document_type_id)
        REFERENCES document_types(id),

    CONSTRAINT fk_people_status
        FOREIGN KEY (status_id)
        REFERENCES person_statuses(id),

    CONSTRAINT uq_people_document
        UNIQUE (document_type_id, document_number)
);

-- ============================================================
-- 3. USUARIOS
-- ============================================================

CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    person_id       BIGINT NOT NULL UNIQUE,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_users_person
        FOREIGN KEY (person_id)
        REFERENCES people(id)
        ON DELETE RESTRICT
);

-- ============================================================
-- 4. ROLES DE USUARIO
-- ============================================================

CREATE TABLE user_roles (
    user_id         BIGINT NOT NULL,
    role_id         BIGINT NOT NULL,

    PRIMARY KEY (user_id, role_id),

    CONSTRAINT fk_user_roles_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_user_roles_role
        FOREIGN KEY (role_id)
        REFERENCES roles(id)
        ON DELETE RESTRICT
);

-- ============================================================
-- 5. CLIENTES
-- ============================================================

CREATE TABLE clients (
    id              BIGSERIAL PRIMARY KEY,
    person_id       BIGINT NOT NULL UNIQUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_clients_person
        FOREIGN KEY (person_id)
        REFERENCES people(id)
        ON DELETE RESTRICT
);

-- ============================================================
-- 6. INGRESOS DE CLIENTES
-- ============================================================

CREATE TABLE client_entries (
    id              BIGSERIAL PRIMARY KEY,
    client_id       BIGINT NOT NULL,
    entry_date      DATE NOT NULL,
    status_id       BIGINT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_client_entries_client
        FOREIGN KEY (client_id)
        REFERENCES clients(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_client_entries_status
        FOREIGN KEY (status_id)
        REFERENCES entry_statuses(id)
        ON DELETE RESTRICT
);

-- ============================================================
-- 7. CONFIGURACIÓN GLOBAL DE AGENDAMIENTO
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
-- 8. CONFIGURACIÓN POR CLIENTE
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

-- ============================================================
-- 9. PERIODOS DE AGENDAMIENTO
-- ============================================================

CREATE TABLE scheduling_periods (
    id              BIGSERIAL PRIMARY KEY,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    status_id       BIGINT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_scheduling_periods_status
        FOREIGN KEY (status_id)
        REFERENCES period_statuses(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_scheduling_period_dates
        CHECK (end_date >= start_date),

    CONSTRAINT uq_scheduling_period
        UNIQUE (start_date, end_date)
);

-- ============================================================
-- 10. CITAS
-- ============================================================

CREATE TABLE appointments (
    id                      BIGSERIAL PRIMARY KEY,
    client_id               BIGINT NOT NULL,
    professional_id         BIGINT,
    client_entry_id         BIGINT,
    scheduling_period_id    BIGINT,
    previous_appointment_id BIGINT,
    appointment_date        TIMESTAMPTZ NOT NULL,
    status_id               BIGINT NOT NULL,
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_appointments_client
        FOREIGN KEY (client_id)
        REFERENCES clients(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_appointments_professional
        FOREIGN KEY (professional_id)
        REFERENCES people(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_appointments_entry
        FOREIGN KEY (client_entry_id)
        REFERENCES client_entries(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_appointments_period
        FOREIGN KEY (scheduling_period_id)
        REFERENCES scheduling_periods(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_appointments_previous
        FOREIGN KEY (previous_appointment_id)
        REFERENCES appointments(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_appointments_status
        FOREIGN KEY (status_id)
        REFERENCES appointment_statuses(id)
        ON DELETE RESTRICT
);

-- ============================================================
-- 11. REAGENDAMIENTOS
-- ============================================================

CREATE TABLE reschedulings (
    id                      BIGSERIAL PRIMARY KEY,
    original_appointment_id BIGINT NOT NULL,
    new_appointment_id      BIGINT NOT NULL,
    reason_id               BIGINT NOT NULL,
    performed_by            BIGINT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_reschedulings_original
        FOREIGN KEY (original_appointment_id)
        REFERENCES appointments(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_reschedulings_new
        FOREIGN KEY (new_appointment_id)
        REFERENCES appointments(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_reschedulings_reason
        FOREIGN KEY (reason_id)
        REFERENCES rescheduling_reasons(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_reschedulings_user
        FOREIGN KEY (performed_by)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT uq_rescheduling_new_appointment
        UNIQUE (new_appointment_id)
);

-- ============================================================
-- 12. SEGUIMIENTOS
-- ============================================================

CREATE TABLE follow_ups (
    id              BIGSERIAL PRIMARY KEY,
    client_id       BIGINT NOT NULL,
    appointment_id  BIGINT,
    performed_by    BIGINT,
    type_id         BIGINT NOT NULL,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_follow_ups_client
        FOREIGN KEY (client_id)
        REFERENCES clients(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_follow_ups_appointment
        FOREIGN KEY (appointment_id)
        REFERENCES appointments(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_follow_ups_user
        FOREIGN KEY (performed_by)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_follow_ups_type
        FOREIGN KEY (type_id)
        REFERENCES follow_up_types(id)
        ON DELETE RESTRICT
);

-- ============================================================
-- 13. ÍNDICES
-- ============================================================

CREATE INDEX idx_people_name
    ON people (last_name, first_name);

CREATE INDEX idx_people_document
    ON people (document_type_id, document_number);

CREATE INDEX idx_people_phone
    ON people (phone);

CREATE INDEX idx_people_email
    ON people (email);

CREATE INDEX idx_client_entries_client
    ON client_entries (client_id);

CREATE INDEX idx_client_entries_date
    ON client_entries (entry_date);

CREATE INDEX idx_client_entries_status
    ON client_entries (status_id);

CREATE INDEX idx_scheduling_periods_dates
    ON scheduling_periods (start_date, end_date);

CREATE INDEX idx_appointments_client
    ON appointments (client_id);

CREATE INDEX idx_appointments_date
    ON appointments (appointment_date);

CREATE INDEX idx_appointments_status
    ON appointments (status_id);

CREATE INDEX idx_appointments_professional_date
    ON appointments (professional_id, appointment_date);

CREATE INDEX idx_reschedulings_original
    ON reschedulings (original_appointment_id);

CREATE INDEX idx_follow_ups_client
    ON follow_ups (client_id);

CREATE INDEX idx_follow_ups_appointment
    ON follow_ups (appointment_id);

CREATE INDEX idx_follow_ups_created_at
    ON follow_ups (created_at);

COMMIT;
