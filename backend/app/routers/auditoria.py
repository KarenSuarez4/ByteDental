from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta

from ..database import get_db
from ..models.auditoria_models import Audit
from ..models.user_models import User
from ..middleware.auth_middleware import get_current_auditor_user
from ..services.auditoria_service import AuditoriaService

# Zona horaria de Colombia (UTC-5)
COLOMBIA_TZ = timezone(timedelta(hours=-5))

router = APIRouter(prefix="/auditoria", tags=["auditoria"])

# Schemas de Pydantic
class AuditResponse(BaseModel):
    id: str
    user_id: str
    user_role: Optional[str] = None
    user_email: Optional[str] = None
    event_type: str
    event_description: Optional[str]
    affected_record_id: str
    affected_record_type: str
    change_details: Optional[dict]
    integrity_hash: str
    event_timestamp: datetime
    event_timestamp_colombia: Optional[datetime] = None
    source_ip: Optional[str]

    class Config:
        from_attributes = True

class EntityAuditTrailResponse(BaseModel):
    """Respuesta para el historial de auditoría de una entidad específica"""
    entity_type: str
    entity_id: int
    audit_trail: List[AuditResponse]
    total_records: int
    returned_records: int
    
    class Config:
        from_attributes = True

class PatientAuditTrailResponse(EntityAuditTrailResponse):
    """Respuesta específica para auditoría de pacientes"""
    pass

class GuardianAuditTrailResponse(EntityAuditTrailResponse):
    """Respuesta específica para auditoría de guardianes"""
    pass

class PersonAuditTrailResponse(EntityAuditTrailResponse):
    """Respuesta específica para auditoría de personas"""
    pass

class DentalServiceAuditTrailResponse(EntityAuditTrailResponse):
    """Respuesta específica para auditoría de servicios dentales"""
    service_name: str
    service_value: str
    service_status: str

@router.get("/", response_model=List[AuditResponse])
def get_eventos_auditoria(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    user_id: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),  # Filtrar por tipo de evento
    affected_record_type: Optional[str] = Query(None),  # Filtrar por tipo de entidad afectada
    fecha_inicio: Optional[datetime] = Query(None, description="Fecha de inicio (YYYY-MM-DD HH:MM:SS). Si no se especifica zona horaria, se asume Colombia"),
    fecha_fin: Optional[datetime] = Query(None, description="Fecha de fin (YYYY-MM-DD HH:MM:SS). Si no se especifica zona horaria, se asume Colombia"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_auditor_user)
):
    """
    Obtener eventos de auditoría con filtros opcionales - Solo AUDITORES
    
    Args:
        skip: Número de registros a omitir
        limit: Máximo número de registros a retornar
        user_id: Filtrar por usuario que realizó la acción
        event_type: Filtrar por tipo de evento (CREATE, UPDATE, DELETE, etc.)
        affected_record_type: Filtrar por tipo de entidad afectada
        fecha_inicio: Fecha de inicio del rango (formato: YYYY-MM-DD HH:MM:SS)
        fecha_fin: Fecha de fin del rango (formato: YYYY-MM-DD HH:MM:SS)
    """
    query = db.query(Audit)

    # Aplicar filtros básicos
    if user_id:
        query = query.filter(Audit.user_id == user_id)
    if event_type:
        query = query.filter(Audit.event_type == event_type)  # Filtrar por tipo de evento
    if affected_record_type:
        query = query.filter(Audit.affected_record_type == affected_record_type)

    # Aplicar filtros de fecha
    if fecha_inicio:
        if fecha_inicio.tzinfo is None:
            fecha_inicio = fecha_inicio.replace(tzinfo=COLOMBIA_TZ)
        fecha_inicio_utc = fecha_inicio.astimezone(timezone.utc)
        query = query.filter(Audit.event_timestamp >= fecha_inicio_utc)
    if fecha_fin:
        if fecha_fin.tzinfo is None:
            fecha_fin = fecha_fin.replace(tzinfo=COLOMBIA_TZ)
        fecha_fin_utc = fecha_fin.astimezone(timezone.utc)
        query = query.filter(Audit.event_timestamp <= fecha_fin_utc)

    # Ordenar por timestamp descendente (más recientes primero)
    eventos = query.order_by(Audit.event_timestamp.desc()).offset(skip).limit(limit).all()

    # Agregar timestamp en hora de Colombia a la respuesta
    for evento in eventos:
        evento.event_timestamp_colombia = AuditoriaService.convertir_a_hora_colombia(evento.event_timestamp)

    return eventos

