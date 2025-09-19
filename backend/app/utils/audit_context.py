from fastapi import Request
from typing import Optional, Tuple

def get_user_context(request: Request) -> Tuple[Optional[str], Optional[str]]:
    """
    Extraer información del usuario para auditoría desde la request
    
    Args:
        request: FastAPI Request object
        
    Returns:
        Tuple (user_id, user_ip)
    """
    # Extraer user_id desde headers o auth context
    # Por ahora retornamos valores por defecto, se puede expandir según la autenticación
    user_id = None
    
    # Intentar obtener user_id desde headers
    if hasattr(request, 'headers'):
        user_id = request.headers.get('X-User-ID') or request.headers.get('Authorization')
    
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
    
    return user_id or "anonymous", user_ip or "unknown"

def get_audit_context(request: Request) -> dict:
    """
    Obtener contexto completo para auditoría
    
    Returns:
        Dict con user_id, user_ip y metadata adicional
    """
    user_id, user_ip = get_user_context(request)
    
    return {
        'user_id': user_id,
        'user_ip': user_ip,
        'user_agent': request.headers.get('User-Agent', 'unknown'),
        'endpoint': str(request.url.path),
        'method': request.method
    }