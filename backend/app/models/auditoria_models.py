from sqlalchemy import Column, String, Text, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Audit(Base):
    __tablename__ = "audits"
    
    id = Column(String(36), primary_key=True)  # VARCHAR(36) para UUID
    user_id = Column(String(128), nullable=False)  # Usuario que realizó la acción
    user_role = Column(String(100), nullable=True)  # Rol del usuario que realizó la acción
    user_email = Column(String(255), nullable=True)  # Email del usuario que realizó la acción
    event_type = Column(String(100), nullable=False)  # Tipo de evento (CREATE, UPDATE, DELETE, etc.)
    event_description = Column(Text, nullable=True)  # Descripción del evento
    affected_record_id = Column(String(36), nullable=False)  # ID del registro afectado
    affected_record_type = Column(String(50), nullable=False)  # Tipo de tabla/entidad afectada
    change_details = Column(JSON, nullable=True)  # Detalles de los cambios en formato JSON
    integrity_hash = Column(String(64), nullable=False)  # Hash para verificar integridad
    event_timestamp = Column(DateTime(timezone=True), nullable=False)  # Timestamp con zona horaria
    source_ip = Column(String(45), nullable=True)  # IP desde donde se originó la acción (soporte IPv6)
    
    def __repr__(self):
        return f"<Audit(id={self.id}, event={self.event_type}, user={self.user_id})>"