@router.get("/{evento_id}", response_model=AuditResponse)
def get_evento_auditoria(
    evento_id: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_auditor_user)
):
    """Obtener un evento de auditoría específico por ID - Solo AUDITORES"""
    
    evento = db.query(Audit).filter(Audit.id == evento_id).first()
    
    if not evento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evento de auditoría no encontrado"
        )
    
    # Agregar timestamp en hora de Colombia
    evento.event_timestamp_colombia = AuditoriaService.convertir_a_hora_colombia(evento.event_timestamp)
    
    return evento

@router.get("/usuario/{usuario_id}", response_model=List[AuditResponse])
def get_eventos_por_usuario(
    usuario_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    fecha_inicio: Optional[datetime] = Query(None, description="Fecha de inicio (YYYY-MM-DD HH:MM:SS). Si no se especifica zona horaria, se asume Colombia"),
    fecha_fin: Optional[datetime] = Query(None, description="Fecha de fin (YYYY-MM-DD HH:MM:SS). Si no se especifica zona horaria, se asume Colombia"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_auditor_user)
):
    """Obtener todos los eventos de auditoría de un usuario específico - Solo AUDITORES"""
    
    query = db.query(Audit).filter(Audit.user_id == usuario_id)
    
    # Aplicar filtros de fecha
    if fecha_inicio:
        if fecha_inicio.tzinfo is None:
            fecha_inicio = fecha_inicio.replace(tzinfo=COLOMBIA_TZ)
        fecha_inicio_utc = fecha_inicio.astimezone(timezone.utc)
        query = query.filter(Audit.event_timestamp >= fecha_inicio_utc)
    
    if fecha_fin:
        if fecha_fin.tzinfo is None:
            fecha_fin = fecha_fin.replace(tzinfo=COLOMBIA_TZ)
        fecha_fin_utc = fecha_fin.astimezone(timezone.utc)
        query = query.filter(Audit.event_timestamp <= fecha_fin_utc)
    
    eventos = query.order_by(Audit.event_timestamp.desc()).offset(skip).limit(limit).all()
    
    # Agregar timestamp en hora de Colombia
    for evento in eventos:
        evento.event_timestamp_colombia = AuditoriaService.convertir_a_hora_colombia(evento.event_timestamp)
    
    return eventos

@router.get("/registro/{registro_id}", response_model=List[AuditResponse])
def get_eventos_por_registro(
    registro_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    fecha_inicio: Optional[datetime] = Query(None, description="Fecha de inicio (YYYY-MM-DD HH:MM:SS). Si no se especifica zona horaria, se asume Colombia"),
    fecha_fin: Optional[datetime] = Query(None, description="Fecha de fin (YYYY-MM-DD HH:MM:SS). Si no se especifica zona horaria, se asume Colombia"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_auditor_user)
):
    """Obtener todos los eventos de auditoría de un registro específico - Solo AUDITORES"""
    
    query = db.query(Audit).filter(Audit.affected_record_id == registro_id)
    
    # Aplicar filtros de fecha
    if fecha_inicio:
        if fecha_inicio.tzinfo is None:
            fecha_inicio = fecha_inicio.replace(tzinfo=COLOMBIA_TZ)
        fecha_inicio_utc = fecha_inicio.astimezone(timezone.utc)
        query = query.filter(Audit.event_timestamp >= fecha_inicio_utc)
    
    if fecha_fin:
        if fecha_fin.tzinfo is None:
            fecha_fin = fecha_fin.replace(tzinfo=COLOMBIA_TZ)
        fecha_fin_utc = fecha_fin.astimezone(timezone.utc)
        query = query.filter(Audit.event_timestamp <= fecha_fin_utc)
    
    eventos = query.order_by(Audit.event_timestamp.desc()).offset(skip).limit(limit).all()
    
    # Agregar timestamp en hora de Colombia
    for evento in eventos:
        evento.event_timestamp_colombia = AuditoriaService.convertir_a_hora_colombia(evento.event_timestamp)
    
    return eventos

