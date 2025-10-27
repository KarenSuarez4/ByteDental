"""
Servicio para el dashboard del sistema odontológico
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract, case
from datetime import datetime
import logging
from typing import List, Dict

from ..models.patient_models import Patient
from ..models.clinical_history_models import ClinicalHistory
from ..models.treatment_models import Treatment
from ..models.user_models import User
from ..models.rol_models import Role
from ..models.dental_service_models import DentalService

logger = logging.getLogger(__name__)


class DashboardService:
    """Servicio para obtener estadísticas del dashboard"""
    
    @staticmethod
    def get_active_patients_stats(db: Session) -> dict:
        """
        Obtiene estadísticas de pacientes activos
        
        Returns:
            dict: {
                "total_active_patients": int,  # Total de pacientes activos
                "active_patients_month": int   # Pacientes activos con atención este mes
            }
        """
        try:
            # Total de pacientes activos
            total_active_patients = db.query(func.count(Patient.id)).filter(
                Patient.is_active == True
            ).scalar()
            
            # Pacientes activos con atención en el mes actual
            current_year = datetime.now().year
            current_month = datetime.now().month
            
            active_patients_month = db.query(func.count(func.distinct(Patient.id))).join(
                ClinicalHistory, Patient.id == ClinicalHistory.patient_id
            ).join(
                Treatment, ClinicalHistory.id == Treatment.clinical_history_id
            ).filter(
                and_(
                    Patient.is_active == True,
                    extract('year', Treatment.treatment_date) == current_year,
                    extract('month', Treatment.treatment_date) == current_month
                )
            ).scalar()
            
            logger.info(f"Estadísticas de pacientes activos obtenidas: total={total_active_patients}, mes_actual={active_patients_month}")
            
            return {
                "total_active_patients": total_active_patients or 0,
                "active_patients_month": active_patients_month or 0
            }
            
        except Exception as e:
            logger.error(f"Error obteniendo estadísticas de pacientes activos: {e}")
            raise Exception(f"Error obteniendo estadísticas de pacientes activos: {str(e)}")
    
    @staticmethod
    def get_employees_by_role_stats(db: Session) -> dict:
        """
        Obtiene estadísticas de empleados activos agrupados por rol
        
        Returns:
            dict: {
                "total_general": int,
                "detail_by_role": [
                    {"role": "Administrator", "total": 2},
                    {"role": "Doctor", "total": 6},
                    {"role": "Asistente", "total": 4},
                    {"role": "Auditor", "total": 1}
                ]
            }
        """
        try:
            # Obtener el total general de empleados activos
            total_general = db.query(func.count(User.uid)).filter(
                User.is_active == True
            ).scalar()
            
            # Obtener empleados activos agrupados por rol
            employees_by_role = db.query(
                Role.name.label('role'),
                func.count(User.uid).label('total')
            ).join(
                User, Role.id == User.role_id
            ).filter(
                User.is_active == True
            ).group_by(
                Role.name
            ).order_by(
                Role.name
            ).all()
            
            # Construir la respuesta
            detail_by_role = [
                {"role": row.role, "total": row.total}
                for row in employees_by_role
            ]
            
            logger.info(f"Estadísticas de empleados obtenidas: total_general={total_general}, roles={len(detail_by_role)}")
            
            return {
                "total_general": total_general or 0,
                "detail_by_role": detail_by_role
            }
            
        except Exception as e:
            logger.error(f"Error obteniendo estadísticas de empleados por rol: {e}")
            raise Exception(f"Error obteniendo estadísticas de empleados por rol: {str(e)}")
    
    @staticmethod
    def get_procedures_distribution(db: Session) -> dict:
        """
        Obtiene la distribución de procedimientos realizados con cantidad y porcentaje
        
        Usa función de ventana (OVER) para calcular porcentajes en una sola consulta SQL.
        
        SQL equivalente:
        SELECT 
            ds.name AS procedimiento,
            COUNT(t.id) AS cantidad,
            ROUND((COUNT(t.id) * 100.0 / SUM(COUNT(t.id)) OVER ()), 2) AS porcentaje
        FROM treatments t
        JOIN dental_service ds ON t.dental_service_id = ds.id
        GROUP BY ds.name
        ORDER BY cantidad DESC;
        
        Returns:
            dict: {
                "total_procedures": int,
                "distribution": [
                    {
                        "procedure": "Limpieza dental",
                        "quantity": 45,
                        "percentage": 25.5
                    },
                    ...
                ]
            }
        """
        try:
            # Calcular el total de tratamientos primero
            total_treatments = db.query(func.count(Treatment.id)).filter(
                Treatment.dental_service_id.isnot(None)
            ).scalar() or 0
            
            if total_treatments == 0:
                logger.info("No hay tratamientos registrados con servicios dentales")
                return {
                    "total_procedures": 0,
                    "distribution": []
                }
            
            # Usar función de ventana para calcular porcentajes en una sola query
            # COUNT(t.id) * 100.0 / SUM(COUNT(t.id)) OVER ()
            count_column = func.count(Treatment.id).label('quantity')
            total_over_window = func.sum(func.count(Treatment.id)).over()
            percentage_column = func.round(
                (func.count(Treatment.id) * 100.0 / total_over_window),
                2
            ).label('percentage')
            
            procedures_query = db.query(
                DentalService.name.label('procedure'),
                count_column,
                percentage_column
            ).join(
                Treatment, DentalService.id == Treatment.dental_service_id
            ).group_by(
                DentalService.name
            ).order_by(
                count_column.desc()  # Ordenar por cantidad descendente
            ).all()
            
            # Construir la respuesta
            distribution = [
                {
                    "procedure": row.procedure,
                    "quantity": row.quantity,
                    "percentage": float(row.percentage)
                }
                for row in procedures_query
            ]
            
            logger.info(f"Distribución de procedimientos obtenida: total={total_treatments}, tipos={len(distribution)}")
            
            return {
                "total_procedures": total_treatments,
                "distribution": distribution
            }
            
        except Exception as e:
            logger.error(f"Error obteniendo distribución de procedimientos: {e}")
            raise Exception(f"Error obteniendo distribución de procedimientos: {str(e)}")
    
    @staticmethod
    def get_procedures_by_doctor(db: Session) -> list:
        """
        Obtiene los procedimientos realizados por cada doctor activo con percentage
        
        Usa función de ventana (OVER) para calcular porcentajes en una sola consulta SQL.
        
        SQL equivalente:
        SELECT 
            CONCAT(u.first_name, ' ', u.last_name) AS doctor,
            COUNT(t.id) AS total_procedures,
            ROUND((COUNT(t.id) * 100.0 / NULLIF(SUM(COUNT(t.id)) OVER (), 0)), 2) AS percentage
        FROM users u
        LEFT JOIN treatments t ON t.doctor_id = u.uid
        JOIN roles r ON u.role_id = r.id
        WHERE r.name = 'Doctor' AND u.is_active = true
        GROUP BY doctor
        ORDER BY total_procedures DESC;
        
        Returns:
            list: [
                {
                    "doctor": "Carlos López",
                    "total_procedures": 45,
                    "percentage": 30.0
                },
                ...
            ]
        """
        try:
            # Construir el nombre completo del doctor
            doctor_name = func.concat(User.first_name, ' ', User.last_name).label('doctor')
            
            # Contar tratamientos
            count_treatments = func.count(Treatment.id).label('total_procedures')
            
            # Calcular porcentaje usando función de ventana con NULLIF para evitar división por 0
            total_over_window = func.sum(func.count(Treatment.id)).over()
            percentage_column = func.round(
                (func.count(Treatment.id) * 100.0 / func.nullif(total_over_window, 0)),
                2
            ).label('percentage')
            
            # Ejecutar query
            doctors_query = db.query(
                doctor_name,
                count_treatments,
                percentage_column
            ).outerjoin(
                Treatment, Treatment.doctor_id == User.uid
            ).join(
                Role, User.role_id == Role.id
            ).filter(
                Role.name == 'Doctor',
                User.is_active == True
            ).group_by(
                doctor_name
            ).order_by(
                count_treatments.desc()
            ).all()
            
            # Construir la respuesta
            procedures_by_doctor = [
                {
                    "doctor": row.doctor,
                    "total_procedures": row.total_procedures,
                    "percentage": float(row.percentage) if row.percentage is not None else 0.0
                }
                for row in doctors_query
            ]
            
            logger.info(f"Procedimientos por doctor obtenidos: {len(procedures_by_doctor)} doctores activos")
            
            return procedures_by_doctor
            
        except Exception as e:
            logger.error(f"Error obteniendo procedimientos por doctor: {e}")
            raise Exception(f"Error obteniendo procedimientos por doctor: {str(e)}")
    
    @staticmethod
    def get_treatments_per_month(db: Session) -> list:
        """
        Obtiene el total de tratamientos por mes durante los últimos 12 meses
        
        Genera una serie de los últimos 12 meses e incluye meses sin tratamientos con valor 0.
        
        SQL equivalente:
        WITH meses AS (
            SELECT 
                TO_CHAR(generate_series(
                    date_trunc('month', NOW()) - INTERVAL '11 months', 
                    date_trunc('month', NOW()), 
                    interval '1 month'
                ), 'YYYY-MM') AS mes
        )
        SELECT 
            m.mes,
            COALESCE(COUNT(t.id), 0) AS total_tratamientos
        FROM meses m
        LEFT JOIN treatments t ON TO_CHAR(t.treatment_date, 'YYYY-MM') = m.mes
        GROUP BY m.mes
        ORDER BY m.mes;
        
        Returns:
            list: [
                {"month": "2024-11", "total_treatments": 15},
                {"month": "2024-12", "total_treatments": 23},
                {"month": "2025-01", "total_treatments": 18},
                ...
            ]
        """
        try:
            from sqlalchemy import text
            from datetime import datetime, timedelta
            from dateutil.relativedelta import relativedelta
            
            # Calcular el rango de los últimos 12 meses
            current_date = datetime.now()
            # Primer día del mes actual
            end_month = current_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            # Primer día del mes hace 11 meses
            start_month = end_month - relativedelta(months=11)
            
            # Generar lista de los últimos 12 meses
            months_list = []
            current_month = start_month
            while current_month <= end_month:
                months_list.append(current_month.strftime('%Y-%m'))
                current_month += relativedelta(months=1)
            
            # Obtener tratamientos agrupados por mes
            # Usar func.to_char para PostgreSQL o func.strftime para SQLite
            try:
                # Intentar con PostgreSQL (to_char)
                treatments_by_month = db.query(
                    func.to_char(Treatment.treatment_date, 'YYYY-MM').label('month'),
                    func.count(Treatment.id).label('total')
                ).filter(
                    Treatment.treatment_date >= start_month,
                    Treatment.treatment_date < end_month + relativedelta(months=1)
                ).group_by(
                    func.to_char(Treatment.treatment_date, 'YYYY-MM')
                ).all()
            except Exception:
                # Fallback para SQLite (strftime)
                treatments_by_month = db.query(
                    func.strftime('%Y-%m', Treatment.treatment_date).label('month'),
                    func.count(Treatment.id).label('total')
                ).filter(
                    Treatment.treatment_date >= start_month,
                    Treatment.treatment_date < end_month + relativedelta(months=1)
                ).group_by(
                    func.strftime('%Y-%m', Treatment.treatment_date)
                ).all()
            
            # Convertir a diccionario para búsqueda rápida
            treatments_dict = {row.month: row.total for row in treatments_by_month}
            
            # Construir la respuesta incluyendo todos los meses (con 0 si no hay datos)
            result = [
                {
                    "month": month,
                    "total_treatments": treatments_dict.get(month, 0)
                }
                for month in months_list
            ]
            
            logger.info(f"Tratamientos por mes obtenidos: {len(result)} meses, total={sum(item['total_treatments'] for item in result)}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error obteniendo tratamientos por mes: {e}")
            raise Exception(f"Error obteniendo tratamientos por mes: {str(e)}")
