from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
from decimal import Decimal

class ActivityReportFilters(BaseModel):
    start_date: datetime
    end_date: datetime

class MonthlyReportFilters(BaseModel):
    report_date: Optional[datetime] = None  

class TreatmentActivityDetail(BaseModel):
    treatment_date: datetime
    patient_name: str
    document_number: str
    phone: str
    procedure_name: str
    doctor_name: str

class ActivityReport(BaseModel):
    start_date: datetime
    end_date: datetime
    generated_by: str
    activities: List[TreatmentActivityDetail]
    total_activities: int

class ProcedureSummary(BaseModel):
    procedure_name: str
    patient_count: int

class MonthlyReport(BaseModel):
    generated_by: str
    month: int
    year: int
    start_date: datetime
    end_date: datetime
    procedures: List[ProcedureSummary]
    total_patients: int
