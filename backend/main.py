from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from app.routers import email_router, otp_router, users, auditoria, auth, patients, guardians, persons
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

# Crear tablas si no existen
Base.metadata.create_all(bind=engine)

@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    # Verificación básica del sistema
    health_status = {
        "status": "healthy",
        "app_name": settings.app_name,
        "version": "2.0.0",
        "features": [
            "gestión de usuarios",
            "sistema de roles",
            "auditoría completa",
            "integración Firebase",
            "base de datos PostgreSQL"
        ]
    }
    
    # Verificar la conexión a la base de datos
    try:
        result = db.execute(text("SELECT 1")).fetchone()
        db_connected = result is not None and result[0] == 1
        health_status["database"] = {
            "connected": db_connected,
            "status": "ok" if db_connected else "error"
        }
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["database"] = {
            "connected": False,
            "status": "error",
            "error_message": str(e)
        }
        logging.error(f"Error de conexión a la base de datos: {str(e)}")
    
    return health_status

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
