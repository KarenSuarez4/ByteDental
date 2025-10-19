import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jinja2 import Environment, FileSystemLoader
import os
from typing import Optional
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
from app.config import settings

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
        
        # Debug: Imprimir configuración SMTP (sin contraseñas)
        print(f"🐛 [EMAIL SERVICE] Configuración SMTP:")
        print(f"  Host: {self.smtp_host}")
        print(f"  Port: {self.smtp_port}")
        print(f"  Username: {self.smtp_username}")
        print(f"  Password: {self.smtp_password}")
        print(f"  TLS: {self.smtp_tls}")
        print(f"  SSL: {self.smtp_ssl}")
        print(f"  From Email: {self.from_email}")
        print(f"  From Name: {self.from_name}")
        
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
        user_name: str,
        temporal_password: str,
        role_name: str
    ) -> bool:
        template_data = {
            "app_name": settings.app_name,
            "subject": "¡Bienvenido a ByteDental! - Credenciales de acceso",
            "message_body": f"""
                <h2 style="color: #2B5797; margin-bottom: 20px;">¡Hola {user_name}!</h2>
                <p>¡Bienvenido a <strong>ByteDental</strong>! Tu cuenta ha sido creada exitosamente.</p>
                
                <div style="background: #f8f9fa; border-radius: 10px; padding: 20px; margin: 20px 0; border-left: 4px solid #2B5797;">
                    <h3 style="color: #2B5797; margin-top: 0;">🔐 Credenciales de acceso</h3>
                    <p><strong>Email:</strong> {to_email}</p>
                    <p><strong>Contraseña temporal:</strong> <code style="background: #e9ecef; padding: 5px 10px; border-radius: 5px; font-family: monospace;">{temporal_password}</code></p>
                    <p><strong>Rol asignado:</strong> {role_name}</p>
                </div>
                
                <div style="background: #fff3cd; border-radius: 10px; padding: 15px; margin: 20px 0; border-left: 4px solid #ffc107;">
                    <h4 style="color: #856404; margin-top: 0;">⚠️ Importante</h4>
                    <p style="color: #856404; margin-bottom: 0;">Por seguridad, <strong>debes cambiar tu contraseña</strong> en el primer inicio de sesión.</p>
                </div>
                
                <p>Puedes acceder al sistema haciendo clic en el botón de abajo:</p>
            """,
            "cta_text": "Iniciar Sesión",
            "cta_url": f"{settings.frontend_url}/login"
        }
        
        return await self.send_email(
            to_email=to_email,
            subject="¡Bienvenido a ByteDental! - Credenciales de acceso 🦷🔐",
            body="",  # El body se generará desde el template
            template_name="general_email.html",
            template_data=template_data
        )
    
    def _send_message_sync(self, message: MIMEMultipart) -> bool:
        """
        Método sincrónico para enviar email usando smtplib estándar
        """
        server = None
        try:
            print(f"🐛 [EMAIL] Iniciando envío de email a {message['To']}")
            print(f"🐛 [EMAIL] Conectando a {self.smtp_host}:{self.smtp_port}")
            print(f"🐛 [EMAIL] Modo: {'SSL' if self.smtp_ssl else 'TLS' if self.smtp_tls else 'Plain'}")
            
            # Validar configuración básica
            if not self.smtp_username or not self.smtp_password:
                print(f"❌ [EMAIL] Credenciales SMTP no configuradas")
                return False
            
            if not self.from_email:
                print(f"❌ [EMAIL] Email remitente no configurado")
                return False
            
            # Conectar según el modo SSL o TLS
            if self.smtp_ssl:
                # Para puerto 465 (SSL directo)
                print(f"🔒 [EMAIL] Usando SMTP_SSL para puerto {self.smtp_port}")
                server = smtplib.SMTP_SSL(self.smtp_host, self.smtp_port, timeout=30)
                print(f"✅ [EMAIL] Conexión SMTP_SSL establecida")
            else:
                # Para puerto 587 (TLS) o 25 (Plain)
                print(f"🔓 [EMAIL] Usando SMTP para puerto {self.smtp_port}")
                server = smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=30)
                print(f"✅ [EMAIL] Conexión SMTP establecida")
                
                if self.smtp_tls:
                    print(f"🔒 [EMAIL] Iniciando STARTTLS...")
                    server.starttls()
                    print(f"✅ [EMAIL] TLS habilitado")
            
            # Autenticación
            if self.smtp_username and self.smtp_password:
                print(f"🔐 [EMAIL] Autenticando con usuario: {self.smtp_username}")
                server.login(self.smtp_username, self.smtp_password)
                print(f"✅ [EMAIL] Autenticación exitosa")
            
            # Enviar mensaje
            print(f"📤 [EMAIL] Enviando mensaje...")
            text = message.as_string()
            server.sendmail(
                self.from_email,
                message['To'],
                text
            )
            
            # Cerrar conexión
            server.quit()
            print(f"✅ [EMAIL] Email enviado exitosamente a {message['To']}")
            
            logger.info(f"Email enviado exitosamente a {message['To']}")
            return True
            
        except smtplib.SMTPAuthenticationError as e:
            print(f"❌ [EMAIL] Error de autenticación SMTP: {e}")
            logger.error(f"Error de autenticación SMTP: {e}")
            return False
        except smtplib.SMTPRecipientsRefused as e:
            print(f"❌ [EMAIL] Destinatario rechazado: {e}")
            logger.error(f"Destinatario rechazado: {e}")
            return False
        except smtplib.SMTPServerDisconnected as e:
            print(f"❌ [EMAIL] Servidor SMTP desconectado: {e}")
            logger.error(f"Servidor SMTP desconectado: {e}")
            return False
        except OSError as e:
            print(f"❌ [EMAIL] Error de red/OS: {e}")
            print(f"💡 [EMAIL] Sugerencia: El puerto {self.smtp_port} puede estar bloqueado por el firewall/hosting")
            print(f"💡 [EMAIL] Intenta usar puerto 465 (SSL) o un servicio de email como SendGrid/Resend")
            logger.error(f"Error de red enviando email: {e}")
            return False
        except Exception as e:
            print(f"❌ [EMAIL] Error general enviando email: {e}")
            logger.error(f"Error enviando email: {e}")
            return False
        finally:
            # Asegurar que el servidor se cierre
            if server:
                try:
                    server.quit()
                except:
                    pass

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
