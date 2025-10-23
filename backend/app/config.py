from pydantic_settings import BaseSettings
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # Configuración SMTP (legacy - mantener por compatibilidad)
    smtp_host: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_username: str = os.getenv("SMTP_USERNAME", "")
    smtp_password: str = os.getenv("SMTP_PASSWORD", "")
    smtp_tls: bool = os.getenv("SMTP_TLS", "True").lower() == "true"
    smtp_ssl: bool = os.getenv("SMTP_SSL", "False").lower() == "true"
    
    # Configuración SendGrid (recomendado para producción)
    sendgrid_api_key: str = os.getenv("SENDGRID_API_KEY", "")
    use_sendgrid: bool = os.getenv("USE_SENDGRID", "False").lower() == "true"
    
    # Configuración de la aplicación
    app_name: str = os.getenv("APP_NAME", "ByteDental Email Service")
    from_email: str = os.getenv("FROM_EMAIL", "")
    from_name: str = os.getenv("FROM_NAME", "ByteDental")
    
    # URLs del frontend
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    # Configuración de Base de Datos
    database_url: str = os.getenv("DATABASE_URL", "postgresql://username:password@localhost:5432/bytedental_db")
    db_host: str = os.getenv("DB_HOST", "localhost")
    db_port: int = int(os.getenv("DB_PORT", "5432"))
    db_name: str = os.getenv("DB_NAME", "bytedental_db")
    db_user: str = os.getenv("DB_USER", "username")
    db_password: str = os.getenv("DB_PASSWORD", "password")
    
    # Firebase
    firebase_credentials_path: str = os.getenv("FIREBASE_CREDENTIALS_PATH", "firebase-credentials.json")
    firebase_api_key: str = os.getenv("FIREBASE_API_KEY", "")  # API Key para verificar contraseñas
    
    class Config:
        env_file = ".env"

settings = Settings()
