from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, TIMESTAMP, Enum
from sqlalchemy.orm import relationship, validates
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"  # Tabla en inglés
    
    uid = Column(String(128), primary_key=True)  # Firebase UUID como clave primaria
    document_number = Column(String(20), nullable=False)  # Número de documento
    document_type = Column(Enum('CC', 'TI', 'CE', 'PP', name='document_type_enum'), nullable=False)  # Tipo de documento como ENUM
    first_name = Column(String(100), nullable=False)  # Nombres
    last_name = Column(String(100), nullable=False)  # Apellidos
    email = Column(String(255), unique=True, nullable=False)  # Email
    phone = Column(String(20), nullable=True)  # Teléfono
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)  # Referencia a tabla de roles
    specialty = Column(String(100), nullable=True)  # Especialidad (para doctores)
    is_active = Column(Boolean, default=True)  # Si está activo
    must_change_password = Column(Boolean, default=False, nullable=False)  # Debe cambiar contraseña en primer login
    failed_login_attempts = Column(Integer, default=0, nullable=False)  # Intentos fallidos de inicio de sesión
    locked_until = Column(TIMESTAMP(timezone=True), nullable=True)  # Bloqueado hasta esta fecha/hora
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)  # Fecha de creación
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False)  # Fecha de actualización
    
    # Relación con Rol
    role = relationship("Role", back_populates="users")
    
    def __repr__(self):
        return f"<User(uid={self.uid}, name={self.first_name} {self.last_name}, role_id={self.role_id})>"
    
    @validates('first_name', 'last_name')
    def convert_to_uppercase(self, key, value):
        if value:
            return value.upper()
        return value
