# ByteDental 🦷

Sistema integral de gestión clínica dental diseñado para optimizar la administración de consultorios odontológicos mediante historias clínicas electrónicas, gestión de pacientes y auditoría de operaciones.

## 🏗️ Arquitectura

**Arquitectura en Capas (Layered Architecture)** diseñada para escalabilidad y mantenibilidad:

### Capas del Sistema
- **Presentation Layer:** Componentes React (UI + Process Interface)
- **Business Layer:** Servicios de negocio (PatientService, ClinicalRecordService, ReportService)
- **Persistence Layer:** DTOs y mapeo objeto-relacional
- **Database Layer:** PostgreSQL con triggers de auditoría

### Servicios Externos
- **Firebase Authentication Service:** Gestión de usuarios y autenticación
- **Sendgrid Email Service:** Envío de notificaciones y OTPs

## 🚀 Tecnologías

### Frontend
- **React 18.3** - Biblioteca UI con Hooks
- **Vite 5.4** - Build tool y dev server
- **React Router DOM 6.28** - Enrutamiento SPA
- **Axios 1.7** - Cliente HTTP
- **React Toastify 10.0** - Notificaciones
- **Driver.js 1.3** - Tours interactivos
- **Jest + React Testing Library** - Testing

### Backend
- **FastAPI 0.115** - Framework web asíncrono
- **SQLAlchemy 2.0** - ORM
- **Alembic 1.14** - Migraciones de BD
- **Pydantic 2.9** - Validación de datos
- **Firebase Admin SDK 6.6** - Autenticación
- **Pytest 8.3** - Testing
- **Python 3.13**

### Infraestructura
- **PostgreSQL 17** - Base de datos relacional
- **Docker + Docker Compose** - Containerización
- **Uvicorn** - ASGI server

## 📋 Características Principales

- ✅ Gestión completa de pacientes y acudientes
- ✅ Historias clínicas electrónicas (SOAP)
- ✅ Control de tratamientos y servicios dentales
- ✅ Sistema de roles (Administrador, Doctor, Asistente)
- ✅ Auditoría automática de operaciones
- ✅ Autenticación segura con Firebase
- ✅ Recuperación de contraseña con OTP por email
- ✅ Validaciones de negocio en tiempo real

## 🛠️ Instalación

### Prerrequisitos
```bash
Node.js >= 18.x
Python >= 3.13
PostgreSQL >= 17
Docker (opcional)
```

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

**Configurar variables de entorno** (`.env`):
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/bytedental
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

**Ejecutar migraciones:**
```bash
alembic upgrade head
```

**Iniciar servidor:**
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

El frontend estará disponible en `http://localhost:5173`

### Docker (Alternativa)
```bash
cd backend
docker-compose up -d
```

## 🧪 Testing

### Backend
```bash
cd backend
pytest tests/ -v
```

### Frontend
```bash
cd frontend
npm test
```

## 📁 Estructura del Proyecto

```
ByteDental/
├── backend/
│   ├── app/
│   │   ├── models/        # Modelos SQLAlchemy
│   │   ├── routers/       # Endpoints FastAPI
│   │   ├── services/      # Lógica de negocio
│   │   ├── schemas/       # Esquemas Pydantic
│   │   ├── middleware/    # Autenticación y CORS
│   │   └── utils/         # Utilidades (auditoría)
│   ├── alembic/           # Migraciones de BD
│   ├── tests/             # Pruebas unitarias
│   └── main.py            # Entry point
├── frontend/
│   ├── src/
│   │   ├── components/    # Componentes reutilizables
│   │   ├── pages/         # Páginas por rol
│   │   ├── services/      # Servicios API
│   │   ├── contexts/      # Context API (Auth)
│   │   └── Firebase/      # Configuración Firebase
│   └── public/            # Assets estáticos
└── README.md
```

## 🔒 Seguridad

- Autenticación basada en JWT (Firebase)
- Middleware de autorización por roles
- Validación de entrada con Pydantic
- Sanitización de datos en frontend
- Hashing de contraseñas con Firebase
- Auditoría completa de operaciones CRUD

## 📊 Base de Datos

**Tablas principales:**
- `users` - Usuarios del sistema
- `persons` - Información personal
- `patients` - Pacientes
- `guardians` - Acudientes/tutores
- `clinical_histories` - Historias clínicas
- `treatments` - Tratamientos aplicados
- `dental_services` - Catálogo de servicios
- `audit_log` - Registro de auditoría

**Triggers automáticos** para auditoría en todas las tablas.

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto es privado y está protegido por derechos de autor.

## 👥 Autores

Desarrollado como proyecto de Trabajo de Campo - 8vo Semestre

- **Camilo Andrés Arias Tenjo**
- **Karen Juliana Peña Suárez**
- **Lunna Karina Sosa Espitia**
- **María Fernanda Sogamoso Rodríguez**
- **Ronald Samir Molinares Sanabria**

---