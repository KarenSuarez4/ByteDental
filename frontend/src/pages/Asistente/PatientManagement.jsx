import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Select from "../../components/Select";
import DateInput from "../../components/DateInput";
import ConfirmDialog from "../../components/ConfirmDialog";
import SearchInput from "../../components/SearchInput"; 
import FilterBar from "../../components/FilterBar"; 
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getAllPatients, updatePatient, deactivatePatient, activatePatient } from "../../services/patientService";
import { getClinicalHistoriesByPatient, checkPatientHasHistory } from "../../services/historyPatientService";
import { FaEye } from "react-icons/fa";
import { motion } from "framer-motion";



const tableHeaderClass = "bg-header-blue text-white font-semibold text-center font-poppins text-18";
const tableCellClass = "text-center font-poppins text-16 py-2";

function PatientManagement() {
  const { token, userRole } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editPatient, setEditPatient] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editFormErrors, setEditFormErrors] = useState({});
  const [editError, setEditError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [historyCheckLoading, setHistoryCheckLoading] = useState(false);

  const [phoneEditError, setPhoneEditError] = useState("");
  const [patientInfoModal, setPatientInfoModal] = useState({ open: false, patient: null });
  const [deactivationModal, setDeactivationModal] = useState({ open: false, patient: null, reason: '', loading: false });

  // Filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(4);
  const [totalPages, setTotalPages] = useState(1);

  const navigate = useNavigate();

  // ✅ Configuración de filtros para FilterBar
  const filterConfig = [
    {
      key: 'status',
      value: filterStatus,
      onChange: (e) => setFilterStatus(e.target.value),
      options: [
        { value: 'ALL', label: 'Todos' },
        { value: 'ACTIVO', label: 'Activo' },
        { value: 'INACTIVO', label: 'Inactivo' }
      ],
      ariaLabel: 'Filtrar por estado del paciente',
      className: 'w-[180px]'
    }
  ];

  // ✅ Función para resetear página (usada por FilterBar)
  const resetToFirstPage = () => {
    setCurrentPage(1);
  };

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

  // Función para obtener tipos de documento válidos según la edad
  const getValidDocumentTypes = (age) => {
    if (age === null || age === undefined) {
      // Si no hay edad, mostrar todos los tipos
      return [
        { value: 'CC', label: 'Cédula de Ciudadanía' },
        { value: 'TI', label: 'Tarjeta de Identidad' },
        { value: 'CE', label: 'Cédula de Extranjería' },
        { value: 'PP', label: 'Pasaporte' }
      ];
    }

    if (age < 18) {
      // Menores de edad: Solo TI
      return [
        { value: 'TI', label: 'Tarjeta de Identidad' }
      ];
    } else {
      // Mayores de edad: CC, CE, PP (no TI)
      return [
        { value: 'CC', label: 'Cédula de Ciudadanía' },
        { value: 'CE', label: 'Cédula de Extranjería' },
        { value: 'PP', label: 'Pasaporte' }
      ];
    }
  };

  // Función para obtener el texto legible del tipo de relación
  const getRelationshipText = (relationshipType) => {
    const relationships = {
      "Father": "Padre",
      "Mother": "Madre",
      "Grandfather": "Abuelo",
      "Grandmother": "Abuela",
      "Son": "Hijo",
      "Daughter": "Hija",
      "Legal_Guardian": "Tutor Legal",
      "Brother": "Hermano",
      "Sister": "Hermana",
      "Other": "Otro"
    };
    return relationships[relationshipType] || relationshipType;
  };

  // Función para validar solo letras y espacios
  const isValidName = (name) => {
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;
    return nameRegex.test(name);
  };

  // Función para mostrar información completa del paciente
  const handlePatientInfo = (patient) => {
    setPatientInfoModal({ open: true, patient });
  };

  const handleViewHistory = async (patient) => {
    setHistoryCheckLoading(true);

    try {
      const response = await checkPatientHasHistory(patient.id, token);

      if (response.has_history && response.history_id) {
        navigate(`/doctor/history-management/${response.history_id}`);
      } else {
        navigate(`/doctor/register-first-history/${patient.id}`);
      }
    } catch (error) {
      setEditError(`Error al verificar historias: ${error.message}`);

      setTimeout(() => {
        navigate(`/doctor/register-first-history/${patient.id}`);
      }, 2000);
    } finally {
      setHistoryCheckLoading(false);
    }
  };

  useEffect(() => {
    if ((userRole !== "Asistente" && userRole !== "Doctor") || !token) return;
    setLoading(true);

    getAllPatients(token)
      .then(setPatients)
      .catch(() => setEditError("Error cargando pacientes"))
      .finally(() => setLoading(false));
  }, [token, userRole]);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (editError) {
      const timer = setTimeout(() => setEditError(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [editError]);

  // Estados para el tutor legal
  const [needsGuardian, setNeedsGuardian] = useState(false);
  const [guardianForm, setGuardianForm] = useState({
    guardian_document_type: "",
    guardian_document_number: "",
    guardian_full_names: "",
    guardian_full_surnames: "",
    guardian_email: "",
    guardian_phone: "",
    guardian_birthdate: "",
    guardian_relationship_type: "",
  });
  const [guardianFormErrors, setGuardianFormErrors] = useState({});

  // Abrir modal de edición
  const handleEdit = (patient) => {
    setEditPatient(patient);
    // Combinar nombres y apellidos para mostrarlos en los campos
    const fullNames = [patient.person.first_name, patient.person.middle_name].filter(Boolean).join(' ');
    const fullSurnames = [patient.person.first_surname, patient.person.second_surname].filter(Boolean).join(' ');

    setEditForm({
      document_type: patient.person.document_type,
      document_number: patient.person.document_number,
      full_names: fullNames,
      full_surnames: fullSurnames,
      email: patient.person.email || "",
      phone: patient.person.phone || "",
      birthdate: patient.person.birthdate,
      occupation: patient.occupation || "",
      blood_group: patient.blood_group || "O+",
      has_disability: patient.has_disability === true ? "true" : patient.has_disability === false ? "false" : "",
      disability_description: patient.disability_description || "",
    });

    // Calcular si necesita tutor basado en la edad actual y discapacidad
    const age = calculateAge(patient.person.birthdate);
    const requiresGuardian = age < 18 || age > 64 || patient.has_disability;
    setNeedsGuardian(requiresGuardian);

    // Si tiene tutor, llenar los datos del tutor
    if (patient.guardian) {
      const guardianFullNames = [patient.guardian.person.first_name, patient.guardian.person.middle_name].filter(Boolean).join(' ');
      const guardianFullSurnames = [patient.guardian.person.first_surname, patient.guardian.person.second_surname].filter(Boolean).join(' ');

      setGuardianForm({
        guardian_document_type: patient.guardian.person.document_type,
        guardian_document_number: patient.guardian.person.document_number,
        guardian_full_names: guardianFullNames,
        guardian_full_surnames: guardianFullSurnames,
        guardian_email: patient.guardian.person.email || "",
        guardian_phone: patient.guardian.person.phone || "",
        guardian_birthdate: patient.guardian.person.birthdate,
        guardian_relationship_type: patient.guardian.relationship_type,
      });
    } else {
      // Limpiar formulario del tutor
      setGuardianForm({
        guardian_document_type: "",
        guardian_document_number: "",
        guardian_full_names: "",
        guardian_full_surnames: "",
        guardian_email: "",
        guardian_phone: "",
        guardian_birthdate: "",
        guardian_relationship_type: "",
      });
    }

    setEditError("");
    setSuccessMsg("");
    setGuardianFormErrors({});
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;

    // Convertir nombres y apellidos a mayúsculas
    if (name === "full_names" || name === "full_surnames") {
      setEditForm((prev) => ({ ...prev, [name]: value.toUpperCase() }));
      return;
    }

    if (name === "document_number") {
      const docType = editForm.document_type;

      // Validar según el tipo de documento
      if (docType === 'PP') {
        if (!/^[a-zA-Z0-9]*$/.test(value)) return;
        if (value.length > 10) return;
      } else {
        if (!/^\d*$/.test(value)) return;
      }

      setEditForm((prev) => ({ ...prev, [name]: value }));
      const newErrors = { ...editFormErrors };

      if (newErrors[name]) {
        delete newErrors[name];
      }

      if (value) {
        if (docType === 'PP' && value.length < 6) {
          newErrors[name] = 'El pasaporte debe tener entre 6 y 10 caracteres';
        }
      }

      setEditFormErrors(newErrors);
      return;
    }

    if (name === "phone") {
      if (!/^\d*$/.test(value)) return;
      setEditForm((prev) => ({ ...prev, [name]: value }));
      if (value && value.length !== 10) {
        setPhoneEditError("El teléfono debe tener exactamente 10 dígitos.");
        toast.error("El teléfono debe tener exactamente 10 dígitos");
      } else {
        setPhoneEditError("");
      }
      return;
    }

    // Validación para nombres y apellidos
    if (name === "full_names" || name === "full_surnames") {
      if (value && !isValidName(value)) {
        return; // No permitir el valor si no es válido
      }
      setEditForm((prev) => ({ ...prev, [name]: value.toUpperCase() }));
      return;
    }

    // Validación para discapacidad
    if (name === "has_disability") {
      const hasDisability = value === "true" || value === true;

      if (!hasDisability) {
        setEditForm((prev) => ({ ...prev, has_disability: "false", disability_description: "" }));
        const newErrors = { ...editFormErrors };
        if (newErrors.disability_description) {
          delete newErrors.disability_description;
          setEditFormErrors(newErrors);
        }
      } else {
        setEditForm((prev) => ({ ...prev, has_disability: "true" }));
      }

      const age = calculateAge(editForm.birthdate);
      const requiresGuardian = (age !== null && (age < 18 || age > 64)) || hasDisability;
      setNeedsGuardian(requiresGuardian);

      return;
    }

    if (name === "disability_description") {
      const newErrors = { ...editFormErrors };

      if (newErrors[name]) {
        delete newErrors[name];
      }

      if (editForm.has_disability === "true" && !value.trim()) {
        newErrors[name] = 'La descripción de la discapacidad es obligatoria';
      }

      setEditFormErrors(newErrors);
      setEditForm((prev) => ({ ...prev, [name]: value }));
      return;
    }

    if (name === "birthdate") {
      setEditForm((prev) => ({ ...prev, [name]: value }));

      if (value && value.length === 10) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const birthDate = new Date(value);

        if (isNaN(birthDate.getTime())) {
          setEditFormErrors((prev) => ({ ...prev, birthdate: 'Fecha de nacimiento inválida' }));
          return;
        }

        if (birthDate > today) {
          setEditFormErrors((prev) => ({ ...prev, birthdate: 'La fecha de nacimiento no puede ser en el futuro' }));
          return;
        }

        const age = calculateAge(value);
        if (age > 120) {
          setEditFormErrors((prev) => ({ ...prev, birthdate: 'La edad no puede ser mayor a 120 años' }));
          return;
        }

        setEditFormErrors((prev) => ({ ...prev, birthdate: '' }));

        const requiresGuardian = age < 18 || age > 64 || editForm.has_disability === "true";
        setNeedsGuardian(requiresGuardian);

        if (!requiresGuardian) {
          setGuardianForm({
            guardian_document_type: "",
            guardian_document_number: "",
            guardian_full_names: "",
            guardian_full_surnames: "",
            guardian_email: "",
            guardian_phone: "",
            guardian_birthdate: "",
            guardian_relationship_type: "",
          });
          setGuardianFormErrors({});
        }
      } else if (value === '') {
        setEditFormErrors((prev) => ({ ...prev, birthdate: 'La fecha de nacimiento es obligatoria' }));
      } else {
        setEditFormErrors((prev) => ({ ...prev, birthdate: '' }));
      }

      return;
    }

    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleGuardianFormChange = (e) => {
    const { name, value } = e.target;

    if (name === "guardian_document_number") {
      const docType = guardianForm.guardian_document_type;

      // Validar según el tipo de documento
      if (docType === 'PP') {
        // Pasaporte: alfanumérico, entre 6 y 10 caracteres, puede contener letras y números
        if (!/^[a-zA-Z0-9]*$/.test(value)) return;
        if (value.length > 10) return;
      } else {
        // Otros documentos: solo números
        if (!/^\d*$/.test(value)) return;
      }

      setGuardianForm(prev => ({ ...prev, [name]: value }));

      const newErrors = { ...guardianFormErrors };

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

      setGuardianFormErrors(newErrors);
      return;
    }

    if (name === "guardian_phone") {
      if (!/^\d*$/.test(value)) return;
      setGuardianForm(prev => ({ ...prev, [name]: value }));
      return;
    }

    // Validación para nombres y apellidos del tutor
    if (name === "guardian_full_names" || name === "guardian_full_surnames") {
      if (value && !isValidName(value)) {
        return; // No permitir el valor si no es válido
      }
      setGuardianForm(prev => ({ ...prev, [name]: value }));
      return;
    }

    // Validación inmediata para fecha de nacimiento del tutor
    if (name === "guardian_birthdate") {
      setGuardianForm(prev => ({ ...prev, [name]: value }));

      // Validación solo si la fecha está completa
      if (value && value.length === 10) { // formato YYYY-MM-DD
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const birthDate = new Date(value);

        // Verificar que la fecha sea válida
        if (isNaN(birthDate.getTime())) {
          setGuardianFormErrors(prev => ({ ...prev, guardian_birthdate: 'Fecha de nacimiento inválida' }));
          return;
        }

        // Verificar que la fecha no sea futura
        if (birthDate > today) {
          setGuardianFormErrors(prev => ({ ...prev, guardian_birthdate: 'La fecha de nacimiento no puede ser en el futuro' }));
          return;
        }

        // Calcular edad y verificar límites
        const age = calculateAge(value);
        if (age > 120) {
          setGuardianFormErrors(prev => ({ ...prev, guardian_birthdate: 'La edad no puede ser mayor a 120 años' }));
          return;
        }

        if (age < 18) {
          setGuardianFormErrors(prev => ({ ...prev, guardian_birthdate: 'El tutor legal debe ser mayor de 18 años' }));
          return;
        }

        // Si la fecha es válida, limpiar error
        setGuardianFormErrors(prev => ({ ...prev, guardian_birthdate: '' }));
      } else if (value === '') {
        setGuardianFormErrors(prev => ({ ...prev, guardian_birthdate: 'La fecha de nacimiento del tutor es obligatoria' }));
      } else {
        // Si la fecha está incompleta, limpiar error temporal
        setGuardianFormErrors(prev => ({ ...prev, guardian_birthdate: '' }));
      }

      return;
    }

    setGuardianForm(prev => ({ ...prev, [name]: value }));
  };

  const handleGuardianEmailChange = (e) => {
    const { name, value } = e.target;
    setGuardianForm(prev => ({ ...prev, [name]: value }));

    if (value && (!value.includes('@') || !value.includes('.'))) {
      setGuardianFormErrors(prev => ({ ...prev, [name]: 'Ingrese un correo electrónico válido' }));
    } else {
      setGuardianFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleEmailChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));

    if (value && (!value.includes('@') || !value.includes('.'))) {
      setEditFormErrors(prev => ({ ...prev, [name]: 'Ingrese un correo electrónico válido' }));
    } else {
      setEditFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateEditForm = () => {
    const errors = {};
    const guardianErrors = {};

    // Validar campos del paciente
    if (!editForm.document_type) errors.document_type = "El tipo de documento es obligatorio.";
    if (!editForm.document_number) errors.document_number = "El número de documento es obligatorio.";
    if (!editForm.full_names) errors.full_names = "Los nombres son obligatorios.";
    if (!editForm.full_surnames) errors.full_surnames = "Los apellidos son obligatorios.";
    if (!editForm.birthdate) errors.birthdate = "La fecha de nacimiento es obligatoria.";

    // Validar restricciones específicas del paciente
    const patientAge = calculateAge(editForm.birthdate);
    if (editForm.document_type === 'TI' && patientAge !== null && patientAge <= 7) {
      errors.document_type = 'La Tarjeta de Identidad es solo para mayores de 7 años';
    }

    // Validar email del paciente
    if (editForm.email && (!editForm.email.includes('@') || !editForm.email.includes('.'))) {
      errors.email = "Ingrese un correo electrónico válido.";
    }

    // Validar teléfono del paciente siempre que se ingrese
    if (editForm.phone && editForm.phone.length !== 10) {
      errors.phone = "El teléfono debe tener exactamente 10 dígitos.";
    }

    // Validar número de documento según tipo
    if (editForm.document_number) {
      if (editForm.document_type === 'PP') {
        if (editForm.document_number.length < 6 || editForm.document_number.length > 10) {
          errors.document_number = 'El pasaporte debe tener entre 6 y 10 caracteres';
        }
        if (!/^[a-zA-Z0-9]+$/.test(editForm.document_number)) {
          errors.document_number = 'El pasaporte solo puede contener letras y números';
        }
      }
    }

    // Validar discapacidad
    if (editForm.has_disability === "true" && !editForm.disability_description?.trim()) {
      errors.disability_description = 'La descripción de la discapacidad es obligatoria';
    }

    // Validar campos del tutor si es necesario
    if (needsGuardian) {
      if (!guardianForm.guardian_document_type) guardianErrors.guardian_document_type = "El tipo de documento del tutor es obligatorio.";
      if (!guardianForm.guardian_document_number) guardianErrors.guardian_document_number = "El número de documento del tutor es obligatorio.";
      if (!guardianForm.guardian_full_names) guardianErrors.guardian_full_names = "Los nombres del tutor son obligatorios.";
      if (!guardianForm.guardian_full_surnames) guardianErrors.guardian_full_surnames = "Los apellidos del tutor son obligatorios.";
      if (!guardianForm.guardian_email) guardianErrors.guardian_email = "El correo del tutor es obligatorio.";
      if (!guardianForm.guardian_phone) guardianErrors.guardian_phone = "El teléfono del tutor es obligatorio.";
      if (!guardianForm.guardian_birthdate) guardianErrors.guardian_birthdate = "La fecha de nacimiento del tutor es obligatoria.";
      if (!guardianForm.guardian_relationship_type) guardianErrors.guardian_relationship_type = "La relación con el paciente es obligatoria.";

      // Validar email del tutor
      if (guardianForm.guardian_email && (!guardianForm.guardian_email.includes('@') || !guardianForm.guardian_email.includes('.'))) {
        guardianErrors.guardian_email = "Ingrese un correo electrónico válido.";
      }

      // Validar teléfono del tutor siempre que se ingrese
      if (guardianForm.guardian_phone && guardianForm.guardian_phone.length !== 10) {
        guardianErrors.guardian_phone = "El teléfono del tutor debe tener exactamente 10 dígitos.";
      }

      // Validar que el tutor sea mayor de 18 años
      if (guardianForm.guardian_birthdate) {
        const guardianAge = calculateAge(guardianForm.guardian_birthdate);
        if (guardianAge !== null && guardianAge < 18) {
          guardianErrors.guardian_birthdate = 'El tutor legal debe ser mayor de 18 años';
        }
      }

      // Validar número de documento del tutor según tipo
      if (guardianForm.guardian_document_number) {
        if (guardianForm.guardian_document_type === 'PP') {
          if (guardianForm.guardian_document_number.length < 6 || guardianForm.guardian_document_number.length > 10) {
            guardianErrors.guardian_document_number = 'El pasaporte debe tener entre 6 y 10 caracteres';
          }
          if (!/^[a-zA-Z0-9]+$/.test(guardianForm.guardian_document_number)) {
            guardianErrors.guardian_document_number = 'El pasaporte solo puede contener letras y números';
          }
        }
      }

      // Validar restricciones específicas del tutor
      if (guardianForm.guardian_document_type === 'TI' && guardianForm.guardian_birthdate) {
        const guardianAge = calculateAge(guardianForm.guardian_birthdate);
        if (guardianAge !== null && guardianAge <= 7) {
          guardianErrors.guardian_document_type = 'La Tarjeta de Identidad es solo para mayores de 7 años';
        }
      }
    }

    setEditFormErrors(errors);
    setGuardianFormErrors(guardianErrors);
    setPhoneEditError(errors.phone || "");

    return Object.keys(errors).length === 0 && Object.keys(guardianErrors).length === 0;
  };

  // Guardar cambios
  const handleSaveEdit = async () => {
    if (!validateEditForm()) return;

    setEditLoading(true);
    try {
      // Separar los nombres y apellidos del paciente
      const namesArray = editForm.full_names.trim().split(/\s+/);
      const surnamesArray = editForm.full_surnames.trim().split(/\s+/);

      // Preparar los datos del paciente para el backend
      const updateData = {
        person: {
          document_type: editForm.document_type,
          document_number: editForm.document_number,
          first_name: namesArray[0] || "",
          middle_name: namesArray.length > 1 ? namesArray.slice(1).join(' ') : null,
          first_surname: surnamesArray[0] || "",
          second_surname: surnamesArray.length > 1 ? surnamesArray.slice(1).join(' ') : null,
          email: editForm.email || null,
          phone: editForm.phone || null,
          birthdate: editForm.birthdate,
        },
        occupation: editForm.occupation || null,
        blood_group: editForm.blood_group,
        has_disability: editForm.has_disability === "true",
        disability_description: editForm.has_disability === "true" ? editForm.disability_description : null,
      };

      // Si necesita tutor y se proporcionaron datos del tutor
      if (needsGuardian && guardianForm.guardian_document_number) {
        // Separar nombres y apellidos del tutor
        const guardianNamesArray = guardianForm.guardian_full_names.trim().split(/\s+/);
        const guardianSurnamesArray = guardianForm.guardian_full_surnames.trim().split(/\s+/);

        updateData.guardian = {
          person: {
            document_type: guardianForm.guardian_document_type,
            document_number: guardianForm.guardian_document_number,
            first_name: guardianNamesArray[0] || "",
            middle_name: guardianNamesArray.length > 1 ? guardianNamesArray.slice(1).join(' ') : null,
            first_surname: guardianSurnamesArray[0] || "",
            second_surname: guardianSurnamesArray.length > 1 ? guardianSurnamesArray.slice(1).join(' ') : null,
            email: guardianForm.guardian_email || null,
            phone: guardianForm.guardian_phone || null,
            birthdate: guardianForm.guardian_birthdate,
          },
          relationship_type: guardianForm.guardian_relationship_type,
        };
      }

      await updatePatient(editPatient.id, updateData, token);
      setSuccessMsg("Paciente actualizado correctamente");
      toast.success("Paciente actualizado correctamentes");
      setEditPatient(null);
      setLoading(true);
      const updatedPatients = await getAllPatients(token);
      setPatients(updatedPatients);
      setLoading(false);
      setEditFormErrors({});
      setGuardianFormErrors({});
    } catch (err) {
      setEditFormErrors({ general: err.message || "Error al actualizar paciente" });
      toast.error(err.message || "Error al actualizar paciente");
    } finally {
      setEditLoading(false);
    }
  };

  // Cancelar edición
  const handleCancelEdit = () => {
    setEditPatient(null);
    setEditError("");
    setSuccessMsg("");
    setEditLoading(false);
    setNeedsGuardian(false);
    setGuardianForm({
      guardian_document_type: "",
      guardian_document_number: "",
      guardian_full_names: "",
      guardian_full_surnames: "",
      guardian_email: "",
      guardian_phone: "",
      guardian_birthdate: "",
      guardian_relationship_type: "",
    });
    setGuardianFormErrors({});
  };

  // Abrir modal de desactivación
  const handleDeactivateClick = (patient) => {
    setDeactivationModal({ open: true, patient, reason: '', loading: false });
  };

  // Desactivar paciente con motivo
  const handleDeactivate = async () => {
    if (!deactivationModal.reason.trim()) {
      setEditError("El motivo de desactivación es obligatorio");
      toast.error("El motivo de desactivación es obligatorio");
      return;
    }

    setDeactivationModal(prev => ({ ...prev, loading: true }));

    try {
      await deactivatePatient(deactivationModal.patient.id, deactivationModal.reason.trim(), token);
      setSuccessMsg("Paciente desactivado correctamente");
      toast.success("Paciente desactivado correctamente");

      // Cerrar modal
      setDeactivationModal({ open: false, patient: null, reason: '', loading: false });

      // Actualizar lista
      setLoading(true);
      const updatedPatients = await getAllPatients(token);
      setPatients(updatedPatients);
      setLoading(false);
    } catch (err) {
      console.error('Error al desactivar paciente:', err);
      setEditError(err.message || "Error al desactivar paciente");
      toast.error(err.message || "Error al desactivar paciente");
      setDeactivationModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Activar paciente
  const handleActivate = async (patient) => {
    try {
      await activatePatient(patient.id, token);
      setSuccessMsg("Paciente activado correctamente");
      toast.success("Paciente activado correctamente")
      setLoading(true);
      const updatedPatients = await getAllPatients(token);
      setPatients(updatedPatients);
      setLoading(false);
    } catch (err) {
      setEditError(err.message || "Error al activar paciente");
      toast.error(err.message || "Error al activar paciente");
    }
  };


  // Filtros y paginación - CORREGIR esta sección
  const filteredPatients = patients.filter(patient => {
    // Función auxiliar para normalizar texto (quitar acentos y convertir a minúsculas)
    const normalizeText = (text) => {
      return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''); // Remover acentos
    };

    // Si no hay término de búsqueda, solo aplicar filtro de estado
    if (searchTerm === "") {
      const statusMatch = filterStatus === "ALL" || (filterStatus === "ACTIVO" ? patient.is_active : !patient.is_active);
      return statusMatch;
    }

    // Normalizar término de búsqueda
    const normalizedSearchTerm = normalizeText(searchTerm);

    // Buscar en documento (exacto, no normalizado para números)
    const docMatch = patient.person.document_number.includes(searchTerm);

    // Crear texto completo para búsqueda (nombres + apellidos)
    const fullSearchText = `${patient.person.first_name} ${patient.person.middle_name || ''} ${patient.person.first_surname} ${patient.person.second_surname || ''}`.trim();
    const normalizedFullText = normalizeText(fullSearchText);

    // Buscar el término normalizado en el texto completo normalizado
    const nameMatch = normalizedFullText.includes(normalizedSearchTerm);

    // También buscar términos individuales si el usuario busca por palabras separadas
    const searchWords = normalizedSearchTerm.split(/\s+/).filter(word => word.length > 0);
    const individualWordsMatch = searchWords.every(word =>
      normalizedFullText.includes(word)
    );

    // El paciente coincide si encuentra el término en documento, nombre completo, o palabras individuales
    const searchMatch = docMatch || nameMatch || individualWordsMatch;

    // Aplicar también filtro de estado
    const statusMatch = filterStatus === "ALL" || (filterStatus === "ACTIVO" ? patient.is_active : !patient.is_active);

    return searchMatch && statusMatch;
  }).sort((a, b) => a.id - b.id); // Ordenar por ID ascendente

  // Calcular total de páginas
  const totalPagesCount = Math.ceil(filteredPatients.length / itemsPerPage);

  // Obtener pacientes para la página current
  const currentPatients = filteredPatients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Actualizar total de páginas cuando cambian los filtros
  useEffect(() => {
    const newTotalPages = Math.ceil(filteredPatients.length / itemsPerPage);
    setTotalPages(newTotalPages);

    // Si la página actual es mayor al nuevo total, ir a la primera página
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredPatients.length, itemsPerPage, currentPage]);

  // Funciones de paginación
  const goToPage = (page) => {
    setCurrentPage(page);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  if (userRole !== "Asistente" && userRole !== "Doctor") {
    return <div className="font-poppins text-center mt-20 text-xl">No autorizado</div>;
  }

  if (loading) {
    return <div className="font-poppins text-center mt-10 text-18">Cargando pacientes...</div>;
  }

  return (
    <main className="flex min-h-[calc(100vh-94px)] bg-gray-50 overflow-hidden">
      <section className="flex-1 flex flex-col items-center px-3">
        <h1 className="text-header-blue text-46 font-bold font-poppins mb-1 pt-6 text-center pb-6">
          GESTIÓN DE PACIENTES
        </h1>

        {/* Error and Success Messages */}
        {editError && (
          <div className="mb-2 w-full max-w-[1200px] p-3 bg-red-100 border border-red-400 text-red-700 rounded text-center text-18">
            {editError}
          </div>
        )}
        {successMsg && (
          <div className="mb-2 w-full max-w-[1200px] p-3 bg-green-100 border border-green-400 text-green-700 rounded text-center transition-opacity duration-500 text-18">
            {successMsg}
          </div>
        )}

        {/*Usar FilterBar con configuración correcta */}
        <FilterBar
          searchValue={searchTerm} // Cambiar de searchDoc a searchTerm
          onSearchChange={(e) => setSearchTerm(e.target.value)} // Cambiar función
          filters={filterConfig}
          onPageReset={resetToFirstPage}
          searchPlaceholder="Buscar por documento, nombres o apellidos" // Actualizar placeholder
          searchAriaLabel="Buscar paciente por documento, nombres o apellidos" // Actualizar aria-label
          className="max-w-[1200px]"
        />

        {/* Tabla de pacientes - no changes to this section */}
        <div className="w-full max-w-[1200px] bg-white rounded-[12px] shadow-md overflow-x-auto"
          style={{ maxHeight: "calc(100vh - 226px)", overflowY: "auto" }}>
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 h-10">
              <tr>
                <th className={tableHeaderClass}>Tipo de Documento</th>
                <th className={tableHeaderClass}>Documento</th>
                <th className={tableHeaderClass}>Nombres</th>
                <th className={tableHeaderClass}>Apellidos</th>
                <th className={tableHeaderClass}>Correo</th>
                <th className={tableHeaderClass}>Teléfono</th>
                <th className={tableHeaderClass}>Edad</th>
                <th className={tableHeaderClass}>Grupo Sanguíneo</th>
                <th className={tableHeaderClass}>Ocupación</th>
                <th className={tableHeaderClass}>Estado</th>
                {userRole !== "Doctor" && (
                  <th className={tableHeaderClass}>Información</th>
                )}
                <th className={tableHeaderClass}>Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentPatients.map(patient => (
                <tr key={patient.id}>
                  <td className={tableCellClass}>{patient.person.document_type}</td>
                  <td className={tableCellClass}>{patient.person.document_number}</td>
                  <td className={tableCellClass}>
                    {patient.person.first_name}
                    {patient.person.middle_name && ` ${patient.person.middle_name}`}
                  </td>
                  <td className={tableCellClass}>
                    {patient.person.first_surname}
                    {patient.person.second_surname && ` ${patient.person.second_surname}`}
                  </td>
                  <td className={tableCellClass}>{patient.person.email || "-"}</td>
                  <td className={tableCellClass}>{patient.person.phone || "-"}</td>
                  <td className={tableCellClass}>{calculateAge(patient.person.birthdate)} años</td>
                  <td className={tableCellClass}>{patient.blood_group || "-"}</td>
                  <td className={tableCellClass}>{patient.occupation || "-"}</td>
                  <td className={tableCellClass}>
                    {patient.is_active ? (
                      <span className="text-green-600 font-bold">Activo</span>
                    ) : (
                      <span className="text-red-600 font-bold">Inactivo</span>
                    )}
                  </td>
                  {userRole !== "Doctor" && (
                    <td className={tableCellClass}>
                      <span
                        className="text-blue-600 font-semibold hover:text-blue-800 hover:underline cursor-pointer"
                        onClick={() => handlePatientInfo(patient)}
                        title="Haga clic para ver la información completa del paciente"
                      >
                        Ver Información
                      </span>
                    </td>
                  )}
                  <td className={tableCellClass}>
                    <div className="flex flex-col items-center justify-center gap-2">
                      {userRole === "Doctor" ? (
                        <Button
                          aria-label="Ver historia clínica del paciente"
                          title="Ver historia clínica"
                          onClick={() => handleViewHistory(patient)}
                          className="flex items-center justify-center gap-2 bg-primary-blue hover:bg-primary-blue-hover text-white 
                          px-1 py-2 rounded-full font-poppins text-[12px] font-semibold 
                          w-[160px] h-[44px] shadow-sm hover:shadow-md transition-all duration-200"
                        >
                          <motion.span
                            whileHover={{ scale: 1.15 }}
                            transition={{ type: 'spring', stiffness: 250, damping: 10 }}
                            className="flex items-center justify-center"
                          >
                            <FaEye className="text-white text-[18px]" />
                          </motion.span>
                          <span className="leading-none tracking-wide">Ver historia clínica</span>
                        </Button>
                      ) : (
                        patient.is_active ? (
                          <>
                            <Button
                              className="bg-primary-blue hover:bg-primary-blue-hover text-white px-4 py-2 rounded-[40px] font-poppins text-16 font-bold w-[130px] h-[35px]"
                              onClick={() => handleEdit(patient)}
                            >
                              Modificar
                            </Button>
                            <Button
                              className="bg-header-blue hover:bg-header-blue-hover text-white px-4 py-2 rounded-[40px] font-poppins text-16 font-bold w-[130px] h-[35px]"
                              onClick={() => handleDeactivateClick(patient)}
                            >
                              Desactivar
                            </Button>
                          </>
                        ) : (
                          <Button
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-[40px] font-poppins text-16 font-bold w-[130px] h-[35px]"
                            onClick={() => handleActivate(patient)}
                          >
                            Activar
                          </Button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {currentPatients.length === 0 && (
                <tr>
                  <td colSpan="11" className="text-center py-8 text-gray-500 font-poppins text-16">
                    {searchTerm ? "No se encontraron pacientes que coincidan con la búsqueda" : "No hay pacientes registrados"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Controles de paginación */}
        {totalPages > 1 && (
          <div className="w-full max-w-[1200px] flex justify-center items-center mt-6 gap-3">
            {/* Botón Primera página (solo si hay más de 5 páginas y no estamos en las primeras) */}
            {totalPages > 5 && currentPage > 3 && (
              <button
                className="group flex items-center justify-center w-10 h-10 rounded-full font-poppins text-12 font-medium transition-all duration-200 shadow-sm bg-white text-gray-700 hover:bg-primary-blue hover:text-white border border-gray-300 hover:border-primary-blue hover:shadow-md transform hover:-translate-y-0.5"
                onClick={() => goToPage(1)}
                title="Primera página"
              >
                <svg className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* Botón Anterior */}
            <button
              className={`group flex items-center justify-center px-4 py-2 rounded-full font-poppins text-12 font-medium transition-all duration-200 shadow-sm ${currentPage === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                : 'bg-white text-gray-700 hover:bg-primary-blue hover:text-white border border-gray-300 hover:border-primary-blue hover:shadow-md transform hover:-translate-y-0.5'
                }`}
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
            >
              <svg
                className={`w-4 h-4 mr-2 transition-transform duration-200 ${currentPage === 1 ? '' : 'group-hover:-translate-x-0.5'
                  }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Anterior
            </button>

            {/* Números de página */}
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => {
                // Mostrar solo algunas páginas alrededor de la actual
                if (
                  pageNumber === 1 ||
                  pageNumber === totalPages ||
                  (pageNumber >= currentPage - 2 && pageNumber <= currentPage + 2)
                ) {
                  return (
                    <button
                      key={pageNumber}
                      className={`flex items-center justify-center w-10 h-10 rounded-full font-poppins text-12 font-medium transition-all duration-200 ${currentPage === pageNumber
                        ? 'bg-primary-blue text-white shadow-lg transform scale-105 border-2 border-primary-blue'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 hover:border-primary-blue hover:text-primary-blue hover:shadow-md transform hover:-translate-y-0.5'
                        }`}
                      onClick={() => goToPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  );
                } else if (
                  pageNumber === currentPage - 3 ||
                  pageNumber === currentPage + 3
                ) {
                  return (
                    <div key={pageNumber} className="flex items-center justify-center w-10 h-10">
                      <span className="text-gray-400 font-poppins text-12">•••</span>
                    </div>
                  );
                }
                return null;
              })}
            </div>

            {/* Botón Siguiente */}
            <button
              className={`group flex items-center justify-center px-4 py-2 rounded-full font-poppins text-12 font-medium transition-all duration-200 shadow-sm ${currentPage === totalPages
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                : 'bg-white text-gray-700 hover:bg-primary-blue hover:text-white border border-gray-300 hover:border-primary-blue hover:shadow-md transform hover:-translate-y-0.5'
                }`}
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
            >
              Siguiente
              <svg
                className={`w-4 h-4 ml-2 transition-transform duration-200 ${currentPage === totalPages ? '' : 'group-hover:translate-x-0.5'
                  }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Botón Última página (solo si hay más de 5 páginas y no estamos en las últimas) */}
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <button
                className="group flex items-center justify-center w-10 h-10 rounded-full font-poppins text-12 font-medium transition-all duration-200 shadow-sm bg-white text-gray-700 hover:bg-primary-blue hover:text-white border border-gray-300 hover:border-primary-blue hover:shadow-md transform hover:-translate-y-0.5"
                onClick={() => goToPage(totalPages)}
                title="Última página"
              >
                <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Información de paginación */}
        {filteredPatients.length > 0 && (
          <div className="w-full max-w-[1200px] flex justify-center mt-3">
            <div className="bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
              <p className="text-gray-600 font-poppins text-12 font-medium">
                <span className="text-primary-blue font-semibold">
                  {(currentPage - 1) * itemsPerPage + 1}
                </span>
                {' - '}
                <span className="text-primary-blue font-semibold">
                  {Math.min(currentPage * itemsPerPage, filteredPatients.length)}
                </span>
                {' de '}
                <span className="text-primary-blue font-semibold">
                  {filteredPatients.length}
                </span>
                {' pacientes'}
              </p>
            </div>
          </div>
        )}

        {/* Modal de edición */}
        {editPatient && (
          <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }}>
            <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[900px] max-h-[90vh] overflow-y-auto">
              {/* Header del modal */}
              <div className="bg-gradient-to-br from-primary-blue to-header-blue text-white p-6 rounded-t-[24px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-12 -mb-12"></div>
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-white bg-opacity-20 p-2 rounded-full">
                      ✏️
                    </div>
                    <div>
                      <h2 className="text-24 font-bold font-poppins">Editar Paciente</h2>
                      <p className="text-16 opacity-90 font-poppins">Actualizar información del paciente</p>
                    </div>
                  </div>
                  <button
                    className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-full transition-all duration-200"
                    onClick={handleCancelEdit}
                  >
                    ✖️
                  </button>
                </div>
              </div>

              {/* Contenido del modal */}
              <div className="p-6">
                {editFormErrors.general && (
                  <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-r-lg">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-red-700 font-poppins">{editFormErrors.general}</p>
                    </div>
                  </div>
                )}

                <form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Fecha de nacimiento - PRIMERO para calcular edad */}
                    <div>
                      <label className="block font-poppins font-medium text-gray-700 mb-2">Fecha de nacimiento</label>
                      <DateInput
                        name="birthdate"
                        value={editForm.birthdate}
                        onChange={handleEditFormChange}
                        className="w-full"
                        error={!!editFormErrors.birthdate}
                      />
                      {editFormErrors.birthdate && (
                        <p className="text-red-500 text-sm font-poppins mt-1">{editFormErrors.birthdate}</p>
                      )}
                    </div>
                    {/* Campo vacío para mantener grid */}
                    <div></div>

                    <div>
                      <label className="block font-poppins font-medium text-gray-700 mb-2">Tipo de documento</label>
                      <Select
                        name="document_type"
                        value={editForm.document_type}
                        onChange={handleEditFormChange}
                        className="w-full"
                        error={!!editFormErrors.document_type}
                      >
                        {getValidDocumentTypes(calculateAge(editForm.birthdate)).map(docType => (
                          <option key={docType.value} value={docType.value}>
                            {docType.label}
                          </option>
                        ))}
                      </Select>
                      {editFormErrors.document_type && (
                        <p className="text-red-500 text-sm font-poppins mt-1">{editFormErrors.document_type}</p>
                      )}
                    </div>
                    <div>
                      <label className="block font-poppins font-medium text-gray-700 mb-2">Número de documento</label>
                      <Input
                        name="document_number"
                        value={editForm.document_number}
                        onChange={handleEditFormChange}
                        className="w-full bg-gray-100 cursor-not-allowed"
                        error={!!editFormErrors.document_number}
                        readOnly={true}
                      />
                      {editFormErrors.document_number && (
                        <p className="text-red-500 text-sm font-poppins mt-1">{editFormErrors.document_number}</p>
                      )}
                    </div>
                    <div>
                      <label className="block font-poppins font-medium text-gray-700 mb-2">Nombres</label>
                      <Input
                        name="full_names"
                        value={editForm.full_names}
                        onChange={handleEditFormChange}
                        className="w-full"
                        error={!!editFormErrors.full_names}
                        placeholder="Primer nombre segundo nombre"
                      />
                      {editFormErrors.full_names && (
                        <p className="text-red-500 text-sm font-poppins mt-1">{editFormErrors.full_names}</p>
                      )}
                    </div>
                    <div>
                      <label className="block font-poppins font-medium text-gray-700 mb-2">Apellidos</label>
                      <Input
                        name="full_surnames"
                        value={editForm.full_surnames}
                        onChange={handleEditFormChange}
                        className="w-full"
                        error={!!editFormErrors.full_surnames}
                        placeholder="Primer apellido segundo apellido"
                      />
                      {editFormErrors.full_surnames && (
                        <p className="text-red-500 text-sm font-poppins mt-1">{editFormErrors.full_surnames}</p>
                      )}
                    </div>
                    <div>
                      <label className="block font-poppins font-medium text-gray-700 mb-2">Correo electrónico</label>
                      <Input
                        name="email"
                        value={editForm.email}
                        onChange={handleEmailChange}
                        className="w-full"
                        error={!!editFormErrors.email}
                      />
                      {editFormErrors.email && (
                        <p className="text-red-500 text-sm font-poppins mt-1">{editFormErrors.email}</p>
                      )}
                    </div>
                    <div>
                      <label className="block font-poppins font-medium text-gray-700 mb-2">Teléfono</label>
                      <Input
                        name="phone"
                        value={editForm.phone}
                        onChange={handleEditFormChange}
                        className="w-full"
                        error={!!editFormErrors.phone || !!phoneEditError}
                        maxLength={10}
                      />
                      {(editFormErrors.phone || phoneEditError) && (
                        <p className="text-red-500 text-sm font-poppins mt-1">{editFormErrors.phone || phoneEditError}</p>
                      )}
                    </div>
                    <div>
                      <label className="block font-poppins font-medium text-gray-700 mb-2">Ocupación</label>
                      <Input
                        name="occupation"
                        value={editForm.occupation}
                        onChange={handleEditFormChange}
                        className="w-full"
                        error={!!editFormErrors.occupation}
                      />
                    </div>
                    <div>
                      <label className="block font-poppins font-medium text-gray-700 mb-2">Grupo Sanguíneo</label>
                      <Select
                        name="blood_group"
                        value={editForm.blood_group}
                        onChange={handleEditFormChange}
                        className="w-full"
                        error={!!editFormErrors.blood_group}
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
                      {editFormErrors.blood_group && (
                        <p className="text-red-500 text-sm font-poppins mt-1">{editFormErrors.blood_group}</p>
                      )}
                    </div>
                    <div>
                      <label className="block font-poppins font-medium text-gray-700 mb-2">¿Tiene discapacidad?</label>
                      <Select
                        name="has_disability"
                        value={editForm.has_disability}
                        onChange={handleEditFormChange}
                        className="w-full"
                        error={!!editFormErrors.has_disability}
                        placeholder="¿Tiene alguna discapacidad?"
                      >
                        <option value="false">No</option>
                        <option value="true">Sí</option>
                      </Select>
                      {editFormErrors.has_disability && (
                        <p className="text-red-500 text-sm font-poppins mt-1">{editFormErrors.has_disability}</p>
                      )}
                    </div>
                  </div>

                  {/* Descripción de discapacidad - Solo si tiene discapacidad */}
                  {editForm.has_disability === "true" && (
                    <div className="mt-6">
                      <label className="block font-poppins font-medium text-gray-700 mb-2">
                        Descripción de la discapacidad *
                      </label>
                      <textarea
                        name="disability_description"
                        value={editForm.disability_description}
                        onChange={handleEditFormChange}
                        placeholder="Describa la discapacidad del paciente"
                        className={`w-full px-4 py-3 border rounded-[16px] text-16 font-poppins focus:outline-none focus:ring-2 focus:ring-primary-blue resize-none ${editFormErrors.disability_description
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:border-primary-blue'
                          }`}
                        rows={3}
                        maxLength={500}
                      />
                      {editFormErrors.disability_description && (
                        <p className="text-red-500 text-sm font-poppins mt-1">{editFormErrors.disability_description}</p>
                      )}
                      <p className="text-gray-500 text-sm font-poppins mt-1">
                        Máximo 500 caracteres ({editForm.disability_description?.length || 0}/500)
                      </p>
                    </div>
                  )}

                  {/* Sección del tutor legal */}
                  {needsGuardian && (
                    <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-[16px] border border-blue-200">
                      <div className="flex items-center mb-4">
                        <div className="bg-blue-100 p-2 rounded-full mr-3">
                          🛡️
                        </div>
                        <div>
                          <h3 className="text-20 font-semibold font-poppins text-gray-800">Información del Tutor Legal</h3>
                          <p className="text-14 text-gray-600 font-poppins">
                            El paciente requiere un tutor legal debido a su
                            {editForm.has_disability === "true" && (calculateAge(editForm.birthdate) >= 18 && calculateAge(editForm.birthdate) <= 64) ?
                              ' discapacidad' :
                              ' edad'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block font-poppins font-medium text-gray-700 mb-2">Tipo de documento</label>
                          <Select
                            name="guardian_document_type"
                            value={guardianForm.guardian_document_type}
                            onChange={handleGuardianFormChange}
                            className="w-full"
                            error={!!guardianFormErrors.guardian_document_type}
                          >
                            <option value="">Seleccionar tipo</option>
                            {getValidDocumentTypes(25).map(docType => ( // Asumimos que los tutores son adultos
                              <option key={docType.value} value={docType.value}>
                                {docType.label}
                              </option>
                            ))}
                          </Select>
                          {guardianFormErrors.guardian_document_type && (
                            <p className="text-red-500 text-sm font-poppins mt-1">{guardianFormErrors.guardian_document_type}</p>
                          )}
                        </div>
                        <div>
                          <label className="block font-poppins font-medium text-gray-700 mb-2">Número de documento</label>
                          <Input
                            name="guardian_document_number"
                            value={guardianForm.guardian_document_number}
                            onChange={handleGuardianFormChange}
                            className={guardianForm.guardian_document_number !== "" ? "w-full bg-gray-100 cursor-not-allowed" : "w-full"}
                            error={!!guardianFormErrors.guardian_document_number}
                            readOnly={guardianForm.guardian_document_number !== ""}
                          />
                          {guardianFormErrors.guardian_document_number && (
                            <p className="text-red-500 text-sm font-poppins mt-1">{guardianFormErrors.guardian_document_number}</p>
                          )}
                        </div>
                        <div>
                          <label className="block font-poppins font-medium text-gray-700 mb-2">Nombres</label>
                          <Input
                            name="guardian_full_names"
                            value={guardianForm.guardian_full_names}
                            onChange={handleGuardianFormChange}
                            className="w-full"
                            error={!!guardianFormErrors.guardian_full_names}
                            placeholder="Primer nombre segundo nombre"
                          />
                          {guardianFormErrors.guardian_full_names && (
                            <p className="text-red-500 text-sm font-poppins mt-1">{guardianFormErrors.guardian_full_names}</p>
                          )}
                        </div>
                        <div>
                          <label className="block font-poppins font-medium text-gray-700 mb-2">Apellidos</label>
                          <Input
                            name="guardian_full_surnames"
                            value={guardianForm.guardian_full_surnames}
                            onChange={handleGuardianFormChange}
                            className="w-full"
                            error={!!guardianFormErrors.guardian_full_surnames}
                            placeholder="Primer apellido segundo apellido"
                          />
                          {guardianFormErrors.guardian_full_surnames && (
                            <p className="text-red-500 text-sm font-poppins mt-1">{guardianFormErrors.guardian_full_surnames}</p>
                          )}
                        </div>
                        <div>
                          <label className="block font-poppins font-medium text-gray-700 mb-2">Fecha de nacimiento</label>
                          <DateInput
                            name="guardian_birthdate"
                            value={guardianForm.guardian_birthdate}
                            onChange={handleGuardianFormChange}
                            className="w-full"
                            error={!!guardianFormErrors.guardian_birthdate}
                          />
                          {guardianFormErrors.guardian_birthdate && (
                            <p className="text-red-500 text-sm font-poppins mt-1">{guardianFormErrors.guardian_birthdate}</p>
                          )}
                        </div>
                        <div>
                          <label className="block font-poppins font-medium text-gray-700 mb-2">Relación con el paciente</label>
                          <Select
                            name="guardian_relationship_type"
                            value={guardianForm.guardian_relationship_type}
                            onChange={handleGuardianFormChange}
                            className="w-full"
                            error={!!guardianFormErrors.guardian_relationship_type}
                          >
                            <option value="">Seleccionar relación</option>
                            <option value="Father">Padre</option>
                            <option value="Mother">Madre</option>
                            <option value="Grandfather">Abuelo</option>
                            <option value="Grandmother">Abuela</option>
                            <option value="Brother">Hermano</option>
                            <option value="Sister">Hermana</option>
                            <option value="Legal_Guardian">Tutor Legal</option>
                            <option value="Other">Otro</option>
                          </Select>
                          {guardianFormErrors.guardian_relationship_type && (
                            <p className="text-red-500 text-sm font-poppins mt-1">{guardianFormErrors.guardian_relationship_type}</p>
                          )}
                        </div>
                        <div>
                          <label className="block font-poppins font-medium text-gray-700 mb-2">Correo electrónico</label>
                          <Input
                            name="guardian_email"
                            value={guardianForm.guardian_email}
                            onChange={handleGuardianEmailChange}
                            className="w-full"
                            error={!!guardianFormErrors.guardian_email}
                          />
                          {guardianFormErrors.guardian_email && (
                            <p className="text-red-500 text-sm font-poppins mt-1">{guardianFormErrors.guardian_email}</p>
                          )}
                        </div>
                        <div>
                          <label className="block font-poppins font-medium text-gray-700 mb-2">Teléfono</label>
                          <Input
                            name="guardian_phone"
                            value={guardianForm.guardian_phone}
                            onChange={handleGuardianFormChange}
                            className="w-full"
                            error={!!guardianFormErrors.guardian_phone}
                            maxLength={10}
                          />
                          {guardianFormErrors.guardian_phone && (
                            <p className="text-red-500 text-sm font-poppins mt-1">{guardianFormErrors.guardian_phone}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </form>

                {/* Botones de acción */}
                <div className="flex justify-center space-x-6 mt-8 pt-6 border-t border-gray-200">
                  <Button
                    className="bg-header-blue hover:bg-header-blue-hover text-white px-8 py-3 font-bold rounded-[40px] text-16 shadow-md"
                    onClick={handleCancelEdit}
                    disabled={editLoading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="bg-primary-blue hover:bg-primary-blue-hover text-white px-8 py-3 font-bold rounded-[40px] text-16 shadow-md"
                    onClick={handleSaveEdit}
                    disabled={editLoading}
                  >
                    {editLoading ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Guardando...
                      </div>
                    ) : (
                      'Guardar cambios'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal unificado de información del paciente */}
        {patientInfoModal.open && patientInfoModal.patient && (
          <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }}>
            <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[900px] max-h-[90vh] overflow-y-auto">
              {/* Header del modal */}
              <div className="bg-gradient-to-br from-primary-blue to-header-blue text-white p-6 rounded-t-[24px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-12 -mb-12"></div>
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-white bg-opacity-20 p-3 rounded-full">
                      👤
                    </div>
                    <div>
                      <h2 className="text-26 font-bold font-poppins">Información Completa del Paciente</h2>
                      <p className="text-16 opacity-90 font-poppins">
                        {patientInfoModal.patient.person.first_name} {patientInfoModal.patient.person.first_surname}
                      </p>
                    </div>
                  </div>
                  <button
                    className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-full transition-all duration-200"
                    onClick={() => setPatientInfoModal({ open: false, patient: null })}
                  >
                    ✖️
                  </button>
                </div>
              </div>

              {/* Contenido del modal */}
              <div className="p-6">
                {/* Información personal del paciente */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-[16px] p-6 mb-6">
                  <div className="flex items-center mb-4">
                    <div className="bg-blue-100 p-2 rounded-full mr-3">
                      📋
                    </div>
                    <h3 className="text-20 font-semibold font-poppins text-gray-800">Datos Personales</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-[12px] p-4 shadow-sm">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Nombre Completo</label>
                      <p className="text-18 font-semibold text-gray-900 font-poppins">
                        {patientInfoModal.patient.person.first_name} {patientInfoModal.patient.person.first_surname}
                        {patientInfoModal.patient.person.second_surname && ` ${patientInfoModal.patient.person.second_surname}`}
                      </p>
                    </div>
                    <div className="bg-white rounded-[12px] p-4 shadow-sm">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Documento</label>
                      <p className="text-16 font-medium text-gray-900 font-poppins">
                        {patientInfoModal.patient.person.document_type} - {patientInfoModal.patient.person.document_number}
                      </p>
                    </div>
                    <div className="bg-white rounded-[12px] p-4 shadow-sm">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Edad</label>
                      <p className="text-16 font-medium text-gray-900 font-poppins">
                        {calculateAge(patientInfoModal.patient.person.birthdate)} años
                      </p>
                    </div>
                    <div className="bg-white rounded-[12px] p-4 shadow-sm">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Grupo Sanguíneo</label>
                      <p className="text-16 font-medium text-gray-900 font-poppins">
                        {patientInfoModal.patient.blood_group || 'No especificado'}
                      </p>
                    </div>
                    <div className="bg-white rounded-[12px] p-4 shadow-sm">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Ocupación</label>
                      <p className="text-16 font-medium text-gray-900 font-poppins">
                        {patientInfoModal.patient.occupation || 'No especificada'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Información de contacto */}
                {(patientInfoModal.patient.person.email || patientInfoModal.patient.person.phone) && (
                  <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-[16px] p-6 mb-6">
                    <div className="flex items-center mb-4">
                      <div className="bg-green-100 p-2 rounded-full mr-3">
                        📧
                      </div>
                      <h3 className="text-20 font-semibold font-poppins text-gray-800">Información de Contacto</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {patientInfoModal.patient.person.email && (
                        <div className="bg-white rounded-[12px] p-4 shadow-sm">
                          <label className="block text-sm font-medium text-gray-600 mb-1">Correo Electrónico</label>
                          <p className="text-16 font-medium text-gray-900 font-poppins break-all">
                            {patientInfoModal.patient.person.email}
                          </p>
                        </div>
                      )}
                      {patientInfoModal.patient.person.phone && (
                        <div className="bg-white rounded-[12px] p-4 shadow-sm">
                          <label className="block text-sm font-medium text-gray-600 mb-1">Teléfono</label>
                          <p className="text-16 font-medium text-gray-900 font-poppins">
                            {patientInfoModal.patient.person.phone}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Información de discapacidad */}
                <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-[16px] p-6 mb-6">
                  <div className="flex items-center mb-4">
                    <div className="bg-orange-100 p-2 rounded-full mr-3">
                      ♿
                    </div>
                    <h3 className="text-20 font-semibold font-poppins text-gray-800">Información de Discapacidad</h3>
                  </div>
                  <div className="bg-white rounded-[12px] p-4 shadow-sm">
                    <label className="block text-sm font-medium text-gray-600 mb-1">¿Tiene discapacidad?</label>
                    <p className="text-16 font-medium text-gray-900 font-poppins mb-3">
                      {patientInfoModal.patient.has_disability ? 'Sí' : 'No'}
                    </p>
                    {patientInfoModal.patient.has_disability && patientInfoModal.patient.disability_description && (
                      <>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Descripción de la discapacidad</label>
                        <p className="text-16 font-medium text-gray-900 font-poppins">
                          {patientInfoModal.patient.disability_description}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Información del tutor */}
                {patientInfoModal.patient.guardian && (
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-[16px] p-6 mb-6">
                    <div className="flex items-center mb-4">
                      <div className="bg-purple-100 p-2 rounded-full mr-3">
                        🛡️
                      </div>
                      <h3 className="text-20 font-semibold font-poppins text-gray-800">Información del Tutor Legal</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white rounded-[12px] p-4 shadow-sm">
                        <label className="block text-sm font-medium text-gray-600 mb-1">Nombre Completo</label>
                        <p className="text-16 font-medium text-gray-900 font-poppins">
                          {patientInfoModal.patient.guardian.person.first_name} {patientInfoModal.patient.guardian.person.first_surname}
                          {patientInfoModal.patient.guardian.person.second_surname && ` ${patientInfoModal.patient.guardian.person.second_surname}`}
                        </p>
                      </div>
                      <div className="bg-white rounded-[12px] p-4 shadow-sm">
                        <label className="block text-sm font-medium text-gray-600 mb-1">Documento</label>
                        <p className="text-16 font-medium text-gray-900 font-poppins">
                          {patientInfoModal.patient.guardian.person.document_type} - {patientInfoModal.patient.guardian.person.document_number}
                        </p>
                      </div>
                      <div className="bg-white rounded-[12px] p-4 shadow-sm">
                        <label className="block text-sm font-medium text-gray-600 mb-1">Relación</label>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                          {getRelationshipText(patientInfoModal.patient.guardian.relationship_type)}
                        </span>
                      </div>
                      <div className="bg-white rounded-[12px] p-4 shadow-sm">
                        <label className="block text-sm font-medium text-gray-600 mb-1">Edad</label>
                        <p className="text-16 font-medium text-gray-900 font-poppins">
                          {calculateAge(patientInfoModal.patient.guardian.person.birthdate)} años
                        </p>
                      </div>
                      {patientInfoModal.patient.guardian.person.email && (
                        <div className="bg-white rounded-[12px] p-4 shadow-sm">
                          <label className="block text-sm font-medium text-gray-600 mb-1">Correo Electrónico</label>
                          <p className="text-16 font-medium text-gray-900 font-poppins break-all">
                            {patientInfoModal.patient.guardian.person.email}
                          </p>
                        </div>
                      )}
                      {patientInfoModal.patient.guardian.person.phone && (
                        <div className="bg-white rounded-[12px] p-4 shadow-sm">
                          <label className="block text-sm font-medium text-gray-600 mb-1">Teléfono</label>
                          <p className="text-16 font-medium text-gray-900 font-poppins">
                            {patientInfoModal.patient.guardian.person.phone}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Botón de cerrar */}
                <div className="flex justify-center mt-8 pt-6 border-t border-gray-200">
                  <Button
                    className="bg-primary-blue hover:bg-primary-blue-hover text-white px-8 py-3 font-bold rounded-[40px] text-16 shadow-md"
                    onClick={() => setPatientInfoModal({ open: false, patient: null })}
                  >
                    Cerrar

                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de desactivación con motivo */}
        {deactivationModal.open && (
          <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }}>
            <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[500px] max-h-[90vh] overflow-y-auto">
              {/* Header del modal */}
              <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-t-[24px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-12 -mb-12"></div>
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-white bg-opacity-20 p-3 rounded-full">
                      ⚠️
                    </div>
                    <div>
                      <h2 className="text-26 font-bold font-poppins">Desactivar Paciente</h2>
                      <p className="text-16 opacity-90 font-poppins">
                        {deactivationModal.patient?.person.first_name} {deactivationModal.patient?.person.first_surname}
                      </p>
                    </div>
                  </div>
                  <button
                    className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-full transition-all duration-200"
                    onClick={() => setDeactivationModal({ open: false, patient: null, reason: '', loading: false })}
                    disabled={deactivationModal.loading}
                  >
                    ✖️
                  </button>
                </div>
              </div>

              {/* Contenido del modal */}
              <div className="p-6">
                <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-[16px] p-6 mb-6">
                  <div className="flex items-center mb-4">
                    <div className="bg-red-100 p-2 rounded-full mr-3">
                      📝
                    </div>
                    <h3 className="text-20 font-semibold font-poppins text-gray-800">Motivo de Desactivación</h3>
                  </div>
                  <div className="bg-white rounded-[12px] p-4 shadow-sm">
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      Ingrese el motivo de desactivación *
                    </label>
                    <textarea
                      className="w-full px-4 py-3 border border-gray-300 rounded-[12px] resize-none font-poppins text-16 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      rows="4"
                      placeholder="Ej: Paciente se trasladó a otra ciudad, duplicado en el sistema, etc."
                      value={deactivationModal.reason}
                      onChange={(e) => setDeactivationModal(prev => ({ ...prev, reason: e.target.value }))}
                      disabled={deactivationModal.loading}
                    />
                    {!deactivationModal.reason.trim() && (
                      <p className="text-sm text-red-500 mt-2 font-poppins">Este campo es obligatorio</p>
                    )}
                  </div>
                </div>

                {/* Botones */}
                <div className="flex justify-center space-x-4 pt-6 border-t border-gray-200">
                  <Button
                    className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 font-bold rounded-[40px] text-16 shadow-md"
                    onClick={() => setDeactivationModal({ open: false, patient: null, reason: '', loading: false })}
                    disabled={deactivationModal.loading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 font-bold rounded-[40px] text-16 shadow-md"
                    onClick={handleDeactivate}
                    disabled={deactivationModal.loading || !deactivationModal.reason.trim()}
                  >
                    {deactivationModal.loading ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Desactivando...
                      </div>
                    ) : (
                      'Desactivar'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}


      </section>
    </main>
  );
}

export default PatientManagement;
