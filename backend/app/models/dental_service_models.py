from sqlalchemy import Column, Integer, String, Text, Numeric, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class DentalService(Base):
    __tablename__ = "dental_service"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relación con Treatment
    treatments = relationship("Treatment", back_populates="dental_service")

    def __repr__(self):
        return f"<DentalService(id={self.id}, name={self.name}, price={self.price}, is_active={self.is_active})>"
