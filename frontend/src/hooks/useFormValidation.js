import { useCallback } from "react";

const VALIDATION_RULES = {
  basicFields: [
    { key: "patient_id", message: "Debe seleccionar un paciente" },
    { key: "reason", message: "La razón de consulta es obligatoria" },
    { key: "symptoms", message: "Los síntomas son obligatorios" },
    { key: "findings", message: "Los hallazgos clínicos son obligatorios" },
    { key: "doctor_signature", message: "La firma del doctor es obligatoria" },
  ],
  medicalStringFields: [
    { key: "anesthesia_tolerance", name: "Tolerancia a la anestesia" },
    { key: "breathing_condition", name: "Estado de respiración" },
    { key: "coagulation_condition", name: "Estado de coagulación" },
  ],
  medicalArrayFields: [
    { key: "general_pathologies", name: "Patologías generales" },
    { key: "current_medication", name: "Medicación actual" },
    { key: "allergies", name: "Alergias" },
    { key: "previous_treatments", name: "Tratamientos previos" },
  ],
};

// Función para validar restricciones lógicas
const validateLogicalRestrictions = (formData) => {
  const errors = {};
  const mh = formData.medical_history;

  // Si patologías incluye "ninguno", no puede tener otras
  if (
    mh.general_pathologies?.includes("ninguno") &&
    mh.general_pathologies.length > 1
  ) {
    errors["medical_history.general_pathologies"] =
      "No puede seleccionar 'Ninguno' junto con otras patologías";
  }

  // Si medicación incluye "ninguna", no puede tener otras
  if (
    mh.current_medication?.includes("ninguna") &&
    mh.current_medication.length > 1
  ) {
    errors["medical_history.current_medication"] =
      "No puede seleccionar 'Ninguna medicación' junto con otros medicamentos";
  }

  // Si alergias incluye "ninguna", no puede tener otras
  if (mh.allergies?.includes("ninguna") && mh.allergies.length > 1) {
    errors["medical_history.allergies"] =
      "No puede seleccionar 'Ninguna alergia' junto con otras alergias";
  }

  // Si tratamientos previos incluye "ninguno", no puede tener otros
  if (
    mh.previous_treatments?.includes("ninguno") &&
    mh.previous_treatments.length > 1
  ) {
    errors["medical_history.previous_treatments"] =
      "No puede seleccionar 'Ningún tratamiento' junto con otros tratamientos";
  }

  return errors;
};

export const useFormValidation = () => {
  const validateForm = (data) => {
    const errors = {};

    // Validaciones básicas
    if (!data.patient_id) errors.patient_id = "Seleccione un paciente";
    if (!data.reason?.trim())
      errors.reason = "La razón de consulta es requerida";
    if (!data.symptoms?.trim()) errors.symptoms = "Los síntomas son requeridos";
    if (!data.findings?.trim())
      errors.findings = "Los hallazgos clínicos son requeridos";
    if (!data.diagnosis?.trim())
      errors.diagnosis = "El diagnóstico es requerido";
    if (!data.doctor_signature?.trim())
      errors.doctor_signature = "La firma del doctor es requerida";

    // Validación mejorada de la firma
    if (!data.doctor_signature || data.doctor_signature.trim() === "") {
      errors.doctor_signature = "El código de firma es obligatorio";
    } else if (data.doctor_signature.length < 4) {
      errors.doctor_signature =
        "El código de firma debe tener al menos 4 caracteres";
    } else if (data.doctor_signature.length > 12) {
      errors.doctor_signature =
        "El código de firma no puede exceder 12 caracteres";
    }

    // Validar servicios dentales
    if (!data.dental_services || data.dental_services.length === 0) {
      errors.dental_services = "Seleccione al menos un servicio odontológico";
    }

    // Validar medical_history
    const mh = data.medical_history;
    if (!mh.anesthesia_tolerance) {
      errors["medical_history.anesthesia_tolerance"] = "Requerido";
    }
    if (!mh.breathing_condition) {
      errors["medical_history.breathing_condition"] = "Requerido";
    }
    if (!mh.coagulation_condition) {
      errors["medical_history.coagulation_condition"] = "Requerido";
    }
    if (!mh.general_pathologies || mh.general_pathologies.length === 0) {
      errors["medical_history.general_pathologies"] =
        "Seleccione al menos una opción";
    }
    if (!mh.current_medication || mh.current_medication.length === 0) {
      errors["medical_history.current_medication"] =
        "Seleccione al menos una opción";
    }
    if (!mh.previous_treatments || mh.previous_treatments.length === 0) {
      errors["medical_history.previous_treatments"] =
        "Seleccione al menos una opción";
    }
    if (!mh.allergies || mh.allergies.length === 0) {
      errors["medical_history.allergies"] = "Seleccione al menos una opción";
    }

    // Validaciones lógicas
    const logicalErrors = validateLogicalRestrictions(data);
    Object.assign(errors, logicalErrors);

    return errors;
  };

  // Función para determinar si un campo debe estar deshabilitado
  const getFieldRestrictions = (formData) => {
    const mh = formData.medical_history;
    const restrictions = {
      pathologies_disabled: false,
      breathing_disabled: false,
      coagulation_disabled: false,
      medication_disabled: false,
      treatments_disabled: false,
      allergies_disabled: false,
    };

    // Si ya se seleccionó "ninguno" en patologías
    if (mh.general_pathologies?.includes("ninguno")) {
      restrictions.pathologies_other_disabled = true;
    }

    // Si ya se seleccionó "ninguna" en medicación
    if (mh.current_medication?.includes("ninguna")) {
      restrictions.medication_other_disabled = true;
    }

    // Si ya se seleccionó "ninguna" en alergias
    if (mh.allergies?.includes("ninguna")) {
      restrictions.allergies_other_disabled = true;
    }

    // Si ya se seleccionó "ninguno" en tratamientos
    if (mh.previous_treatments?.includes("ninguno")) {
      restrictions.treatments_other_disabled = true;
    }

    return restrictions;
  };

  return { validateForm, getFieldRestrictions };
};
