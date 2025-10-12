"""
Configuración global para todos los tests de pytest
"""
import pytest
import warnings
import os
import sys

# Añadir el directorio backend al path para imports
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

def pytest_configure(config):
    """Configuración ejecutada antes de todos los tests"""
    # Configurar warnings de forma específica
    warnings.filterwarnings("ignore", category=DeprecationWarning)
    warnings.filterwarnings("ignore", category=PendingDeprecationWarning)
    
    # SQLAlchemy warnings específicos
    warnings.filterwarnings(
        "ignore", 
        message=".*declarative_base.*",
        category=Warning
    )
    
    # Pydantic warnings específicos
    warnings.filterwarnings(
        "ignore", 
        message=".*@validator.*",
        category=Warning
    )
    
    # Configurar logging para tests
    import logging
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


@pytest.fixture(scope="session", autouse=True)
def configure_test_environment():
    """Configuración automática del entorno de testing"""
    # Variables de entorno para testing
    os.environ["TESTING"] = "true"
    os.environ["DATABASE_URL"] = "sqlite:///:memory:"
    
    yield
    
    # Cleanup después de todos los tests
    if "TESTING" in os.environ:
        del os.environ["TESTING"]

import pytest
from fastapi.testclient import TestClient
from app.database import get_db
from main import app
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from unittest.mock import MagicMock

# Configuración de la base de datos de pruebas
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Crear las tablas en la base de datos de pruebas
@pytest.fixture(scope="session", autouse=True)
def setup_database():
    from app.models import Base
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

# Fixture para la sesión de base de datos
@pytest.fixture
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()

# Fixture para el cliente de pruebas
@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()

# Fixture para el token de doctor
@pytest.fixture
def doctor_token():
    """Token de autenticación para un usuario con rol de Doctor"""
    return "Bearer doctor-test-token"

# Fixture para el token de asistente
@pytest.fixture
def assistant_token():
    """Token de autenticación para un usuario con rol de Asistente"""
    return "Bearer assistant-test-token"

# Fixture para el servicio de auditoría (mock)
@pytest.fixture
def mock_audit_service(mocker):
    """Mock del servicio de auditoría"""
    mock = MagicMock()
    mocker.patch("app.services.auditoria_service.AuditoriaService", return_value=mock)
    return mock

# Python
import pytest

@pytest.fixture
def test_db():
    """Fixture para configurar una base de datos de prueba"""
    from app.database import Base
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    # Crear las tablas en la base de datos de prueba
    Base.metadata.create_all(bind=engine)

    yield session

    # Limpiar la base de datos después de las pruebas
    session.close()
    transaction.rollback()
    connection.close()
    Base.metadata.drop_all(bind=engine)