import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jinja2 import Environment, FileSystemLoader
import os
from typing import List, Optional
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
from app.config import settings
from app.models.email_models import EmailType

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.smtp_host = settings.smtp_host
        self.smtp_port = settings.smtp_port
        self.smtp_username = settings.smtp_username
        self.smtp_password = settings.smtp_password
        self.smtp_tls = settings.smtp_tls
        self.smtp_ssl = settings.smtp_ssl
        self.from_email = settings.from_email
        self.from_name = settings.from_name
        
        # Configurar Jinja2 para templates
        template_dir = os.path.join(os.path.dirname(__file__), "..", "templates")
        self.jinja_env = Environment(loader=FileSystemLoader(template_dir))

    async def send_email(
        self,
        to_email: str,
        subject: str,
        body: str,
        is_html: bool = False,
        template_name: Optional[str] = None,
        template_data: Optional[dict] = None
    ) -> bool:
        try:
            # Crear el mensaje
            message = MIMEMultipart("related")
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email
            message["Subject"] = subject
            
            # Si no se especifica template pero se está enviando HTML, usar template general
            if not template_name and is_html:
                template_name = "general_email.html"
                # Asegurar que template_data contenga el body original como message_body
                if not template_data:
                    template_data = {}
                template_data.update({
                    "app_name": settings.app_name,
                    "subject": subject,
                    "message_body": body  # El body original se pasa como message_body
                })
            
            # Si se especifica un template, usarlo
            if template_name and template_data:
                try:
                    template = self.jinja_env.get_template(template_name)
                    rendered_body = template.render(**template_data)
                    is_html = True
                    # Usar el body renderizado del template
                    body = rendered_body
                except Exception as e:
                    logger.error(f"Error renderizando template {template_name}: {e}")
                    # Usar el body original si falla el template
            
            # Agregar el contenido
            # Crear contenedor para el contenido del mensaje
            msg_alternative = MIMEMultipart("alternative")
            
            if is_html:
                html_part = MIMEText(body, "html")
                msg_alternative.attach(html_part)
            else:
                text_part = MIMEText(body, "plain")
                msg_alternative.attach(text_part)
            
            message.attach(msg_alternative)
            
            # Enviar el email
            success = await self._send_message(message)
            if success:
                logger.info(f"Email enviado exitosamente a {to_email}")
                return True
            else:
                logger.error(f"Error enviando email a {to_email}")
                return False
            
        except Exception as e:
            logger.error(f"Error enviando email a {to_email}: {e}")
            return False
    
    async def send_welcome_email(
        self,
        to_email: str,
        user_name: str
    ) -> bool:
        """
        Envía email de bienvenida usando el template moderno
        """
        template_data = {
            "app_name": settings.app_name,
            "subject": "¡Bienvenido a ByteDental!",
            "message_body": f"""
                <h2 style="color: #2B5797; margin-bottom: 20px;">¡Hola {user_name}!</h2>
                <p>¡Bienvenido a <strong>ByteDental</strong>! Estamos emocionados de tenerte como parte de nuestra familia dental.</p>
                <p>En ByteDental, combinamos la tecnología más avanzada con el cuidado personalizado para brindarte la mejor experiencia dental posible.</p>
            """,
            "features": [
                "🦷 Tecnología dental de vanguardia",
                "👨‍⚕️ Equipo de profesionales especializados", 
                "📱 Plataforma digital moderna y fácil de usar",
                "🕒 Horarios flexibles adaptados a tu rutina",
                "💎 Tratamientos personalizados para cada paciente"
            ],
            "cta_text": "Explorar Servicios",
            "cta_url": f"{settings.frontend_url}/services"
        }
        
        return await self.send_email(
            to_email=to_email,
            subject="¡Bienvenido a ByteDental! 🦷✨",
            body="",  # El body se generará desde el template
            template_name="general_email.html",
            template_data=template_data
        )
    
    def _send_message_sync(self, message: MIMEMultipart) -> bool:
        """
        Método sincrónico para enviar email usando smtplib estándar
        """
        try:
            server = smtplib.SMTP(self.smtp_host, self.smtp_port)
            
            if self.smtp_tls:
                server.starttls()
            
            # Autenticación
            if self.smtp_username and self.smtp_password:
                server.login(self.smtp_username, self.smtp_password)
            
            # Enviar mensaje
            text = message.as_string()
            server.sendmail(
                self.from_email,
                message['To'],
                text
            )
            
            # Cerrar conexión
            server.quit()
            
            logger.info(f"Email enviado exitosamente a {message['To']}")
            return True
            
        except Exception as e:
            logger.error(f"Error enviando email: {e}")
            return False

    async def _send_message(self, message: MIMEMultipart) -> bool:
        """
        Método asíncrono que ejecuta el envío en un hilo separado
        """
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor() as executor:
            result = await loop.run_in_executor(
                executor, 
                self._send_message_sync, 
                message
            )
            return result

email_service = EmailService()
