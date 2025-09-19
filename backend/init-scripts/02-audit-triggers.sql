-- =============================================================================
-- TRIGGERS DE AUDITORÍA AUTOMÁTICA PARA TODAS LAS TABLAS
-- Sistema: ByteDental
-- Propósito: Registrar automáticamente todos los cambios en las tablas principales
-- =============================================================================

-- Crear tabla para almacenar cambios automáticos (separada de la auditoría manual)
CREATE TABLE IF NOT EXISTS db_audit_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    operation VARCHAR(10) NOT NULL, -- INSERT, UPDATE, DELETE
    record_id VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    changed_by VARCHAR(100), -- Usuario de la sesión de BD
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_info JSONB -- Información adicional de la sesión
);

-- Crear índices para mejorar consultas
CREATE INDEX IF NOT EXISTS idx_db_audit_log_table_name ON db_audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_db_audit_log_operation ON db_audit_log(operation);
CREATE INDEX IF NOT EXISTS idx_db_audit_log_changed_at ON db_audit_log(changed_at);
CREATE INDEX IF NOT EXISTS idx_db_audit_log_record_id ON db_audit_log(record_id);

-- =============================================================================
-- FUNCIÓN GENÉRICA PARA AUDITORÍA
-- =============================================================================
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    -- Variables para almacenar información
    DECLARE
        old_data JSONB := NULL;
        new_data JSONB := NULL;
        record_id_value VARCHAR(100) := NULL;
        session_user_info JSONB := '{}';
    BEGIN
        -- Obtener información de la sesión actual si está disponible
        BEGIN
            session_user_info := jsonb_build_object(
                'application_name', current_setting('application_name', true),
                'client_addr', inet_client_addr()::TEXT,
                'session_user', session_user,
                'current_user', current_user
            );
        EXCEPTION
            WHEN OTHERS THEN
                session_user_info := '{"error": "Could not get session info"}';
        END;

        -- Determinar la operación y extraer datos
        IF TG_OP = 'DELETE' THEN
            old_data := row_to_json(OLD)::JSONB;
            -- Extraer ID del registro usando JSONB para evitar errores de campo inexistente
            BEGIN
                record_id_value := (old_data->>'id');
                IF record_id_value IS NULL THEN
                    record_id_value := (old_data->>'uid');
                END IF;
                IF record_id_value IS NULL THEN
                    record_id_value := (old_data->>'uuid');
                END IF;
            EXCEPTION
                WHEN OTHERS THEN
                    record_id_value := NULL;
            END;
            
        ELSIF TG_OP = 'UPDATE' THEN
            old_data := row_to_json(OLD)::JSONB;
            new_data := row_to_json(NEW)::JSONB;
            -- Extraer ID del registro usando JSONB para evitar errores de campo inexistente
            BEGIN
                record_id_value := (new_data->>'id');
                IF record_id_value IS NULL THEN
                    record_id_value := (new_data->>'uid');
                END IF;
                IF record_id_value IS NULL THEN
                    record_id_value := (new_data->>'uuid');
                END IF;
            EXCEPTION
                WHEN OTHERS THEN
                    record_id_value := NULL;
            END;
            
        ELSIF TG_OP = 'INSERT' THEN
            new_data := row_to_json(NEW)::JSONB;
            -- Extraer ID del registro usando JSONB para evitar errores de campo inexistente
            BEGIN
                record_id_value := (new_data->>'id');
                IF record_id_value IS NULL THEN
                    record_id_value := (new_data->>'uid');
                END IF;
                IF record_id_value IS NULL THEN
                    record_id_value := (new_data->>'uuid');
                END IF;
            EXCEPTION
                WHEN OTHERS THEN
                    record_id_value := NULL;
            END;
        END IF;

        -- Insertar registro de auditoría
        INSERT INTO db_audit_log (
            table_name,
            operation,
            record_id,
            old_values,
            new_values,
            changed_by,
            session_info
        ) VALUES (
            TG_TABLE_NAME,
            TG_OP,
            record_id_value,
            old_data,
            new_data,
            session_user,
            session_user_info
        );

        -- Retornar el registro apropiado según la operación
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
        
    EXCEPTION
        WHEN OTHERS THEN
            -- En caso de error en el trigger, loguearlo pero no fallar la operación principal
            RAISE WARNING 'Error in audit trigger for table %: %', TG_TABLE_NAME, SQLERRM;
            IF TG_OP = 'DELETE' THEN
                RETURN OLD;
            ELSE
                RETURN NEW;
            END IF;
    END;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- CREAR TRIGGERS PARA TABLAS PRINCIPALES
-- =============================================================================

