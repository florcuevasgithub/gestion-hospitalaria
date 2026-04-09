-- ============================================================
-- ESQUEMA CORE - MVP GESTIÓN HOSPITALARIA (UTI)
-- Base de datos: PostgreSQL (Supabase)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. GESTIÓN DE USUARIOS Y PERSONAL
-- ────────────────────────────────────────────────────────────
CREATE TABLE personal_salud (
    id          UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    nombre_completo VARCHAR(255) NOT NULL,
    rol         VARCHAR(50)  NOT NULL
                CHECK (rol IN ('ADMIN_MVP', 'MEDICO', 'ENFERMERO')),
    activo      BOOLEAN      NOT NULL DEFAULT TRUE
);

COMMENT ON TABLE  personal_salud IS 'Perfil extendido del personal de salud, vinculado 1:1 con auth.users.';
COMMENT ON COLUMN personal_salud.rol IS 'Rol funcional. MVP usa ADMIN_MVP; futuro: MEDICO, ENFERMERO.';

-- ────────────────────────────────────────────────────────────
-- 2. BÓVEDA DE PACIENTES (Datos Sensibles)
-- ────────────────────────────────────────────────────────────
CREATE TABLE paciente_boveda (
    uuid_paciente   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dni             VARCHAR(20)  NOT NULL UNIQUE,
    nombre          VARCHAR(255) NOT NULL,
    apellido        VARCHAR(255) NOT NULL,
    fecha_nacimiento DATE        NOT NULL,
    sexo_biologico  VARCHAR(20)  NOT NULL
                    CHECK (sexo_biologico IN ('Masculino', 'Femenino', 'Intersex', 'No especificado'))
);

CREATE INDEX idx_paciente_boveda_dni ON paciente_boveda (dni);

COMMENT ON TABLE  paciente_boveda IS 'Bóveda de datos demográficos sensibles de pacientes, aislada del flujo clínico.';
COMMENT ON COLUMN paciente_boveda.dni IS 'Documento Nacional de Identidad, único e indexado para búsquedas rápidas.';

-- ────────────────────────────────────────────────────────────
-- 3. INFRAESTRUCTURA FÍSICA
-- ────────────────────────────────────────────────────────────

-- 3a. Sectores
CREATE TABLE sector (
    id      SERIAL       PRIMARY KEY,
    nombre  VARCHAR(100) NOT NULL UNIQUE
);

COMMENT ON TABLE sector IS 'Sectores físicos del hospital (UTI, pisos, áreas).';

-- 3b. Camas
CREATE TABLE cama (
    id          SERIAL       PRIMARY KEY,
    sector_id   INTEGER      NOT NULL REFERENCES sector (id) ON DELETE RESTRICT,
    codigo_cama VARCHAR(20)  NOT NULL UNIQUE,
    tipo        VARCHAR(50)  NOT NULL DEFAULT 'Comun'
                CHECK (tipo IN ('Comun', 'KPC')),
    estado      VARCHAR(20)  NOT NULL DEFAULT 'Disponible'
                CHECK (estado IN ('Disponible', 'Ocupada', 'Limpieza', 'Mantenimiento'))
);

COMMENT ON TABLE  cama IS 'Camas hospitalarias asignadas a un sector.';
COMMENT ON COLUMN cama.codigo_cama IS 'Código visual de la cama, ej: UTI-01, UTI-02.';
COMMENT ON COLUMN cama.estado IS 'Estado operativo: Disponible | Ocupada | Limpieza | Mantenimiento.';

-- ────────────────────────────────────────────────────────────
-- 4. FLUJO CLÍNICO - INTERNACIONES
-- ────────────────────────────────────────────────────────────
CREATE TABLE internacion (
    id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    uuid_paciente       UUID           NOT NULL REFERENCES paciente_boveda (uuid_paciente) ON DELETE RESTRICT,
    cama_id             INTEGER        NOT NULL REFERENCES cama (id) ON DELETE RESTRICT,
    codigo_cie10        VARCHAR(10)    NOT NULL,
    fecha_hora_ingreso  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    
    procedencia         VARCHAR(50)    NOT NULL
                        CHECK (procedencia IN ('Guardia', 'Quirófano', 'Piso', 'Ambulancia', 'Otro Hospital')),
                        
    fecha_hora_egreso   TIMESTAMPTZ,
    tipo_egreso         VARCHAR(30)
                        CHECK (tipo_egreso IN ('Alta Médica', 'Defunción', 'Derivación')),
    personal_ingreso_id UUID           NOT NULL REFERENCES personal_salud (id) ON DELETE RESTRICT,

    CONSTRAINT chk_egreso_coherente
        CHECK (
            (fecha_hora_egreso IS NULL AND tipo_egreso IS NULL)
            OR
            (fecha_hora_egreso IS NOT NULL AND tipo_egreso IS NOT NULL)
        ),

    CONSTRAINT chk_egreso_posterior_ingreso
        CHECK (fecha_hora_egreso IS NULL OR fecha_hora_egreso > fecha_hora_ingreso)
);

COMMENT ON TABLE  internacion IS 'Registro de internaciones. Cada fila representa una estadía de un paciente en una cama.';
COMMENT ON COLUMN internacion.codigo_cie10 IS 'Código CIE-10 del diagnóstico de ingreso.';
COMMENT ON COLUMN internacion.procedencia IS 'Origen del paciente: Guardia | Quirófano | Piso | Ambulancia | Otro Hospital.';
COMMENT ON COLUMN internacion.tipo_egreso IS 'Motivo de egreso: Alta Médica | Defunción | Derivación. NULL mientras está internado.';
COMMENT ON COLUMN internacion.personal_ingreso_id IS 'Trazabilidad: usuario que registró el ingreso.';

-- ────────────────────────────────────────────────────────────
-- ÍNDICES ADICIONALES
-- ────────────────────────────────────────────────────────────
CREATE INDEX idx_internacion_paciente   ON internacion (uuid_paciente);
CREATE INDEX idx_internacion_cama       ON internacion (cama_id);
CREATE INDEX idx_internacion_ingreso    ON internacion (fecha_hora_ingreso);
CREATE INDEX idx_internacion_egreso     ON internacion (fecha_hora_egreso)
    WHERE fecha_hora_egreso IS NULL;
CREATE INDEX idx_cama_sector            ON cama (sector_id);