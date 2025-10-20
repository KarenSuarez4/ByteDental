from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, TIMESTAMP, Enum
from sqlalchemy.orm import relationship, validates
from sqlalchemy.sql import func
from app.database import Base  # ✅ Cambiar a import absoluto

class User(Base):
    __tablename__ = "users"
    
    uid = Column(String(128), primary_key=True)
    document_number = Column(String(20), nullable=False)
    document_type = Column(Enum('CC', 'TI', 'CE', 'PP', name='document_type_enum'), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(20), nullable=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    specialty = Column(String(100), nullable=True)
    birthdate = Column(Date, nullable=True)  
    is_active = Column(Boolean, default=True)
    must_change_password = Column(Boolean, default=False, nullable=False)
    failed_login_attempts = Column(Integer, default=0, nullable=False) 
    locked_until = Column(TIMESTAMP(timezone=True), nullable=True)  
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)  
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False)  
    
    # Relación con Rol
    role = relationship("Role", back_populates="users")
    
    def __repr__(self):
        return f"<User(uid={self.uid}, name={self.first_name} {self.last_name}, role_id={self.role_id})>"
    
    @validates('first_name', 'last_name')
    def convert_to_uppercase(self, key, value):
        if value:
            return value.upper()
        return value
