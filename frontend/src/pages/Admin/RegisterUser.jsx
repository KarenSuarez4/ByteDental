import React, { useState, useEffect } from "react";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Select from "../../components/Select";
import DateInput from "../../components/DateInput";  
import ConfirmDialog from "../../components/ConfirmDialog";
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { createUser } from "../../services/userService";
import { getRoles } from "../../services/userService";
import { useAuth } from "../../contexts/AuthContext"; 
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function cn(...args) {
  return twMerge(clsx(args));
}

const RegisterUser = () => {
  const [formData, setFormData] = useState({
    documentType: "",
    documentNumber: "",
    phoneNumber: "",
    firstName: "",
    lastName: "",
    email: "",
    role: "",
    specialty: "",
    birthdate: "",  
  });

  const [rolesList, setRolesList] = useState([]);
  const [isDoctor, setIsDoctor] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const { currentUser, token } = useAuth();
  const [age, setAge] = useState(null);  

  const specialties = [
    "Periodoncia",
    "Endodoncia",
    "Cirugía oral y maxilofacial",
    "Odontopediatría",
  ];

  const calculateAge = (birthDate) => {
    if (!birthDate || birthDate.length !== 10) return null;
    
    const today = new Date();
    const birth = new Date(birthDate);
    
    if (isNaN(birth.getTime())) return null;
    
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };


  useEffect(() => {
    if (formData.birthdate) {
      const calculatedAge = calculateAge(formData.birthdate);
      setAge(calculatedAge);
    } else {
      setAge(null);
    }
  }, [formData.birthdate]);

  useEffect(() => {
    async function fetchRoles() {
      try {
        const roles = await getRoles(token);
        setRolesList(roles);
      } catch (err) {
        setFormError("No se pudieron cargar los roles.");
        console.error("Error en fetchRoles:", err);
      }
    }
    if (token) fetchRoles();
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "documentNumber") {
      // Validar según el tipo de documento
      if (formData.documentType === 'PP') {
        // Pasaporte: alfanumérico, entre 6 y 10 caracteres, puede contener letras y números
        if (!/^[a-zA-Z0-9]*$/.test(value)) return;
        if (value.length > 10) return;
      } else {
        // Otros documentos: solo números
        if (!/^\d*$/.test(value)) return;
      }
      
      setFormData((prev) => ({ ...prev, [name]: value }));
      
      const newErrors = { ...formErrors };
      
      // Limpiar error anterior primero
      if (newErrors.documentNumber) {
        delete newErrors.documentNumber;
      }
      
      // Validar longitud según tipo de documento
      if (value) {
        if (formData.documentType === 'PP') {
          if (value.length < 6) {
            newErrors.documentNumber = 'El pasaporte debe tener entre 6 y 10 caracteres';
          }
        }
      }
      
      setFormErrors(newErrors);
      return;
    }

    if (name === "phoneNumber") {
      if (!/^\d*$/.test(value)) return;
      setFormData((prev) => ({ ...prev, [name]: value }));
      // Validación inmediata de teléfono
      const newErrors = { ...formErrors };
      if (value && value.length !== 10) {
        newErrors.phoneNumber = "El teléfono debe tener exactamente 10 dígitos";
      } else if (!value) {
        newErrors.phoneNumber = "Teléfono es obligatorio";
      } else {
        delete newErrors.phoneNumber;
      }
      setFormErrors(newErrors);
      return;
    }

    // Validación inmediata de nombres y apellidos - SOLO PERMITIR LETRAS Y ESPACIOS
    if (name === "firstName" || name === "lastName") {
      // Prevenir entrada de números y caracteres especiales
      if (value && !isValidName(value)) {
        return; // No actualizar el estado si contiene caracteres inválidos
      }
      
      // Convertir a mayúsculas automáticamente
      const upperCaseValue = value.toUpperCase();
      
      setFormData((prev) => ({ ...prev, [name]: upperCaseValue }));
      
      const newErrors = { ...formErrors };
      if (!upperCaseValue) {
        newErrors[name] = name === "firstName" ? "Nombre es obligatorio" : "Apellido es obligatorio";
      } else {
        delete newErrors[name];
      }
      setFormErrors(newErrors);
      return;
    }

    // Validación inmediata de campos obligatorios
    if (name === "documentType" || name === "role") {
      const newErrors = { ...formErrors };
      if (!value) {
        newErrors[name] = name === "documentType" ? 
          "Tipo de documento es obligatorio" : 
          "Rol es obligatorio";
      } else {
        delete newErrors[name];
      }
      setFormErrors(newErrors);
    }

    if (name === "firstName" || name === "lastName") {
      setFormData((prev) => ({ ...prev, [name]: value.toUpperCase() }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (name === "role") {
      const selectedRole = rolesList.find(role => role.id === parseInt(value));
      const isDoctorRole = selectedRole?.name === "Doctor";
      setIsDoctor(isDoctorRole);
      
      // Si no es doctor, limpiar la especialidad
      if (!isDoctorRole) {
        setFormData((prev) => ({ ...prev, [name]: value, specialty: "" }));
        // También limpiar el error de especialidad si existe
        const newErrors = { ...formErrors };
        delete newErrors.specialty;
        setFormErrors(newErrors);
        return;
      }
    }

    if (name === 'birthdate') {
      setFormData(prev => ({ ...prev, [name]: value }));
      
      const newErrors = { ...formErrors };
      
      if (newErrors.birthdate) {
        delete newErrors.birthdate;
      }

      if (value === '') {
        newErrors.birthdate = 'Fecha de nacimiento es obligatoria';
      } else if (value.length < 10) {
        newErrors.birthdate = 'Ingrese la fecha completa (día/mes/año)';
      } else if (value.length === 10) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const birthDate = new Date(value);

        if (isNaN(birthDate.getTime())) {
          newErrors.birthdate = 'Fecha de nacimiento inválida';
        } else if (birthDate > today) {
          newErrors.birthdate = 'La fecha de nacimiento no puede ser en el futuro';
        } else {
          const calculatedAge = calculateAge(value);
          // ✅ Validación específica para usuarios: deben ser mayores de edad
          if (calculatedAge < 18) {
            newErrors.birthdate = 'Los usuarios del sistema deben ser mayores de 18 años';
          } else if (calculatedAge > 80) {
            newErrors.birthdate = 'Edad inválida - debe estar entre 18 y 80 años';
          }
        }
      }

      setFormErrors({ ...newErrors, _timestamp: Date.now() });
      return;
    }
  };

const handleEmailChange = (e) => {
  const { value } = e.target;
  setFormData((prev) => ({ ...prev, email: value }));
  const newErrors = { ...formErrors };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
  if (!value) {
    newErrors.email = 'Correo electrónico es obligatorio';
  } else if (!emailRegex.test(value)) {
    newErrors.email = 'Ingrese un correo electrónico válido';
  } else {
    delete newErrors.email;
  }
  setFormErrors(newErrors);
};

  // Función para validar solo letras, espacios y caracteres acentuados
  const isValidName = (name) => {
    // Regex más estricta: solo letras (incluye acentos), espacios, y algunos caracteres especiales del español
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]*$/;
    return nameRegex.test(name) && name.trim().length > 0;
  };

  const validateForm = () => {
    const errors = {};
    
    // Validar campos obligatorios
    if (!formData.documentType) errors.documentType = 'Tipo de documento es obligatorio';
    if (!formData.documentNumber) errors.documentNumber = 'Número de documento es obligatorio';
    if (!formData.firstName) errors.firstName = 'Nombre es obligatorio';
    if (!formData.lastName) errors.lastName = 'Apellido es obligatorio';
    
    // Validar formato de nombres
    if (formData.firstName && !isValidName(formData.firstName)) {
      errors.firstName = 'El nombre solo puede contener letras y espacios';
    }
    if (formData.lastName && !isValidName(formData.lastName)) {
      errors.lastName = 'El apellido solo puede contener letras y espacios';
    }
    if (!formData.email) errors.email = 'Correo electrónico es obligatorio';
    if (!formData.phoneNumber) errors.phoneNumber = 'Teléfono es obligatorio';
    if (!formData.role) errors.role = 'Rol es obligatorio';
    if (isDoctor && !formData.specialty) errors.specialty = 'Especialidad es obligatoria';

    // Validar email
    if (formData.email && (!formData.email.includes('@') || !formData.email.includes('.'))) {
      errors.email = 'Ingrese un correo electrónico válido';
    }

    // Validar teléfono
    if (formData.phoneNumber && formData.phoneNumber.length !== 10) {
      errors.phoneNumber = 'El teléfono debe tener exactamente 10 dígitos';
    }

    // Validar número de documento según tipo
    if (formData.documentNumber) {
      if (formData.documentType === 'PP') {
        if (formData.documentNumber.length < 6 || formData.documentNumber.length > 10) {
          errors.documentNumber = 'El pasaporte debe tener entre 6 y 10 caracteres';
        }
        if (!/^[a-zA-Z0-9]+$/.test(formData.documentNumber)) {
          errors.documentNumber = 'El pasaporte solo puede contener letras y números';
        }
      }
    }


    if (!formData.birthdate) {
      errors.birthdate = 'Fecha de nacimiento es obligatoria';
    } else if (formData.birthdate.length !== 10) {
      errors.birthdate = 'Ingrese la fecha completa';
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const birthDate = new Date(formData.birthdate);

      if (isNaN(birthDate.getTime())) {
        errors.birthdate = 'Fecha de nacimiento inválida';
      } else if (birthDate > today) {
        errors.birthdate = 'La fecha de nacimiento no puede ser en el futuro';
      } else if (age !== null) {
        // ✅ Validación específica para usuarios del sistema
        if (age < 18) {
          errors.birthdate = 'Los usuarios del sistema deben ser mayores de 18 años';
        } else if (age > 80) {
          errors.birthdate = 'Edad inválida - debe estar entre 18 y 80 años';
        }
      }
    }

    setFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      setFormError("Por favor, complete todos los campos obligatorios correctamente.");
      toast.error("Por favor, complete los campos obligatorios");
      return false;
    }
    
    setFormError("");
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Mostrar modal de confirmación
    setShowConfirmModal(true);
  };

  const confirmSubmit = async () => {
    setShowConfirmModal(false);

    const userData = {
      document_type: formData.documentType,
      document_number: formData.documentNumber,
      phone: formData.phoneNumber,
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      role_id: parseInt(formData.role),
      specialty: formData.specialty,
      birthdate: formData.birthdate  
    };

    try {
      setLoading(true);
      await createUser(userData, token);
      setSuccessMessage("Usuario creado exitosamente. Se han enviado las credenciales por correo electrónico.");
      setFormError('');
      setFormErrors({});
      setEmailError('');
      setFormData({
        documentType: "",
        documentNumber: "",
        phoneNumber: "",
        firstName: "",
        lastName: "",
        email: "",
        role: "",
        specialty: "",
        birthdate: "",  
      });
      setIsDoctor(false);
      setAge(null);  
      toast.success("Usuario registrado exitosamente");
    } catch (error) {
      console.error('Error al registrar el usuario:', error);
      setFormError(error.message || 'Error al registrar el usuario.');
      setSuccessMessage('');
      toast.error("Error al registrar usuario");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      documentType: "",
      documentNumber: "",
      phoneNumber: "",
      firstName: "",
      lastName: "",
      email: "",
      role: "",
      specialty: "",
      birthdate: "",
    });
    setIsDoctor(false);
    setEmailError('');
    setFormError('');
    setFormErrors({});
    setSuccessMessage('');
  };

  if (!token) return <p>Cargando autenticación...</p>;
  
  if (!rolesList || rolesList.length === 0) {
    return <p className="font-poppins text-center mt-10 text-18">Cargando...</p>;
  }

  return (
    <main className="flex-1 flex flex-col items-center bg-gray-50 pt-8 pb-10 px-2">
      <h1 className="text-header-blue text-46 font-bold font-poppins mb-8 text-center">
        REGISTRO DE USUARIOS
      </h1>
      {formError && (
        <div className="mb-4 w-full max-w-[700px] p-3 bg-red-100 border border-red-400 text-red-700 rounded text-center">
          {formError}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 w-full max-w-[700px] p-3 bg-green-100 border border-green-400 text-green-700 rounded text-center">
          {successMessage}
        </div>
      )}
      
      {formData.birthdate && formData.birthdate.length > 0 && (
        <div className={`mb-6 p-4 rounded-lg max-w-[700px] w-full ${
          (age !== null && (age < 18 || age > 80)) || formErrors.birthdate
            ? 'bg-red-50 border border-red-200'
            : formData.birthdate.length === 10 && age !== null && age >= 18 && age <= 80
              ? 'bg-blue-50 border border-blue-200'
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
          <p className={`font-poppins ${
            (age !== null && (age < 18 || age > 80)) || formErrors.birthdate
              ? 'text-red-700'
              : formData.birthdate.length === 10 && age !== null && age >= 18 && age <= 80
                ? 'text-blue-700'
                : 'text-yellow-700'
            }`}>
            {formData.birthdate.length < 10 ? (
              <>
                <span className="font-semibold">⏳ Completando fecha de nacimiento...</span>
                <span className="block text-sm mt-1">
                  Fecha actual: {formData.birthdate}
                </span>
              </>
            ) : formData.birthdate.length === 10 && age !== null && age >= 18 && age <= 80 ? (
              <>
                <span className="font-semibold">Fecha válida</span>
                <span className="block text-sm mt-1">
                  Fecha de nacimiento: {formData.birthdate} | Edad: {age} años
                </span>
              </>
            ) : age !== null && age < 18 ? (
              <>
                <span className="font-semibold">⚠️ Edad insuficiente</span>
                <span className="block text-sm mt-1">
                  Los usuarios del sistema deben ser mayores de 18 años (Edad actual: {age} años)
                </span>
              </>
            ) : age !== null && age > 90 ? (
              <>
                <span className="font-semibold">⚠️ Edad excesiva</span>
                <span className="block text-sm mt-1">
                  Edad máxima permitida: 90 años (Edad actual: {age} años)
                </span>
              </>
            ) : (
              <>
                <span className="font-semibold">⚠️ Fecha inválida</span>
                <span className="block text-sm mt-1">
                  Verifique el formato de la fecha de nacimiento
                </span>
              </>
            )}
          </p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[700px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-[80px] gap-y-4 justify-center"
      >
        {/* Columna Izquierda */}
        <div className="flex flex-col items-center md:items-start w-full">
          <label className="block text-gray-700 font-poppins font-semibold mb-2 text-18">Tipo de documento *</label>
          <Select
            name="documentType"
            value={formData.documentType}
            onChange={handleChange}
            error={!!formErrors.documentType}
            placeholder="Seleccione tipo de documento"
          >
            <option value="CC">Cédula de Ciudadanía</option>
            <option value="CE">Cédula de Extranjería</option>
            <option value="PP">Pasaporte</option>
          </Select>
          {formErrors.documentType && (
            <p className="text-red-500 text-sm mt-2 font-poppins">{formErrors.documentType}</p>
          )}
        </div>
        {/* Columna Derecha */}
        <div className="flex flex-col items-center md:items-start w-full">
          <label className="block text-gray-700 font-poppins font-semibold mb-2 text-18">Número de documento *</label>
          <Input
            name="documentNumber"
            placeholder="Ingrese el número de documento"
            value={formData.documentNumber}
            onChange={handleChange}
            error={!!formErrors.documentNumber}
          />
          {formErrors.documentNumber && (
            <p className="text-red-500 text-sm mt-2 font-poppins">{formErrors.documentNumber}</p>
          )}
        </div>

        {/* Columna Izquierda */}
        <div className="flex flex-col items-center md:items-start w-full">
          <label className="block text-gray-700 font-poppins font-semibold mb-2 text-18">
            Nombre *
          </label>
          <Input
            name="firstName"
            placeholder="Ingrese el nombre"
            value={formData.firstName}
            onChange={handleChange}
            error={!!formErrors.firstName}
          />
          {formErrors.firstName && (
            <p className="text-red-500 text-sm mt-2 font-poppins">{formErrors.firstName}</p>
          )}
        </div>
        {/* Columna Derecha */}
        <div className="flex flex-col items-center md:items-start w-full">
          <label className="block text-gray-700 font-poppins font-semibold mb-2 text-18">Apellido *</label>
          <Input
            name="lastName"
            placeholder="Ingrese el apellido"
            value={formData.lastName}
            onChange={handleChange}
            error={!!formErrors.lastName}
          />
          {formErrors.lastName && (
            <p className="text-red-500 text-sm mt-2 font-poppins">{formErrors.lastName}</p>
          )}
        </div>

        {/* Columna Izquierda */}
        <div className="flex flex-col items-center md:items-start w-full">
          <label className="block text-gray-700 font-poppins font-semibold mb-2 text-18">Teléfono *</label>
          <Input
            name="phoneNumber"
            placeholder="Ingrese el número de teléfono"
            value={formData.phoneNumber}
            onChange={handleChange}
            error={!!formErrors.phoneNumber}
            maxLength={10}
          />
          {formErrors.phoneNumber && (
            <p className="text-red-500 text-sm mt-2 font-poppins">{formErrors.phoneNumber}</p>
          )}
        </div>
        {/* Columna Derecha */}
        <div className="flex flex-col items-center md:items-start w-full">
          <label className="block text-gray-700 font-poppins font-semibold mb-2 text-18">Correo Electrónico *</label>
          <Input
            name="email"
            placeholder="Ingrese el correo electrónico"
            value={formData.email}
            onChange={handleEmailChange}
            error={!!formErrors.email}
          />
          {formErrors.email && (
            <p className="text-red-500 text-sm mt-2 font-poppins">{formErrors.email}</p>
          )}
        </div>

        {/* Columna Izquierda */}
        <div className="flex flex-col items-center md:items-start w-full">
          <label className="block text-gray-700 font-poppins font-semibold mb-2 text-18">Rol *</label>
          <Select
            name="role"
            value={formData.role}
            onChange={handleChange}
            error={!!formErrors.role}
            placeholder="Seleccione el Rol"
          >
            {rolesList.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
          {formErrors.role && (
            <p className="text-red-500 text-sm mt-2 font-poppins">{formErrors.role}</p>
          )}
        </div>
        {/* Columna Derecha - Especialidad (solo visible si es Doctor) */}
        {isDoctor && (
          <div className="flex flex-col items-center md:items-start w-full">
            <label className="block text-gray-700 font-poppins font-semibold mb-2 text-18">
              Especialidad del doctor *
            </label>
            <Select
              name="specialty"
              value={formData.specialty}
              onChange={handleChange}
              error={!!formErrors.specialty}
              placeholder="Seleccione la especialidad"
            >
              {specialties.map((specialty) => (
                <option key={specialty} value={specialty}>{specialty}</option>
              ))}
            </Select>
            {formErrors.specialty && (
              <p className="text-red-500 text-sm mt-2 font-poppins">{formErrors.specialty}</p>
            )}
          </div>
        )}

        {/* Fecha de nacimiento - PRIMERO para calcular edad */}
        <div className="flex flex-col items-center md:items-start w-full">
          <label className="block text-gray-700 font-poppins font-semibold mb-2 text-18">
            Fecha de nacimiento *
          </label>
          <DateInput
            name="birthdate"
            value={formData.birthdate}
            onChange={handleChange}
            error={!!formErrors.birthdate}
          />
          {formErrors.birthdate && (
            <p className="text-red-500 text-sm mt-2 font-poppins">{formErrors.birthdate}</p>
          )}
        </div>

        {/* Campo vacío para mantener grid */}
        <div></div>
      </form>
      <div className="flex flex-col md:flex-row justify-center items-center md:space-x-6 space-y-4 md:space-y-0 mt-10 w-full max-w-[700px] mx-auto">
        <Button
          onClick={handleCancel}
          className="bg-header-blue hover:bg-header-blue-hover text-white w-full md:w-auto px-10 py-4 font-bold rounded-[40px] text-18 shadow-md"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className={cn(
            "w-full md:w-auto px-10 py-4 font-bold rounded-[40px] !text-18 shadow-md",
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-primary-blue hover:bg-primary-blue-hover text-white"
          )}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Guardando...
            </div>
          ) : (
            "Guardar"
          )}
        </Button>
      </div>

      {/* Modal de confirmación */}
      <ConfirmDialog
        open={showConfirmModal}
        onConfirm={confirmSubmit}
        onCancel={() => setShowConfirmModal(false)}
        title="Confirmar registro"
        message={
          <span>
            ¿Seguro que quieres guardar el registro con número de documento{' '}
            <strong>{formData.documentNumber}</strong>?
          </span>
        }
        confirmText="Sí, guardar"
        cancelText="Cancelar"
      />
    </main>
  );
};

export default RegisterUser;