@router.get("/tipos-evento/", response_model=List[str])
def get_tipos_evento(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_auditor_user)
):
    """Obtener todos los tipos de evento únicos registrados - Solo AUDITORES"""
    
    tipos = db.query(Audit.event_type).distinct().all()
    return [tipo[0] for tipo in tipos]

@router.get("/entidades-afectadas/", response_model=List[str])
def get_entidades_afectadas(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_auditor_user)
):
    """Obtener todos los tipos de entidades afectadas únicos - Solo AUDITORES"""
    
    entidades = db.query(Audit.affected_record_type).distinct().all()
    return [entidad[0] for entidad in entidades]

@router.get("/rango-fechas/", response_model=List[AuditResponse])
def get_eventos_por_rango_fechas(
    fecha_inicio: datetime = Query(..., description="Fecha de inicio (YYYY-MM-DD HH:MM:SS). Si no se especifica zona horaria, se asume Colombia"),
    fecha_fin: datetime = Query(..., description="Fecha de fin (YYYY-MM-DD HH:MM:SS). Si no se especifica zona horaria, se asume Colombia"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    event_type: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    affected_record_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_auditor_user)
):
    """
    Obtener eventos de auditoría en un rango de fechas específico - Solo AUDITORES
    
    Args:
        fecha_inicio: Fecha de inicio del rango (obligatoria)
        fecha_fin: Fecha de fin del rango (obligatoria)
        skip: Número de registros a omitir
        limit: Máximo número de registros a retornar
        event_type: Filtrar por tipo de evento
        user_id: Filtrar por usuario
        affected_record_type: Filtrar por tipo de entidad afectada
    """
    
    # Validar que fecha_inicio sea menor que fecha_fin
    if fecha_inicio >= fecha_fin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La fecha de inicio debe ser menor que la fecha de fin"
        )
    
    # Si las fechas no tienen zona horaria, asumimos que son hora de Colombia
    if fecha_inicio.tzinfo is None:
        fecha_inicio = fecha_inicio.replace(tzinfo=COLOMBIA_TZ)
    if fecha_fin.tzinfo is None:
        fecha_fin = fecha_fin.replace(tzinfo=COLOMBIA_TZ)
    
    # Convertir a UTC para comparar con la base de datos
    fecha_inicio_utc = fecha_inicio.astimezone(timezone.utc)
    fecha_fin_utc = fecha_fin.astimezone(timezone.utc)
    
    query = db.query(Audit).filter(
        Audit.event_timestamp >= fecha_inicio_utc,
        Audit.event_timestamp <= fecha_fin_utc
    )
    
    # Aplicar filtros adicionales
    if event_type:
        query = query.filter(Audit.event_type == event_type)
    
    if user_id:
        query = query.filter(Audit.user_id == user_id)
    
    if affected_record_type:
        query = query.filter(Audit.affected_record_type == affected_record_type)
    
    eventos = query.order_by(Audit.event_timestamp.desc()).offset(skip).limit(limit).all()
    
    # Agregar timestamp en hora de Colombia
    for evento in eventos:
        evento.event_timestamp_colombia = AuditoriaService.convertir_a_hora_colombia(evento.event_timestamp)
    
    return eventos

# =============================================================================
# ENDPOINTS CENTRALIZADOS DE AUDITORÍA POR ENTIDAD
# =============================================================================

@router.get("/patients/{patient_id}", response_model=PatientAuditTrailResponse)
def get_patient_audit_trail(
    patient_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_auditor_user)
):
    """Obtener historial de auditoría de un paciente específico - Solo AUDITORES"""
    from app.services.patient_service import get_patient_service
    
    auditoria_service = AuditoriaService()
    
    # Verificar que el paciente existe
    patient_service = get_patient_service(db)
    patient = patient_service.get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    
    # Obtener registros de auditoría
    audit_records = auditoria_service.obtener_eventos_por_registro(
        db=db,
        registro_id=str(patient_id),
        tipo_registro="patients",
        skip=skip,
        limit=limit
    )
    
    # Obtener conteo total
    total_records = auditoria_service.obtener_conteo_eventos_por_registro(
        db=db,
        registro_id=str(patient_id),
        tipo_registro="patients"
    )
    
    return PatientAuditTrailResponse(
        entity_type="patients",
        entity_id=patient_id,
        audit_trail=audit_records,
        total_records=total_records,
        returned_records=len(audit_records)
    )

