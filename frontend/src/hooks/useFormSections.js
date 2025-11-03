import { useMemo } from "react";

export const useFormSections = (formData, hasAttemptedSubmit = false) => {
  return useMemo(
    () => [
      {
        key: "patient",
        id: "patient-info",
        completed: !!formData.patient_id,
        iconName: "FaHospitalUser",
        label: "Paciente",
        showError: hasAttemptedSubmit && !formData.patient_id, // ✅ Nuevo campo
      },
      {
        key: "consultation",
        id: "consultation-info",
        completed: formData.reason && formData.symptoms,
        iconName: "LuBotMessageSquare",
        label: "Consulta",
        showError:
          hasAttemptedSubmit && !(formData.reason && formData.symptoms), // ✅ Nuevo campo
      },
      {
        key: "medical",
        id: "medical-history",
        completed:
          formData.medical_history.anesthesia_tolerance &&
          formData.medical_history.breathing_condition &&
          formData.medical_history.coagulation_condition &&
          formData.medical_history.general_pathologies.length > 0 &&
          formData.medical_history.current_medication.length > 0 &&
          formData.medical_history.previous_treatments.length > 0 &&
          formData.medical_history.allergies.length > 0,
        iconName: "SiGoogledocs",
        label: "Antecedentes",
        showError:
          hasAttemptedSubmit &&
          !(
            formData.medical_history.anesthesia_tolerance &&
            formData.medical_history.breathing_condition &&
            formData.medical_history.coagulation_condition &&
            formData.medical_history.general_pathologies.length > 0 &&
            formData.medical_history.current_medication.length > 0 &&
            formData.medical_history.previous_treatments.length > 0 &&
            formData.medical_history.allergies.length > 0
          ), // ✅ Nuevo campo
      },
      {
        key: "findings",
        id: "clinical-findings",
        completed: !!formData.findings,
        iconName: "FaSearch",
        label: "Hallazgos",
        showError: hasAttemptedSubmit && !formData.findings, // ✅ Nuevo campo
      },
      {
        key: "diagnosis",
        id: "diagnosis-treatment",
        completed: formData.diagnosis && formData.dental_services.length > 0,
        iconName: "MdMedicalInformation",
        label: "Diagnóstico",
        showError:
          hasAttemptedSubmit &&
          !(formData.diagnosis && formData.dental_services.length > 0), // ✅ Nuevo campo
      },
      {
        key: "signature",
        id: "doctor-signature",
        completed: !!formData.doctor_signature,
        iconName: "LuSignature",
        label: "Firma",
        showError: hasAttemptedSubmit && !formData.doctor_signature, // ✅ Nuevo campo
      },
    ],
    [formData, hasAttemptedSubmit] // ✅ Agregar dependencia
  );
};
