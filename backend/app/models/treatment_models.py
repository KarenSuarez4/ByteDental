from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from app.database import Base

class Treatment(Base):
    __tablename__ = "treatments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    clinical_history_id = Column(Integer, ForeignKey("clinical_histories.id", ondelete="CASCADE"), nullable=False)
    dental_service_id = Column(Integer, ForeignKey("dental_service.id", ondelete="SET NULL"), nullable=True)
    doctor_id = Column(String(128), nullable=False)
    treatment_date = Column(DateTime, nullable=False)
    notes = Column(Text, nullable=True)

    # Relaciones
    dental_service = relationship("DentalService", back_populates="treatments")
    clinical_history = relationship("ClinicalHistory", back_populates="treatments")