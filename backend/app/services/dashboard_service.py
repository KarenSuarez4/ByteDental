"""
Servicio para el dashboard del sistema odontológico
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract, case
from datetime import datetime, date
import logging
from typing import List, Dict, Optional

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
    def get_active_patients_stats(
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        doctor_id: Optional[str] = None
    ) -> dict:
        """
        Obtiene estadísticas de pacientes activos
        
        Args:
            db: Sesión de base de datos
            start_date: Fecha de inicio para filtrar (opcional). Si solo se proporciona esta, filtra desde esta fecha hasta hoy
            end_date: Fecha de fin para filtrar (opcional). Si solo se proporciona esta, filtra desde el inicio hasta esta fecha
            doctor_id: UID del doctor para filtrar pacientes atendidos (opcional)
        
        Lógica de filtros:
            - start_date solo: Filtra desde start_date hasta hoy
            - end_date solo: Filtra desde el inicio hasta end_date
            - Ambos: Filtra el rango específico
            - Ninguno: Mes actual por defecto
        
        Returns:
            dict: {
                "total_active_patients": int,  # Total de pacientes activos
                "active_patients_period": int  # Pacientes activos con atención en el período
            }
        """
        try:
            # Total de pacientes activos (no filtrado)
            total_active_patients = db.query(func.count(Patient.id)).filter(
                Patient.is_active == True
            ).scalar()
            
            # Construir query para pacientes activos con atención
            query = db.query(func.count(func.distinct(Patient.id))).join(
                ClinicalHistory, Patient.id == ClinicalHistory.patient_id
            ).join(
                Treatment, ClinicalHistory.id == Treatment.clinical_history_id
            ).filter(
                Patient.is_active == True
            )
            
            # Aplicar filtros de fecha con lógica flexible
            if start_date or end_date:
                # Si se proporciona al menos una fecha, aplicar filtros parciales
                if start_date:
                    query = query.filter(Treatment.treatment_date >= start_date)
                if end_date:
                    query = query.filter(Treatment.treatment_date <= end_date)
            else:
                # Default: mes actual (solo si no se especifica ninguna fecha)
                current_year = datetime.now().year
                current_month = datetime.now().month
                query = query.filter(
                    extract('year', Treatment.treatment_date) == current_year,
                    extract('month', Treatment.treatment_date) == current_month
                )
            
            # Aplicar filtro de doctor si se proporciona
            if doctor_id:
                query = query.filter(Treatment.doctor_id == doctor_id)
            
            active_patients_period = query.scalar()
            
            logger.info(f"Estadísticas de pacientes activos obtenidas: total={total_active_patients}, período={active_patients_period}")
            
            return {
                "total_active_patients": total_active_patients or 0,
                "active_patients_period": active_patients_period or 0
            }
            
        except Exception as e:
            logger.error(f"Error obteniendo estadísticas de pacientes activos: {e}")
            raise Exception(f"Error obteniendo estadísticas de pacientes activos: {str(e)}")
    
    @staticmethod
    def get_employees_by_role_stats(
        db: Session,
        role: Optional[str] = None,
        is_active: Optional[bool] = True
    ) -> dict:
        """
        Obtiene estadísticas de empleados agrupados por rol
        
        Args:
            db: Sesión de base de datos
            role: Filtrar por rol específico (opcional)
            is_active: Filtrar por estado activo/inactivo (default: True)
        
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
            # Construir query base
            base_filter_conditions = []
            
            # Aplicar filtro de estado activo
            if is_active is not None:
                base_filter_conditions.append(User.is_active == is_active)
            
            # Obtener el total general de empleados
            total_query = db.query(func.count(User.uid))
            if base_filter_conditions:
                total_query = total_query.filter(*base_filter_conditions)
            total_general = total_query.scalar()
            
            # Construir query para empleados agrupados por rol
            employees_query = db.query(
                Role.name.label('role'),
                func.count(User.uid).label('total')
            ).join(
                User, Role.id == User.role_id
            )
            
            # Aplicar filtros
            if base_filter_conditions:
                employees_query = employees_query.filter(*base_filter_conditions)
            
            # Filtrar por rol específico si se proporciona
            if role:
                employees_query = employees_query.filter(Role.name == role)
            
            employees_by_role = employees_query.group_by(
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
    def get_procedures_distribution(
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        doctor_id: Optional[str] = None,
        procedure_id: Optional[int] = None
    ) -> dict:
        """
        Obtiene la distribución de procedimientos realizados con cantidad y porcentaje
        
        Args:
            db: Sesión de base de datos
            start_date: Fecha de inicio para filtrar (opcional). Si solo se proporciona esta, filtra desde esta fecha hasta hoy
            end_date: Fecha de fin para filtrar (opcional). Si solo se proporciona esta, filtra desde el inicio hasta esta fecha
            doctor_id: UID del doctor para filtrar (opcional)
            procedure_id: ID del procedimiento dental para filtrar (opcional)
        
        Lógica de filtros:
            - start_date solo: Filtra desde start_date en adelante
            - end_date solo: Filtra hasta end_date
            - Ambos: Filtra el rango específico
            - Ninguno: Todos los procedimientos históricos
        
        Usa función de ventana (OVER) para calcular porcentajes en una sola consulta SQL.
        
        SQL equivalente:
        SELECT 
            ds.name AS procedimiento,
            COUNT(t.id) AS cantidad,
            ROUND((COUNT(t.id) * 100.0 / SUM(COUNT(t.id)) OVER ()), 2) AS porcentaje
        FROM treatments t
        JOIN dental_service ds ON t.dental_service_id = ds.id
        WHERE [filtros opcionales]
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
            # Construir query base con filtros
            base_query = db.query(Treatment).filter(
                Treatment.dental_service_id.isnot(None)
            )
            
            # Aplicar filtros de fecha
            if start_date:
                base_query = base_query.filter(Treatment.treatment_date >= start_date)
            if end_date:
                base_query = base_query.filter(Treatment.treatment_date <= end_date)
            
            # Aplicar filtro de doctor
            if doctor_id:
                base_query = base_query.filter(Treatment.doctor_id == doctor_id)
            
            # Aplicar filtro de procedimiento
            if procedure_id:
                base_query = base_query.filter(Treatment.dental_service_id == procedure_id)
            
            # Calcular el total de tratamientos con filtros aplicados
            total_treatments = base_query.count()
            
            if total_treatments == 0:
                logger.info("No hay tratamientos registrados con los filtros aplicados")
                return {
                    "total_procedures": 0,
                    "distribution": []
                }
            
            # Usar función de ventana para calcular porcentajes en una sola query
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
            )
            
            # Aplicar los mismos filtros
            if start_date:
                procedures_query = procedures_query.filter(Treatment.treatment_date >= start_date)
            if end_date:
                procedures_query = procedures_query.filter(Treatment.treatment_date <= end_date)
            if doctor_id:
                procedures_query = procedures_query.filter(Treatment.doctor_id == doctor_id)
            if procedure_id:
                procedures_query = procedures_query.filter(Treatment.dental_service_id == procedure_id)
            
            procedures_query = procedures_query.group_by(
                DentalService.name
            ).order_by(
                count_column.desc()
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
    def get_procedures_by_doctor(
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        procedure_id: Optional[int] = None
    ) -> list:
        """
        Obtiene los procedimientos realizados por cada doctor activo con porcentaje
        
        Args:
            db: Sesión de base de datos
            start_date: Fecha de inicio para filtrar (opcional). Si solo se proporciona esta, filtra desde esta fecha en adelante
            end_date: Fecha de fin para filtrar (opcional). Si solo se proporciona esta, filtra hasta esta fecha
            procedure_id: ID del procedimiento dental para filtrar (opcional)
        
        Lógica de filtros:
            - start_date solo: Filtra desde start_date en adelante
            - end_date solo: Filtra hasta end_date
            - Ambos: Filtra el rango específico
            - Ninguno: Todos los procedimientos históricos
        
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
          [AND t.treatment_date >= start_date]
          [AND t.treatment_date <= end_date]
          [AND t.dental_service_id = procedure_id]
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
            
            # Construir query base
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
            )
            
            # Crear subquery para aplicar filtros solo a los tratamientos
            # Esto es necesario para que el LEFT JOIN funcione correctamente con filtros
            if start_date or end_date or procedure_id:
                # Crear condiciones para el WHERE del LEFT JOIN
                treatment_conditions = []
                if start_date:
                    treatment_conditions.append(Treatment.treatment_date >= start_date)
                if end_date:
                    treatment_conditions.append(Treatment.treatment_date <= end_date)
                if procedure_id:
                    treatment_conditions.append(Treatment.dental_service_id == procedure_id)
                
                # Aplicar filtros en el ON clause del JOIN
                doctors_query = db.query(
                    doctor_name,
                    count_treatments,
                    percentage_column
                ).outerjoin(
                    Treatment,
                    and_(
                        Treatment.doctor_id == User.uid,
                        *treatment_conditions
                    )
                ).join(
                    Role, User.role_id == Role.id
                ).filter(
                    Role.name == 'Doctor',
                    User.is_active == True
                )
            
            doctors_query = doctors_query.group_by(
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
    def get_treatments_per_month(
        db: Session,
        year: Optional[int] = None,
        doctor_id: Optional[str] = None,
        procedure_id: Optional[int] = None
    ) -> list:
        """
        Obtiene el total de tratamientos por mes durante los últimos 12 meses o un año específico
        
        Args:
            db: Sesión de base de datos
            year: Año específico para filtrar (opcional, por defecto últimos 12 meses)
            doctor_id: UID del doctor para filtrar (opcional)
            procedure_id: ID del procedimiento dental para filtrar (opcional)
        
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
          [AND t.doctor_id = doctor_id]
          [AND t.dental_service_id = procedure_id]
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
            
            # Calcular el rango de fechas
            current_date = datetime.now()
            
            if year:
                # Si se proporciona un año, usar todos los meses de ese año
                start_month = datetime(year, 1, 1)
                end_month = datetime(year, 12, 1)
            else:
                # Por defecto: últimos 12 meses
                end_month = current_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                start_month = end_month - relativedelta(months=11)
            
            # Generar lista de meses
            months_list = []
            current_month = start_month
            while current_month <= end_month:
                months_list.append(current_month.strftime('%Y-%m'))
                current_month += relativedelta(months=1)
            
            # Construir query base para tratamientos
            try:
                # Intentar con PostgreSQL (to_char)
                treatments_query = db.query(
                    func.to_char(Treatment.treatment_date, 'YYYY-MM').label('month'),
                    func.count(Treatment.id).label('total')
                )
            except Exception:
                # Fallback para SQLite (strftime)
                treatments_query = db.query(
                    func.strftime('%Y-%m', Treatment.treatment_date).label('month'),
                    func.count(Treatment.id).label('total')
                )
            
            # Aplicar filtro de rango de fechas
            treatments_query = treatments_query.filter(
                Treatment.treatment_date >= start_month,
                Treatment.treatment_date < end_month + relativedelta(months=1)
            )
            
            # Aplicar filtro de doctor si se proporciona
            if doctor_id:
                treatments_query = treatments_query.filter(Treatment.doctor_id == doctor_id)
            
            # Aplicar filtro de procedimiento si se proporciona
            if procedure_id:
                treatments_query = treatments_query.filter(Treatment.dental_service_id == procedure_id)
            
            # Agrupar por mes
            try:
                treatments_by_month = treatments_query.group_by(
                    func.to_char(Treatment.treatment_date, 'YYYY-MM')
                ).all()
            except Exception:
                treatments_by_month = treatments_query.group_by(
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
