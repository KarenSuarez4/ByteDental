-- Total general de pacientes activos
SELECT COUNT(*) AS total_pacientes_activos
FROM patients
WHERE is_active = true;

-- Pacientes activos con actividad en el mes actual
SELECT COUNT(DISTINCT p.id) AS total_pacientes_activos_mes
FROM patients p
JOIN clinical_histories ch ON p.id = ch.patient_id
JOIN treatments t ON ch.id = t.clinical_history_id
WHERE p.is_active = true
  AND DATE_TRUNC('month', t.treatment_date) = DATE_TRUNC('month', CURRENT_DATE);

-- Total de usuarios activos por rol con total general
-- Total general
SELECT COUNT(uid) FROM users WHERE is_active = true;

-- Por rol
SELECT r.name AS rol, COUNT(u.uid) AS total
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
WHERE u.is_active = true
GROUP BY r.name
ORDER BY r.name;

-- Tratamientos por procedimiento con porcentaje
SELECT 
    ds.name AS procedimiento,
    COUNT(t.id) AS cantidad,
    ROUND(
        (COUNT(t.id) * 100.0 / SUM(COUNT(t.id)) OVER ()), 
        2
    ) AS porcentaje
FROM treatments t
JOIN dental_service ds ON t.dental_service_id = ds.id
GROUP BY ds.name;

-- Tratamientos por doctor con porcentaje
SELECT 
    CONCAT(u.first_name, ' ', u.last_name) AS doctor,
    COUNT(t.id) AS total_procedimientos,
    ROUND(
        (COUNT(t.id) * 100.0 / NULLIF(SUM(COUNT(t.id)) OVER (), 0)), 
        2
    ) AS percentage
FROM users u
LEFT JOIN treatments t ON t.doctor_id = u.uid
JOIN roles r ON u.role_id = r.id
WHERE r.name = 'Doctor' AND u.is_active = true
GROUP BY doctor;

-- Tratamientos en los últimos 12 meses
WITH meses AS (
    SELECT 
        TO_CHAR(generate_series(date_trunc('month', NOW()) - INTERVAL '11 months', date_trunc('month', NOW()), interval '1 month'), 'YYYY-MM') AS mes
)
SELECT 
    m.mes,
    COALESCE(COUNT(t.id), 0) AS total_tratamientos
FROM meses m
LEFT JOIN treatments t 
    ON TO_CHAR(t.treatment_date, 'YYYY-MM') = m.mes
GROUP BY m.mes
ORDER BY m.mes;

