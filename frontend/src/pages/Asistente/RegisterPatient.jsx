import React, { useState, useEffect } from "react";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Select from "../../components/Select";
import DateInput from "../../components/DateInput";
import ProgressBar from "../../components/ProgressBar";
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { createPatient } from "../../services/patientService";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

function cn(...args) {
  return twMerge(clsx(args));
}

const RegisterPatient = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    // Datos del paciente
    document_type: "",
    document_number: "",
    nombres: "",
    apellidos: "",
    email: "",
    phone: "",
    occupation: "",
    birthdate: "",
    // Datos del tutor legal
    guardian_document_type: "",
    guardian_document_number: "",
    guardian_nombres: "",
    guardian_apellidos: "",
    guardian_email: "",
    guardian_phone: "",
    guardian_relationship_type: "",
  });

  const [formErrors, setFormErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [patientExists, setPatientExists] = useState(false);
  const [needsGuardian, setNeedsGuardian] = useState(false);
  const [age, setAge] = useState(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  // Función para calcular edad
  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  // Función para calcular progreso
  const calculateProgress = () => {
    const requiredFields = [
      'document_type', 
      'document_number', 
      'nombres', 
      'apellidos', 
      'email', 
      'phone', 
      'occupation', 
      'birthdate'
    ];
    
    const guardianFields = [
      'guardian_document_type',
      'guardian_document_number', 
      'guardian_nombres', 
      'guardian_apellidos', 
      'guardian_email', 
      'guardian_phone',
      'guardian_relationship_type'
    ];

    let totalFields = requiredFields.length;
    let completedFields = 0;

    // Contar campos del paciente completados
    requiredFields.forEach(field => {
      if (formData[field] && String(formData[field]).trim() !== '') {
        completedFields++;
      }
    });

    // Si necesita tutor, agregar esos campos al cálculo
    if (needsGuardian) {
      totalFields += guardianFields.length;
      guardianFields.forEach(field => {
        if (formData[field] && String(formData[field]).trim() !== '') {
          completedFields++;
        }
      });
    }

    return (completedFields / totalFields) * 100;
  };

  // Actualizar progreso cuando cambian los datos del formulario
  useEffect(() => {
    setProgress(calculateProgress());
  }, [formData, needsGuardian]);

  // Actualizar edad y necesidad de tutor cuando cambia la fecha de nacimiento
  useEffect(() => {
    if (formData.birthdate) {
      const calculatedAge = calculateAge(formData.birthdate);
      setAge(calculatedAge);
      
      // Determinar si necesita tutor legal (menor de 18)
      if (calculatedAge !== null && calculatedAge < 18) {
        setNeedsGuardian(true);
      } else {
        setNeedsGuardian(false);
        // Limpiar datos del tutor si ya no es necesario
        setFormData(prev => ({
          ...prev,
          guardian_document_type: "",
          guardian_document_number: "",
          guardian_nombres: "",
          guardian_apellidos: "",
          guardian_email: "",
          guardian_phone: "",
          guardian_relationship_type: "",
        }));
      }
    } else {
      setAge(null);
      setNeedsGuardian(false);
    }
  }, [formData.birthdate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Validaciones específicas para teléfono
    if (name === 'phone' || name === 'guardian_phone') {
      // Solo permitir números
      if (!/^\d*$/.test(value)) return;
      
      setFormData((prev) => ({ ...prev, [name]: value }));
      
      // Validar longitud del teléfono
      if (value && value.length !== 10) {
        setFormErrors(prev => ({ ...prev, [name]: 'El teléfono debe tener exactamente 10 dígitos' }));
      } else {
        setFormErrors(prev => ({ ...prev, [name]: '' }));
      }
      return;
    }

    // Validaciones específicas para número de documento
    if (name === 'document_number' || name === 'guardian_document_number') {
      // Solo permitir números
      if (!/^\d*$/.test(value)) return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Limpiar error específico del campo
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleEmailChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Validar email
    if (value && (!value.includes('@') || !value.includes('.'))) {
      setFormErrors(prev => ({ ...prev, [name]: 'Ingrese un correo electrónico válido' }));
    } else {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    // Validar campos obligatorios del paciente
    if (!formData.document_type) errors.document_type = 'Tipo de documento es obligatorio';
    if (!formData.document_number) errors.document_number = 'Número de documento es obligatorio';
    if (!formData.nombres) errors.nombres = 'Nombres son obligatorios';
    if (!formData.apellidos) errors.apellidos = 'Apellidos son obligatorios';
    if (!formData.email) errors.email = 'Correo electrónico es obligatorio';
    if (!formData.phone) errors.phone = 'Teléfono es obligatorio';
    if (!formData.occupation) errors.occupation = 'Ocupación es obligatoria';
    if (!formData.birthdate) errors.birthdate = 'Fecha de nacimiento es obligatoria';

    // Validar restricciones específicas del paciente
    if (formData.document_type === 'TI' && age !== null && age <= 7) {
      errors.document_type = 'La Tarjeta de Identidad es solo para mayores de 7 años';
    }

    // Validar teléfono siempre que se ingrese
    if (formData.phone && formData.phone.length !== 10) {
      errors.phone = 'El teléfono debe tener exactamente 10 dígitos';
    }

    // Validar campos del tutor si es necesario
    if (needsGuardian) {
      if (!formData.guardian_document_type) errors.guardian_document_type = 'Tipo de documento del tutor es obligatorio';
      if (!formData.guardian_document_number) errors.guardian_document_number = 'Número de documento del tutor es obligatorio';
      if (!formData.guardian_nombres) errors.guardian_nombres = 'Nombres del tutor son obligatorios';
      if (!formData.guardian_apellidos) errors.guardian_apellidos = 'Apellidos del tutor son obligatorios';
      if (!formData.guardian_email) errors.guardian_email = 'Correo del tutor es obligatorio';
      if (!formData.guardian_phone) errors.guardian_phone = 'Teléfono del tutor es obligatorio';
      if (!formData.guardian_relationship_type) errors.guardian_relationship_type = 'La relación con el paciente es obligatoria';

      // Validar teléfono del tutor siempre que se ingrese
      if (formData.guardian_phone && formData.guardian_phone.length !== 10) {
        errors.guardian_phone = 'El teléfono del tutor debe tener exactamente 10 dígitos';
      }

      // Nota: En el registro de pacientes no tenemos la fecha de nacimiento del tutor
      // La validación de edad del tutor se debe hacer en el backend o en el proceso de edición
    }

    // Verificar errores de email
    if (formErrors.email || formErrors.guardian_email) {
      Object.assign(errors, formErrors);
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setFormError('');

    if (!validateForm()) {
      setFormError('Por favor, complete todos los campos obligatorios.');
      return;
    }

    // Procesar nombres y apellidos para el paciente
    const nombresArray = formData.nombres.trim().split(' ');
    const first_name = nombresArray[0] || '';
    const middle_name = nombresArray.slice(1).join(' ') || null;

    const apellidosArray = formData.apellidos.trim().split(' ');
    const first_surname = apellidosArray[0] || '';
    const second_surname = apellidosArray.slice(1).join(' ') || null;

    // Procesar nombres y apellidos para el tutor si es necesario
    let guardian_first_name = '';
    let guardian_middle_name = null;
    let guardian_first_surname = '';
    let guardian_second_surname = null;

    if (needsGuardian) {
      const guardianNombresArray = formData.guardian_nombres.trim().split(' ');
      guardian_first_name = guardianNombresArray[0] || '';
      guardian_middle_name = guardianNombresArray.slice(1).join(' ') || null;

      const guardianApellidosArray = formData.guardian_apellidos.trim().split(' ');
      guardian_first_surname = guardianApellidosArray[0] || '';
      guardian_second_surname = guardianApellidosArray.slice(1).join(' ') || null;
    }

    const patientPayload = {
      person: {
        document_type: formData.document_type,
        document_number: formData.document_number,
        first_name: first_name,
        middle_name: middle_name,
        first_surname: first_surname,
        second_surname: second_surname,
        email: formData.email,
        phone: formData.phone,
        birthdate: formData.birthdate,
      },
      occupation: formData.occupation,
      requires_guardian: needsGuardian,
      guardian: needsGuardian ? {
        person: {
          document_type: formData.guardian_document_type,
          document_number: formData.guardian_document_number,
          first_name: guardian_first_name,
          middle_name: guardian_middle_name,
          first_surname: guardian_first_surname,
          second_surname: guardian_second_surname,
          email: formData.guardian_email,
          phone: formData.guardian_phone,
          birthdate: "2000-01-01", // Placeholder, el backend no lo requiere para el tutor
        },
        relationship_type: formData.guardian_relationship_type,
      } : null,
    };

    try {
      setLoading(true);
      await createPatient(patientPayload, token);
      setSuccessMessage("¡Paciente registrado con éxito!");
      
      // Resetear el formulario después del éxito
      setFormData({
        document_type: "",
        document_number: "",
        nombres: "",
        apellidos: "",
        email: "",
        phone: "",
        occupation: "",
        birthdate: "",
        guardian_document_type: "",
        guardian_document_number: "",
        guardian_nombres: "",
        guardian_apellidos: "",
        guardian_email: "",
        guardian_phone: "",
        guardian_relationship_type: "",
      });
      setFormErrors({});
      setNeedsGuardian(false);
      setAge(null);
      setProgress(0);
    } catch (error) {
      console.error('Error al registrar el paciente:', error);
      setFormError(error.message || 'Error al registrar el paciente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      document_type: "",
      document_number: "",
      nombres: "",
      apellidos: "",
      email: "",
      phone: "",
      occupation: "",
      birthdate: "",
      guardian_document_type: "",
      guardian_document_number: "",
      guardian_nombres: "",
      guardian_apellidos: "",
      guardian_email: "",
      guardian_phone: "",
      guardian_relationship_type: "",
    });
    setFormErrors({});
    setFormError('');
    setSuccessMessage('');
    setPatientExists(false);
    setNeedsGuardian(false);
    setAge(null);
    setProgress(0);
  };

  return (
    <main className="flex-1 flex flex-col items-center bg-gray-50 pt-8 pb-10 px-2">
      <h1 className="text-header-blue text-46 font-bold font-poppins mb-8 text-center">
        REGISTRO DE PACIENTES
      </h1>
      
      {/* Barra de progreso */}
      <ProgressBar progress={progress} />

      {/* Mostrar edad si está calculada */}
      {age !== null && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-700 font-poppins">
            Edad: {age} años
            {needsGuardian && (
              <span className="ml-2 text-blue-800 font-semibold">
                - Se requiere información del tutor legal
              </span>
            )}
          </p>
        </div>
      )}
      
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

      <form 
        onSubmit={handleSubmit}
        className="w-full max-w-[700px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-[80px] gap-y-4 justify-center"
      >
        {/* Sección de datos del paciente */}
        <div className="md:col-span-2 mb-2">
          <h2 className="text-xl font-poppins font-semibold text-header-blue mb-4 text-left">
            Datos del Paciente
          </h2>
        </div>
        
        {/* Tipo de documento */}
        <div className="flex flex-col items-center md:items-start w-full">
          <label className="block text-gray-700 font-poppins font-semibold mb-2 text-18">
            Tipo de documento *
          </label>
          <Select
            name="document_type"
            value={formData.document_type}
            onChange={handleChange}
            error={!!formErrors.document_type}
            placeholder="Seleccione tipo de documento"
          >
            <option value="CC">Cédula de Ciudadanía</option>
            <option value="TI">Tarjeta de Identidad</option>
            <option value="CE">Cédula de Extranjería</option>
            <option value="PA">Pasaporte</option>
          </Select>
          {formErrors.document_type && (
            <p className="text-red-500 text-sm mt-2 font-poppins">{formErrors.document_type}</p>
          )}
        </div>

        {/* Número de documento */}
        <div className="flex flex-col items-center md:items-start w-full">
          <label className="block text-gray-700 font-poppins font-semibold mb-2 text-18">
            Número de documento *
          </label>
          <Input
            name="document_number"
            type="text"
            placeholder="Ingrese el número de documento"
            value={formData.document_number}
            onChange={handleChange}
            error={!!formErrors.document_number}
          />
          {formErrors.document_number && (
            <p className="text-red-500 text-sm mt-2 font-poppins">{formErrors.document_number}</p>
          )}
        </div>

        {/* Nombres */}
        <div className="flex flex-col items-center md:items-start w-full">
          <label className="block text-gray-700 font-poppins font-semibold mb-2 text-18">
            Nombres *
          </label>
          <Input
            name="nombres"
            type="text"
            placeholder="Ingrese los nombres"
            value={formData.nombres}
            onChange={handleChange}
            error={!!formErrors.nombres}
          />
          {formErrors.nombres && (
            <p className="text-red-500 text-sm mt-2 font-poppins">{formErrors.nombres}</p>
          )}
        </div>

        {/* Apellidos */}
        <div className="flex flex-col items-center md:items-start w-full">
          <label className="block text-gray-700 font-poppins font-semibold mb-2 text-18">
            Apellidos *
          </label>
          <Input
            name="apellidos"
            type="text"
            placeholder="Ingrese los apellidos"
            value={formData.apellidos}
            onChange={handleChange}
            error={!!formErrors.apellidos}
          />
          {formErrors.apellidos && (
            <p className="text-red-500 text-sm mt-2 font-poppins">{formErrors.apellidos}</p>
          )}
        </div>

        {/* Teléfono */}
        <div className="flex flex-col items-center md:items-start w-full">
          <label className="block text-gray-700 font-poppins font-semibold mb-2 text-18">
            Teléfono *
          </label>
          <Input
            name="phone"
            type="tel"
            placeholder="Ingrese el número de teléfono"
            value={formData.phone}
            onChange={handleChange}
            error={!!formErrors.phone}
            maxLength={10}
          />
          {formErrors.phone && (
            <p className="text-red-500 text-sm mt-2 font-poppins">{formErrors.phone}</p>
          )}
        </div>

        {/* Correo electrónico */}
        <div className="flex flex-col items-center md:items-start w-full">
          <label className="block text-gray-700 font-poppins font-semibold mb-2 text-18">
            Correo electrónico *
          </label>
          <Input
            name="email"
            type="email"
            placeholder="Ingrese el correo electrónico"
            value={formData.email}
            onChange={handleEmailChange}
            error={!!formErrors.email}
          />
          {formErrors.email && (
            <p className="text-red-500 text-sm mt-2 font-poppins">{formErrors.email}</p>
          )}
        </div>

        {/* Ocupación */}
        <div className="flex flex-col items-center md:items-start w-full">
          <label className="block text-gray-700 font-poppins font-semibold mb-2 text-18">
            Ocupación *
          </label>
          <Input
            name="occupation"
            type="text"
            placeholder="Ingrese la ocupación"
            value={formData.occupation}
            onChange={handleChange}
            error={!!formErrors.occupation}
          />
          {formErrors.occupation && (
            <p className="text-red-500 text-sm mt-2 font-poppins">{formErrors.occupation}</p>
          )}
        </div>

        {/* Fecha de nacimiento */}
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

        {/* Sección de datos del tutor legal - Solo se muestra si es necesario */}
        {needsGuardian && (
          <>
            <div className="md:col-span-2 mt-8 mb-2">
              <hr className="border-t border-blue-300 mb-4" />
              <h2 className="text-xl font-poppins font-semibold text-header-blue mb-4 text-left">
                Tutor Legal
              </h2>
            </div>
            
            {/* Tipo de documento del tutor */}
            <div className="flex flex-col items-center md:items-start w-full">
              <label className="block text-gray-700 font-poppins font-semibold mb-2 text-18">
                Tipo de documento *
              </label>
              <Select
                name="guardian_document_type"
                value={formData.guardian_document_type}
                onChange={handleChange}
                error={!!formErrors.guardian_document_type}
                placeholder="Seleccione tipo de documento"
              >
                <option value="CC">Cédula de Ciudadanía</option>
                <option value="TI">Tarjeta de Identidad</option>
                <option value="CE">Cédula de Extranjería</option>
                <option value="PA">Pasaporte</option>
              </Select>
              {formErrors.guardian_document_type && (
                <p className="text-red-500 text-sm mt-2 font-poppins">{formErrors.guardian_document_type}</p>
              )}
            </div>

            {/* Número de documento del tutor */}
            <div className="flex flex-col items-center md:items-start w-full">
              <label className="block text-gray-700 font-poppins font-semibold mb-2 text-18">
                Número de documento *
              </label>
              <Input
                name="guardian_document_number"
                type="text"
                placeholder="Ingrese el número de documento"
                value={formData.guardian_document_number}
                onChange={handleChange}
                error={!!formErrors.guardian_document_number}
              />
              {formErrors.guardian_document_number && (
                <p className="text-red-500 text-sm mt-2 font-poppins">{formErrors.guardian_document_number}</p>
              )}
            </div>

            {/* Nombres del tutor */}
            <div className="flex flex-col items-center md:items-start w-full">
              <label className="block text-gray-700 font-poppins font-semibold mb-2 text-18">
                Nombres *
              </label>
              <Input
                name="guardian_nombres"
                type="text"
                placeholder="Ingrese los nombres"
                value={formData.guardian_nombres}
                onChange={handleChange}
                error={!!formErrors.guardian_nombres}
              />
              {formErrors.guardian_nombres && (
                <p className="text-red-500 text-sm mt-2 font-poppins">{formErrors.guardian_nombres}</p>
              )}
            </div>

            {/* Apellidos del tutor */}
            <div className="flex flex-col items-center md:items-start w-full">
              <label className="block text-gray-700 font-poppins font-semibold mb-2 text-18">
                Apellidos *
              </label>
              <Input
                name="guardian_apellidos"
                type="text"
                placeholder="Ingrese los apellidos"
                value={formData.guardian_apellidos}
                onChange={handleChange}
                error={!!formErrors.guardian_apellidos}
              />
              {formErrors.guardian_apellidos && (
                <p className="text-red-500 text-sm mt-2 font-poppins">{formErrors.guardian_apellidos}</p>
              )}
            </div>

            {/* Relación con el paciente */}
            <div className="flex flex-col items-center md:items-start w-full">
              <label className="block text-gray-700 font-poppins font-semibold mb-2 text-18">
                Relación con el paciente *
              </label>
              <Select
                name="guardian_relationship_type"
                value={formData.guardian_relationship_type}
                onChange={handleChange}
                error={!!formErrors.guardian_relationship_type}
                placeholder="Seleccione la relación"
              >
                <option value="Father">Padre</option>
                <option value="Mother">Madre</option>
                <option value="Grandfather">Abuelo</option>
                <option value="Grandmother">Abuela</option>
                <option value="Legal_Guardian">Tutor Legal</option>
                <option value="Other">Otro</option>
              </Select>
              {formErrors.guardian_relationship_type && (
                <p className="text-red-500 text-sm mt-2 font-poppins">{formErrors.guardian_relationship_type}</p>
              )}
            </div>

            {/* Teléfono del tutor */}
            <div className="flex flex-col items-center md:items-start w-full">
              <label className="block text-gray-700 font-poppins font-semibold mb-2 text-18">
                Teléfono *
              </label>
              <Input
                name="guardian_phone"
                type="tel"
                placeholder="Ingrese el número de teléfono"
                value={formData.guardian_phone}
                onChange={handleChange}
                error={!!formErrors.guardian_phone}
                maxLength={10}
              />
              {formErrors.guardian_phone && (
                <p className="text-red-500 text-sm mt-2 font-poppins">{formErrors.guardian_phone}</p>
              )}
            </div>

            {/* Correo electrónico del tutor */}
            <div className="flex flex-col items-center md:items-start w-full">
              <label className="block text-gray-700 font-poppins font-semibold mb-2 text-18">
                Correo electrónico *
              </label>
              <Input
                name="guardian_email"
                type="email"
                placeholder="Ingrese el correo electrónico"
                value={formData.guardian_email}
                onChange={handleEmailChange}
                error={!!formErrors.guardian_email}
              />
              {formErrors.guardian_email && (
                <p className="text-red-500 text-sm mt-2 font-poppins">{formErrors.guardian_email}</p>
              )}
            </div>
          </>
        )}
      </form>

      {/* Botones de acción */}
      <div className="flex flex-col md:flex-row justify-center items-center md:space-x-6 space-y-4 md:space-y-0 mt-10 w-full max-w-[700px] mx-auto">
        <Button 
          onClick={handleSubmit} 
          disabled={progress < 100 || loading}
          className={cn(
            "w-full md:w-auto px-10 py-4 font-bold rounded-[40px] !text-18 shadow-md",
            progress < 100 || loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-primary-blue hover:bg-primary-blue-hover text-white"
          )}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Guardando...
            </div>
          ) : (
            "Guardar"
          )}
        </Button>
        <Button 
          onClick={handleCancel} 
          className="bg-header-blue hover:bg-header-blue-hover text-white w-full md:w-auto px-10 py-4 font-bold rounded-[40px] text-18 shadow-md"
        >
          Cancelar
        </Button>
      </div>
    </main>
  );
};

export default RegisterPatient;
