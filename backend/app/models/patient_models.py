from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Index, Text
from sqlalchemy.orm import relationship
from app.database import Base

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, autoincrement=True)
    person_id = Column(Integer, ForeignKey("persons.id", ondelete="CASCADE"), nullable=False, unique=True)
    occupation = Column(String(50), nullable=True)
    guardian_id = Column(Integer, ForeignKey("guardians.id", ondelete="SET NULL"), nullable=True)
    requires_guardian = Column(Boolean, default=False)
    has_disability = Column(Boolean, default=False)
    disability_description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    deactivation_reason = Column(Text, nullable=True)
    
    # Relaciones
    person = relationship("Person", back_populates="patient")
    guardian = relationship("Guardian", back_populates="patients")  # Un paciente apunta a un guardian

# Índices para optimización
Index('idx_patient_active', Patient.is_active)
Index('idx_patient_person', Patient.person_id)
Index('idx_patient_occupation', Patient.occupation)
Index('idx_patient_guardian', Patient.guardian_id)