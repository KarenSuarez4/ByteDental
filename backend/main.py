from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from app.routers import email_router, otp_router, users, auditoria, auth, patients, guardians, persons, dental_services
from app.config import settings
from app.database import get_db, engine, Base  # Asegúrate de importar Base y engine
from sqlalchemy.orm import Session
from sqlalchemy import text
import logging

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

# Crear la aplicación FastAPI
app = FastAPI(
    title=settings.app_name,
    description="API para gestión de usuarios, auditoría y correos electrónicos - ByteDental",
    version="2.0.0"
)

# Debug: Configuración CORS para depurar problema de producción
print(f"🐛 [CORS DEBUG] Frontend URL desde config: {settings.frontend_url}")
print(f"🐛 [CORS DEBUG] Todas las variables de entorno relacionadas con URL:")
import os
for key, value in os.environ.items():
    if 'FRONTEND' in key or 'URL' in key:
        print(f"  {key}: {value}")

# Lista de orígenes permitidos
allowed_origins = [
    settings.frontend_url, 
    "http://localhost:8000", 
    "http://localhost:5173",
    "https://bytedental-dev-front.onrender.com",
    "https://bytedental-staging-front.onrender.com"
]

print(f"🐛 [CORS DEBUG] Origins configurados: {allowed_origins}")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoint de debug para verificar CORS
@app.get("/debug/cors")
def debug_cors():
    return {
        "message": "CORS funcionando correctamente",
        "frontend_url": settings.frontend_url,
        "allowed_origins": [
            settings.frontend_url, 
            "http://localhost:8000", 
            "http://localhost:5173",
            "https://bytedental-dev-front.onrender.com",
            "https://bytedental-staging-front.onrender.com"
        ],
        "status": "ok"
    }

# Incluir routers
app.include_router(email_router.router, prefix="/api")
app.include_router(otp_router.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(auditoria.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(persons.router, prefix="/api")
app.include_router(patients.router, prefix="/api")
app.include_router(guardians.router, prefix="/api")
app.include_router(dental_services.router, prefix="/api")

# Crear tablas si no existen
Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
