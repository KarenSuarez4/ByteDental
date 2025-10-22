import React, { useState, useEffect } from "react";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Select from "../../components/Select";
import DateInput from "../../components/DateInput";
import ProgressBar from "../../components/ProgressBar";
import ConfirmDialog from "../../components/ConfirmDialog";
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
    blood_group:"",
    has_disability: "",
    disability_description: "",
    // Datos del tutor legal
    guardian_document_type: "",
    guardian_document_number: "",
    guardian_nombres: "",
    guardian_apellidos: "",
    guardian_email: "",
    guardian_phone: "",
    guardian_birthdate: "",
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
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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

  // Función para validar solo letras y espacios
  const isValidName = (name) => {
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;
    return nameRegex.test(name);
  };

  // Función para filtrar caracteres no válidos en nombres
  const filterValidNameChars = (text) => {
    return text.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
  };

  // Función para obtener tipos de documento válidos según la edad
  const getValidDocumentTypes = (age, isGuardian = false) => {
    if (isGuardian) {
      // Los tutores solo pueden tener documentos de adulto
      return [
        { value: "CC", label: "Cédula de Ciudadanía" },
        { value: "CE", label: "Cédula de Extranjería" },
        { value: "PP", label: "Pasaporte" }
      ];
    }

    if (age === null) {
      // Si no hay edad calculada, mostrar todos los tipos
      return [
        { value: "CC", label: "Cédula de Ciudadanía" },
        { value: "TI", label: "Tarjeta de Identidad" },
        { value: "CE", label: "Cédula de Extranjería" },
        { value: "PP", label: "Pasaporte" }
      ];
    }

    if (age >= 0 && age <= 17) {
      // Menores de 18: Solo TI, CE, PP
      return [
        { value: "TI", label: "Tarjeta de Identidad" },
        { value: "CE", label: "Cédula de Extranjería" },
        { value: "PP", label: "Pasaporte" }
      ];
    } else {
      // Mayores de 18: Solo CC, CE, PP (No TI)
      return [
        { value: "CC", label: "Cédula de Ciudadanía" },
        { value: "CE", label: "Cédula de Extranjería" },
        { value: "PP", label: "Pasaporte" }
      ];
    }
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
      'blood_group',
      'birthdate',
      'has_disability'
    ];

    // Si tiene discapacidad, incluir la descripción como campo requerido
    const disabilityFields = formData.has_disability === true || formData.has_disability === "true" ? ['disability_description'] : [];

    const guardianFields = [
      'guardian_document_type',
      'guardian_document_number',
      'guardian_nombres',
      'guardian_apellidos',
      'guardian_email',
      'guardian_phone',
      'guardian_birthdate',
      'guardian_relationship_type'
    ];

    let totalFields = requiredFields.length + disabilityFields.length;
    let completedFields = 0;

    // Contar campos del paciente completados
    requiredFields.forEach(field => {
      if (field === 'has_disability') {
        // Para has_disability, considerar válido si es "true" o "false" (no cadena vacía)
        if (formData[field] === "true" || formData[field] === "false" || formData[field] === true || formData[field] === false) {
          completedFields++;
        }
      } else if (formData[field] && String(formData[field]).trim() !== '') {
        completedFields++;
      }
    });

    // Contar campos de discapacidad si aplica
    disabilityFields.forEach(field => {
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

  // Actualizar edad y necesidad de tutor cuando cambia la fecha de nacimiento o discapacidad
  useEffect(() => {
    if (formData.birthdate) {
      const calculatedAge = calculateAge(formData.birthdate);
      setAge(calculatedAge);

      // Determinar si necesita tutor legal (menor de 18 O mayor de 64 O tiene discapacidad)
      if (calculatedAge !== null && (calculatedAge < 18 || calculatedAge > 64) || (formData.has_disability === true || formData.has_disability === "true")) {
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
          guardian_birthdate: "",
          guardian_relationship_type: "",
        }));
      }
    } else {
      setAge(null);
      // Si no hay fecha pero tiene discapacidad, aún necesita tutor
      if (formData.has_disability === true || formData.has_disability === "true") {
        setNeedsGuardian(true);
      } else {
        setNeedsGuardian(false);
      }
    }
  }, [formData.birthdate, formData.has_disability]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Convertir nombres y apellidos a mayúsculas
    if (["nombres", "apellidos", "guardian_nombres", "guardian_apellidos"].includes(name)) {
      setFormData((prev) => ({ ...prev, [name]: value.toUpperCase() }));
      return;
    }

    // Validaciones específicas para teléfono
    if (name === 'phone' || name === 'guardian_phone') {
      // Solo permitir números
      if (!/^\d*$/.test(value)) return;

      setFormData((prev) => ({ ...prev, [name]: value }));

      const newErrors = { ...formErrors };

      // Limpiar error anterior primero
      if (newErrors[name]) {
        delete newErrors[name];
      }

      // Validar longitud del teléfono
      if (value && value.length !== 10) {
        newErrors[name] = 'El teléfono debe tener exactamente 10 dígitos';
      }

      setFormErrors({ ...newErrors, _timestamp: Date.now() });
      return;
    }

    // Validaciones específicas para número de documento
    if (name === 'document_number' || name === 'guardian_document_number') {
      const docTypeField = name === 'document_number' ? 'document_type' : 'guardian_document_type';
      const docType = formData[docTypeField];

      // Validar según el tipo de documento
      if (docType === 'PP') {
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
      if (newErrors[name]) {
        delete newErrors[name];
      }

      // Validar longitud según tipo de documento
      if (value) {
        if (docType === 'PP') {
          if (value.length < 6) {
            newErrors[name] = 'El pasaporte debe tener entre 6 y 10 caracteres';
          }
        }
      }

      if (Object.keys(newErrors).length !== Object.keys(formErrors).length || newErrors[name]) {
        setFormErrors({ ...newErrors, _timestamp: Date.now() });
      }
      return;
    }

    // Validación preventiva y filtrado para campos de texto que solo deben contener letras
    if (name === 'nombres' || name === 'apellidos' || name === 'guardian_nombres' || name === 'guardian_apellidos' || name === 'occupation') {
      // Filtrar caracteres no válidos antes de establecer el valor
      const filteredValue = filterValidNameChars(value);
      
      // Solo actualizar si el valor filtrado es diferente o si no había filtrado
      if (filteredValue !== value) {
        // Si hubo caracteres inválidos, no actualizar el estado y retornar
        return;
      }

      const newErrors = { ...formErrors };

      // Limpiar error anterior primero
      if (newErrors[name]) {
        delete newErrors[name];
      }

      if (filteredValue && !isValidName(filteredValue)) {
        const fieldNames = {
          nombres: 'Los nombres solo pueden contener letras y espacios',
          apellidos: 'Los apellidos solo pueden contener letras y espacios',
          guardian_nombres: 'Los nombres del tutor solo pueden contener letras y espacios',
          guardian_apellidos: 'Los apellidos del tutor solo pueden contener letras y espacios',
          occupation: 'La ocupación solo puede contener letras y espacios'
        };
        newErrors[name] = fieldNames[name];
      } else if (!filteredValue) {
        const requiredMessages = {
          nombres: 'Nombres son obligatorios',
          apellidos: 'Apellidos son obligatorios',
          guardian_nombres: 'Nombres del tutor son obligatorios',
          guardian_apellidos: 'Los apellidos del tutor son obligatorios',
          occupation: 'Ocupación es obligatoria'
        };
        newErrors[name] = requiredMessages[name];
      }

      setFormErrors({ ...newErrors, _timestamp: Date.now() });
      
      // Actualizar el estado con el valor filtrado
      setFormData((prev) => ({ ...prev, [name]: filteredValue }));
      return;
    }

    // Validación inmediata para fecha de nacimiento
    if (name === 'birthdate') {
      const newErrors = { ...formErrors };

      // Limpiar error anterior primero para forzar re-render
      if (newErrors.birthdate) {
        delete newErrors.birthdate;
      }

      if (value === '') {
        newErrors.birthdate = 'Fecha de nacimiento es obligatoria';
      } else if (value.length < 10) {
        // Mientras se está escribiendo la fecha
        newErrors.birthdate = 'Ingrese la fecha completa (día/mes/año)';
      } else if (value.length === 10) {
        // Validar fecha completa
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const birthDate = new Date(value);

        // Verificar que la fecha sea válida
        if (isNaN(birthDate.getTime())) {
          newErrors.birthdate = 'Fecha de nacimiento inválida';
        } else if (birthDate > today) {
          newErrors.birthdate = 'La fecha de nacimiento no puede ser en el futuro';
        } else {
          // Calcular edad
          const calculatedAge = calculateAge(value);
          if (calculatedAge < 0 || calculatedAge > 120) {
            newErrors.birthdate = 'Edad inválida - debe estar entre 0 y 120 años';
          } else {
            // Validar tipo de documento según la edad y resetear si no es válido
            if (formData.document_type === 'TI' && calculatedAge >= 18) {
              // TI no válido para mayores de 18 años - resetear tipo de documento
              setFormData(prev => ({ ...prev, document_type: "" }));
              if (newErrors.document_type) {
                delete newErrors.document_type;
              }
            } else if (formData.document_type === 'CC' && calculatedAge < 18) {
              // CC no válido para menores de 18 años - resetear tipo de documento
              setFormData(prev => ({ ...prev, document_type: "" }));
              if (newErrors.document_type) {
                delete newErrors.document_type;
              }
            } else {
              // Si el tipo de documento es válido, limpiar cualquier error relacionado
              if (newErrors.document_type && (
                newErrors.document_type.includes('Tarjeta de Identidad') ||
                newErrors.document_type.includes('Cédula de Ciudadanía')
              )) {
                delete newErrors.document_type;
              }
            }
          }
          // Si no hay errores, no agregar nada (ya se limpió arriba)
        }
      }

      // Forzar actualización usando una clave temporal para asegurar re-render
      setFormErrors({ ...newErrors, _timestamp: Date.now() });
    }

    // Validación inmediata para fecha de nacimiento del tutor
    if (name === 'guardian_birthdate') {
      const newErrors = { ...formErrors };

      // Limpiar error anterior primero para forzar re-render
      if (newErrors.guardian_birthdate) {
        delete newErrors.guardian_birthdate;
      }

      if (value === '') {
        newErrors.guardian_birthdate = 'Fecha de nacimiento del tutor es obligatoria';
      } else if (value.length < 10) {
        // Mientras se está escribiendo la fecha
        newErrors.guardian_birthdate = 'Ingrese la fecha completa (día/mes/año)';
      } else if (value.length === 10) {
        // Validar fecha completa
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const birthDate = new Date(value);

        // Verificar que la fecha sea válida
        if (isNaN(birthDate.getTime())) {
          newErrors.guardian_birthdate = 'Fecha de nacimiento inválida';
        } else if (birthDate > today) {
          newErrors.guardian_birthdate = 'La fecha de nacimiento del tutor no puede ser en el futuro';
        } else {
          // Calcular edad
          const guardianAge = calculateAge(value);
          if (guardianAge < 18) {
            newErrors.guardian_birthdate = 'El tutor legal debe ser mayor de 18 años';
          } else if (guardianAge > 120) {
            newErrors.guardian_birthdate = 'Edad inválida - debe estar entre 18 y 120 años';
          }
          // Si no hay errores, no agregar nada (ya se limpió arriba)
        }
      }

      // Forzar actualización usando una clave temporal para asegurar re-render
      setFormErrors({ ...newErrors, _timestamp: Date.now() });
    }

    // Validación inmediata para campos obligatorios
    if (['document_type', 'occupation', 'guardian_document_type', 'guardian_relationship_type'].includes(name)) {
      const newErrors = { ...formErrors };

      // Limpiar error anterior primero
      if (newErrors[name]) {
        delete newErrors[name];
      }

      if (!value) {
        const requiredMessages = {
          document_type: 'Tipo de documento es obligatorio',
          occupation: 'Ocupación es obligatoria',
          guardian_document_type: 'Tipo de documento del tutor es obligatorio',
          guardian_relationship_type: 'La relación con el paciente es obligatoria'
        };
        newErrors[name] = requiredMessages[name];
      }

      setFormErrors({ ...newErrors, _timestamp: Date.now() });
    }

    // Validación en tiempo real para tipo de documento y edad
    if (name === 'document_type') {
      const newErrors = { ...formErrors };

      if (value === 'TI' && formData.birthdate) {
        const age = calculateAge(formData.birthdate);
        if (age !== null && age >= 18) {
          newErrors.document_type = 'La Tarjeta de Identidad es solo para menores de 18 años';
          setFormErrors({ ...newErrors, _timestamp: Date.now() });
        } else {
          // Limpiar cualquier error previo de TI
          if (newErrors.document_type && newErrors.document_type.includes('Tarjeta de Identidad')) {
            delete newErrors.document_type;
            setFormErrors({ ...newErrors, _timestamp: Date.now() });
          }
        }
      } else if (value === 'CC' && formData.birthdate) {
        const age = calculateAge(formData.birthdate);
        if (age !== null && age < 18) {
          newErrors.document_type = 'La Cédula de Ciudadanía es solo para mayores de 18 años';
          setFormErrors({ ...newErrors, _timestamp: Date.now() });
        } else {
          // Limpiar cualquier error previo de CC
          if (newErrors.document_type && newErrors.document_type.includes('Cédula de Ciudadanía')) {
            delete newErrors.document_type;
            setFormErrors({ ...newErrors, _timestamp: Date.now() });
          }
        }
      }
    }

    // Validación para discapacidad
    if (name === 'has_disability') {
      // Guardar como string consistentemente
      const boolValue = value === "true" ? "true" : "false";
      setFormData(prev => ({
        ...prev,
        has_disability: boolValue,
        // Limpiar descripción si se marca como false
        disability_description: value === "false" ? "" : prev.disability_description
      }));

      const newErrors = { ...formErrors };
      if (newErrors.disability_description && value === "false") {
        delete newErrors.disability_description;
        setFormErrors({ ...newErrors, _timestamp: Date.now() });
      }
      return;
    }

    // Validación para descripción de discapacidad
    if (name === 'disability_description') {
      const newErrors = { ...formErrors };

      // Limpiar error anterior primero
      if (newErrors[name]) {
        delete newErrors[name];
      }

      if ((formData.has_disability === true || formData.has_disability === "true") && !value.trim()) {
        newErrors[name] = 'La descripción de la discapacidad es obligatoria';
      }

      setFormErrors({ ...newErrors, _timestamp: Date.now() });
    }

    setFormData((prev) => ({ ...prev, [name]: value }));

    // Limpiar error específico del campo para otros campos que no tienen validación especial
    const specialFields = ['nombres', 'apellidos', 'guardian_nombres', 'guardian_apellidos', 'document_type', 'occupation', 'guardian_document_type', 'guardian_relationship_type', 'birthdate', 'guardian_birthdate', 'phone', 'guardian_phone', 'document_number', 'guardian_document_number', 'has_disability', 'disability_description'];
    if (formErrors[name] && !specialFields.includes(name)) {
      const newErrors = { ...formErrors };
      delete newErrors[name];
      setFormErrors({ ...newErrors, _timestamp: Date.now() });
    }
  };

  const handleEmailChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Validación inmediata de email
    const newErrors = { ...formErrors };

    // Limpiar error anterior primero
    if (newErrors[name]) {
      delete newErrors[name];
    }

    if (!value) {
      newErrors[name] = name === 'email' ? 'Correo electrónico es obligatorio' : 'Correo del tutor es obligatorio';
    } else if (!value.includes('@') || !value.includes('.')) {
      newErrors[name] = 'Ingrese un correo electrónico válido';
    }

    setFormErrors({ ...newErrors, _timestamp: Date.now() });
  };

  const validateForm = () => {
    const errors = {};

    // Validar campos obligatorios del paciente
    if (!formData.document_type) errors.document_type = 'Tipo de documento es obligatorio';
    if (!formData.document_number) errors.document_number = 'Número de documento es obligatorio';
    if (!formData.nombres) errors.nombres = 'Nombres son obligatorios';
    if (!formData.apellidos) errors.apellidos = 'Apellidos son obligatorios';
    if (formData.has_disability === null || formData.has_disability === "") errors.has_disability = '¿Tiene discapacidad? es obligatorio';

    // Validar formato de nombres y apellidos
    if (formData.nombres && !isValidName(formData.nombres)) {
      errors.nombres = 'Los nombres solo pueden contener letras y espacios';
    }
    if (formData.apellidos && !isValidName(formData.apellidos)) {
      errors.apellidos = 'Los apellidos solo pueden contener letras y espacios';
    }
    if (!formData.email) errors.email = 'Correo electrónico es obligatorio';
    if (!formData.phone) errors.phone = 'Teléfono es obligatorio';
    if (!formData.occupation) errors.occupation = 'Ocupación es obligatoria';
    
    // Validar formato de ocupación
    if (formData.occupation && !isValidName(formData.occupation)) {
      errors.occupation = 'La ocupación solo puede contener letras y espacios';
    }
    if (!formData.blood_group) errors.blood_group = 'Grupo sanguíneo es obligatorio';
    if (!formData.birthdate) errors.birthdate = 'Fecha de nacimiento es obligatoria';

    // Validar fecha de nacimiento y edad
    if (formData.birthdate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const birthDate = new Date(formData.birthdate);

      // Verificar que la fecha sea válida
      if (isNaN(birthDate.getTime())) {
        errors.birthdate = 'Fecha de nacimiento inválida';
      }
      // Verificar que la fecha no sea futura
      else if (birthDate > today) {
        errors.birthdate = 'La fecha de nacimiento no puede ser en el futuro';
      }
      // Verificar edad mínima (0 años) y máxima (120 años)
      else if (age !== null && (age < 0 || age > 120)) {
        errors.birthdate = 'Edad inválida - debe estar entre 0 y 120 años';
      }
    }

    // Validar restricciones específicas del tipo de documento según edad
    if (formData.document_type === 'TI' && age !== null && age >= 18) {
      errors.document_type = 'La Tarjeta de Identidad es solo para menores de 18 años';
    }
    if (formData.document_type === 'CC' && age !== null && age < 18) {
      errors.document_type = 'La Cédula de Ciudadanía es solo para mayores de 18 años';
    }

    // Validar teléfono siempre que se ingrese
    if (formData.phone && formData.phone.length !== 10) {
      errors.phone = 'El teléfono debe tener exactamente 10 dígitos';
    }

    // Validar número de documento según tipo
    if (formData.document_number) {
      if (formData.document_type === 'PP') {
        if (formData.document_number.length < 6 || formData.document_number.length > 10) {
          errors.document_number = 'El pasaporte debe tener entre 6 y 10 caracteres';
        }
        if (!/^[a-zA-Z0-9]+$/.test(formData.document_number)) {
          errors.document_number = 'El pasaporte solo puede contener letras y números';
        }
      }
    }

    // Validar discapacidad
    if ((formData.has_disability === true || formData.has_disability === "true") && !formData.disability_description?.trim()) {
      errors.disability_description = 'La descripción de la discapacidad es obligatoria';
    }

    // Validar campos del tutor si es necesario
    if (needsGuardian) {
      if (!formData.guardian_document_type) errors.guardian_document_type = 'Tipo de documento del tutor es obligatorio';
      if (!formData.guardian_document_number) errors.guardian_document_number = 'Número de documento del tutor es obligatorio';
      if (!formData.guardian_nombres) errors.guardian_nombres = 'Nombres del tutor son obligatorios';
      if (!formData.guardian_apellidos) errors.guardian_apellidos = 'Apellidos del tutor son obligatorios';

      // Validar formato de nombres y apellidos del tutor
      if (formData.guardian_nombres && !isValidName(formData.guardian_nombres)) {
        errors.guardian_nombres = 'Los nombres del tutor solo pueden contener letras y espacios';
      }
      if (formData.guardian_apellidos && !isValidName(formData.guardian_apellidos)) {
        errors.guardian_apellidos = 'Los apellidos del tutor solo pueden contener letras y espacios';
      }
      if (!formData.guardian_email) errors.guardian_email = 'Correo del tutor es obligatorio';
      if (!formData.guardian_phone) errors.guardian_phone = 'Teléfono del tutor es obligatorio';
      if (!formData.guardian_birthdate) errors.guardian_birthdate = 'Fecha de nacimiento del tutor es obligatoria';
      if (!formData.guardian_relationship_type) errors.guardian_relationship_type = 'La relación con el paciente es obligatoria';

      // Validar teléfono del tutor siempre que se ingrese
      if (formData.guardian_phone && formData.guardian_phone.length !== 10) {
        errors.guardian_phone = 'El teléfono del tutor debe tener exactamente 10 dígitos';
      }

      // Validar número de documento del tutor según tipo
      if (formData.guardian_document_number) {
        if (formData.guardian_document_type === 'PP') {
          if (formData.guardian_document_number.length < 6 || formData.guardian_document_number.length > 10) {
            errors.guardian_document_number = 'El pasaporte debe tener entre 6 y 10 caracteres';
          }
          if (!/^[a-zA-Z0-9]+$/.test(formData.guardian_document_number)) {
            errors.guardian_document_number = 'El pasaporte solo puede contener letras y números';
          }
        }
      }

      // Validar fecha de nacimiento del tutor
      if (formData.guardian_birthdate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const guardianBirthDate = new Date(formData.guardian_birthdate);

        // Verificar que la fecha sea válida
        if (isNaN(guardianBirthDate.getTime())) {
          errors.guardian_birthdate = 'Fecha de nacimiento inválida';
        }
        // Verificar que la fecha no sea futura
        else if (guardianBirthDate > today) {
          errors.guardian_birthdate = 'La fecha de nacimiento del tutor no puede ser en el futuro';
        } else {
          const guardianAge = calculateAge(formData.guardian_birthdate);
          if (guardianAge < 18) {
            errors.guardian_birthdate = 'El tutor legal debe ser mayor de 18 años';
          } else if (guardianAge > 120) {
            errors.guardian_birthdate = 'Edad inválida - debe estar entre 18 y 120 años';
          }
        }
      }
    }

    // Verificar errores de email
    if (formErrors.email || formErrors.guardian_email) {
      Object.assign(errors, formErrors);
    }

    // Limpiar la clave temporal si existe
    if (errors._timestamp) {
      delete errors._timestamp;
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
      toast.error("Complete todos los campos obligatorios");
      return;
    }

    // Mostrar modal de confirmación
    setShowConfirmModal(true);
  };

  const confirmSubmit = async () => {
    setShowConfirmModal(false);

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

    // Verificar lógica de discapacidad
    const hasDisabilityValue = formData.has_disability === "true" || formData.has_disability === true;
    const disabilityDescValue = hasDisabilityValue && formData.disability_description ? formData.disability_description.trim() : null;

    console.log('🔍 Debug de discapacidad:');
    console.log('  - formData.has_disability:', formData.has_disability, typeof formData.has_disability);
    console.log('  - hasDisabilityValue:', hasDisabilityValue);
    console.log('  - formData.disability_description:', formData.disability_description);
    console.log('  - disabilityDescValue final:', disabilityDescValue);
    console.log('  - Validación backend: Si has_disability=true, disability_description debe no ser null/empty');

    // Validación previa para evitar error 422
    if (hasDisabilityValue && !disabilityDescValue) {
      setFormError('Si el paciente tiene discapacidad, debe proporcionar una descripción válida.');
      setLoading(false);
      return;
    }

    const patientPayload = {
      person: {
        document_type: formData.document_type,
        document_number: formData.document_number,
        first_name: first_name,
        middle_name: middle_name,
        first_surname: first_surname,
        second_surname: second_surname,
        email: formData.email || null,
        phone: formData.phone || null,
        birthdate: formData.birthdate,
      },
      occupation: formData.occupation || null,
      blood_group: formData.blood_group || null,
      has_disability: hasDisabilityValue,
      disability_description: disabilityDescValue,
      guardian: needsGuardian ? {
        person: {
          document_type: formData.guardian_document_type,
          document_number: formData.guardian_document_number,
          first_name: guardian_first_name,
          middle_name: guardian_middle_name,
          first_surname: guardian_first_surname,
          second_surname: guardian_second_surname,
          email: formData.guardian_email || null,
          phone: formData.guardian_phone || null,
          birthdate: formData.guardian_birthdate,
        },
        relationship_type: formData.guardian_relationship_type,
      } : null,
    };

    try {
      setLoading(true);
      console.log('🚀 Payload being sent:', JSON.stringify(patientPayload, null, 2));
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
        blood_group: "",
        birthdate: "",
        has_disability: null,
        disability_description: "",
        guardian_document_type: "",
        guardian_document_number: "",
        guardian_nombres: "",
        guardian_apellidos: "",
        guardian_email: "",
        guardian_phone: "",
        guardian_birthdate: "",
        guardian_relationship_type: "",
      });
      setFormErrors({});
      setNeedsGuardian(false);
      setAge(null);
      setProgress(0);
    } catch (error) {
      console.error('❌ Error al registrar el paciente:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error response data:', error.response?.data);

      let errorMessage = 'Error al registrar el paciente.';

      if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            // Errores de validación de Pydantic
            const errorMessages = errorData.detail.map(err => {
              const field = err.loc?.slice(1).join('.') || 'campo';
              return `${field}: ${err.msg}`;
            }).join('\n');
            errorMessage = `Errores de validación:\n${errorMessages}`;
          } else {
            errorMessage = errorData.detail;
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else {
          errorMessage = `Error ${error.response.status}: ${JSON.stringify(errorData)}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      setFormError(errorMessage);
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
      blood_group: "",
      birthdate: "",
      has_disability: null,
      disability_description: "",
      guardian_document_type: "",
      guardian_document_number: "",
      guardian_nombres: "",
      guardian_apellidos: "",
      guardian_email: "",
      guardian_phone: "",
      guardian_birthdate: "",
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

      {/* Mostrar información de fecha y edad */}
      {formData.birthdate && formData.birthdate.length > 0 && (
        <div className={`mb-6 p-4 rounded-lg ${(age !== null && (age < 0 || age > 120)) || formErrors.birthdate
          ? 'bg-red-50 border border-red-200'
          : formData.birthdate.length === 10 && age !== null
            ? 'bg-blue-50 border border-blue-200'
            : 'bg-yellow-50 border border-yellow-200'
          }`}>
          <p className={`font-poppins ${(age !== null && (age < 0 || age > 120)) || formErrors.birthdate
            ? 'text-red-700'
            : formData.birthdate.length === 10 && age !== null
              ? 'text-blue-700'
              : 'text-yellow-700'
            }`}>
            {formData.birthdate.length < 10 ? (
              <>
                <span className="font-semibold">📅 Ingresando fecha...</span>
                <span className="block text-sm mt-1">
                  Complete la fecha de nacimiento para calcular la edad
                </span>
              </>
            ) : age !== null && (age < 0 || age > 120) ? (
              <>
                <span className="font-semibold">⚠️ Edad inválida:</span> {age} años
                <span className="block text-sm mt-1">
                  La edad debe estar entre 0 y 120 años
                </span>
              </>
            ) : age !== null ? (
              <>
                Edad: {age} años
                {needsGuardian && (
                  <span className="ml-2 text-blue-800 font-semibold">
                    - Se requiere información del tutor legal
                    {formData.has_disability && age >= 18 && age <= 64 && (
                      <span className="block text-sm mt-1">
                        (Requerido por discapacidad)
                      </span>
                    )}
                  </span>
                )}
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
        {/* <div></div> */}

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
            {getValidDocumentTypes(age).map(docType => (
              <option key={docType.value} value={docType.value}>
                {docType.label}
              </option>
            ))}
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

        {/* Grupo sanguíneo */}
        <div className="flex flex-col items-center md:items-start w-full">
          <label className="block text-gray-700 font-poppins font-semibold mb-2 text-18">
            Grupo Sanguíneo *
          </label>
          <Select
            name="blood_group"
            value={formData.blood_group}
            onChange={handleChange}
            error={!!formErrors.blood_group}
            placeholder="Seleccione el grupo sanguíneo"
          >
            <option value="O+">O+</option>
            <option value="O-">O-</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
          </Select>
          {formErrors.blood_group && (
            <p className="text-red-500 text-sm mt-2 font-poppins">{formErrors.blood_group}</p>
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

        {/* ¿Tiene discapacidad? */}
        <div className="flex flex-col items-center md:items-start w-full">
          <label className="block text-gray-700 font-poppins font-semibold mb-2 text-18">
            ¿Tiene discapacidad? *
          </label>
          <Select
            name="has_disability"
            value={formData.has_disability}
            onChange={handleChange}
            error={!!formErrors.has_disability}
            placeholder="¿Tiene alguna discapacidad?"
          >
            <option value="false">No</option>
            <option value="true">Sí</option>
          </Select>


          {formErrors.has_disability && (
            <p className="text-red-500 text-sm mt-2 font-poppins">{formErrors.has_disability}</p>
          )}
        </div>

        {/* Descripción de discapacidad - Solo si tiene discapacidad */}
        {(formData.has_disability === true || formData.has_disability === "true") && (
          <div className="md:col-span-2 flex flex-col items-center md:items-start w-full">
            <label className="block text-gray-700 font-poppins font-semibold mb-2 text-18">
              Descripción de la discapacidad *
            </label>
            <textarea
              name="disability_description"
              value={formData.disability_description}
              onChange={handleChange}
              placeholder="Describa la discapacidad del paciente"
              className={`w-full px-4 py-3 border rounded-[25px] text-16 font-poppins focus:outline-none focus:ring-2 focus:ring-primary-blue resize-none ${formErrors.disability_description
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-primary-blue'
                }`}
              rows={3}
              maxLength={500}
            />
            {formErrors.disability_description && (
              <p className="text-red-500 text-sm mt-2 font-poppins">{formErrors.disability_description}</p>
            )}
            <p className="text-gray-500 text-sm font-poppins mt-1">
              Máximo 500 caracteres ({formData.disability_description.length}/500)
            </p>
          </div>
        )}

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
                {getValidDocumentTypes(25).map(docType => ( // Asumimos que los tutores son adultos
                  <option key={docType.value} value={docType.value}>
                    {docType.label}
                  </option>
                ))}
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

            {/* Fecha de nacimiento del tutor */}
            <div className="flex flex-col items-center md:items-start w-full">
              <label className="block text-gray-700 font-poppins font-semibold mb-2 text-18">
                Fecha de nacimiento *
              </label>
              <DateInput
                name="guardian_birthdate"
                value={formData.guardian_birthdate}
                onChange={handleChange}
                error={!!formErrors.guardian_birthdate}
              />
              {formErrors.guardian_birthdate && (
                <p className="text-red-500 text-sm mt-2 font-poppins">{formErrors.guardian_birthdate}</p>
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
                <option value="Son">Hijo</option>
                <option value="Daughter">Hija</option>
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
            <strong>{formData.document_number}</strong>?
          </span>
        }
        confirmText="Sí, guardar"
        cancelText="Cancelar"
      />
    </main>
  );
};

export default RegisterPatient;
