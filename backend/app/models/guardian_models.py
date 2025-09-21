from sqlalchemy import Column, Integer, TIMESTAMP, ForeignKey, Enum, Index, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum

# Enum para relación con el paciente (basado en el nuevo modelo)
class PatientRelationshipEnum(enum.Enum):
    Father = "Father"
    Mother = "Mother"
    Grandfather = "Grandfather"
    Grandmother = "Grandmother"
    Son = "Son"
    Daughter = "Daughter"
    Legal_Guardian = "Legal_Guardian"
    Brother = "Brother"
    Sister = "Sister"
    Other = "Other"

class Guardian(Base):
    __tablename__ = "guardians"

    id = Column(Integer, primary_key=True, autoincrement=True)
    person_id = Column(Integer, ForeignKey("persons.id", ondelete="CASCADE"), nullable=False)
    relationship_type = Column(Enum(PatientRelationshipEnum, name='patient_relationship_enum', create_type=False), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relaciones
    person = relationship("Person", back_populates="guardians")
    patients = relationship("Patient", back_populates="guardian")  # Un guardian puede tener múltiples pacientes

# Índices para optimización
Index('idx_guardian_active', Guardian.is_active)
Index('idx_guardian_person', Guardian.person_id)
Index('idx_guardian_relationship_type', Guardian.relationship_type)
