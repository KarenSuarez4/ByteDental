from sqlalchemy import Column, Integer, String, Date, Enum, Index
from sqlalchemy.orm import relationship, validates
from app.database import Base
import enum

# Enum para tipos de documento (basado en el nuevo modelo)
class DocumentTypeEnum(enum.Enum):
    CC = "CC"  # Cédula de Ciudadanía
    TI = "TI"  # Tarjeta de Identidad
    CE = "CE"  # Cédula de Extranjería
    PP = "PP"  # Pasaporte
    RC = "RC"  # Registro Civil

class Person(Base):
    __tablename__ = "persons"

    id = Column(Integer, primary_key=True, autoincrement=True)
    document_type = Column(Enum(DocumentTypeEnum, name='document_type', create_type=False), nullable=False)
    document_number = Column(String(30), unique=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    middle_name = Column(String(100), nullable=True)
    first_surname = Column(String(100), nullable=False)
    second_surname = Column(String(100), nullable=True)
    email = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    birthdate = Column(Date, nullable=False)

    # Relaciones
    patient = relationship("Patient", back_populates="person", uselist=False, cascade="all, delete-orphan")
    guardians = relationship("Guardian", back_populates="person", cascade="all, delete-orphan")

    @validates('first_name', 'middle_name', 'first_surname', 'second_surname')
    def convert_to_uppercase(self, key, value):
        if value:
            return value.upper()
        return value

# Índices para optimización
Index('idx_person_document', Person.document_type, Person.document_number)
Index('idx_person_names', Person.first_name, Person.first_surname)
Index('idx_person_email', Person.email)