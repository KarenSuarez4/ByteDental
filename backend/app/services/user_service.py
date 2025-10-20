from app.models.user_models import User
from app.services.firebase_service import create_firebase_user
from sqlalchemy.orm import Session

def create_user(db: Session, user_data: dict):
    # Crear usuario en Firebase
    firebase_uuid = create_firebase_user(
        email=user_data["email"],
        password=user_data["password"],
        display_name=user_data["nombre"],
        phone_number=user_data.get("telefono")
    )
    # Crear usuario en la base de datos
    user = User(
        first_name=user_data["first_name"].upper(),
        last_name=user_data["last_name"].upper(),
        email=user_data["email"],
        document_number=user_data["document_number"],
        document_type=user_data["document_type"],
        phone=user_data.get("phone"),
        role_id=user_data["role_id"],
        specialty=user_data.get("specialty"),
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
