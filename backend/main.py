from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import email_router, otp_router, users, auditoria, auth
from app.config import settings
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
        "http://localhost:3000", 
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

@app.get("/health")
async def health_check():
    return {
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
