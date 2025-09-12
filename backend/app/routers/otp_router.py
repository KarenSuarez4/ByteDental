from fastapi import APIRouter, HTTPException
from app.models.otp_models import OTPRequest, OTPVerification, OTPResponse
from app.services.otp_service import otp_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/otp", tags=["OTP"])

@router.post("/send-otp", response_model=OTPResponse)
async def send_otp(request: OTPRequest):
    """
    Envía un código OTP al email especificado
    """
    try:
        result = await otp_service.send_otp_email(request.email)
        
        if not result.success:
            raise HTTPException(status_code=400, detail=result.message)
        
        return result
        
    except Exception as e:
        logger.error(f"Error en endpoint send-otp: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.post("/verify-otp", response_model=OTPResponse)
async def verify_otp(request: OTPVerification):
    """
    Verifica un código OTP
    """
    try:
        result = otp_service.verify_otp_code(request.email, request.otp_code)
        
        if not result.success:
            raise HTTPException(status_code=400, detail=result.message)
        
        return result
        
    except Exception as e:
        logger.error(f"Error en endpoint verify-otp: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.get("/otp-status/{email}")
async def get_otp_status(email: str):
    """
    Obtiene el estado de un OTP para un email específico
    """
    try:
        status = otp_service.get_otp_status(email)
        return status
        
    except Exception as e:
        logger.error(f"Error en endpoint otp-status: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
