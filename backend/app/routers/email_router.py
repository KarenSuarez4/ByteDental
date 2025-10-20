from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.models.email_models import (
    EmailRequest, 
    EmailResponse
)
from app.services.email_service import email_service
from app.config import settings
import logging
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/email", tags=["Email"])

@router.get("/config-check")
async def check_email_config():
    """
    🔍 Endpoint de debug para verificar configuración de email en producción
    ⚠️ ELIMINAR ANTES DE PRODUCCIÓN FINAL
    """
    return {
        "use_sendgrid": settings.use_sendgrid,
        "has_sendgrid_key": bool(settings.sendgrid_api_key),
        "sendgrid_key_length": len(settings.sendgrid_api_key) if settings.sendgrid_api_key else 0,
        "from_email": settings.from_email,
        "from_name": settings.from_name,
        "app_name": settings.app_name,
        "frontend_url": settings.frontend_url,
        "smtp_host": settings.smtp_host,
        "smtp_port": settings.smtp_port,
        "has_smtp_username": bool(settings.smtp_username),
        "has_smtp_password": bool(settings.smtp_password)
    }

@router.post("/send", response_model=EmailResponse)
async def send_email(email_request: EmailRequest, background_tasks: BackgroundTasks):
    """
    Envía un email individual
    """
    try:
        email_id = str(uuid.uuid4())
        
        # Ejecutar en background para no bloquear la respuesta
        background_tasks.add_task(
            email_service.send_email,
            to_email=email_request.to_email,
            subject=email_request.subject,
            body=email_request.body,
            is_html=True,
            template_data=email_request.template_data
        )
        
        logger.info(f"Email programado para envío: {email_request.to_email}")
        
        return EmailResponse(
            success=True,
            message="Email programado para envío exitosamente",
            email_id=email_id
        )
        
    except Exception as e:
        logger.error(f"Error programando email: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
