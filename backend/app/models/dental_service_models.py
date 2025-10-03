from sqlalchemy import Column, Integer, String, Text, Numeric, Boolean
from app.database import Base


class DentalService(Base):
    __tablename__ = "dental_service"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    value = Column(Numeric(10, 2), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    def __repr__(self):
        return f"<DentalService(id={self.id}, name={self.name}, value={self.value}, is_active={self.is_active})>"
