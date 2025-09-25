import pytest
import json
import warnings
from decimal import Decimal
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import sys
import os

# Configurar warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.filterwarnings("ignore", message=".*declarative_base.*")
warnings.filterwarnings("ignore", message=".*@validator.*")

# Añadir el directorio backend al path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.database import Base, get_db
from main import app
from app.models.user_models import User
from app.models.rol_models import Role
from app.models.dental_service_models import DentalService
from app.schemas.dental_service_schema import DentalServiceCreate, DentalServiceUpdate, DentalServiceStatusChange

# Configuración de base de datos de test en memoria
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={
        "check_same_thread": False,
    },
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session")
def setup_database():
    """Crear todas las tablas para los tests"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session(setup_database):
    """Crear una sesión de base de datos para cada test"""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    # Crear roles básicos
    assistant_role = Role(id=1, name="Asistente", description="Asistente dental")
    doctor_role = Role(id=2, name="Doctor", description="Doctor dental")
    admin_role = Role(id=3, name="Administrator", description="Administrador")
    
    session.add(assistant_role)
    session.add(doctor_role) 
    session.add(admin_role)
    session.commit()
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session):
    """Cliente de test de FastAPI"""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as client:
        yield client
    
    app.dependency_overrides.clear()


@pytest.fixture
def mock_firebase_service():
    """Mock del servicio de Firebase"""
    with patch('app.middleware.auth_middleware.FirebaseService') as mock:
        mock.verify_token.return_value = {"uid": "test-firebase-uid-123"}
        yield mock


@pytest.fixture
def admin_user(db_session):
    """Usuario con rol de Administrador para pruebas"""
    user = User(
        uid="admin-firebase-uid-123",
        document_number="123456789",
        document_type="CC", 
        first_name="Carlos",
        last_name="Administrador",
        email="admin@bytedental.com",
        phone="3001234567",
        role_id=3,  # Administrator
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def assistant_user(db_session):
    """Usuario con rol de Asistente para pruebas"""
    user = User(
        uid="assistant-firebase-uid-456",
        document_number="987654321",
        document_type="CC", 
        first_name="María",
        last_name="Asistente",
        email="assistant@bytedental.com",
        phone="3009876543",
        role_id=1,  # Asistente
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def doctor_user(db_session):
    """Usuario con rol de Doctor para pruebas"""
    user = User(
        uid="doctor-firebase-uid-789",
        document_number="555666777", 
        document_type="CC",
        first_name="Ana",
        last_name="Doctora", 
        email="doctor@bytedental.com",
        phone="3005555555",
        role_id=2,  # Doctor
        specialty="Endodoncia",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def valid_service_data():
    """Datos válidos para crear un servicio odontológico"""
    return {
        "name": "Limpieza Dental",
        "description": "Limpieza profunda de dientes y encías",
        "value": 85000.00,
        "is_active": True
    }


@pytest.fixture
def auth_headers_admin():
    """Headers de autorización para admin"""
    return {"Authorization": "Bearer admin-test-token"}


@pytest.fixture
def auth_headers_assistant():
    """Headers de autorización para assistant"""
    return {"Authorization": "Bearer assistant-test-token"}


@pytest.fixture
def sample_dental_service(db_session):
    """Crear un servicio odontológico de muestra para los tests"""
    service = DentalService(
        name="Extracción Dental",
        description="Extracción de diente con anestesia local",
        value=Decimal("120000.00"),
        is_active=True
    )
    db_session.add(service)
    db_session.commit()
    db_session.refresh(service)
    return service


class TestDentalServiceCreation:
    """Tests para la creación de servicios odontológicos"""
    
    def test_create_service_success_with_admin_role(
        self, 
        client, 
        mock_firebase_service, 
        admin_user, 
        valid_service_data, 
        auth_headers_admin
    ):
        """Test: Crear servicio exitosamente con rol de Administrador"""
        
        response = client.post(
            "/api/dental-services/",
            json=valid_service_data,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 201
        data = response.json()
        
        # Verificar datos del servicio creado
        assert data["id"] is not None
        assert data["name"] == "Limpieza Dental"
        assert data["description"] == "Limpieza profunda de dientes y encías"
        assert float(data["value"]) == 85000.00
        assert data["is_active"] is True
    
    def test_create_service_forbidden_with_assistant_role(
        self, 
        client, 
        mock_firebase_service, 
        assistant_user, 
        valid_service_data, 
        auth_headers_assistant
    ):
        """Test: Crear servicio denegado con rol de Asistente"""
        
        # Configurar mock para el asistente
        mock_firebase_service.verify_token.return_value = {"uid": "assistant-firebase-uid-456"}
        
        response = client.post(
            "/api/dental-services/",
            json=valid_service_data,
            headers=auth_headers_assistant
        )
        
        assert response.status_code == 403
    
    def test_create_service_forbidden_with_doctor_role(
        self, 
        client, 
        mock_firebase_service, 
        doctor_user, 
        valid_service_data, 
        auth_headers_admin
    ):
        """Test: Crear servicio denegado con rol de Doctor"""
        
        # Configurar mock para el doctor
        mock_firebase_service.verify_token.return_value = {"uid": "doctor-firebase-uid-789"}
        
        response = client.post(
            "/api/dental-services/",
            json=valid_service_data,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 403
    
    def test_create_service_invalid_data(
        self, 
        client, 
        mock_firebase_service, 
        admin_user, 
        auth_headers_admin
    ):
        """Test: Crear servicio con datos inválidos"""
        
        invalid_data = {
            "name": "",  # Nombre vacío
            "description": "Descripción válida",
            "value": -1000.00,  # Valor negativo
            "is_active": True
        }
        
        response = client.post(
            "/api/dental-services/",
            json=invalid_data,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 422  # Validation Error
    
    def test_create_service_unauthorized_no_token(
        self, 
        client, 
        valid_service_data
    ):
        """Test: Crear servicio sin token de autorización"""
        
        response = client.post(
            "/api/dental-services/",
            json=valid_service_data
        )
        
        assert response.status_code == 401


class TestDentalServiceRead:
    """Tests para la lectura de servicios odontológicos"""
    
    def test_get_services_success_with_admin(
        self,
        client,
        mock_firebase_service,
        admin_user,
        sample_dental_service,
        auth_headers_admin
    ):
        """Test: Obtener lista de servicios con rol de Administrador"""
        
        response = client.get(
            "/api/dental-services/",
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        
        # Verificar que el servicio de muestra esté en la lista
        service_names = [service["name"] for service in data]
        assert "Extracción Dental" in service_names
    
    def test_get_services_success_with_assistant(
        self,
        client,
        mock_firebase_service,
        assistant_user,
        sample_dental_service,
        auth_headers_assistant
    ):
        """Test: Obtener lista de servicios con rol de Asistente"""
        
        # Configurar mock para el asistente
        mock_firebase_service.verify_token.return_value = {"uid": "assistant-firebase-uid-456"}
        
        response = client.get(
            "/api/dental-services/",
            headers=auth_headers_assistant
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_services_forbidden_with_doctor(
        self,
        client,
        mock_firebase_service,
        doctor_user,
        auth_headers_admin
    ):
        """Test: Obtener servicios denegado con rol de Doctor"""
        
        # Configurar mock para el doctor
        mock_firebase_service.verify_token.return_value = {"uid": "doctor-firebase-uid-789"}
        
        response = client.get(
            "/api/dental-services/",
            headers=auth_headers_admin
        )
        
        assert response.status_code == 403
    
    def test_get_service_by_id_success(
        self,
        client,
        mock_firebase_service,
        admin_user,
        sample_dental_service,
        auth_headers_admin
    ):
        """Test: Obtener servicio por ID exitosamente"""
        
        response = client.get(
            f"/api/dental-services/{sample_dental_service.id}",
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_dental_service.id
        assert data["name"] == "Extracción Dental"
        assert float(data["value"]) == 120000.00
    
    def test_get_service_by_id_not_found(
        self,
        client,
        mock_firebase_service,
        admin_user,
        auth_headers_admin
    ):
        """Test: Obtener servicio por ID inexistente"""
        
        response = client.get(
            "/api/dental-services/9999",
            headers=auth_headers_admin
        )
        
        assert response.status_code == 404
    
    def test_get_services_with_filters(
        self,
        client,
        mock_firebase_service,
        admin_user,
        sample_dental_service,
        auth_headers_admin
    ):
        """Test: Obtener servicios con filtros"""
        
        # Test filtro por estado activo
        response = client.get(
            "/api/dental-services/?is_active=true",
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        data = response.json()
        for service in data:
            assert service["is_active"] is True
        
        # Test filtro por búsqueda
        response = client.get(
            "/api/dental-services/?search=Extracción",
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert any("Extracción" in service["name"] for service in data)
        
        # Test filtro por rango de precios
        response = client.get(
            "/api/dental-services/?min_price=100000&max_price=150000",
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        data = response.json()
        for service in data:
            assert 100000 <= float(service["value"]) <= 150000


class TestDentalServiceUpdate:
    """Tests para la actualización de servicios odontológicos"""
    
    def test_update_service_success(
        self,
        client,
        mock_firebase_service,
        admin_user,
        sample_dental_service,
        auth_headers_admin
    ):
        """Test: Actualizar servicio exitosamente"""
        
        update_data = {
            "name": "Extracción Dental Compleja",
            "description": "Extracción de muela del juicio con cirugía",
            "value": 180000.00
        }
        
        response = client.put(
            f"/api/dental-services/{sample_dental_service.id}",
            json=update_data,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Extracción Dental Compleja"
        assert data["description"] == "Extracción de muela del juicio con cirugía"
        assert float(data["value"]) == 180000.00
    
    def test_update_service_forbidden_with_assistant(
        self,
        client,
        mock_firebase_service,
        assistant_user,
        sample_dental_service,
        auth_headers_assistant
    ):
        """Test: Actualizar servicio denegado con rol de Asistente"""
        
        # Configurar mock para el asistente
        mock_firebase_service.verify_token.return_value = {"uid": "assistant-firebase-uid-456"}
        
        update_data = {
            "name": "Nuevo Nombre",
            "value": 100000.00
        }
        
        response = client.put(
            f"/api/dental-services/{sample_dental_service.id}",
            json=update_data,
            headers=auth_headers_assistant
        )
        
        assert response.status_code == 403
    
    def test_update_service_not_found(
        self,
        client,
        mock_firebase_service,
        admin_user,
        auth_headers_admin
    ):
        """Test: Actualizar servicio inexistente"""
        
        update_data = {
            "name": "Servicio Inexistente",
            "value": 50000.00
        }
        
        response = client.put(
            "/api/dental-services/9999",
            json=update_data,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 404
    
    def test_update_service_partial(
        self,
        client,
        mock_firebase_service,
        admin_user,
        sample_dental_service,
        auth_headers_admin
    ):
        """Test: Actualización parcial de servicio"""
        
        # Solo actualizar el precio
        update_data = {
            "value": 95000.00
        }
        
        response = client.put(
            f"/api/dental-services/{sample_dental_service.id}",
            json=update_data,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        data = response.json()
        assert float(data["value"]) == 95000.00
        assert data["name"] == "Extracción Dental"  # No cambió


class TestDentalServiceStatusChange:
    """Tests para el cambio de estado de servicios odontológicos"""
    
    def test_change_service_status_success(
        self,
        client,
        mock_firebase_service,
        admin_user,
        sample_dental_service,
        auth_headers_admin
    ):
        """Test: Cambiar estado de servicio exitosamente"""
        
        status_data = {
            "is_active": False,
            "reason": "Servicio descontinuado temporalmente"
        }
        
        response = client.patch(
            f"/api/dental-services/{sample_dental_service.id}/status",
            json=status_data,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["previous_status"] is True
        assert data["new_status"] is False
        assert data["service"]["is_active"] is False
    
    def test_change_service_status_forbidden(
        self,
        client,
        mock_firebase_service,
        assistant_user,
        sample_dental_service,
        auth_headers_assistant
    ):
        """Test: Cambiar estado denegado con rol de Asistente"""
        
        # Configurar mock para el asistente
        mock_firebase_service.verify_token.return_value = {"uid": "assistant-firebase-uid-456"}
        
        status_data = {
            "is_active": False,
            "reason": "Test"
        }
        
        response = client.patch(
            f"/api/dental-services/{sample_dental_service.id}/status",
            json=status_data,
            headers=auth_headers_assistant
        )
        
        assert response.status_code == 403


class TestDentalServiceDeletion:
    """Tests para la eliminación de servicios odontológicos"""
    
    def test_delete_service_success(
        self,
        client,
        mock_firebase_service,
        admin_user,
        sample_dental_service,
        auth_headers_admin
    ):
        """Test: Eliminar servicio exitosamente"""
        
        response = client.delete(
            f"/api/dental-services/{sample_dental_service.id}",
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["service_id"] == sample_dental_service.id
        assert data["service_name"] == "Extracción Dental"
    
    def test_delete_service_forbidden(
        self,
        client,
        mock_firebase_service,
        assistant_user,
        sample_dental_service,
        auth_headers_assistant
    ):
        """Test: Eliminar servicio denegado con rol de Asistente"""
        
        # Configurar mock para el asistente
        mock_firebase_service.verify_token.return_value = {"uid": "assistant-firebase-uid-456"}
        
        response = client.delete(
            f"/api/dental-services/{sample_dental_service.id}",
            headers=auth_headers_assistant
        )
        
        assert response.status_code == 403
    
    def test_delete_service_not_found(
        self,
        client,
        mock_firebase_service,
        admin_user,
        auth_headers_admin
    ):
        """Test: Eliminar servicio inexistente"""
        
        response = client.delete(
            "/api/dental-services/9999",
            headers=auth_headers_admin
        )
        
        assert response.status_code == 404


class TestDentalServiceValidations:
    """Tests para validaciones específicas de servicios odontológicos"""
    
    def test_create_service_name_validation(
        self,
        client,
        mock_firebase_service,
        admin_user,
        auth_headers_admin
    ):
        """Test: Validaciones de nombre del servicio"""
        
        # Nombre demasiado largo
        invalid_data = {
            "name": "A" * 101,  # Excede máximo de 100 caracteres
            "description": "Descripción válida",
            "value": 50000.00,
            "is_active": True
        }
        
        response = client.post(
            "/api/dental-services/",
            json=invalid_data,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 422
    
    def test_create_service_value_validation(
        self,
        client,
        mock_firebase_service,
        admin_user,
        auth_headers_admin
    ):
        """Test: Validaciones de valor del servicio"""
        
        # Valor cero
        invalid_data = {
            "name": "Servicio Gratis",
            "description": "Descripción válida",
            "value": 0.00,
            "is_active": True
        }
        
        response = client.post(
            "/api/dental-services/",
            json=invalid_data,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 422
        
        # Valor demasiado alto
        invalid_data["value"] = 1000000000.00  # Excede máximo
        
        response = client.post(
            "/api/dental-services/",
            json=invalid_data,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 422
    
    def test_create_service_description_validation(
        self,
        client,
        mock_firebase_service,
        admin_user,
        auth_headers_admin
    ):
        """Test: Validación de descripción del servicio"""
        
        # Descripción demasiado larga
        invalid_data = {
            "name": "Servicio Válido",
            "description": "A" * 1001,  # Excede máximo de 1000 caracteres
            "value": 50000.00,
            "is_active": True
        }
        
        response = client.post(
            "/api/dental-services/",
            json=invalid_data,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 422


if __name__ == "__main__":
    pytest.main([__file__])
