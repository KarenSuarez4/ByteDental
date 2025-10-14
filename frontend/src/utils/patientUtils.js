/**
 * Calcula la edad basada en fecha de nacimiento
 * @param {string} birthDate - Fecha de nacimiento en formato YYYY-MM-DD
 * @returns {number|null} Edad en años o null si no hay fecha
 */
export const calculateAge = (birthDate) => {
  if (!birthDate) return null;

  const today = new Date();
  const birth = new Date(birthDate);

  // Verificar que la fecha sea válida
  if (isNaN(birth.getTime())) return null;

  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
};

/**
 * Determina si un paciente requiere tutor legal
 * @param {Object} patient - Objeto del paciente
 * @returns {boolean} True si requiere tutor
 */
export const requiresGuardian = (patient) => {
  if (!patient) return false;

  const birthdate = patient.person?.birthdate || patient.birthdate;
  const hasDisability = patient.has_disability;

  if (!birthdate) return false;

  const age = calculateAge(birthdate);

  return (
    age < 18 || // Menor de edad
    age > 64 || // Adulto mayor
    hasDisability // Persona con discapacidad
  );
};

/**
 * Determina si se debe mostrar información del tutor
 * @param {Object} patient - Objeto del paciente
 * @returns {boolean} True si se debe mostrar
 */
export const shouldShowGuardianInfo = (patient) => {
  // ✅ VERIFICAR que el paciente tenga guardian Y que cumpla las condiciones para necesitarlo
  return !!(
    patient?.guardian &&
    patient.guardian.person &&
    requiresGuardian(patient)
  );
};

/**
 * Obtiene el texto legible del tipo de relación
 * @param {string} relationshipType - Tipo de relación del guardian
 * @returns {string} Texto legible de la relación
 */
export const getRelationshipText = (relationshipType) => {
  const relationships = {
    Father: "Padre",
    Mother: "Madre",
    Grandfather: "Abuelo",
    Grandmother: "Abuela",
    Son: "Hijo",
    Daughter: "Hija",
    Legal_Guardian: "Tutor Legal",
    Brother: "Hermano",
    Sister: "Hermana",
    Other: "Otro",
  };
  return relationships[relationshipType] || relationshipType;
};

/**
 * Construye el nombre completo de una persona
 * @param {Object} person - Objeto persona con nombres y apellidos
 * @returns {string} Nombre completo
 */
export const buildFullName = (person) => {
  if (!person) return "N/A";

  const names = [person.first_name, person.middle_name].filter(Boolean);

  const surnames = [person.first_surname, person.second_surname].filter(
    Boolean
  );

  return [...names, ...surnames].join(" ").trim() || "N/A";
};

/**
 * Verifica si un paciente tiene información de contacto
 * @param {Object} patient - Objeto del paciente
 * @returns {boolean} True si tiene email o teléfono
 */
export const hasContactInfo = (patient) => {
  if (!patient) return false;

  const email = patient.person?.email || patient.email;
  const phone = patient.person?.phone || patient.phone;

  return !!(email || phone);
};

/**
 * Obtiene la razón por la cual un paciente necesita tutor
 * @param {Object} patient - Objeto del paciente
 * @returns {string} Razón del tutoreo
 */
export const getGuardianReason = (patient) => {
  if (!patient) return "";

  const age = calculateAge(patient.person?.birthdate || patient.birthdate);

  if (age < 18) return "Menor de edad";
  if (age > 64) return "Adulto mayor";
  if (patient.has_disability) return "Discapacidad";

  return "";
};
