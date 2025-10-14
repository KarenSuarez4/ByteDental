import { useMemo } from "react";

export const useFormProgress = (formData) => {
  const progress = useMemo(() => {
    const requiredFields = [
      "patient_id",
      "reason",
      "symptoms",
      "findings",
      "doctor_signature",
    ];
    const stringMedicalFields = [
      "anesthesia_tolerance",
      "breathing_condition",
      "coagulation_condition",
    ];
    const arrayMedicalFields = [
      "general_pathologies",
      "current_medication",
      "allergies",
      "previous_treatments",
    ];

    const totalFields =
      requiredFields.length +
      stringMedicalFields.length +
      arrayMedicalFields.length;
    let completedFields = 0;

    // Contar campos básicos
    requiredFields.forEach((field) => {
      if (formData[field]?.toString().trim()) completedFields++;
    });

    // Contar campos médicos string
    stringMedicalFields.forEach((field) => {
      if (formData.medical_history?.[field]?.trim()) completedFields++;
    });

    // Contar campos médicos array
    arrayMedicalFields.forEach((field) => {
      if (formData.medical_history?.[field]?.length > 0) completedFields++;
    });

    return (completedFields / totalFields) * 100;
  }, [formData]);

  return progress;
};
