-- Migración para agregar campos de discapacidad a la tabla patients
-- Fecha: 2025-09-25
-- Descripción: Agregar has_disability (BOOLEAN) y disability_description (TEXT) para manejar pacientes con discapacidades que requieren tutor

-- Agregar campo has_disability (por defecto FALSE)
ALTER TABLE patients 
ADD COLUMN has_disability BOOLEAN DEFAULT FALSE;

-- Agregar campo disability_description (nullable)
ALTER TABLE patients 
ADD COLUMN disability_description TEXT;

-- Comentarios para documentar los campos
COMMENT ON COLUMN patients.has_disability IS 'Indica si el paciente tiene alguna discapacidad que requiera supervisión de un tutor';
COMMENT ON COLUMN patients.disability_description IS 'Descripción detallada de la discapacidad del paciente (requerido si has_disability=TRUE)';

-- Índice para optimizar consultas por discapacidad
CREATE INDEX idx_patient_disability ON patients(has_disability);

-- Actualizar todos los registros existentes para asegurar consistencia
UPDATE patients SET has_disability = FALSE WHERE has_disability IS NULL;