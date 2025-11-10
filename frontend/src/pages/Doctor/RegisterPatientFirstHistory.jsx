import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Components
import Button from "../../components/Button";
import Input from "../../components/Input";
import Select from "../../components/Select";
import TextArea from "../../components/TextArea";
import MultiSelect from "../../components/MultiSelect";
import FormSection from "../../components/FormSection";
import FormField from "../../components/FormField";
import AlertMessage from "../../components/AlertMessage";
import SignatureCredentialField from "../../components/SignatureCredentialField";
import PatientInfoCard from "../../components/PatientInfoCard";
import LegalConfirmationModal from "../../components/LegalConfirmationModal";
import FormNavigationBar from "../../components/FormNavigationBar";
import PatientSearchSelect from "../../components/PatientSearchSelect";
import InputPassword from "../../components/InputPassword";

// Hooks
import { useAuth } from "../../contexts/AuthContext";
import { useFormValidation } from "../../hooks/useFormValidation";
import { useFormProgress } from "../../hooks/useFormProgress";
import { useFormSections } from "../../hooks/useFormSections";

// Services
import { getActivePatients, getPatientById } from "../../services/patientService";
import { createClinicalHistory, formatClinicalHistoryData } from "../../services/historyPatientService";
import { getDentalServices } from "../../services/dentalServiceService";

// Constants
import {
  PATHOLOGY_OPTIONS,
  MEDICATION_OPTIONS,
  ALLERGY_OPTIONS,
  PREVIOUS_TREATMENTS_OPTIONS,
  ANESTHESIA_TOLERANCE_OPTIONS,
  BREATHING_CONDITION_OPTIONS,
  COAGULATION_CONDITION_OPTIONS
} from "../../constants/medicalHistoryOptions";

// Icons
import { MdCancel } from "react-icons/md";
import { IoIosSave } from "react-icons/io";

/**
 * Utility function to merge Tailwind classes
 * @param {...string} args - Class names to merge
 * @returns {string} Merged class names
 */
function cn(...args) {
  return twMerge(clsx(args));
}

/**
 * Calculate patient age based on birth date
 * @param {string} birthDate - Patient's birth date
 * @returns {number} Patient's age in years
 */
const calculateAge = (birthDate) => {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
};

/**
 * Initial state for the clinical history form
 */
const INITIAL_FORM_STATE = {
  patient_id: "",
  reason: "",
  symptoms: "",
  medical_history: {
    general_pathologies: [],
    anesthesia_tolerance: "",
    breathing_condition: "",
    coagulation_condition: "",
    current_medication: [],
    previous_treatments: [],
    allergies: [],
  },
  diagnosis: "",
  dental_services: [],
  findings: "",
  doctor_signature: "",
  doctor_password: "", // <-- agregar
  treatments: []
};

/**
 * RegisterPatientFirstHistory Component
 * 
 * Main component for creating the first clinical history for a patient.
 * Handles form validation, submission, and user interactions with legal confirmation.
 * 
 * Features:
 * - Multi-section form with progress tracking
 * - Real-time validation and error highlighting
 * - Legal confirmation modal for digital signatures
 * - Smooth scrolling navigation between form sections
 * - Auto-save prevention with incomplete forms
 * 
 * @returns {JSX.Element} The clinical history registration form
 */
