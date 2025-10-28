# app/routers/reports.py
from fastapi import APIRouter, Depends, Request, Response, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from app.database import get_db
from app.schemas.report_schema import ActivityReportFilters, MonthlyReportFilters
from app.services.report_service import ReportService
from app.utils.pdf_generator import generate_activity_pdf, generate_monthly_pdf
from app.middleware.auth_middleware import get_current_admin_user as require_admin
from app.models.user_models import User

router = APIRouter(
    prefix="/reports",
    tags=["reports"],
    dependencies=[Depends(require_admin)]
)

@router.post("/activities")
def get_activities_report(
    filters: ActivityReportFilters,
    response: Response,
    format: str = "json",
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    admin_full_name = f"{current_admin.first_name} {current_admin.last_name}"
    """Generates activity report (JSON or PDF)."""
    service = ReportService(db)
    report_data = service.generate_activity_report(
        filters.start_date,
        filters.end_date,
        generated_by=admin_full_name
    )    

    # PDF output
    if format.lower() == "pdf":
        pdf_bytes = generate_activity_pdf(report_data)
        response.headers["Content-Disposition"] = "attachment; filename=actividades.pdf"
        return Response(content=pdf_bytes, media_type="application/pdf")

    # JSON output
    return report_data



@router.post("/monthly")
async def get_monthly_report(
    request: Request,
    filters: MonthlyReportFilters,
    response: Response,
    format: str = "json",
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    """
    Generates monthly report in JSON or PDF format.
    Only accessible by admin users.
    """
    service = ReportService(db)
    
    # Use the current_admin parameter that was injected by the dependency
    admin_full_name = f"{current_admin.first_name} {current_admin.last_name}"
    
    report_data = service.generate_monthly_report(
        filters.report_date or datetime.now(),
        generated_by=admin_full_name
    )

    if format.lower() == "pdf":
        pdf_bytes = generate_monthly_pdf(report_data)
        response.headers["Content-Disposition"] = "attachment; filename=reporte_mensual.pdf"
        return Response(content=pdf_bytes, media_type="application/pdf")

    return report_data