from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Index, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import ENUM
from app.database import Base

# Definir el enum que corresponde al blood_group_enum de PostgreSQL
blood_group_enum = ENUM(
    'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-',
    name='blood_group_enum',
    create_type=False  # No crear el tipo porque ya existe en la BD
)

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, autoincrement=True)
    person_id = Column(Integer, ForeignKey("persons.id", ondelete="CASCADE"), nullable=False, unique=True)
    occupation = Column(String(50), nullable=True)
    guardian_id = Column(Integer, ForeignKey("guardians.id", ondelete="SET NULL"), nullable=True)
    requires_guardian = Column(Boolean, default=False)
    has_disability = Column(Boolean, default=False)
    disability_description = Column(Text, nullable=True)
    blood_group = Column(blood_group_enum, nullable=False, default='O+')
    is_active = Column(Boolean, default=True)
    deactivation_reason = Column(Text, nullable=True)

    # Relaciones
    person = relationship("Person", back_populates="patient")
    guardian = relationship("Guardian", back_populates="patients")  # Un paciente apunta a un guardian
    clinical_histories = relationship("ClinicalHistory", back_populates="patient")  # Relación con ClinicalHistory

# Índices para optimización
Index('idx_patient_active', Patient.is_active)
Index('idx_patient_person', Patient.person_id)
Index('idx_patient_occupation', Patient.occupation)
Index('idx_patient_guardian', Patient.guardian_id)