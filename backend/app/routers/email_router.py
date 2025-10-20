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
