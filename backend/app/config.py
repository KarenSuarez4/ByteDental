from pydantic_settings import BaseSettings
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # Configuración SMTP
    smtp_host: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_username: str = os.getenv("SMTP_USERNAME", "")
    smtp_password: str = os.getenv("SMTP_PASSWORD", "")
    smtp_tls: bool = os.getenv("SMTP_TLS", "True").lower() == "true"
    smtp_ssl: bool = os.getenv("SMTP_SSL", "False").lower() == "true"
    
    # Configuración de la aplicación
    app_name: str = os.getenv("APP_NAME", "ByteDental Email Service")
    from_email: str = os.getenv("FROM_EMAIL", "")
    from_name: str = os.getenv("FROM_NAME", "ByteDental")
    
    # URLs del frontend
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    class Config:
        env_file = ".env"

settings = Settings()
