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