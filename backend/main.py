from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import email_router, otp_router, users, auditoria, auth, patients, guardians, persons, dental_services, clinical_histories
from app.config import settings
from app.database import engine, Base  # Asegúrate de importar Base y engine
from app.routers import reports
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

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url, 
        "http://localhost:8000", 
        "http://localhost:5173",
        "https://bytedental-dev-front.onrender.com",
        "https://bytedental-staging-front.onrender.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
app.include_router(clinical_histories.router, prefix="/api/clinical-histories")
app.include_router(reports.router, prefix="/reports", tags=["reports"])


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
