import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getClinicalHistoryById, addTreatmentToHistory } from '../../services/historyPatientService';
import { getDentalServices } from '../../services/dentalServiceService';
import PatientProfileCard from '../../components/PatientProfileCard';
import TreatmentsTable from '../../components/TreatmentsTable';
import Button from '../../components/Button';
import LoadingScreen from '../../components/LoadingScreen';
import AlertMessage from '../../components/AlertMessage';
import ConsultationReason from '../../components/ConsultationReason';
import MedicalInfoCarousel from '../../components/MedicalInfoCarousel';
import AddTreatmentModal from '../../components/AddTreatmentModal';

import {
  FaSyringe,
  FaPills,
  FaExclamationTriangle,
  FaPlus,
  FaArrowLeft,
  FaLungs,           // Respiratory condition icon
  FaUserMd,          // Previous treatments icon
  FaStethoscope,     // General pathologies icon
  FaClipboardList    // Consultation reason icon
} from 'react-icons/fa';

import { FaDroplet } from "react-icons/fa6";
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const HistoryManagement = () => {
  const { historyId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  // Component state management
  const [medicalRecord, setMedicalRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scrollPosition, setScrollPosition] = useState(0);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dentalServices, setDentalServices] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  /**
   * Scrolls the medical cards carousel in the specified direction
   * @param {string} direction - 'left' or 'right'
   */
  const scrollCarousel = (direction) => {
    const carousel = document.getElementById('medical-cards-carousel');
    const scrollAmount = 300; // Pixels to scroll

    if (direction === 'left') {
      carousel.scrollLeft -= scrollAmount;
    } else {
      carousel.scrollLeft += scrollAmount;
    }
  };

  /**
   * Parses the medical_history JSON string from backend
   * Handles Python-specific values and formats
   * @param {string|Object} medicalHistoryStr - Raw medical history data
   * @returns {Object} Parsed medical history object
   */
  const parseMedicalHistory = (medicalHistoryStr) => {
    try {
      if (typeof medicalHistoryStr === 'string') {
        // Clean problematic characters from Python backend
        const cleanStr = medicalHistoryStr
          .replace(/'/g, '"')  // Replace single quotes with double quotes
          .replace(/None/g, 'null')  // Replace Python None with null
          .replace(/True/g, 'true')  // Replace Python True with true
          .replace(/False/g, 'false'); // Replace Python False with false

        return JSON.parse(cleanStr);
      }
      return medicalHistoryStr || {};
    } catch (error) {
      return {};
    }
  };

  /**
   * Converts backend option values to human-readable text
   * @param {string|Array} value - Option value(s)
   * @param {string} type - Type of medical information
   * @returns {string} Human-readable text
   */
  const getReadableOption = (value, type) => {
    const options = {
      general_pathologies: {
        'ninguno': 'Sin antecedentes médicos',
        'hipertension': 'Hipertensión arterial',
        'diabetes': 'Diabetes',
        'cardiopatia': 'Cardiopatías',
        'hepatitis': 'Hepatitis',
        'cancer': 'Cáncer',
        'enfermedades_respiratorias': 'Enfermedades respiratorias',
        'enfermedades_renales': 'Enfermedades renales',
        'trastornos_neurologicos': 'Trastornos neurológicos',
        'osteoporosis': 'Osteoporosis',
        'hipotension': 'Hipotensión',
        'otros': 'Otros'
      },
      anesthesia_tolerance: {
        'excelente': 'Excelente - Sin reacciones adversas',
        'buena': 'Buena - Tolerancia normal',
        'regular': 'Regular - Algunas molestias',
        'mala': 'Mala - Reacciones adversas',
        'alergica': 'Alérgica - Contraindicación',
        'no_evaluada': 'No evaluada'
      },
      breathing_condition: {
        'normal': 'Normal - Sin dificultad',
        'disnea_leve': 'Disnea Leve',
        'disnea_moderada': 'Disnea Moderada',
        'disnea_severa': 'Disnea Severa',
        'asma_controlada': 'Asma Controlada',
        'asma_no_controlada': 'Asma No Controlada',
        'no_evaluada': 'No evaluada'
      },
      current_medication: {
        'ninguna': 'Ninguna medicación',
        'antihipertensivos': 'Antihipertensivos',
        'antidiabeticos': 'Antidiabéticos',
        'anticoagulantes': 'Anticoagulantes',
        'antiinflamatorios': 'Antiinflamatorios',
        'antibioticos': 'Antibióticos',
        'analgesicos': 'Analgésicos',
        'otros': 'Otros medicamentos'
      },
      previous_treatments: {
        'ninguno': 'Ningún tratamiento previo',
        'limpiezas': 'Limpiezas dentales',
        'obturaciones': 'Obturaciones/Resinas',
        'extracciones': 'Extracciones dentales',
        'endodoncias': 'Endodoncias',
        'coronas': 'Coronas o prótesis',
        'implantes': 'Implantes dentales',
        'ortodoncia': 'Ortodoncia'
      },
      allergies: {
        'ninguna': 'Ninguna alergia conocida',
        'penicilina': 'Penicilina',
        'latex': 'Látex',
        'ibuprofeno': 'Ibuprofeno/AINEs',
        'anestesia_local': 'Anestesia local',
        'metales': 'Metales (níquel, cromo)',
        'otras': 'Otras alergias'
      }
    };

    // Handle array values (multiple selections)
    if (Array.isArray(value)) {
      return value.map(v => options[type]?.[v] || v).join(', ');
    }

    return options[type]?.[value] || value || 'No especificado';
  };

  /**
   * Fetches medical record data from the API and maps it to component format
   * @param {string} id - Clinical history ID
   * @returns {Object} Formatted medical record data
   */
  const fetchMedicalRecord = async (id) => {
    try {
      // Fetch data from API service
      const response = await getClinicalHistoryById(id, token);

      // Parse the medical_history JSON field
      const medicalHistoryData = parseMedicalHistory(response.medical_history);

      // Map API response to component-expected format
      const mappedData = {
        id: response.id,
        patient_id: response.patient_id,
        patient: {
          // Basic patient information
          first_name: response.patient?.person?.first_name || response.patient?.first_name || 'N/A',
          first_surname: response.patient?.person?.first_surname || response.patient?.first_surname || '',
          second_surname: response.patient?.person?.second_surname || response.patient?.second_surname || '',
          document_type: response.patient?.person?.document_type || response.patient?.document_type || 'N/A',
          document_number: response.patient?.person?.document_number || response.patient?.document_number || 'N/A',
          birthdate: response.patient?.person?.birthdate || response.patient?.birthdate || null,
          phone: response.patient?.person?.phone || response.patient?.phone || null,
          email: response.patient?.person?.email || response.patient?.email || null,
          blood_group: response.patient?.blood_group || null,
          has_disability: response.patient?.has_disability ?? false,
          is_active: response.patient?.is_active ?? true,
          occupation: response.patient?.occupation || null,
          created_at: response.patient?.created_at || response.created_at,

          // Guardian information for minors
          guardian: response.patient?.guardian || null,

          // Person nested object for compatibility with PatientProfileCard
          person: {
            first_name: response.patient?.person?.first_name || response.patient?.first_name || 'N/A',
            first_surname: response.patient?.person?.first_surname || response.patient?.first_surname || '',
            second_surname: response.patient?.person?.second_surname || response.patient?.second_surname || '',
            document_type: response.patient?.person?.document_type || response.patient?.document_type || 'N/A',
            document_number: response.patient?.person?.document_number || response.patient?.document_number || 'N/A',
            birthdate: response.patient?.person?.birthdate || response.patient?.birthdate || null,
            phone: response.patient?.person?.phone || response.patient?.phone || null,
            email: response.patient?.person?.email || response.patient?.email || null
          }
        },
        // Medical history with human-readable values
        medical_history: {
          general_pathologies: getReadableOption(medicalHistoryData.general_pathologies, 'general_pathologies'),
          anesthesia_tolerance: getReadableOption(medicalHistoryData.anesthesia_tolerance, 'anesthesia_tolerance'),
          breathing_condition: getReadableOption(medicalHistoryData.breathing_condition, 'breathing_condition'),
          coagulation_condition: medicalHistoryData.coagulation_condition || 'No especificado',
          current_medication: getReadableOption(medicalHistoryData.current_medication, 'current_medication'),
          previous_treatments: getReadableOption(medicalHistoryData.previous_treatments, 'previous_treatments'),
          allergies: getReadableOption(medicalHistoryData.allergies, 'allergies')
        },
        // Clinical consultation data
        reason: response.reason,
        symptoms: response.symptoms,
        findings: response.findings,
        doctor_signature: response.doctor_signature,
        created_at: response.created_at,
        // Treatments history mapping
        treatments: response.treatments?.map(treatment => ({
          id: treatment.id || Math.random(),
          date: treatment.date || treatment.treatment_date,
          name: treatment.name || treatment.dental_service?.name || 'Tratamiento no especificado',
          doctor_name: treatment.doctor_name || 'Doctor no especificado',
          notes: treatment.notes || 'Sin observaciones'
        })) || []
      };

      return mappedData;

    } catch (error) {
      // Fallback data if API fails
      return {
        id: parseInt(id) || 1,
        patient_id: 101,
        patient: {
          first_name: "Lizeth",
          first_surname: "Rodriguez",
          second_surname: "Perez",
          document_type: "CC",
          document_number: "1050090699",
          birthdate: "1995-03-15",
          phone: "312 612345",
          email: "manu112@gmail.com",
          blood_group: "A+",
          has_disability: false,
          created_at: "2025-03-07T00:00:00.000Z"
        },
        medical_history: {
          allergies: "Sin alergias",
          previous_conditions: "Sin antecedentes",
          medications: "Sin medicamentos",
          anesthesia_tolerance: true
        },
        treatments: [],
        created_at: "2025-03-07T00:00:00.000Z"
      };
    }
  };

  // Load medical record data when component mounts or dependencies change
  useEffect(() => {
    const loadMedicalRecord = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await fetchMedicalRecord(historyId);
        setMedicalRecord(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (historyId && token) {
      loadMedicalRecord();
    }
  }, [historyId, token]);

  // Load dental services when modal is opened
  useEffect(() => {
    const loadDentalServices = async () => {
      if (isModalOpen && dentalServices.length === 0) {
        try {
          const services = await getDentalServices(token);
          setDentalServices(services);
        } catch (err) {
          console.error('Error cargando servicios dentales:', err);
        }
      }
    };

    loadDentalServices();
  }, [isModalOpen, token]);

  /**
   * Handles opening the add treatment modal
   */
  const handleAddTreatment = () => {
    setIsModalOpen(true);
    setSuccessMessage('');
  };

  /**
   * Handles closing the modal
   */
  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  /**
   * Handles submitting a new treatment
   */
  const handleSubmitTreatment = async (treatmentData) => {
    try {
      setModalLoading(true);
      
      const result = await addTreatmentToHistory(
        parseInt(historyId),
        treatmentData,
        token
      );

      // Actualizar la lista de tratamientos
      setMedicalRecord(prev => ({
        ...prev,
        treatments: [...prev.treatments, result.treatment]
      }));

      // Mostrar mensaje de éxito
      setSuccessMessage('Tratamiento agregado exitosamente');
      setIsModalOpen(false);

      // Limpiar mensaje después de 5 segundos
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);

    } catch (err) {
      console.error('Error al agregar tratamiento:', err);
      setError(err.message || 'Error al agregar el tratamiento');
    } finally {
      setModalLoading(false);
    }
  };

  /**
   * Handles navigation back to previous page
   */
  const handleGoBack = () => {
    navigate(-1);
  };

  // Loading state
  if (loading) {
    return <LoadingScreen message="Cargando historial médico..." />;
  }

  // Error state
  if (error) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center bg-gray-50 min-h-screen">
        <AlertMessage type="error" message={error} />
        <Button onClick={handleGoBack} variant="secondary" className="mt-4">
          <FaArrowLeft className="mr-2" />
          Volver
        </Button>
      </main>
    );
  }

  // No data state
  if (!medicalRecord) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center bg-gray-50 min-h-screen">
        <p className="text-gray-600">No se encontró el historial médico.</p>
        <Button onClick={handleGoBack} variant="secondary" className="mt-4">
          <FaArrowLeft className="mr-2" />
          Volver
        </Button>
      </main>
    );
  }

  // Main component render
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-6" role="main">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-4">
            <AlertMessage type="success" message={successMessage} />
          </div>
        )}

        {/* Page header */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-header-blue font-poppins mb-2">
            FICHA MÉDICA
          </h1>
          <p className="text-gray-600 font-poppins">
            Paciente: {medicalRecord.patient.first_name} {medicalRecord.patient.first_surname}
          </p>
        </div>

        {/* Main content grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
          {/* Columna Izquierda: Perfil del Paciente (ocupa 1 de 5 columnas) */}
          <div className="lg:col-span-1">
            <PatientProfileCard patient={medicalRecord.patient} />
          </div>

          {/* Columna Derecha: Contenido Principal (ocupa 4 de 5 columnas) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Fila Superior: Información Médica y Motivo de Consulta */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MedicalInfoCarousel
                medicalHistory={medicalRecord.medical_history}
                doctorSignature={medicalRecord.doctor_signature}
              />
              <ConsultationReason
                reason={medicalRecord.reason}
                symptoms={medicalRecord.symptoms}
                findings={medicalRecord.findings}
                showFindings={true}
              />
            </div>

            {/* Fila Inferior: Historial de Tratamientos */}
            <section className="bg-white rounded-lg shadow-md p-6 h-full">
              <h2 className="text-xl font-semibold text-primary-blue-hover mb-4">
                Historial de Tratamientos
              </h2>

              <TreatmentsTable treatments={medicalRecord.treatments} />

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
                <Button
                  onClick={handleAddTreatment}
                  variant="primary"
                  className="flex items-center justify-center"
                >
                  <FaPlus className="mr-2" />
                  Agregar Tratamiento
                </Button>

                <Button
                  onClick={handleGoBack}
                  variant="secondary"
                  className="flex items-center justify-center"
                >
                  <FaArrowLeft className="mr-2" />
                  Regresar
                </Button>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Add Treatment Modal */}
      <AddTreatmentModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmitTreatment}
        dentalServices={dentalServices}
        loading={modalLoading}
      />
    </div>
  );
};

export default HistoryManagement;