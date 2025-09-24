-- =============================================
-- SCRIPT COMPLETO DE RECREACIÓN DE BASE DE DATOS
-- =============================================

-- 1. DROP existing objects (in correct order due to dependencies)
DROP VIEW IF EXISTS view_patients_with_guardians CASCADE;
DROP VIEW IF EXISTS view_guardians_complete CASCADE;
DROP VIEW IF EXISTS view_patients_complete CASCADE;

DROP TRIGGER IF EXISTS trigger_validate_single_guardian ON guardians;
DROP TRIGGER IF EXISTS trigger_validate_guardian_age ON guardians;
DROP TRIGGER IF EXISTS trigger_update_guardians_timestamp ON guardians;
DROP TRIGGER IF EXISTS trigger_update_patients_timestamp ON patients;
DROP TRIGGER IF EXISTS trigger_update_persons_timestamp ON persons;

DROP FUNCTION IF EXISTS validate_single_guardian() CASCADE;
DROP FUNCTION IF EXISTS validate_guardian_age() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

DROP TABLE IF EXISTS guardians CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS persons CASCADE;

DROP TYPE IF EXISTS patient_relationship_enum CASCADE;
DROP TYPE IF EXISTS document_type_enum CASCADE;


CREATE TYPE patient_relationship_enum AS ENUM (
    'Father', 'Mother', 'Grandfather', 'Grandmother',
    'Son', 'Daughter', 'Legal_Guardian', 'Brother', 'Sister', 'Other'
);

-- 3. Persons table (common personal data)
CREATE TABLE persons (
    id SERIAL PRIMARY KEY,
    document_type document_type NOT NULL,  
    document_number VARCHAR(30) UNIQUE NOT NULL,
    first_surname VARCHAR(50) NOT NULL,
    second_surname VARCHAR(50),
    first_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    email VARCHAR(100),
    phone VARCHAR(20),
    birthdate DATE NOT NULL
);

-- 4. Guardians table (guardian/tutor role)
CREATE TABLE guardians (
    id SERIAL PRIMARY KEY,
    person_id INT NOT NULL, 
    relationship patient_relationship_enum NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE
);

-- 5. Patients table (patient role)
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    person_id INT NOT NULL UNIQUE, -- One person can be only ONE patient
    occupation VARCHAR(50),
    guardian_id INT,
    requires_guardian BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE,
    FOREIGN KEY (guardian_id) REFERENCES guardians(id) ON DELETE SET NULL
);

-- 6. Indexes for optimization
CREATE INDEX idx_person_document ON persons (document_type, document_number);
CREATE INDEX idx_person_names ON persons (first_name, first_surname);
CREATE INDEX idx_person_email ON persons (email);

CREATE INDEX idx_patient_active ON patients (is_active);
CREATE INDEX idx_patient_person ON patients (person_id);
CREATE INDEX idx_patient_occupation ON patients (occupation);
CREATE INDEX idx_patient_guardian ON patients (guardian_id);

CREATE INDEX idx_guardian_active ON guardians (is_active);
CREATE INDEX idx_guardian_person ON guardians (person_id);
CREATE INDEX idx_guardian_relationship ON guardians (relationship);

-- Para consultar pacientes con datos completos
CREATE OR REPLACE VIEW view_patients_complete AS
SELECT 
    p.id as patient_id,
    p.occupation,
    p.requires_guardian,
    p.is_active,
    
    -- Person data
    per.document_type,
    per.document_number,
    per.first_surname,
    per.second_surname,
    per.first_name,
    per.middle_name,
    per.email,
    per.phone,
    per.birthdate,
    
    -- Guardian info if exists
    p.guardian_id,
    g_per.first_name as guardian_first_name,
    g_per.first_surname as guardian_first_surname,
    g.relationship as guardian_relationship
    
FROM patients p
INNER JOIN persons per ON p.person_id = per.id
LEFT JOIN guardians g ON p.guardian_id = g.id
LEFT JOIN persons g_per ON g.person_id = g_per.id;

-- 7. Table comments
COMMENT ON TABLE persons IS 'Base personal data for patients and guardians';
COMMENT ON TABLE patients IS 'Patient roles linked to persons';
COMMENT ON TABLE guardians IS 'Guardian/tutor roles linked to persons';

COMMENT ON COLUMN patients.requires_guardian IS 'Indicates if patient requires guardian due to age or other reasons';
COMMENT ON COLUMN patients.guardian_id IS 'Reference to the guardian assigned to this patient';

-- =============================================
-- SCRIPT EJECUTADO EXITOSAMENTE
-- =============================================