@router.get("/guardians/{guardian_id}", response_model=GuardianAuditTrailResponse)
def get_guardian_audit_trail(
    guardian_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_auditor_user)
):
    """Obtener historial de auditoría de un guardian específico - Solo AUDITORES"""
    from app.services.guardian_service import get_guardian_service
    
    auditoria_service = AuditoriaService()
    
    # Verificar que el guardian existe
    guardian_service = get_guardian_service(db)
    guardian = guardian_service.get_guardian_by_id(guardian_id)
    if not guardian:
        raise HTTPException(status_code=404, detail="Guardian no encontrado")
    
    # Obtener registros de auditoría
    audit_records = auditoria_service.obtener_eventos_por_registro(
        db=db,
        registro_id=str(guardian_id),
        tipo_registro="guardians",
        skip=skip,
        limit=limit
    )
    
    # Obtener conteo total
    total_records = auditoria_service.obtener_conteo_eventos_por_registro(
        db=db,
        registro_id=str(guardian_id),
        tipo_registro="guardians"
    )
    
    return GuardianAuditTrailResponse(
        entity_type="guardians",
        entity_id=guardian_id,
        audit_trail=audit_records,
        total_records=total_records,
        returned_records=len(audit_records)
    )

@router.get("/persons/{person_id}", response_model=PersonAuditTrailResponse)
def get_person_audit_trail(
    person_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_auditor_user)
):
    """Obtener historial de auditoría de una persona específica - Solo AUDITORES"""
    from app.services.person_service import get_person_service
    
    auditoria_service = AuditoriaService()
    
    # Verificar que la persona existe
    person_service = get_person_service(db)
    person = person_service.get_person_by_id(person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    
    # Obtener registros de auditoría
    audit_records = auditoria_service.obtener_eventos_por_registro(
        db=db,
        registro_id=str(person_id),
        tipo_registro="persons",
        skip=skip,
        limit=limit
    )
    
    # Obtener conteo total
    total_records = auditoria_service.obtener_conteo_eventos_por_registro(
        db=db,
        registro_id=str(person_id),
        tipo_registro="persons"
    )
    
    return PersonAuditTrailResponse(
        entity_type="persons",
        entity_id=person_id,
        audit_trail=audit_records,
        total_records=total_records,
        returned_records=len(audit_records)
    )

@router.get("/dental-services/{service_id}", response_model=DentalServiceAuditTrailResponse)
def get_dental_service_audit_trail(
    service_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_auditor_user)
):
    """Obtener historial de auditoría de un servicio odontológico específico - Solo AUDITORES"""
    from app.services.dental_service import get_dental_service_service
    
    auditoria_service = AuditoriaService()
    
    # Verificar que el servicio odontológico existe
    dental_service_service = get_dental_service_service(db)
    dental_service = dental_service_service.get_dental_service(service_id)
    if not dental_service:
        raise HTTPException(status_code=404, detail="Servicio odontológico no encontrado")
    
    # Obtener registros de auditoría
    audit_records = auditoria_service.obtener_eventos_por_registro(
        db=db,
        registro_id=str(service_id),
        tipo_registro="dental_services",
        skip=skip,
        limit=limit
    )
    
    # Obtener conteo total
    total_records = auditoria_service.obtener_conteo_eventos_por_registro(
        db=db,
        registro_id=str(service_id),
        tipo_registro="dental_services"
    )
    
    return DentalServiceAuditTrailResponse(
        entity_type="dental_services",
        entity_id=service_id,
        service_name=dental_service.name,
        service_value=str(dental_service.value),
        service_status="activo" if dental_service.is_active else "inactivo",
        audit_trail=audit_records,
        total_records=total_records,
        returned_records=len(audit_records)
    )
