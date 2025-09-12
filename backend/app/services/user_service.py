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
        tipo_documento=user_data["tipo_documento"],
        nombre=user_data["nombre"],
        email=user_data["email"],
        documento=user_data["documento"],
        telefono=user_data.get("telefono"),
        firebase_uuid=firebase_uuid,
        role_id=user_data["role_id"],
        activo=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
