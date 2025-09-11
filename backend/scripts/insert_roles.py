"""
Script para insertar roles básicos en la base de datos
"""
import sys
import os

# Agregar el directorio padre al path para importar módulos
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.config import settings

"""
Script para insertar roles básicos en la base de datos
"""
import sys
import os

# Agregar el directorio padre al path para importar módulos
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.config import settings

def insert_basic_roles():
    """Insertar roles básicos del sistema"""
    # Usar la configuración de la aplicación
    engine = create_engine(settings.database_url)
    
    roles = [
        {
            'name': 'Administrator',
            'description': 'Full system control, user management and configuration'
        },
        {
            'name': 'Auditor',
            'description': 'Supervision, report generation and system auditing'
        },
        {
            'name': 'Doctor',
            'description': 'Patient management, appointments and medical treatments'
        },
        {
            'name': 'Assistant',
            'description': 'Operational support, appointment and patient management'
        },
        {
            'name': 'Receptionist',
            'description': 'Front desk operations, appointment scheduling'
        }
    ]
    
    with engine.connect() as conn:
        # Verificar si ya existen roles
        result = conn.execute(text("SELECT COUNT(*) FROM roles"))
        count = result.scalar()
        
        # Manejar caso donde count puede ser None
        if count is None:
            count = 0
        
        if count > 0:
            print(f"✅ Ya existen {count} roles en la base de datos")
            # Mostrar roles existentes
            existing_roles = conn.execute(text("SELECT id, name, description FROM roles ORDER BY id"))
            print("📋 Roles existentes:")
            for role in existing_roles:
                print(f"  {role[0]}. {role[1]} - {role[2]}")
            return
        
        # Insertar roles
        for role in roles:
            conn.execute(text("""
                INSERT INTO roles (name, description, is_active) 
                VALUES (:name, :description, true)
            """), role)
        
        conn.commit()
        print("✅ Roles básicos insertados exitosamente:")
        
        # Mostrar roles insertados
        new_roles = conn.execute(text("SELECT id, name, description FROM roles ORDER BY id"))
        for role in new_roles:
            print(f"  {role[0]}. {role[1]} - {role[2]}")

if __name__ == "__main__":
    insert_basic_roles()
