from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, autoincrement=True)
    person_id = Column(Integer, ForeignKey("persons.id", ondelete="CASCADE"), nullable=False, unique=True)
    occupation = Column(String(50), nullable=True)
    requires_guardian = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relaciones
    person = relationship("Person", back_populates="patient")
    guardians = relationship("Guardian", back_populates="patient", cascade="all, delete-orphan")

# Índices para optimización
Index('idx_patient_active', Patient.is_active)
Index('idx_patient_person', Patient.person_id)
Index('idx_patient_occupation', Patient.occupation)