-- 1. TABLA USERS
DROP TRIGGER IF EXISTS audit_users_trigger ON users;
CREATE TRIGGER audit_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- 2. TABLA ROLES
DROP TRIGGER IF EXISTS audit_roles_trigger ON roles;
CREATE TRIGGER audit_roles_trigger
    AFTER INSERT OR UPDATE OR DELETE ON roles
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- 3. TABLA AUDITS (Para auditar cambios en la propia tabla de auditoría)
DROP TRIGGER IF EXISTS audit_audits_trigger ON audits;
CREATE TRIGGER audit_audits_trigger
    AFTER INSERT OR UPDATE OR DELETE ON audits
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- 5. TABLA PATIENTS
DROP TRIGGER IF EXISTS audit_patients_trigger ON patients;
CREATE TRIGGER audit_patients_trigger
    AFTER INSERT OR UPDATE OR DELETE ON patients
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- 6. TABLA GUARDIANS
DROP TRIGGER IF EXISTS audit_guardians_trigger ON guardians;
CREATE TRIGGER audit_guardians_trigger
    AFTER INSERT OR UPDATE OR DELETE ON guardians
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- 4. Agregar triggers para otras tablas del sistema cuando existan
-- Ejemplo para tablas futuras:
-- DROP TRIGGER IF EXISTS audit_patients_trigger ON patients;
-- CREATE TRIGGER audit_patients_trigger
--     AFTER INSERT OR UPDATE OR DELETE ON patients
--     FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- DROP TRIGGER IF EXISTS audit_appointments_trigger ON appointments;
-- CREATE TRIGGER audit_appointments_trigger
--     AFTER INSERT OR UPDATE OR DELETE ON appointments
--     FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- =============================================================================
-- FUNCIONES DE UTILIDAD PARA CONSULTAR AUDITORÍA
-- =============================================================================

-- Función para obtener historial de cambios de una tabla específica
CREATE OR REPLACE FUNCTION get_table_audit_history(
    p_table_name VARCHAR(100),
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    id INTEGER,
    operation VARCHAR(10),
    record_id VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    changed_by VARCHAR(100),
    changed_at TIMESTAMP WITH TIME ZONE,
    session_info JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dal.id,
        dal.operation,
        dal.record_id,
        dal.old_values,
        dal.new_values,
        dal.changed_by,
        dal.changed_at,
        dal.session_info
    FROM db_audit_log dal
    WHERE dal.table_name = p_table_name
    ORDER BY dal.changed_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener historial de un registro específico
CREATE OR REPLACE FUNCTION get_record_audit_history(
    p_table_name VARCHAR(100),
    p_record_id VARCHAR(100),
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id INTEGER,
    operation VARCHAR(10),
    old_values JSONB,
    new_values JSONB,
    changed_by VARCHAR(100),
    changed_at TIMESTAMP WITH TIME ZONE,
    session_info JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dal.id,
        dal.operation,
        dal.old_values,
        dal.new_values,
        dal.changed_by,
        dal.changed_at,
        dal.session_info
    FROM db_audit_log dal
    WHERE dal.table_name = p_table_name 
      AND dal.record_id = p_record_id
    ORDER BY dal.changed_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- =============================================================================

COMMENT ON TABLE db_audit_log IS 'Tabla de auditoría automática a nivel de base de datos para registrar todos los cambios en las tablas principales';
COMMENT ON COLUMN db_audit_log.table_name IS 'Nombre de la tabla que fue modificada';
COMMENT ON COLUMN db_audit_log.operation IS 'Tipo de operación: INSERT, UPDATE, DELETE';
COMMENT ON COLUMN db_audit_log.record_id IS 'ID del registro afectado (id, uid, o uuid según la tabla)';
COMMENT ON COLUMN db_audit_log.old_values IS 'Valores anteriores del registro (NULL para INSERT)';
COMMENT ON COLUMN db_audit_log.new_values IS 'Valores nuevos del registro (NULL para DELETE)';
COMMENT ON COLUMN db_audit_log.changed_by IS 'Usuario de la sesión de base de datos que realizó el cambio';
COMMENT ON COLUMN db_audit_log.changed_at IS 'Timestamp del cambio con zona horaria';
COMMENT ON COLUMN db_audit_log.session_info IS 'Información adicional de la sesión (IP, aplicación, etc.)';

COMMENT ON FUNCTION audit_trigger_function() IS 'Función de trigger genérica para auditar cambios en cualquier tabla';
COMMENT ON FUNCTION get_table_audit_history(VARCHAR, INTEGER) IS 'Obtiene el historial de cambios de una tabla específica';
COMMENT ON FUNCTION get_record_audit_history(VARCHAR, VARCHAR, INTEGER) IS 'Obtiene el historial de cambios de un registro específico';

-- =============================================================================
-- CONSULTAS DE EJEMPLO
-- =============================================================================

-- Ver todos los cambios recientes
-- SELECT * FROM db_audit_log ORDER BY changed_at DESC LIMIT 10;

-- Ver cambios en la tabla users
-- SELECT * FROM get_table_audit_history('users', 20);

-- Ver historial de un usuario específico
-- SELECT * FROM get_record_audit_history('users', 'usuario_uid_aqui', 10);

-- Ver estadísticas de cambios por tabla
-- SELECT table_name, operation, COUNT(*) as count 
-- FROM db_audit_log 
-- GROUP BY table_name, operation 
-- ORDER BY table_name, operation;

-- Ver cambios en las últimas 24 horas
-- SELECT table_name, operation, COUNT(*) as count
-- FROM db_audit_log 
-- WHERE changed_at >= NOW() - INTERVAL '24 hours'
-- GROUP BY table_name, operation
-- ORDER BY count DESC;
