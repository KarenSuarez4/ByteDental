
def test_create_clinical_history_success(client, doctor_token):
    """Prueba: Creación exitosa de una historia clínica"""
    response = client.post(
        "/api/clinical-histories/",
        json={
            "patient_id": 1,
            "reason": "Dolor de muelas",
            "symptoms": "Dolor intenso",
            "medical_history": {
                "tolerance_to_anesthesia": "Buena",
                "general_health": "Saludable",
                "breathing_status": "Normal",
                "coagulation_status": "Normal",
                "current_medication": "Ninguna",
                "previous_treatments": "Limpieza dental",
                "allergies": "Ninguna"
            },
            "doctor_signature": "Dr. Juan Pérez",
            "treatments": [
                {
                    "dental_service_id": 1,
                    "treatment_date": "2025-10-07T10:30:00",
                    "notes": "Extracción exitosa"
                }
            ]
        },
        headers={"Authorization": doctor_token}
    )
    assert response.status_code == 201
    assert response.json()["message"] == "La historia clínica ha sido registrada exitosamente."


def test_create_clinical_history_patient_not_found(client, doctor_token):
    """Prueba: No permitir crear historia clínica si el paciente no existe"""
    response = client.post(
        "/api/clinical-histories/",
        json={
            "patient_id": 9999,  # ID inexistente
            "reason": "Dolor de muelas",
            "symptoms": "Dolor intenso",
            "medical_history": {
                "tolerance_to_anesthesia": "Buena",
                "general_health": "Saludable",
                "breathing_status": "Normal",
                "coagulation_status": "Normal",
                "current_medication": "Ninguna",
                "previous_treatments": "Limpieza dental",
                "allergies": "Ninguna"
            },
            "doctor_signature": "Dr. Juan Pérez"
        },
        headers={"Authorization": doctor_token}
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Paciente no encontrado"


def test_create_clinical_history_missing_fields(client, doctor_token):
    """Prueba: Creación de historia clínica con campos obligatorios faltantes"""
    response = client.post(
        "/api/clinical-histories/",
        json={
            "patient_id": 1,
            "reason": "Dolor de muelas",
            "symptoms": "Dolor intenso",
            "doctor_signature": "Dr. Juan Pérez"
        },
        headers={"Authorization": doctor_token}
    )
    assert response.status_code == 400
    assert "El campo 'tolerance_to_anesthesia' es obligatorio" in response.json()["detail"]


def test_create_clinical_history_duplicate(client, doctor_token):
    """Prueba: Creación de historia clínica para un paciente que ya tiene una registrada"""
    # Crear una historia clínica inicial
    client.post(
        "/api/clinical-histories/",
        json={
            "patient_id": 1,
            "reason": "Dolor de muelas",
            "symptoms": "Dolor intenso",
            "medical_history": {
                "tolerance_to_anesthesia": "Buena",
                "general_health": "Saludable",
                "breathing_status": "Normal",
                "coagulation_status": "Normal",
                "current_medication": "Ninguna",
                "previous_treatments": "Limpieza dental",
                "allergies": "Ninguna"
            },
            "doctor_signature": "Dr. Juan Pérez"
        },
        headers={"Authorization": doctor_token}
    )

    # Intentar crear una segunda historia clínica
    response = client.post(
        "/api/clinical-histories/",
        json={
            "patient_id": 1,
            "reason": "Dolor de cabeza",
            "symptoms": "Dolor leve",
            "medical_history": {
                "tolerance_to_anesthesia": "Buena",
                "general_health": "Saludable",
                "breathing_status": "Normal",
                "coagulation_status": "Normal",
                "current_medication": "Ninguna",
                "previous_treatments": "Limpieza dental",
                "allergies": "Ninguna"
            },
            "doctor_signature": "Dr. Juan Pérez"
        },
        headers={"Authorization": doctor_token}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "El paciente ya tiene una historia clínica registrada."


def test_search_clinical_histories_by_patient_id(client, test_db, doctor_token):
    """Prueba: Consulta de historias clínicas por patient_id"""
    response = client.get(
        "/api/clinical-histories/?patient_id=1",
        headers={"Authorization": f"Bearer {doctor_token}"}
    )
    assert response.status_code == 200
    assert "results" in response.json()
    assert len(response.json()["results"]) > 0


def test_search_clinical_histories_by_name(client, test_db, doctor_token):
    """Prueba: Consulta de historias clínicas por nombre del paciente"""
    response = client.get(
        "/api/clinical-histories/?name=Juan",
        headers={"Authorization": f"Bearer {doctor_token}"}
    )
    assert response.status_code == 200
    assert "results" in response.json()
    assert len(response.json()["results"]) > 0


def test_search_clinical_histories_no_results(client, test_db, doctor_token):
    """Prueba: Consulta de historias clínicas sin resultados"""
    response = client.get(
        "/api/clinical-histories/?patient_id=9999",
        headers={"Authorization": f"Bearer {doctor_token}"}
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "No se encontraron historias clínicas coincidentes."


def test_search_clinical_histories_pagination(client, test_db, doctor_token):
    """Prueba: Validación de paginación en la consulta de historias clínicas"""
    response = client.get(
        "/api/clinical-histories/?page=1&limit=2",
        headers={"Authorization": f"Bearer {doctor_token}"}
    )
    assert response.status_code == 200
    assert "results" in response.json()
    assert len(response.json()["results"]) <= 2


def test_search_clinical_histories_audit_log(client, test_db, doctor_token, mock_audit_service):
    """Prueba: Registro en auditoría de consultas de historias clínicas"""
    response = client.get(
        "/api/clinical-histories/?patient_id=1",
        headers={"Authorization": f"Bearer {doctor_token}"}
    )
    assert response.status_code == 200
    mock_audit_service.registrar_evento.assert_called_once_with(
        user_id=1,  # ID del doctor
        event_type="SEARCH",
        event_description="Consulta de historias clínicas",
        affected_record_id=None,
        affected_record_type="ClinicalHistory",
        details={"patient_id": 1, "name": None}
    )


def test_create_clinical_history_forbidden_for_non_doctor(client, test_db, assistant_token):
    """Prueba: Validación de permisos para crear historias clínicas (solo doctores)"""
    response = client.post(
        "/api/clinical-histories/",
        json={
            "patient_id": 1,
            "reason": "Dolor de muelas",
            "symptoms": "Dolor intenso",
            "medical_history": {
                "tolerance_to_anesthesia": "Buena",
                "general_health": "Saludable",
                "breathing_status": "Normal",
                "coagulation_status": "Normal",
                "current_medication": "Ninguna",
                "previous_treatments": "Limpieza dental",
                "allergies": "Ninguna"
            },
            "doctor_signature": "Dr. Juan Pérez"
        },
        headers={"Authorization": f"Bearer {assistant_token}"}
    )
    assert response.status_code == 403
    assert "No tienes permisos para realizar esta acción" in response.json()["detail"]
