"""
Script simple para verificar el estado de los triggers de auditoría
ByteDental System - Audit Triggers Status Check
"""

import sys
from pathlib import Path
from sqlalchemy import create_engine, text

# Agregar el directorio padre al path
sys.path.append(str(Path(__file__).parent.parent))

from app.config import settings

def check_audit_status():
    """Verifica el estado de los triggers de auditoría"""
    
    print("🔍 VERIFICACIÓN DE TRIGGERS DE AUDITORÍA")
    print("=" * 50)
    
    try:
        engine = create_engine(settings.database_url)
        
        with engine.connect() as connection:
            
            # 1. Verificar tabla de auditoría
            audit_table = connection.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'db_audit_log'
                );
            """)).scalar()
            
            print(f"📊 Tabla db_audit_log: {'✅ Existe' if audit_table else '❌ No encontrada'}")
            
            # 2. Contar triggers
            triggers_result = connection.execute(text("""
                SELECT COUNT(*) 
                FROM information_schema.triggers 
                WHERE trigger_name LIKE 'audit_%'
            """))
            triggers_count = triggers_result.scalar() or 0
            
            print(f"⚡ Triggers de auditoría: {triggers_count} activos")
            
            # 3. Contar registros de auditoría
            records_count = 0
            if audit_table:
                records_result = connection.execute(text(
                    "SELECT COUNT(*) FROM db_audit_log"
                ))
                records_count = records_result.scalar() or 0
                print(f"📝 Registros de auditoría: {records_count}")
            
            # 4. Mostrar resumen
            if audit_table and triggers_count > 0:
                print("\n✅ Sistema de auditoría automática: ACTIVO")
                return True
            else:
                print("\n❌ Sistema de auditoría automática: INACTIVO")
                print("💡 Ejecutar script de instalación desde init-scripts/02-audit-triggers.sql")
                return False
                
    except Exception as e:
        print(f"❌ Error al verificar estado: {e}")
        return False

if __name__ == "__main__":
    check_audit_status()
