#!/bin/bash
set -e

# Script de inicialización de PostgreSQL
# Este script se ejecuta automáticamente cuando el contenedor se crea por primera vez

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Crear extensiones útiles
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    
    -- Configuraciones adicionales
    ALTER DATABASE bytedental_db SET timezone TO 'America/Bogota';
    
    -- Mensaje de confirmación
    SELECT 'Base de datos ByteDental inicializada correctamente' as mensaje;
EOSQL