const RegisterPatientFirstHistory = () => {
  const { token, currentUser } = useAuth();
  const navigate = useNavigate();
  const { patientId } = useParams();
  const { validateForm } = useFormValidation();
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  // Form State Management
  const [formData, setFormData] = useState({
    patient_id: "",
    reason: "",
    symptoms: "",
    medical_history: {
      general_pathologies: [],
      anesthesia_tolerance: "",
      breathing_condition: "",
      coagulation_condition: "",
      current_medication: [],
      previous_treatments: [],
      allergies: [],
    },
    diagnosis: "",
    dental_services: [],
    findings: "",
    doctor_signature: "",
    doctor_password: "", // <-- agregar
    treatments: []
  });
  const [formErrors, setFormErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');



  // UI State Management
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Data State Management
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientDetails, setPatientDetails] = useState(null);
  const [dentalServices, setDentalServices] = useState([]);
  const [doctorBackendInfo, setDoctorBackendInfo] = useState(null);
  const [loadingDoctorInfo, setLoadingDoctorInfo] = useState(true);

  // Custom hooks for form progress and section management
  const progress = useFormProgress(formData);
  const sections = useFormSections(formData, hasAttemptedSubmit);

  /**
   * Load initial data when component mounts or token changes
   */
  useEffect(() => {
    if (token) {
      loadPatients();
      loadDentalServices();
      if (patientId) {
        loadPatientDetails(patientId);
      }
    }
  }, [token, patientId]);

  /**
   * Update selected patient when form data changes
   */
  useEffect(() => {
    if (formData.patient_id && patients.length > 0) {
      const patient = patients.find(p => p.id === Number.parseInt(formData.patient_id));
      setSelectedPatient(patient);
    }
  }, [formData.patient_id, patients]);

  /**
   * Load doctor information from backend
   */
  useEffect(() => {
    const loadDoctorInfo = async () => {
      if (token) {
        try {
          setLoadingDoctorInfo(true);
          const response = await fetch(`${API_BASE_URL}/api/users/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            throw new Error('Failed to fetch doctor information');
          }

          const doctorData = await response.json();
          setDoctorBackendInfo(doctorData);
        } catch (error) {
          // Log error for debugging purposes only
          if (process.env.NODE_ENV === 'development') {
            console.error('Error loading doctor information:', error);
          }
          setFormError('Error al cargar información del doctor');
        } finally {
          setLoadingDoctorInfo(false);
        }
      }
    };

    loadDoctorInfo();
  }, [token]);

  /**
   * Load all available patients
   */
  const loadPatients = async () => {
    setLoadingData(true);
    try {
      const response = await getActivePatients(token);
      setPatients(response || []);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error loading patients:', error);
      }
      setFormError('Error al cargar la lista de pacientes');
    } finally {
      setLoadingData(false);
    }
  };

  /**
   * Load specific patient details by ID
   * @param {string|number} id - Patient ID
   */
  const loadPatientDetails = async (id) => {
    try {
      const response = await getPatientById(id, token);
      setPatientDetails(response);
      setFormData(prev => ({ ...prev, patient_id: id }));

      // Update selected patient if patients are already loaded
      if (patients.length > 0) {
        const patient = patients.find(p => p.id === parseInt(id));
        setSelectedPatient(patient);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error loading patient details:', error);
      }
      setFormError('Error al cargar los detalles del paciente');
    }
  };


  /**
   * Load available dental services
   */
  const loadDentalServices = async () => {
    try {
      const response = await getDentalServices(token, { is_active: true });

      // Filter out invalid services
      const validServices = (response || []).filter(service => {
        const isValid = service &&
          service.id &&
          service.name &&
          !isNaN(service.value);

        if (!isValid && process.env.NODE_ENV === 'development') {
          console.warn('Invalid service detected:', service);
        }

        return isValid;
      });

      setDentalServices(validServices);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error loading dental services:', error);
      }
      setFormError('Error al cargar los servicios odontológicos');
      setDentalServices([]);
    }
  };

  /**
   * Handle patient selection change
   * @param {string} patientId - Selected patient ID
   */
  const handlePatientChange = async (patientId) => {
    const patient = patients.find(p => p.id === parseInt(patientId));
    setSelectedPatient(patient);
    setFormData(prev => ({ ...prev, patient_id: patientId, doctor_signature: "" }));

    if (patientId) {
      await loadPatientDetails(patientId);
    } else {
      setPatientDetails(null);
    }
  };

  /**
   * Handle form field changes
   * @param {Event} e - Input change event
   */
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Handle nested medical history fields
    if (name.startsWith('medical_history.')) {
      const fieldName = name.replace('medical_history.', '');
      setFormData(prev => ({
        ...prev,
        medical_history: { ...prev.medical_history, [fieldName]: value }
      }));
    }
    // Handle dental services array
    else if (name === 'dental_services') {
      const serviceIds = Array.isArray(value) ? value : [];
      setFormData(prev => ({ ...prev, dental_services: serviceIds }));
    }
    // Handle regular fields
    else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear field-specific errors when user starts typing
    setFormErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
  };

  /**
   * Handle legal confirmation acceptance
   */
  const handleLegalConfirm = async () => {
    setShowLegalModal(false);
    await processFormSubmission();
  };

  /**
   * Handle legal confirmation cancellation
   */
  const handleLegalCancel = () => {
    setShowLegalModal(false);
    setLoading(false);
  };

  /**
   * Smooth scroll to top of page
   */
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  /**
   * Scroll to first incomplete form section
   */
  const scrollToFirstIncompleteSection = () => {
    const incompleteSection = sections.find(section => !section.completed);
    if (incompleteSection) {
      const element = document.getElementById(incompleteSection.id);
      if (element) {
        const yOffset = -140; // Account for sticky navigation bar
        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
  };

  /**
   * Handle form submission
   * @param {Event} e - Form submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setFormError('');
    setLoading(true);
    setHasAttemptedSubmit(true);

    try {
      const errors = validateForm(formData);
      setFormErrors(errors);

      if (Object.keys(errors).length > 0) {
        setFormError('Por favor, complete todos los campos obligatorios marcados en rojo.');

        if (process.env.NODE_ENV === 'development') {
          console.error('Validation errors:', errors);
        }

        setLoading(false);

        // Scroll to first incomplete section after brief delay
        setTimeout(() => {
          scrollToFirstIncompleteSection();
        }, 100);
        return;
      }

      // Reset attempt state if validation passes
      setHasAttemptedSubmit(false);
      setShowLegalModal(true);

    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Form validation error:', error);
      }
      setFormError('Error al procesar el formulario.');
      setLoading(false);

      setTimeout(() => {
        scrollToTop();
      }, 100);
    }
  };

  /**
   * Process form submission after legal confirmation
   */
  const processFormSubmission = async () => {
    try {
      const currentDate = new Date().toISOString();

      // Process selected dental services
      const selectedServiceIds = Array.isArray(formData.dental_services)
        ? formData.dental_services.map(id => parseInt(id, 10))
        : [];

      const selectedServicesNames = selectedServiceIds
        .map(serviceId => {
          const service = dentalServices.find(s => s.id === parseInt(serviceId));
          if (!service) {
            if (process.env.NODE_ENV === 'development') {
              console.warn(`Service not found: ${serviceId}`);
            }
            return null;
          }
          const price = service.value || 0;
          return `${service.name} ($${price.toLocaleString('es-CO')})`;
        })
        .filter(Boolean)
        .join(', ');

      // Build treatment notes
      const treatmentNotes = selectedServicesNames
        ? `Servicios Odontológicos Recomendados: ${selectedServicesNames}${formData.diagnosis ? `\n\nDiagnóstico: ${formData.diagnosis}` : ''}`
        : (formData.diagnosis ? `Diagnóstico: ${formData.diagnosis}` : null);

      // Create treatment record
      const treatments = [{
        dental_service_id: 1,
        treatment_date: currentDate,
        notes: treatmentNotes || ''
      }];

      const formDataWithTreatments = {
        ...formData,
        treatments: treatments
      };

      // Format and submit data
      const historyData = formatClinicalHistoryData(formDataWithTreatments);
      const response = await createClinicalHistory(historyData, token);

      // Reset form state on success
      toast.success("¡Historia clínica registrada con éxito!");
      setFormData(INITIAL_FORM_STATE);
      setFormErrors({});
      setSelectedPatient(null);
      setPatientDetails(null);
      setHasAttemptedSubmit(false);

      // Scroll to show success message
      setTimeout(() => {
        scrollToTop();
      }, 100);

      // Navigate to history management after delay
      setTimeout(() => navigate(`/doctor/history-management/${response.clinical_history.id}`), 2000);

    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Submission error:', error);
      }

      // Format error message for user display
      let errorMessage = 'Error al crear la historia clínica.';
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        errorMessage = Array.isArray(detail)
          ? detail.map(err => `${err.loc?.slice(1).join('.') || 'campo'}: ${err.msg}`).join('\n')
          : detail;
      }

      setFormError(errorMessage);

      setTimeout(() => {
        scrollToTop();
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while initial data loads
  if (loadingData) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center bg-gray-50 min-h-screen p-4" role="main" aria-busy="true">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue mx-auto mb-4"
            role="status"
            aria-label="Cargando datos"
          ></div>
          <p className="text-gray-600 font-poppins text-base sm:text-18">Cargando datos...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center bg-gray-50 pt-4 sm:pt-6 md:pt-8 pb-8 sm:pb-10 px-3 sm:px-4 lg:px-6" role="main">
      {/* Page Header */}
      <header className="w-full max-w-[900px] mb-4 sm:mb-6">
        <h1 className="text-header-blue text-2xl sm:text-3xl md:text-4xl lg:text-46 font-bold text-center font-poppins leading-tight">
          CREAR HISTORIA CLÍNICA
        </h1>
      </header>

      {/* Form Navigation with Progress Tracking */}
      <FormNavigationBar
        progress={progress}
        sections={sections}
        showProgressBar={true}
        showLabels={true}
        hasAttemptedSubmit={hasAttemptedSubmit}
      />

      {/* Alert Messages */}
      <AlertMessage
        type="error"
        message={formError}
        role="alert"
        aria-live="assertive"
      />
      <AlertMessage
        type="success"
        message={successMessage}
        role="status"
        aria-live="polite"
      />

      {/* Clinical History Form */}
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[900px] mx-auto space-y-4 sm:space-y-6"
        noValidate
        aria-label="Formulario de historia clínica"
      >
        {/* Patient Selection Section */}
        <FormSection id="patient-info" title="Información del Paciente">
          <div className="grid grid-cols-1 gap-4">
            <FormField label="Seleccionar Paciente" required error={formErrors.patient_id}>
              <PatientSearchSelect
                patients={patients || []}
                selectedPatientId={formData.patient_id}
                onSelectPatient={handlePatientChange}
                disabled={!!patientId}
              />
            </FormField>
            {/* Patient Information Display */}
            <PatientInfoCard
              patientDetails={patientDetails}
              showHeader={true}
              showActions={true}
            />
          </div>
        </FormSection>

        {/* Consultation Information Section */}
        <FormSection id="consultation-info" title="Información de Consulta">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FormField label="Razón Principal de Consulta" required error={formErrors.reason}>
              <TextArea
                name="reason"
                id="reason"
                value={formData.reason}
                onChange={handleChange}
                placeholder="Describa la razón principal por la que el paciente acude a consulta"
                error={!!formErrors.reason}
                rows={3}
                aria-required="true"
                aria-invalid={!!formErrors.reason}
                aria-describedby={formErrors.reason ? "reason-error" : undefined}
              />
            </FormField>

            <FormField label="Síntomas y Molestias" required error={formErrors.symptoms}>
              <TextArea
                name="symptoms"
                id="symptoms"
                value={formData.symptoms}
                onChange={handleChange}
                placeholder="Describa los síntomas, molestias o inquietudes relacionados con la salud bucodental"
                error={!!formErrors.symptoms}
                rows={3}
                aria-required="true"
                aria-invalid={!!formErrors.symptoms}
                aria-describedby={formErrors.symptoms ? "symptoms-error" : undefined}
              />
            </FormField>
          </div>
        </FormSection>

        {/* Medical History Section */}
        <FormSection id="medical-history" title="Antecedentes Médicos">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Anesthesia Tolerance */}
            <FormField label="Tolerancia a la Anestesia" required error={formErrors['medical_history.anesthesia_tolerance']}>
              <Select
                name="medical_history.anesthesia_tolerance"
                id="anesthesia_tolerance"
                value={formData.medical_history.anesthesia_tolerance}
                onChange={handleChange}
                error={!!formErrors['medical_history.anesthesia_tolerance']}
                placeholder="Seleccione la tolerancia a la anestesia"
                aria-required="true"
                aria-invalid={!!formErrors['medical_history.anesthesia_tolerance']}
                aria-describedby={formErrors['medical_history.anesthesia_tolerance'] ? "anesthesia_tolerance-error" : undefined}
              >
                {ANESTHESIA_TOLERANCE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </FormField>

            {/* General Pathologies */}
            <FormField label="Patologías Generales" required error={formErrors['medical_history.general_pathologies']}>
              <MultiSelect
                name="medical_history.general_pathologies"
                id="general_pathologies"
                value={formData.medical_history.general_pathologies}
                onChange={handleChange}
                options={PATHOLOGY_OPTIONS}
                placeholder="Seleccione los antecedentes médicos"
                error={!!formErrors['medical_history.general_pathologies']}
                exclusiveOptions={["ninguno"]}
                aria-required="true"
                aria-invalid={!!formErrors['medical_history.general_pathologies']}
                aria-describedby={formErrors['medical_history.general_pathologies'] ? "general_pathologies-error" : undefined}
              />
            </FormField>

            {/* Breathing Condition */}
            <FormField label="Estado de Respiración" required error={formErrors['medical_history.breathing_condition']}>
              <Select
                name="medical_history.breathing_condition"
                id="breathing_condition"
                value={formData.medical_history.breathing_condition}
                onChange={handleChange}
                error={!!formErrors['medical_history.breathing_condition']}
                placeholder="Seleccione el estado respiratorio"
                aria-required="true"
                aria-invalid={!!formErrors['medical_history.breathing_condition']}
                aria-describedby={formErrors['medical_history.breathing_condition'] ? "breathing_condition-error" : undefined}
              >
                {BREATHING_CONDITION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </FormField>

            {/* Coagulation Condition */}
            <FormField label="Estado de Coagulación" required error={formErrors['medical_history.coagulation_condition']}>
              <Select
                name="medical_history.coagulation_condition"
                id="coagulation_condition"
                value={formData.medical_history.coagulation_condition}
                onChange={handleChange}
                error={!!formErrors['medical_history.coagulation_condition']}
                placeholder="Seleccione el estado de coagulación"
                aria-required="true"
                aria-invalid={!!formErrors['medical_history.coagulation_condition']}
                aria-describedby={formErrors['medical_history.coagulation_condition'] ? "coagulation_condition-error" : undefined}
              >
                {COAGULATION_CONDITION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </FormField>

            {/* Current Medication */}
            <FormField label="Medicación Actual" required error={formErrors['medical_history.current_medication']}>
              <MultiSelect
                name="medical_history.current_medication"
                id="current_medication"
                value={formData.medical_history.current_medication}
                onChange={handleChange}
                options={MEDICATION_OPTIONS}
                placeholder="Seleccione la medicación actual"
                error={!!formErrors['medical_history.current_medication']}
                exclusiveOptions={["ninguna"]}
                aria-required="true"
                aria-invalid={!!formErrors['medical_history.current_medication']}
                aria-describedby={formErrors['medical_history.current_medication'] ? "current_medication-error" : undefined}
              />
            </FormField>

            {/* Previous Treatments */}
            <FormField label="Tratamientos Previos" required error={formErrors['medical_history.previous_treatments']}>
              <MultiSelect
                name="medical_history.previous_treatments"
                id="previous_treatments"
                value={formData.medical_history.previous_treatments}
                onChange={handleChange}
                options={PREVIOUS_TREATMENTS_OPTIONS}
                placeholder="Seleccione los tratamientos previos"
                error={!!formErrors['medical_history.previous_treatments']}
                exclusiveOptions={["ninguno"]}
                aria-required="true"
                aria-invalid={!!formErrors['medical_history.previous_treatments']}
                aria-describedby={formErrors['medical_history.previous_treatments'] ? "previous_treatments-error" : undefined}
              />
            </FormField>

            {/* Allergies */}
            <FormField label="Alergias" required error={formErrors['medical_history.allergies']} className="sm:col-span-2">
              <MultiSelect
                name="medical_history.allergies"
                id="allergies"
                value={formData.medical_history.allergies}
                onChange={handleChange}
                options={ALLERGY_OPTIONS}
                placeholder="Seleccione las alergias conocidas"
                error={!!formErrors['medical_history.allergies']}
                exclusiveOptions={["ninguna"]}
                aria-required="true"
                aria-invalid={!!formErrors['medical_history.allergies']}
                aria-describedby={formErrors['medical_history.allergies'] ? "allergies-error" : undefined}
              />
            </FormField>
          </div>
        </FormSection>

        {/* Clinical Findings Section */}
        <FormSection id="clinical-findings" title="Observaciones y Hallazgos Clínicos">
          <FormField label="Hallazgos Clínicos Relevantes" required error={formErrors.findings}>
            <TextArea
              name="findings"
              id="findings"
              value={formData.findings}
              onChange={handleChange}
              placeholder="Detalle los hallazgos del examen clínico (intra y extraoral, lesiones, estado periodontal, piezas dentales, etc.)"
              error={!!formErrors.findings}
              rows={4}
              aria-required="true"
              aria-invalid={!!formErrors.findings}
              aria-describedby={formErrors.findings ? "findings-error" : undefined}
            />
          </FormField>
        </FormSection>

        {/* Diagnosis and Treatment Plan Section */}
        <FormSection id="diagnosis-treatment" title="Diagnóstico y Plan de Tratamiento">
          <div className="grid grid-cols-1 gap-4">
            <FormField label="Diagnóstico" required error={formErrors.diagnosis}>
              <TextArea
                name="diagnosis"
                id="diagnosis"
                value={formData.diagnosis}
                onChange={handleChange}
                placeholder="Indique el diagnóstico principal (ej: Caries Dental, Periodontitis Crónica, Necrosis Pulpar)"
                error={!!formErrors.diagnosis}
                rows={4}
                aria-required="true"
                aria-invalid={!!formErrors.diagnosis}
                aria-describedby={formErrors.diagnosis ? "diagnosis-error" : undefined}
              />
            </FormField>

            <FormField
              label="Servicios Odontológicos Recomendados"
              required
              error={formErrors.dental_services}
              className="col-span-full"
            >
              <MultiSelect
                name="dental_services"
                id="dental_services"
                value={formData.dental_services}
                onChange={handleChange}
                placeholder="Seleccione los procedimientos recomendados para el tratamiento del diagnóstico"
                options={dentalServices.map(service => ({
                  value: service.id.toString(),
                  label: `${service.name} - $${(service.value || 0).toLocaleString('es-CO')}`
                }))}
                error={!!formErrors.dental_services}
                className="!w-full"
                aria-required="true"
                aria-invalid={!!formErrors.dental_services}
                aria-describedby={formErrors.dental_services ? "dental_services-error" : undefined}
              />
            </FormField>
          </div>
        </FormSection>

        {/* Digital Signature Section */}
        <FormSection id="doctor-signature" title="Firma Digital Profesional">
          {loadingDoctorInfo ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue"></div>
              <span className="ml-3 text-gray-600">Cargando información del doctor...</span>
            </div>
          ) : doctorBackendInfo ? (
            <SignatureCredentialField
              value={formData.doctor_signature}
              onChange={e => {
                setFormData({
                  ...formData,
                  doctor_signature: e.target.value,
                  doctor_password: e.target.value // sincroniza ambos
                });
              }}
              error={formErrors.doctor_signature}
              doctorName={`${doctorBackendInfo.first_name} ${doctorBackendInfo.last_name}`}
              doctorLicense={doctorBackendInfo.document_number}
              disabled={loading}
            />
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium">
                Error: No se pudo cargar la información del doctor.
                Por favor, recargue la página o contacte al administrador.
              </p>
            </div>
          )}
        </FormSection>

        {/* Form Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-3 sm:gap-4 md:gap-6 mt-6 sm:mt-8 md:mt-10 w-full max-w-[700px] mx-auto px-2">
          {/* Cancel Button */}
          <Button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="w-full sm:flex-1 md:w-auto md:px-10 py-3 sm:py-4 font-bold rounded-full text-base sm:text-lg shadow-lg font-poppins bg-header-blue hover:bg-header-blue-hover text-white transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-header-blue focus:ring-offset-2 hover:shadow-xl transform hover:scale-105"
            aria-label="Cancelar y volver al dashboard"
            disabled={loading}
          >
            <div className="flex items-center justify-center gap-2">
              <MdCancel className="text-2xl" />
              <span>Cancelar</span>
            </div>
          </Button>
          
          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full sm:flex-1 md:w-auto md:px-10 py-3 sm:py-4 font-bold rounded-full text-base sm:text-lg shadow-lg font-poppins transition-all duration-200",
              "focus:outline-none focus:ring-4 focus:ring-primary-blue focus:ring-offset-2",
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-primary-blue hover:bg-primary-blue-hover text-white hover:shadow-xl transform hover:scale-105"
            )}
            aria-label={loading ? "Procesando historia clínica" : "Guardar historia clínica"}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <output aria-label="Cargando">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </output>
                <span>Procesando...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <IoIosSave className="text-2xl" />
                <span>Guardar Historia Clínica</span>
              </div>
            )}
          </Button>
        </div>
      </form>

      {/* Legal Confirmation Modal */}
      <LegalConfirmationModal
        isOpen={showLegalModal}
        onConfirm={handleLegalConfirm}
        onCancel={handleLegalCancel}
        doctorName={doctorBackendInfo ? `${doctorBackendInfo.first_name} ${doctorBackendInfo.last_name}` : ''}
        doctorLicense={doctorBackendInfo ? doctorBackendInfo.document_number : ''}
      />
    </main>
  );
};

export default RegisterPatientFirstHistory;