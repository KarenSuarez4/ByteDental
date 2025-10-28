# app/utils/pdf_generator.py
from io import BytesIO
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer, Image, KeepInFrame
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from app.schemas.report_schema import ActivityReport, MonthlyReport
import os

def generate_activity_pdf(report_data: ActivityReport) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(letter),
                            leftMargin=30, rightMargin=30, topMargin=30, bottomMargin=30) 
    elements = []
    styles = getSampleStyleSheet()

    # --- Configuración de Colores y Estilos Personalizados ---
    # Color de la paleta (1c628c) en el formato RGB para ReportLab (valores de 0 a 1)
    PALETTE_COLOR = colors.Color(red=0x1C/255, green=0x62/255, blue=0x8C/255)
    
    # Estilo para el título de la clínica con el color de la paleta
    clinic_title_style = ParagraphStyle('ClinicTitle', 
                                        parent=styles['Heading3'], 
                                        textColor=PALETTE_COLOR, 
                                        alignment=1) # 1 = CENTER
    
    # Estilo para el título principal con el color de la paleta
    main_title_style = ParagraphStyle('MainTitle', 
                                      parent=styles['Heading1'], 
                                      textColor=PALETTE_COLOR, 
                                      alignment=1, 
                                      spaceAfter=6) 
    
    # Estilo para la fecha del periodo (centrado)
    period_style = ParagraphStyle('PeriodInfo', 
                                  parent=styles['Normal'], 
                                  alignment=1, 
                                  spaceAfter=12)
    
    # Estilo para el pie de página (alineado a la derecha)
    footer_style = ParagraphStyle('FooterInfo', 
                                  parent=styles['Normal'], 
                                  alignment=2, # 2 = RIGHT
                                  fontSize=9,
                                  spaceBefore=12) 
    
    # Estilo para el texto dentro de la tabla (Alineación a la izquierda para el tratamiento, y ajuste de texto)
    table_text_style = ParagraphStyle('TableText', 
                                      parent=styles['Normal'], 
                                      alignment=1, # 1 = CENTER
                                      fontSize=10,
                                      leading=12, # Espaciado entre líneas para mejorar la lectura
                                      wordWrap='CJK') # Permite que las palabras se corten y envuelvan
    
    # Estilo para subtítulos o textos informativos centrados
    centered_text_style = ParagraphStyle(
        'CenteredText',
        parent=styles['Normal'],
        alignment=1,  # 1 = CENTRADO
        fontSize=10,
        leading=12
    )


    # --- Encabezado ---
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    logo_path = os.path.join(BASE_DIR, "..", "static", "bytedental-logoAzul.png")
    try:
        logo = Image(logo_path, width=100, height=60)
        logo.hAlign = 'CENTER'
        elements.append(logo)
    except Exception as e:
        elements.append(Paragraph(f"<b>ORALCENTER WHITE</b> (Logo no encontrado: {str(e)})", clinic_title_style))
    elements.append(Spacer(1, 6))    
    elements.append(Paragraph("Sonrisas sanas, brillantes y naturales", centered_text_style))
    elements.append(Paragraph("Odontología general · Blanqueamiento · Ortodoncia", centered_text_style))
    elements.append(Paragraph("<b>DR. CARLOS MORENO - ODONTÓLOGO</b>", centered_text_style))
    elements.append(Paragraph(
        "Calle 16 # 13-40, Centro-Sur, Duitama, Boyacá, Colombia, "
        "Cel: 316 5181414 Email: oralcenterw@gmail.com", 
        centered_text_style
    ))

    
    elements.append(Spacer(1, 12)) # Espacio antes del título

    # --- Título Principal y Periodo ---
    # Título Principal
    elements.append(Paragraph("<b>FORMULARIO CONSOLIDADO DE ACTIVIDADES ODONTOLÓGICAS</b>", main_title_style))
    
    # Periodo
    period_text = f"Periodo: {report_data.start_date.strftime('%Y-%m-%d')} a {report_data.end_date.strftime('%Y-%m-%d')}"
    elements.append(Paragraph(period_text, period_style))

    # --- Datos de la tabla ---
    data = [
        ['FECHA/HORA', 'NOMBRE DEL PACIENTE', 'DOCUMENTO', 'TELÉFONO', 'PROCEDIMIENTO EJECUTADO', 'DOCTOR']
    ]

    for activity in report_data.activities:
        # Se envuelve el 'PROCEDIMIENTO EJECUTADO' en un objeto Paragraph
        # para que pueda ajustarse automáticamente al ancho de la columna.
        procedure_cell = Paragraph(activity.procedure_name, table_text_style)
        
        data.append([
            activity.treatment_date.strftime('%Y-%m-%d %H:%M'),
            activity.patient_name,
            activity.document_number,
            activity.phone,
            procedure_cell, # Se usa el objeto Paragraph
            activity.doctor_name
        ])

    # ColWidths: Se ajusta el ancho de la columna de 'PROCEDIMIENTO EJECUTADO' (5to elemento)
    # y se reajustan las otras para mantener la suma total.
    # Total de 11.5 pulgadas (ancho de letter landscape es ~11 pulgadas, con márgenes de 30)
    colWidths = [1.2*inch, 1.8*inch, 1.4*inch, 1.4*inch, 3.2*inch, 1.5*inch]
    
    # No es necesario definir rowHeights, ReportLab lo calcula automáticamente
    # cuando las celdas contienen objetos Paragraph que necesitan ajuste de línea.
    
    table = Table(data, colWidths=colWidths, hAlign='CENTER')

    
    # Estilo de la tabla
    table.setStyle(TableStyle([
        # Fila de encabezado
        ('BACKGROUND', (0, 0), (-1, 0), PALETTE_COLOR), # Usando el color de la paleta
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),   # Texto blanco para contraste
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        
        # Cuerpo de la tabla
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'), # Alineación superior para el cuerpo, para ver mejor el ajuste de texto
        ('ALIGN', (0, 1), (4, -1), 'LEFT'), # Alineación a la izquierda para las celdas de texto
        ('ALIGN', (0, 1), (0, -1), 'CENTER'), # Centrar FECHA/HORA
        ('ALIGN', (2, 1), (3, -1), 'CENTER'), # Centrar DOCUMENTO y TELÉFONO
        ('ALIGN', (5, 1), (5, -1), 'CENTER'), # Centrar DOCTOR
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3)
    ]))
    
    elements.append(table)

    

    # --- Pie de página (Reporte generado) ---
    report_generated_text = f"Reporte generado el: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    elements.append(Paragraph(report_generated_text, footer_style))

    # Generar PDF
    doc.build(elements)
    return buffer.getvalue()

