from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import Field, validator
import re
from app.database import get_db
from app.services.patient_service import get_patient_service
from app.utils.audit_context import get_user_context
from app.middleware.auth_middleware import (
    require_patient_read, 
    require_patient_write
)
from app.schemas.patient_schema import (
    PatientCreate, 
    PatientUpdate, 
    PatientResponse, 
    PatientWithGuardian,
    PatientStatusChange
)

router = APIRouter(
    prefix="/patients",
    tags=["patients"],
    responses={404: {"description": "Patient not found"}}
)

@router.post("/", response_model=PatientResponse, status_code=201)
def create_patient(
    patient_data: PatientCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(require_patient_write)  # Solo ASSISTANT
):
    """Crear un nuevo paciente (incluye crear la persona)"""
    user_id, user_ip = get_user_context(request, db)
    service = get_patient_service(db, user_id, user_ip)
    
    try:
        return service.create_patient(patient_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error detallado en create_patient: {str(e)}")
        print(f"Tipo de error: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")

@router.get("/", response_model=List[PatientResponse])
def get_patients(
    skip: int = Query(0, ge=0, description="Número de registros a omitir"),
    limit: int = Query(100, ge=1, le=1000, description="Número máximo de registros"),
    active_only: bool = Query(True, description="Solo pacientes activos"),
    search: Optional[str] = Query(None, min_length=1, max_length=100, description="Buscar en nombre, apellido, documento o email"),
    requires_guardian: Optional[bool] = Query(None, description="Filtrar por requerimiento de guardian"),
    has_guardian: Optional[bool] = Query(None, description="Filtrar por tener guardian asignado"),
    db: Session = Depends(get_db),
    _current_user = Depends(require_patient_read)  # ASSISTANT y DENTIST
):
    """Obtener lista de pacientes con filtros"""
    service = get_patient_service(db)
    
    # Sanitizar búsqueda si se proporciona
    if search:
        # Remover caracteres especiales que podrían ser problemáticos
        search = re.sub(r'[<>"\';\\]', '', search.strip())
    
    return service.get_patients(
        skip=skip, 
        limit=limit, 
        active_only=active_only, 
        search=search,
        requires_guardian=requires_guardian,
        has_guardian=has_guardian
    )

@router.get("/{patient_id}", response_model=PatientWithGuardian)
def get_patient(
    patient_id: int,
    include_guardian: bool = Query(True, description="Incluir información del guardian"),
    db: Session = Depends(get_db),
    _current_user = Depends(require_patient_read)  # ASSISTANT y DENTIST
):
    """Obtener paciente por ID"""
    service = get_patient_service(db)
    patient = service.get_patient_by_id(patient_id, include_person=True, include_guardian=include_guardian)
    
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    
    return patient

@router.get("/document/{document_number}", response_model=PatientResponse)
def get_patient_by_document(
    document_number: str,
    db: Session = Depends(get_db),
    _current_user = Depends(require_patient_read)  # ASSISTANT y DENTIST
):
    """Obtener paciente por número de documento"""
    # Validar formato del documento
    if not document_number or len(document_number.strip()) == 0:
        raise HTTPException(status_code=400, detail="Número de documento requerido")
    
    # Sanitizar documento
    document_number = document_number.strip()
    
    # Validar longitud y caracteres permitidos
    if len(document_number) < 5 or len(document_number) > 30:
        raise HTTPException(status_code=400, detail="Número de documento debe tener entre 5 y 30 caracteres")
    
    # Solo permitir números, letras y algunos caracteres especiales
    if not re.match(r'^[A-Za-z0-9\-\.]+$', document_number):
        raise HTTPException(status_code=400, detail="Número de documento contiene caracteres no válidos")
    
    service = get_patient_service(db)
    patient = service.get_patient_by_document(document_number)
    
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    
    return patient

@router.put("/{patient_id}", response_model=PatientWithGuardian)
def update_patient(
    patient_id: int,
    patient_data: PatientUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(require_patient_write)  # Solo ASSISTANT
):
    """Actualizar paciente (puede incluir datos de persona)"""
    user_id, user_ip = get_user_context(request, db)
    service = get_patient_service(db, user_id, user_ip)
    
    try:
        updated_patient = service.update_patient(patient_id, patient_data)
        
        if not updated_patient:
            raise HTTPException(status_code=404, detail="Paciente no encontrado")
        
        return updated_patient
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error detallado en update_patient: {str(e)}")
        print(f"Tipo de error: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")

@router.delete("/{patient_id}")
def delete_patient(
    patient_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(require_patient_write)  # Solo ASSISTANT
):
    """Eliminar paciente (eliminación lógica - soft delete)"""
    user_id, user_ip = get_user_context(request, db)
    service = get_patient_service(db, user_id, user_ip)
    
    try:
        success = service.delete_patient(patient_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Paciente no encontrado")
        
        return {"message": "Paciente desactivado correctamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error interno del servidor")

# Endpoints para gestión de guardians de pacientes
@router.patch("/{patient_id}/assign-guardian/{guardian_id}")
def assign_guardian_to_patient(
    patient_id: int,
    guardian_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(require_patient_write)  # Solo ASSISTANT
):
    """
    Asignar un guardian a un paciente.
    
    Validaciones:
    - El paciente debe existir y estar activo
    - El guardian debe existir y estar activo  
    - El paciente debe ser menor de 18 años o mayor de 64 años
    - El paciente debe requerir guardián según su perfil
    """
    user_id, user_ip = get_user_context(request, db)
    service = get_patient_service(db, user_id, user_ip)
    
    try:
        success = service.assign_guardian(patient_id, guardian_id)
        
        if success:
            return {"message": f"Guardian {guardian_id} asignado correctamente al paciente {patient_id}"}
        else:
            raise HTTPException(status_code=400, detail="No se pudo realizar la asignación")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.delete("/{patient_id}/unassign-guardian")
def unassign_guardian_from_patient(
    patient_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(require_patient_write)  # Solo ASSISTANT
):
    """Desasignar el guardian de un paciente"""
    user_id, user_ip = get_user_context(request, db)
    service = get_patient_service(db, user_id, user_ip)
    
    try:
        success = service.unassign_guardian(patient_id)
        
        if success:
            return {"message": f"Guardian desasignado correctamente del paciente {patient_id}"}
        else:
            raise HTTPException(status_code=400, detail="No se pudo realizar la desasignación")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.patch("/{patient_id}/status")
def change_patient_status(
    patient_id: int,
    status_data: PatientStatusChange,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(require_patient_write)  # Solo ASSISTANT
):
    """Cambiar el estado de un paciente (activo/inactivo) con validación de motivo"""
    user_id, user_ip = get_user_context(request, db)
    service = get_patient_service(db, user_id, user_ip)
    
    try:
        result = service.change_patient_status(
            patient_id=patient_id,
            new_status=status_data.is_active,
            reason=status_data.reason
        )
        
        action = "activado" if status_data.is_active else "desactivado"
        return {
            "message": f"Paciente {action} correctamente",
            "patient_id": patient_id,
            "new_status": status_data.is_active,
            **result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.patch("/update-guardian-requirements")
def update_guardian_requirements_by_age(
    db: Session = Depends(get_db),
    current_user = Depends(require_patient_write)  # Solo ASSISTANT
):
    """Calcula la edad actual de todos los pacientes en la base de datos y actualiza automáticamente el campo requires_guardian basándose en la edad"""
    service = get_patient_service(db)
    result = service.update_guardian_requirements_by_age()
    return {
        "message": "Requirements de guardian actualizados",
        **result
    }
