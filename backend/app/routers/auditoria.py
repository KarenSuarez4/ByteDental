from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from ..database import get_db
from ..models.auditoria_models import Audit
from ..models.user_models import User
from ..middleware.auth_middleware import get_current_auditor_user

router = APIRouter(prefix="/auditoria", tags=["auditoria"])

# Schemas de Pydantic
class AuditResponse(BaseModel):
    id: str
    user_id: str
    event_type: str
    event_description: Optional[str]
    affected_record_id: str
    affected_record_type: str
    change_details: Optional[dict]
    integrity_hash: str
    event_timestamp: datetime
    source_ip: Optional[str]

    class Config:
        from_attributes = True

@router.get("/", response_model=List[AuditResponse])
def get_eventos_auditoria(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    user_id: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    affected_record_type: Optional[str] = Query(None),
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
    """
    
    query = db.query(Audit)
    
    # Aplicar filtros
    if user_id:
        query = query.filter(Audit.user_id == user_id)
    
    if event_type:
        query = query.filter(Audit.event_type == event_type)
    
    if affected_record_type:
        query = query.filter(Audit.affected_record_type == affected_record_type)
    
    # Ordenar por timestamp descendente (más recientes primero)
    eventos = query.order_by(Audit.event_timestamp.desc()).offset(skip).limit(limit).all()
    
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
    
    return evento

@router.get("/usuario/{usuario_id}", response_model=List[AuditResponse])
def get_eventos_por_usuario(
    usuario_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_auditor_user)
):
    """Obtener todos los eventos de auditoría de un usuario específico - Solo AUDITORES"""
    
    eventos = db.query(Audit).filter(
        Audit.user_id == usuario_id
    ).order_by(
        Audit.event_timestamp.desc()
    ).offset(skip).limit(limit).all()
    
    return eventos

@router.get("/registro/{registro_id}", response_model=List[AuditResponse])
def get_eventos_por_registro(
    registro_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_auditor_user)
):
    """Obtener todos los eventos de auditoría de un registro específico - Solo AUDITORES"""
    
    eventos = db.query(Audit).filter(
        Audit.affected_record_id == registro_id
    ).order_by(
        Audit.event_timestamp.desc()
    ).offset(skip).limit(limit).all()
    
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
