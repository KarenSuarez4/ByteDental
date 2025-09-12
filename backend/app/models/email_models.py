from pydantic import BaseModel, EmailStr
from typing import Optional
from enum import Enum

class EmailType(str, Enum):
    WELCOME = "welcome"
    GENERAL = "general"

class EmailRequest(BaseModel):
    to_email: EmailStr
    subject: str
    body: str
    email_type: EmailType = EmailType.GENERAL
    template_data: Optional[dict] = None

class EmailResponse(BaseModel):
    success: bool
    message: str
    email_id: Optional[str] = None
