from sqlalchemy import Column, Integer, String, Text, DateTime
from app.database import Base

class ActivityReport(Base):
    __tablename__ = "activity_reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(Integer, nullable=False)
    dental_service_id = Column(Integer, nullable=False)
    treatment_date = Column(DateTime, nullable=False)
    notes = Column(Text, nullable=True)

class MonthlyActivityReport(Base):
    __tablename__ = "monthly_activity_reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    month = Column(String(20), nullable=False)
    year = Column(Integer, nullable=False)
    total_activities = Column(Integer, nullable=False)
    total_revenue = Column(Integer, nullable=False)