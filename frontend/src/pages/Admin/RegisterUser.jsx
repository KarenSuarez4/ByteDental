import React, { useState, useEffect } from "react";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Select from "../../components/Select";
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { createUser } from "../../services/userService";
import { getRoles } from "../../services/userService";
import { useAuth } from "../../contexts/AuthContext"; 

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
  });

  const [rolesList, setRolesList] = useState([]);
  const [isDoctor, setIsDoctor] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const { currentUser, token } = useAuth();

  const specialties = [
    "Periodoncia",
    "Endodoncia",
    "Cirugía oral y maxilofacial",
    "Odontopediatría",
  ];

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

    if (name === "phoneNumber") {
      if (!/^\d*$/.test(value)) return;
      setFormData((prev) => ({ ...prev, [name]: value }));
      if (value && value.length !== 10) {
        setPhoneError("Ingrese un número válido.");
      } else {
        setPhoneError("");
      }
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "role") {
      const selectedRole = rolesList.find(role => role.id === parseInt(value));
      setIsDoctor(selectedRole?.name === "Doctor");
    }
  };

  const handleEmailChange = (e) => {
    const { value } = e.target;
    setFormData((prev) => ({ ...prev, email: value }));

    if (!value.includes('@') || !value.includes('.')) {
      setEmailError('Ingrese un correo electrónico válido');
    } else {
      setEmailError('');
    }
  };

  const validateForm = () => {
    if (
      !formData.documentType ||
      !formData.documentNumber ||
      !formData.firstName ||
      !formData.lastName ||
      !formData.email ||
      !formData.role ||
      (isDoctor && !formData.specialty)
    ) {
      setFormError("Todos los campos marcados con * son obligatorios.");
      return false;
    }
    if (emailError) {
      setFormError("Por favor, corrige los errores del formulario.");
      return false;
    }
    if (formData.phoneNumber && formData.phoneNumber.length !== 10) {
      setPhoneError("Ingrese un número válido.");
      setFormError("Por favor, corrige los errores del formulario.");
      return false;
    }
    setFormError("");
    setPhoneError("");
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const userData = {
      document_type: formData.documentType,
      document_number: formData.documentNumber,
      phone: formData.phoneNumber,
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      role_id: parseInt(formData.role),
      specialty: formData.specialty
    };

    try {
      await createUser(userData, token);
      setSuccessMessage("Usuario creado exitosamente. Se han enviado las credenciales por correo electrónico.");
      setFormError('');
      setFormData({
        documentType: "",
        documentNumber: "",
        phoneNumber: "",
        firstName: "",
        lastName: "",
        email: "",
        role: "",
        specialty: "",
      });
      setIsDoctor(false);
    } catch (error) {
      console.error('Error al registrar el usuario:', error);
      setFormError(error.message || 'Error al registrar el usuario.');
      setSuccessMessage('');
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
    });
    setIsDoctor(false);
    setEmailError('');
    setFormError('');
    setSuccessMessage('');
  };

  if (!token) return <p>Cargando autenticación...</p>;
  
  if (!rolesList || rolesList.length === 0) {
    return <p className="font-poppins text-center mt-20 text-xl">Cargando...</p>;
  }

  return (
    <main className="flex-1 flex flex-col items-center bg-gray-50 pt-16 pb-20 px-8">
      <h1 className="text-header-blue text-[46px] font-bold font-poppins mb-15">
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
      <form onSubmit={handleSubmit} className="w-full max-w-[700px] grid grid-cols-1 md:grid-cols-2 gap-x-[75px] gap-y-6">
        {/* Columna Izquierda */}
        <div className="flex flex-col items-start">
          <label className="block text-gray-700 font-poppins font-semibold mb-2">Tipo de documento *</label>
          <Select
            name="documentType"
            value={formData.documentType}
            onChange={handleChange}
            error={!formData.documentType && formError}
            placeholder="Seleccione tipo de documento"
          >
            <option value="CC">Cédula de Ciudadanía</option>
            <option value="TI">Tarjeta de Identidad</option>
            <option value="CE">Cédula de Extranjería</option>
            <option value="PP">Pasaporte</option>
          </Select>
        </div>
        {/* Columna Derecha */}
        <div className="flex flex-col items-start">
          <label className="block text-gray-700 font-poppins font-semibold mb-2">Número de documento *</label>
          <Input
            name="documentNumber"
            placeholder="Ingrese el número de documento"
            value={formData.documentNumber}
            onChange={handleChange}
            error={!formData.documentNumber && formError}
          />
        </div>

        {/* Columna Izquierda */}
        <div className="flex flex-col items-start">
          <label className="block text-gray-700 font-poppins font-semibold mb-2">Nombre *</label>
          <Input
            name="firstName"
            placeholder="Ingrese el nombre"
            value={formData.firstName}
            onChange={handleChange}
            error={!formData.firstName && formError}
          />
        </div>
        {/* Columna Derecha */}
        <div className="flex flex-col items-start">
          <label className="block text-gray-700 font-poppins font-semibold mb-2">Apellido *</label>
          <Input
            name="lastName"
            placeholder="Ingrese el apellido"
            value={formData.lastName}
            onChange={handleChange}
            error={!formData.lastName && formError}
          />
        </div>

        {/* Columna Izquierda */}
        <div className="flex flex-col items-start">
          <label className="block text-gray-700 font-poppins font-semibold mb-2">Teléfono</label>
          <Input
            name="phoneNumber"
            placeholder="Ingrese el número de teléfono"
            value={formData.phoneNumber}
            onChange={handleChange}
            error={!!phoneError}
            maxLength={10}
          />
          {phoneError && (
            <p className="text-red-500 text-sm mt-2 font-poppins">{phoneError}</p>
          )}
        </div>
        {/* Columna Derecha */}
        <div className="flex flex-col items-start">
          <label className="block text-gray-700 font-poppins font-semibold mb-2">Correo Electrónico *</label>
          <Input
            name="email"
            placeholder="Ingrese el correo electrónico"
            value={formData.email}
            onChange={handleEmailChange}
            error={!!emailError}
          />
          {emailError && (
            <p className="text-red-500 text-sm mt-2 font-poppins">{emailError}</p>
          )}
        </div>

        {/* Columna Izquierda */}
        <div className="flex flex-col items-start">
          <label className="block text-gray-700 font-poppins font-semibold mb-2">Rol *</label>
          <Select
            name="role"
            value={formData.role}
            onChange={handleChange}
            error={!formData.role && formError}
            placeholder="Seleccione el Rol"
          >
            {rolesList.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
        </div>
        {/* Columna Derecha */}
        <div className="flex flex-col items-start">
          <label className={cn("block text-gray-700 font-poppins font-semibold mb-2", !isDoctor && 'text-gray-400')}>
            Especialidad del doctor {isDoctor && '*'}
          </label>
          <Select
            name="specialty"
            value={formData.specialty}
            onChange={handleChange}
            disabled={!isDoctor}
            error={isDoctor && !formData.specialty && formError}
            placeholder="Seleccione la especialidad"
          >
            {specialties.map((specialty) => (
              <option key={specialty} value={specialty}>{specialty}</option>
            ))}
          </Select>
        </div>
      </form>

      <div className="flex justify-center space-x-6 mt-10">
        <Button onClick={handleSubmit} className="bg-primary-blue hover:bg-primary-blue-hover text-white px-10 py-4 font-bold rounded-[40px] text-2xl shadow-md">
          Guardar
        </Button>
        <Button onClick={handleCancel} className="bg-header-blue hover:bg-header-blue-hover text-white px-10 py-4 font-bold rounded-[40px] text-2xl shadow-md">
          Cancelar
        </Button>
      </div>
    </main>
  );
};

export default RegisterUser;
