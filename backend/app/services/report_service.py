"""
Servicio de reportes para ByteDental
"""
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
from typing import List, Dict
import logging
from io import BytesIO
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER, TA_LEFT

logger = logging.getLogger(__name__)

class ReportService:
    """Servicio para generar reportes del sistema"""

    @staticmethod
    def get_consolidated_activities(
        db: Session,
        start_date: str,
        end_date: str
    ) -> List[Dict]:
        """
        Obtiene el consolidado de actividades odontológicas en un rango de fechas
        
        Args:
            db: Sesión de base de datos
            start_date: Fecha de inicio (YYYY-MM-DD)
            end_date: Fecha de fin (YYYY-MM-DD)
            
        Returns:
            Lista de diccionarios con los datos del reporte
        """
        try:
            query = text("""
                SELECT
                    t.treatment_date AS fecha,
                    CONCAT(per.first_name, ' ', per.first_surname) AS paciente,
                    per.document_number AS documento,
                    per.phone AS telefono,
                    ds.name AS procedimiento,
                    CONCAT(u.first_name, ' ', u.last_name) AS doctor
                FROM treatments t
                JOIN clinical_histories ch ON t.clinical_history_id = ch.id
                JOIN patients p ON ch.patient_id = p.id
                JOIN persons per ON p.person_id = per.id
                JOIN users u ON t.doctor_id = u.uid
                JOIN dental_service ds ON t.dental_service_id = ds.id
                WHERE t.treatment_date BETWEEN :start_date AND :end_date
                ORDER BY t.treatment_date DESC
            """)
            
            result = db.execute(query, {"start_date": start_date, "end_date": end_date})
            
            # Convertir los resultados a lista de diccionarios
            data = []
            for row in result:
                data.append({
                    "fecha": row.fecha.strftime("%Y-%m-%d %H:%M") if row.fecha else "",
                    "paciente": row.paciente or "",
                    "documento": row.documento or "",
                    "telefono": row.telefono or "",
                    "procedimiento": row.procedimiento or "",
                    "doctor": row.doctor or ""
                })
            
            logger.info(f"Se obtuvieron {len(data)} registros para el reporte consolidado")
            return data
            
        except Exception as e:
            logger.error(f"Error al obtener consolidado de actividades: {str(e)}")
            raise

    @staticmethod
    def generate_consolidated_activities_pdf(
        data: List[Dict],
        start_date: str,
        end_date: str
    ) -> BytesIO:
        """
        Genera un PDF con el consolidado de actividades odontológicas
        
        Args:
            data: Lista de diccionarios con los datos del reporte
            start_date: Fecha de inicio (YYYY-MM-DD)
            end_date: Fecha de fin (YYYY-MM-DD)
            
        Returns:
            BytesIO con el contenido del PDF
        """
        try:
            # Crear un buffer en memoria para el PDF
            buffer = BytesIO()
            
            # Crear el documento PDF
            doc = SimpleDocTemplate(
                buffer,
                pagesize=A4,
                rightMargin=30,
                leftMargin=30,
                topMargin=30,
                bottomMargin=30
            )
            
            # Contenedor para los elementos del PDF
            elements = []
            
            # Estilos
            styles = getSampleStyleSheet()
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=16,
                textColor=colors.HexColor('#1a365d'),
                spaceAfter=12,
                alignment=TA_CENTER,
                fontName='Helvetica-Bold'
            )
            
            subtitle_style = ParagraphStyle(
                'CustomSubtitle',
                parent=styles['Normal'],
                fontSize=12,
                textColor=colors.HexColor('#2d3748'),
                spaceAfter=20,
                alignment=TA_CENTER,
                fontName='Helvetica'
            )
            
            # Título
            title = Paragraph("Consolidado de Actividades Odontológicas", title_style)
            elements.append(title)
            
            # Subtítulo con el periodo
            subtitle = Paragraph(f"Periodo: {start_date} a {end_date}", subtitle_style)
            elements.append(subtitle)
            
            # Espacio
            elements.append(Spacer(1, 0.2*inch))
            
            # Tabla de datos
            if data:
                # Encabezados
                table_data = [
                    ['Fecha', 'Paciente', 'Documento', 'Teléfono', 'Procedimiento', 'Doctor']
                ]
                
                # Datos
                for row in data:
                    table_data.append([
                        row['fecha'],
                        row['paciente'],
                        row['documento'],
                        row['telefono'],
                        row['procedimiento'],
                        row['doctor']
                    ])
                
                # Crear tabla
                table = Table(table_data, colWidths=[
                    1.2*inch,  # Fecha
                    1.3*inch,  # Paciente
                    0.9*inch,  # Documento
                    0.9*inch,  # Teléfono
                    1.3*inch,  # Procedimiento
                    1.3*inch   # Doctor
                ])
                
                # Estilo de la tabla
                table.setStyle(TableStyle([
                    # Encabezado
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2b6cb0')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 9),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('TOPPADDING', (0, 0), (-1, 0), 12),
                    
                    # Cuerpo de la tabla
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
                    ('ALIGN', (0, 1), (-1, -1), 'LEFT'),
                    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                    ('FONTSIZE', (0, 1), (-1, -1), 8),
                    ('TOPPADDING', (0, 1), (-1, -1), 6),
                    ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
                    
                    # Bordes
                    ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    
                    # Alternancia de colores en filas
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f7fafc')])
                ]))
                
                elements.append(table)
            else:
                # Mensaje cuando no hay datos
                no_data_style = ParagraphStyle(
                    'NoData',
                    parent=styles['Normal'],
                    fontSize=12,
                    textColor=colors.HexColor('#718096'),
                    alignment=TA_CENTER,
                    fontName='Helvetica'
                )
                no_data_msg = Paragraph("No se encontraron registros en el periodo especificado.", no_data_style)
                elements.append(no_data_msg)
            
            # Espacio
            elements.append(Spacer(1, 0.3*inch))
            
            # Pie de página con fecha de generación
            footer_style = ParagraphStyle(
                'Footer',
                parent=styles['Normal'],
                fontSize=8,
                textColor=colors.HexColor('#a0aec0'),
                alignment=TA_CENTER,
                fontName='Helvetica'
            )
            generation_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            footer = Paragraph(f"Reporte generado el: {generation_date}", footer_style)
            elements.append(footer)
            
            # Construir el PDF
            doc.build(elements)
            
            # Mover el puntero del buffer al inicio
            buffer.seek(0)
            
            logger.info(f"PDF generado exitosamente con {len(data)} registros")
            return buffer
            
        except Exception as e:
            logger.error(f"Error al generar PDF del consolidado: {str(e)}")
            raise
