from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.services.person_service import get_person_service
from app.models.person_models import DocumentTypeEnum
from app.schemas.person_schema import (
    PersonCreate, 
    PersonUpdate, 
    PersonResponse
)

router = APIRouter(
    prefix="/persons",
    tags=["persons"],
    responses={404: {"description": "Person not found"}}
)

@router.post("/", response_model=PersonResponse, status_code=201)
def create_person(
    person_data: PersonCreate,
    db: Session = Depends(get_db)
):
    """Crear una nueva persona"""
    service = get_person_service(db)
    
    try:
        return service.create_person(person_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error detallado: {str(e)}")
        print(f"Tipo de error: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")

@router.get("/", response_model=List[PersonResponse])
def get_persons(
    skip: int = Query(0, ge=0, description="Número de registros a omitir"),
    limit: int = Query(100, ge=1, le=1000, description="Número máximo de registros"),
    search: Optional[str] = Query(None, description="Buscar en nombre, apellido, documento o email"),
    document_type: Optional[DocumentTypeEnum] = Query(None, description="Filtrar por tipo de documento"),
    min_age: Optional[int] = Query(None, ge=0, description="Edad mínima"),
    max_age: Optional[int] = Query(None, le=150, description="Edad máxima"),
    db: Session = Depends(get_db)
):
    """Obtener lista de personas con filtros"""
    service = get_person_service(db)
    return service.get_persons(
        skip=skip, 
        limit=limit,
        search=search,
        document_type=document_type,
        min_age=min_age,
        max_age=max_age
    )

@router.get("/count")
def get_person_count(db: Session = Depends(get_db)):
    """Obtener conteo total de personas"""
    service = get_person_service(db)
    count = service.get_person_count()
    return {"count": count}

@router.get("/search")
def search_persons(
    query: str = Query(..., min_length=2, description="Término de búsqueda"),
    limit: int = Query(10, ge=1, le=50, description="Número máximo de resultados"),
    db: Session = Depends(get_db)
):
    """Búsqueda rápida de personas"""
    service = get_person_service(db)
    return service.search_persons(query=query, limit=limit)

@router.get("/adults", response_model=List[PersonResponse])
def get_adults(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Obtener solo personas mayores de edad"""
    service = get_person_service(db)
    return service.get_adults(skip=skip, limit=limit)

@router.get("/minors", response_model=List[PersonResponse])
def get_minors(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Obtener solo personas menores de edad"""
    service = get_person_service(db)
    return service.get_minors(skip=skip, limit=limit)

@router.get("/{person_id}", response_model=PersonResponse)
def get_person(
    person_id: int,
    db: Session = Depends(get_db)
):
    """Obtener persona por ID"""
    service = get_person_service(db)
    person = service.get_person_by_id(person_id)
    
    if not person:
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    
    return person

@router.get("/document/{document_number}", response_model=PersonResponse)
def get_person_by_document(
    document_number: str,
    db: Session = Depends(get_db)
):
    """Obtener persona por número de documento"""
    service = get_person_service(db)
    person = service.get_person_by_document(document_number)
    
    if not person:
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    
    return person

@router.get("/{person_id}/age")
def get_person_age(
    person_id: int,
    db: Session = Depends(get_db)
):
    """Obtener edad actual de una persona y determinar si requiere guardian"""
    service = get_person_service(db)
    person = service.get_person_by_id(person_id)
    
    if not person:
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    
    age = service.calculate_age(person.birthdate)
    requires_guardian = age < 18 or age > 64
    
    return {
        "person_id": person_id,
        "age": age,
        "birthdate": person.birthdate,
        "requires_guardian": requires_guardian,
        "reason": (
            "Menor de edad" if age < 18 
            else "Adulto mayor" if age > 64 
            else "Adulto independiente"
        )
    }

@router.put("/{person_id}", response_model=PersonResponse)
def update_person(
    person_id: int,
    person_data: PersonUpdate,
    db: Session = Depends(get_db)
):
    """Actualizar persona"""
    service = get_person_service(db)
    
    try:
        updated_person = service.update_person(person_id, person_data)
        
        if not updated_person:
            raise HTTPException(status_code=404, detail="Persona no encontrada")
        
        return updated_person
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.delete("/{person_id}")
def delete_person(
    person_id: int,
    db: Session = Depends(get_db)
):
    """Eliminar persona (no permitido si tiene roles activos como paciente o guardian)"""
    service = get_person_service(db)
    
    try:
        # Verificar que no tenga roles activos antes de permitir eliminación
        # Esto podría expandirse para verificar en las tablas de patients y guardians
        person = service.get_person_by_id(person_id)
        if not person:
            raise HTTPException(status_code=404, detail="Persona no encontrada")
        
        # Por seguridad, no permitir eliminación directa de personas
        # Solo permitir desactivación de pacientes/guardianes
        raise HTTPException(
            status_code=400, 
            detail="No se puede eliminar una persona directamente. Use los endpoints de pacientes o guardianes."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.get("/by-document-type/{document_type}", response_model=List[PersonResponse])
def get_persons_by_document_type(
    document_type: DocumentTypeEnum,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Obtener personas por tipo de documento"""
    service = get_person_service(db)
    return service.get_persons_by_document_type(document_type, skip=skip, limit=limit)