def generate_monthly_pdf(report_data: MonthlyReport) -> bytes:
    """
    Genera un reporte mensual en PDF con un diseño mejorado.
    """
    from reportlab.lib.units import inch
    from reportlab.platypus import KeepInFrame




    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=letter,
        leftMargin=40, rightMargin=40, topMargin=50, bottomMargin=40
    )
    elements = []
    styles = getSampleStyleSheet()

    # --- Colores de la paleta ---
    PALETTE_COLOR = colors.Color(0x1C/255, 0x62/255, 0x8C/255)
    LIGHT_ROW = colors.whitesmoke
    ALT_ROW = colors.Color(0.93, 0.96, 0.98) # Un azul muy claro

    # --- Estilos personalizados ---
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        textColor=PALETTE_COLOR,
        alignment=1, # 1 = CENTER
        spaceAfter=10
    )
    period_style = ParagraphStyle(
        'PeriodInfo', 
        parent=styles['Normal'], 
        alignment=1, 
        spaceAfter=12
    )
    # Estilo para las etiquetas "RESPONSABLE:", "MES:", "AÑO:"
    responsible_label_style = ParagraphStyle(
        'ResponsibleLabel',
        parent=styles['Normal'],
        fontSize=10,
        alignment=0 # 0 = LEFT
    )
    # Estilo para los valores (Nombre, Mes, Año)
    responsible_value_style = ParagraphStyle(
        'ResponsibleValue',
        parent=styles['Normal'],
        fontSize=10,
        alignment=0 # 0 = LEFT
    )
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=9,
        alignment=2, # 2 = RIGHT
        textColor=PALETTE_COLOR
    )

    # --- Encabezado con logo y datos (sin cambios) ---
    try:
        # Intenta encontrar el logo en una ruta relativa
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        logo_path = os.path.join(BASE_DIR, "..", "static", "bytedental-logoAzul.png")
        
        # Fallback si la ruta anterior no existe (para pruebas)
        if not os.path.exists(logo_path):
            logo_path = os.path.join(BASE_DIR, "bytedental-logoAzul.png") # Asume que está en la misma carpeta

        logo = Image(logo_path, width=90, height=50)
        logo.mask = 'auto' # Para transparencia
    except Exception as e:
        print(f"Advertencia: No se pudo cargar el logo. {e}")
        logo = Paragraph("ORALCENTER WHITE", styles['Heading3'])

    header_table_data = [[
        logo, 
        Paragraph(
            "Sonrisas sanas, brillantes y naturales<br/>"
            "Odontología general · Blanqueamiento · Ortodoncia<br/>"
            "<b>DR. CARLOS MORENO - ODONTÓLOGO</b><br/>"
            "Calle 16 # 13-40, Centro-Sur, Duitama, Boyacá, Colombia<br/>"
            "Cel: 316 5181414 · oralcenterw@gmail.com", 
            styles['Normal']
        )
    ]]

    header_table = Table(header_table_data, colWidths=[1.5*inch, 5.5*inch]) # Ancho ajustado
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6)
    ]))
    elements.append(header_table)
    
    # Esta es la línea azul que te gusta
    elements.append(Table([['']], colWidths=[7*inch], style=[('LINEBELOW', (0, 0), (-1, -1), 0.75, PALETTE_COLOR)]))
    elements.append(Spacer(1, 16))

    # --- Título principal ---
    elements.append(Paragraph("<b>REPORTE MENSUAL DE ACTIVIDADES ODONTOLÓGICAS</b>", title_style))
    period_text = f"Periodo: {report_data.start_date.strftime('%Y-%m-%d')} a {report_data.end_date.strftime('%Y-%m-%d')}"
    elements.append(Paragraph(period_text, period_style))

    # --- (CORREGIDO) Información del responsable ---
    # Se eliminó la tabla y el párrafo con líneas de guiones bajos.
    # Se reemplazó con una tabla que imita la imagen de ejemplo.
    
    # Mapeo de número de mes a nombre en español
    MONTH_NAMES = ["", "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", 
                   "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"]
    try:
        month_name = MONTH_NAMES[report_data.month].upper()
    except IndexError:
        month_name = f"{report_data.month:02d}" # Fallback si el mes no es válido

    responsible_data = [[
        Paragraph("<b>RESPONSABLE:</b>", responsible_label_style),
        Paragraph(report_data.generated_by, responsible_value_style),
        Paragraph("<b>MES:</b>", responsible_label_style),
        Paragraph(month_name, responsible_value_style),
        Paragraph("<b>AÑO:</b>", responsible_label_style),
        Paragraph(str(report_data.year), responsible_value_style)
    ]]

    # Ajusta los anchos de columna para que coincidan con la imagen
    responsible_table = Table(responsible_data, colWidths=[
        1.4*inch, 2.0*inch,  # Col 1: Etiqueta, Col 2: Valor (largo)
        0.6*inch, 1.0*inch,  # Col 3: Etiqueta, Col 4: Valor
        0.6*inch, 1.0*inch   # Col 5: Etiqueta, Col 6: Valor
    ]) # Total 7.0 inches

    responsible_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('WORDWRAP', (0, 0), (-1, -1), 'CJK'),  # mejor gestión del texto largo
        ('LINEBELOW', (1, 0), (1, 0), 0.5, colors.black),
        ('LINEBELOW', (3, 0), (3, 0), 0.5, colors.black),
        ('LINEBELOW', (5, 0), (5, 0), 0.5, colors.black),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))

    responsible_table_wrapped = KeepInFrame(7*inch, 0.6*inch, [responsible_table], hAlign='CENTER')
    elements.append(responsible_table_wrapped)
    elements.append(Spacer(1, 16)) # Espacio antes de la tabla principal

    # --- Datos de la tabla ---
    data = [['PROCEDIMIENTOS EJECUTADOS', 'CANTIDAD DE PACIENTES']]
    for procedure in report_data.procedures:
        # Envuelve los nombres largos de procedimientos en Párrafos
        # para que se ajusten automáticamente si es necesario.
        data.append([
            Paragraph(procedure.procedure_name, styles['Normal']), 
            procedure.patient_count
        ])
    
    # Estilo para la fila de Total
    total_style = ParagraphStyle(
        'TotalRow',
        parent=styles['Normal'],
        fontSize=10,
        textColor=PALETTE_COLOR,
        alignment=1 # Centrado
    )

    data.append([
        Paragraph("<b>Total, de pacientes atendidos durante el mes</b>", total_style),
        Paragraph(f"<b>{report_data.total_patients}</b>", total_style)
    ])

    # --- (CORREGIDO) Estilo de la Tabla de datos ---
    table_style_commands = [
        # Encabezado
        ('BACKGROUND', (0, 0), (-1, 0), PALETTE_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8), # Añadido para centrar mejor

        # Celdas y bordes
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ALIGN', (1, 1), (1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        
        # Estilo para la primera columna (procedimientos)
        ('ALIGN', (0, 1), (0, -2), 'LEFT'), # Alinea a la izquierda
        ('LEFTPADDING', (0, 1), (0, -2), 6), # Añade padding
        ('RIGHTPADDING', (0, 1), (0, -2), 6),

        # Fila total
        ('BACKGROUND', (0, -1), (-1, -1), colors.Color(0.85, 0.93, 0.98)),
        ('TEXTCOLOR', (0, -1), (-1, -1), PALETTE_COLOR),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('LINEABOVE', (0, -1), (-1, -1), 1, PALETTE_COLOR)
    ]
    
    # --- (CORREGIDO) Lógica de filas alternas ---
    # Se aplica en un bucle para que funcione correctamente
    # Itera desde la fila 1 (después del encabezado) hasta la -2 (antes del total)
    for i in range(1, len(data) - 1):
        if i % 2 == 0: # Fila par
            color = ALT_ROW
        else: # Fila impar
            color = LIGHT_ROW
        table_style_commands.append(('BACKGROUND', (0, i), (-1, i), color))

    # --- (CORREGIDO) Tabla de datos ---
    # Se ajustaron los anchos de columna. 5.0 + 2.0 = 7.0 pulgadas
    table = Table(data, colWidths=[5.0*inch, 2.0*inch])
    table.setStyle(TableStyle(table_style_commands))
    elements.append(table)

    # --- Pie de página ---
    elements.append(Spacer(1, 20))
    elements.append(Paragraph(f"Reporte generado el: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", footer_style))


    # --- Generar PDF ---
    doc.build(elements)

    
    # Regresa al inicio del buffer
    buffer.seek(0)
    return buffer.getvalue()