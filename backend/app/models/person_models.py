from sqlalchemy import Column, Integer, String, Date, TIMESTAMP, Enum, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum

# Enum para tipos de documento (basado en el nuevo modelo)
class DocumentTypeEnum(enum.Enum):
    CC = "CC"  # Cédula de Ciudadanía
    TI = "TI"  # Tarjeta de Identidad
    CE = "CE"  # Cédula de Extranjería
    PA = "PA"  # Pasaporte
    RC = "RC"  # Registro Civil

class Person(Base):
    __tablename__ = "persons"

    id = Column(Integer, primary_key=True, autoincrement=True)
    document_type = Column(Enum(DocumentTypeEnum, name='document_type', create_type=False), nullable=False)
    document_number = Column(String(30), unique=True, nullable=False)
    first_surname = Column(String(50), nullable=False)
    second_surname = Column(String(50), nullable=True)
    first_name = Column(String(50), nullable=False)
    middle_name = Column(String(50), nullable=True)
    email = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    birthdate = Column(Date, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relaciones
    patient = relationship("Patient", back_populates="person", uselist=False, cascade="all, delete-orphan")
    guardians = relationship("Guardian", back_populates="person", cascade="all, delete-orphan")

# Índices para optimización
Index('idx_person_document', Person.document_type, Person.document_number)
Index('idx_person_names', Person.first_name, Person.first_surname)
Index('idx_person_email', Person.email)