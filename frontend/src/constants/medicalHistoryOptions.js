export const PATHOLOGY_OPTIONS = [
  { value: "ninguno", label: "Ninguno - Sin antecedentes médicos" },
  { value: "hipertension", label: "Hipertensión arterial" },
  { value: "diabetes", label: "Diabetes" },
  { value: "cardiopatia", label: "Cardiopatías" },
  { value: "hepatitis", label: "Hepatitis" },
  { value: "cancer", label: "Cáncer" },
  { value: "enfermedades_respiratorias", label: "Enfermedades respiratorias" },
  { value: "enfermedades_renales", label: "Enfermedades renales" },
  { value: "trastornos_neurologicos", label: "Trastornos neurológicos" },
  { value: "osteoporosis", label: "Osteoporosis" },
  { value: "hipotension", label: "Hipotensión" },
  { value: "otros", label: "Otros - Especificar en observaciones" },
];

export const MEDICATION_OPTIONS = [
  { value: "ninguna", label: "Ninguna medicación" },
  { value: "antihipertensivos", label: "Antihipertensivos" },
  { value: "antidiabeticos", label: "Antidiabéticos" },
  { value: "anticoagulantes", label: "Anticoagulantes" },
  { value: "antiinflamatorios", label: "Antiinflamatorios" },
  { value: "antibioticos", label: "Antibióticos" },
  { value: "analgesicos", label: "Analgésicos" },
  { value: "antidepresivos", label: "Antidepresivos" },
  { value: "vitaminas", label: "Vitaminas y suplementos" },
  { value: "otros", label: "Otros medicamentos" },
];

export const ALLERGY_OPTIONS = [
  { value: "ninguna", label: "Ninguna alergia conocida" },
  { value: "penicilina", label: "Penicilina" },
  { value: "latex", label: "Látex" },
  { value: "ibuprofeno", label: "Ibuprofeno/AINEs" },
  { value: "anestesia_local", label: "Anestesia local" },
  { value: "metales", label: "Metales (níquel, cromo)" },
  { value: "yodo", label: "Yodo" },
  { value: "aspirina", label: "Aspirina" },
  { value: "alimentos", label: "Alergias alimentarias" },
  { value: "medicamentos_multiples", label: "Múltiples medicamentos" },
  { value: "otras", label: "Otras alergias" },
];

export const PREVIOUS_TREATMENTS_OPTIONS = [
  { value: "ninguno", label: "Ningún tratamiento dental previo" },
  { value: "limpiezas", label: "Limpiezas dentales" },
  { value: "obturaciones", label: "Obturaciones/Resinas" },
  { value: "extracciones", label: "Extracciones dentales" },
  { value: "endodoncias", label: "Endodoncias" },
  { value: "coronas", label: "Coronas o prótesis" },
  { value: "implantes", label: "Implantes dentales" },
  { value: "ortodoncia", label: "Ortodoncia" },
  { value: "cirugia_oral", label: "Cirugía oral" },
  { value: "blanqueamiento", label: "Blanqueamiento dental" },
];



export const ANESTHESIA_TOLERANCE_OPTIONS = [
  { value: "excelente", label: "Excelente - Sin reacciones adversas previas" },
  { value: "buena", label: "Buena - Tolerancia normal sin complicaciones" },
  { value: "regular", label: "Regular - Algunas molestias menores" },
  { value: "mala", label: "Mala - Reacciones adversas conocidas" },
  { value: "alergica", label: "Alérgica - Contraindicación absoluta" },
  { value: "no_evaluada", label: "No evaluada - Sin historial previo" },
];

export const BREATHING_CONDITION_OPTIONS = [
  { value: "normal", label: "Normal - Respiración sin dificultad" },
  {
    value: "disnea_leve",
    label: "Disnea Leve - Dificultad respiratoria mínima",
  },
  {
    value: "disnea_moderada",
    label: "Disnea Moderada - Dificultad respiratoria notable",
  },
  {
    value: "disnea_severa",
    label: "Disnea Severa - Dificultad respiratoria intensa",
  },
  {
    value: "asma_controlada",
    label: "Asma Controlada - Con tratamiento efectivo",
  },
  {
    value: "asma_no_controlada",
    label: "Asma No Controlada - Requiere manejo especial",
  },
  { value: "no_evaluada", label: "No Evaluada - Sin evaluación previa" },
];

export const COAGULATION_CONDITION_OPTIONS = [
  { value: "normal", label: "Normal" },
  {
    value: "anticoagulado",
    label: "Anticoagulado - Toma warfarina, heparina u otros",
  },
  {
    value: "antiagregante",
    label: "Antiagregante - Toma aspirina, clopidogrel, etc.",
  },
  {
    value: "hemofilia",
    label: "Hemofilia - Trastorno de coagulación hereditario",
  },
  { value: "trombocitopenia", label: "Trombocitopenia - Plaquetas bajas" },
  { value: "no_evaluada", label: "No Evaluada - Sin estudios de coagulación" },
];
