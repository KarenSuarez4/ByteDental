from fastapi import Request, Depends
from sqlalchemy.orm import Session
from typing import Optional, Tuple
from app.database import get_db
from app.middleware.auth_middleware import get_current_user_from_header

def get_user_context(request: Request, db: Session = Depends(get_db)) -> Tuple[Optional[int], str]:
    """
    Extraer información del usuario para auditoría desde la request
    
    Args:
        request: FastAPI Request object
        db: Database session
        
    Returns:
        Tuple (user_id, user_ip)
    """
    # Intentar obtener usuario autenticado
    user_id = None
    try:
        user = get_current_user_from_header(request, db)
        # Usar uid si existe, sino id, sino None
        user_id = getattr(user, 'uid', None) if user else None
        if not user_id and user:
            user_id = getattr(user, 'id', None)
    except Exception:
        # Si no se puede obtener el usuario, continuar con None
        pass
    
    # Extraer IP del cliente
    user_ip = None
    if hasattr(request, 'client') and request.client:
        user_ip = request.client.host
    
    # Alternativamente, verificar headers de proxy
    if not user_ip and hasattr(request, 'headers'):
        user_ip = (
            request.headers.get('X-Forwarded-For', '').split(',')[0].strip() or
            request.headers.get('X-Real-IP') or
            request.headers.get('CF-Connecting-IP') or
            'unknown'
        )
    
    return user_id, user_ip or "unknown"

def get_audit_context(request: Request, db: Session = Depends(get_db)) -> dict:
    """
    Obtener contexto completo para auditoría
    
    Returns:
        Dict con user_id, user_ip y metadata adicional
    """
    user_id, user_ip = get_user_context(request, db)
    
    return {
        'user_id': user_id,
        'user_ip': user_ip,
        'user_agent': request.headers.get('User-Agent', 'unknown'),
        'endpoint': str(request.url.path),
        'method': request.method
    }