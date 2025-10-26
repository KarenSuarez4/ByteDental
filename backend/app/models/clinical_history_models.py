from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Boolean, func
from sqlalchemy.orm import relationship
from app.database import Base

class ClinicalHistory(Base):
    __tablename__ = "clinical_histories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    reason = Column(Text, nullable=False)
    symptoms = Column(Text, nullable=False)
    medical_history = Column(Text, nullable=True)
    findings = Column(Text, nullable=True)
    doctor_signature = Column(String(128), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)  # Estado de activación sincronizado con paciente
    closure_reason = Column(Text, nullable=True)  # Motivo de cierre de la historia clínica
    closed_at = Column(DateTime, nullable=True)  # Fecha de cierre de la historia clínica
    created_at = Column(DateTime, server_default=func.now())  
    updated_at = Column(DateTime, onupdate=func.now())        

    # Relaciones
    patient = relationship("Patient", back_populates="clinical_histories")
    treatments = relationship("Treatment", back_populates="clinical_history")