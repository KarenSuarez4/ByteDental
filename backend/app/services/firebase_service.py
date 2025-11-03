import firebase_admin
from firebase_admin import auth, credentials
import os
import requests
from typing import Optional
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Inicializar Firebase Admin SDK
if not firebase_admin._apps:
    # Obtener el directorio backend directamente
    current_dir = os.path.dirname(__file__)  # services/
    app_dir = os.path.dirname(current_dir)   # app/
    backend_dir = os.path.dirname(app_dir)   # backend/
    
    # Usar directamente el nombre del archivo que sabemos que existe
    filename = "bytedental-6701e-firebase-adminsdk-fbsvc-1aa4de4cff.json"
    cred_path = os.path.join(backend_dir, filename)
    
    print(f"🔍 Intentando cargar credenciales de Firebase desde: {cred_path}")
    
    if os.path.exists(cred_path):
        try:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            print("✅ Firebase inicializado exitosamente")
        except Exception as e:
            print(f"❌ Error al inicializar Firebase: {e}")
    else:
        print(f"❌ Archivo de credenciales no encontrado: {cred_path}")
        print("🔍 Archivos disponibles en el directorio backend:")
        for file in os.listdir(backend_dir):
            if file.endswith('.json'):
                print(f"   - {file}")
        print("Firebase no se inicializó. Las funciones de Firebase no estarán disponibles.")

class FirebaseService:
    """Servicio para gestionar usuarios en Firebase Authentication"""
    
    @staticmethod
    def create_firebase_user(email: str, password: str, display_name: Optional[str] = None, phone_number: Optional[str] = None) -> Optional[str]:
        """
        Crear un usuario en Firebase Authentication
        
        Args:
            email: Email del usuario
            password: Contraseña del usuario
            display_name: Nombre a mostrar del usuario
            phone_number: Teléfono del usuario
            
        Returns:
            UID del usuario creado en Firebase o None si hay error
        """
        try:
            if not firebase_admin._apps:
                print("Firebase no está inicializado. No se puede crear usuario.")
                return None
                
            user_record = auth.create_user(
                email=email,
                password=password,
                display_name=display_name,
                phone_number=phone_number,
                email_verified=False
            )
            return user_record.uid
        except Exception as e:
            print(f"Error creando usuario en Firebase: {e}")
            return None
    
    @staticmethod
    def get_firebase_user(uid: str):
        """Obtener información de un usuario de Firebase por UID"""
        try:
            if not firebase_admin._apps:
                print("Firebase no está inicializado.")
                return None
                
            user_record = auth.get_user(uid)
            return user_record
        except Exception as e:
            print(f"Error obteniendo usuario de Firebase: {e}")
            return None
    
    @staticmethod
    def update_firebase_user(uid: str, **kwargs):
        """Actualizar un usuario en Firebase"""
        try:
            if not firebase_admin._apps:
                print("Firebase no está inicializado.")
                return None
                
            user_record = auth.update_user(uid, **kwargs)
            return user_record
        except Exception as e:
            print(f"Error actualizando usuario en Firebase: {e}")
            return None
    
    @staticmethod
    def delete_firebase_user(uid: str) -> bool:
        """Eliminar un usuario de Firebase"""
        try:
            if not firebase_admin._apps:
                print("Firebase no está inicializado.")
                return False
                
            auth.delete_user(uid)
            return True
        except Exception as e:
            print(f"Error eliminando usuario de Firebase: {e}")
            return False
    
    @staticmethod
    def verify_token(id_token: str):
        """
        Verificar un token de Firebase
        
        Args:
            id_token: Token JWT de Firebase
            
        Returns:
            Datos del token decodificado o None si hay error
        """
        try:
            if not firebase_admin._apps:
                print("Firebase no está inicializado.")
                return None
                
            decoded_token = auth.verify_id_token(id_token)
            return decoded_token
        except Exception as e:
            print(f"Error verificando token de Firebase: {e}")
            return None
    
    @staticmethod
    def verify_password(email: str, password: str) -> bool:
        """
        Verificar si la contraseña de un usuario es correcta usando Firebase REST API
        
        Args:
            email: Email del usuario
            password: Contraseña a verificar
            
        Returns:
            True si la contraseña es correcta, False en caso contrario
        """
        try:
            # Obtener la API key de Firebase desde variables de entorno
            firebase_api_key = os.getenv("FIREBASE_API_KEY")
            
            if not firebase_api_key:
                print("⚠️  FIREBASE_API_KEY no está configurada en .env")
                return False
            
            # Endpoint de Firebase para verificar contraseña
            url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={firebase_api_key}"
            
            payload = {
                "email": email,
                "password": password,
                "returnSecureToken": True
            }
            
            response = requests.post(url, json=payload)
            
            if response.status_code == 200:
                return True
            else:
                # Contraseña incorrecta o usuario no existe
                return False
                
        except Exception as e:
            print(f"Error verificando contraseña en Firebase: {e}")
            return False

# Función legacy para compatibilidad
def create_firebase_user(email, password, display_name=None, phone_number=None):
    return FirebaseService.create_firebase_user(email, password, display_name, phone_number)

# Instancia global del servicio
firebase_service = FirebaseService()
