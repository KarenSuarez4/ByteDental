import firebase_admin
from firebase_admin import credentials, auth

def init_firebase():
    """Inicializar Firebase Admin SDK"""
    cred_path = "bytedental-6701e-firebase-adminsdk-fbsvc-1aa4de4cff.json"  # Ruta al archivo de credenciales
    try:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        print("✅ Firebase inicializado correctamente")
    except Exception as e:
        print(f"❌ Error inicializando Firebase: {e}")
        return False
    return True

def generate_token(uid):
    """Generar un token personalizado para un usuario"""
    try:
        custom_token = auth.create_custom_token(uid)
        print(f"🎫 Token generado para UID {uid}:")
        print(f"Bearer {custom_token.decode('utf-8')}")
    except Exception as e:
        print(f"❌ Error generando token: {e}")

def main():
    if not init_firebase():
        return

    # UID del usuario con rol de doctor
    doctor_uid = "oYEj3T71MhRgtYbvbcDfYR9AFnB2"  # Reemplaza con el UID del doctor
    generate_token(doctor_uid)

if __name__ == "__main__":
    main()