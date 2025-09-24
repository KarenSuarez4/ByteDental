import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Select from "../../components/Select";
import DateInput from "../../components/DateInput";
import ConfirmDialog from "../../components/ConfirmDialog";
import { getAllPatients, updatePatient, deactivatePatient, activatePatient } from "../../services/patientService";

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
  const [confirmDialog, setConfirmDialog] = useState({ open: false, patient: null });
  const [phoneEditError, setPhoneEditError] = useState("");
  const [guardianModal, setGuardianModal] = useState({ open: false, guardian: null });

  // Filtros y búsqueda
  const [searchDoc, setSearchDoc] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(4);
  const [totalPages, setTotalPages] = useState(1);

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

  // Función para abrir modal de información del tutor
  const handleShowGuardian = (guardian) => {
    setGuardianModal({ open: true, guardian });
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
    });
    setEditError("");
    setSuccessMsg("");
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;

    if (name === "document_number") {
      if (!/^\d*$/.test(value)) return;
      setEditForm(prev => ({ ...prev, [name]: value }));
      return;
    }

    if (name === "phone") {
      if (!/^\d*$/.test(value)) return;
      setEditForm(prev => ({ ...prev, [name]: value }));
      if (value && value.length !== 10) {
        setPhoneEditError("Ingrese un número válido.");
      } else {
        setPhoneEditError("");
      }
      return;
    }

    setEditForm(prev => ({ ...prev, [name]: value }));
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
    if (!editForm.document_type) errors.document_type = "El tipo de documento es obligatorio.";
    if (!editForm.full_names) errors.full_names = "Los nombres son obligatorios.";
    if (!editForm.full_surnames) errors.full_surnames = "Los apellidos son obligatorios.";
    if (!editForm.birthdate) errors.birthdate = "La fecha de nacimiento es obligatoria.";
    if (editForm.email && (!editForm.email.includes('@') || !editForm.email.includes('.'))) {
      errors.email = "Ingrese un correo electrónico válido.";
    }
    if (editForm.phone && editForm.phone.length !== 10) {
      errors.phone = "Ingrese un número válido.";
    }

    setEditFormErrors(errors);
    setPhoneEditError(errors.phone || "");
    return Object.keys(errors).length === 0;
  };

  // Guardar cambios
  const handleSaveEdit = async () => {
    if (!validateEditForm()) return;
    try {
      // Separar los nombres y apellidos
      const namesArray = editForm.full_names.trim().split(/\s+/);
      const surnamesArray = editForm.full_surnames.trim().split(/\s+/);
      
      // Preparar los datos para el backend
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
      };

      await updatePatient(editPatient.id, updateData, token);
      setSuccessMsg("Paciente actualizado correctamente");
      setEditPatient(null);
      setLoading(true);
      const updatedPatients = await getAllPatients(token);
      setPatients(updatedPatients);
      setLoading(false);
      setEditFormErrors({});
    } catch (err) {
      setEditFormErrors({ general: err.message || "Error al actualizar paciente" });
    }
  };

  // Cancelar edición
  const handleCancelEdit = () => {
    setEditPatient(null);
    setEditError("");
    setSuccessMsg("");
  };

  // Desactivar paciente
  const handleDeactivate = async (patient) => {
    try {
      await deactivatePatient(patient.id, token);
      setSuccessMsg("Paciente desactivado correctamente");
      setLoading(true);
      const updatedPatients = await getAllPatients(token);
      setPatients(updatedPatients);
      setLoading(false);
    } catch (err) {
      setEditError(err.message || "Error al desactivar paciente");
    }
  };

  // Activar paciente
  const handleActivate = async (patient) => {
    try {
      await activatePatient(patient.id, token);
      setSuccessMsg("Paciente activado correctamente");
      setLoading(true);
      const updatedPatients = await getAllPatients(token);
      setPatients(updatedPatients);
      setLoading(false);
    } catch (err) {
      setEditError(err.message || "Error al activar paciente");
    }
  };

  // Filtros y paginación
  const filteredPatients = patients.filter(patient => {
    const docMatch = searchDoc === "" || patient.person.document_number.includes(searchDoc);
    const statusMatch = filterStatus === "ALL" || (filterStatus === "ACTIVO" ? patient.is_active : !patient.is_active);
    return docMatch && statusMatch;
  });

  // Calcular total de páginas
  const totalPagesCount = Math.ceil(filteredPatients.length / itemsPerPage);
  
  // Obtener pacientes para la página actual
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

        {/* Filtros y búsqueda */}
        <div className="w-full max-w-[1200px] flex flex-wrap items-center justify-between mb-3 gap-4">
          <div className="flex items-center gap-4">
            <Input
              className="w-[280px] h-[35px] font-poppins"
              placeholder="Buscar por documento"
              value={searchDoc}
              onChange={(e) => {
                setSearchDoc(e.target.value);
                setCurrentPage(1); // Resetear a primera página al buscar
              }}
            />
            <Select
              className="w-[180px] h-[35px] font-poppins"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1); // Resetear a primera página al filtrar
              }}
            >
              <option value="ALL">Todos</option>
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
            </Select>
          </div>
        </div>

        {/* Tabla de pacientes con scroll vertical */}
        <div className="w-full max-w-[1200px] bg-white rounded-[12px] shadow-md overflow-x-auto"
             style={{ maxHeight: "calc(100vh - 226px)", overflowY: "auto" }}>
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 h-10">
              <tr>
                <th className={tableHeaderClass}>Documento</th>
                <th className={tableHeaderClass}>Tipo</th>
                <th className={tableHeaderClass}>Nombres</th>
                <th className={tableHeaderClass}>Apellidos</th>
                <th className={tableHeaderClass}>Correo</th>
                <th className={tableHeaderClass}>Teléfono</th>
                <th className={tableHeaderClass}>Edad</th>
                <th className={tableHeaderClass}>Ocupación</th>
                <th className={tableHeaderClass}>Tutor</th>
                <th className={tableHeaderClass}>Estado</th>
                <th className={tableHeaderClass}>Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentPatients.map(patient => (
                <tr key={patient.id}>
                  <td className={tableCellClass}>{patient.person.document_number}</td>
                  <td className={tableCellClass}>{patient.person.document_type}</td>
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
                  <td className={tableCellClass}>{patient.occupation || "-"}</td>
                  <td className={tableCellClass}>
                    {patient.requires_guardian ? (
                      patient.guardian ? (
                        <button 
                          className="text-blue-600 font-bold hover:text-blue-800 hover:underline cursor-pointer bg-transparent border-none"
                          onClick={() => handleShowGuardian(patient.guardian)}
                        >
                          {patient.guardian.person.first_name} {patient.guardian.person.first_surname}
                        </button>
                      ) : (
                        <span className="text-orange-600 font-bold">Pendiente</span>
                      )
                    ) : (
                      <span className="text-gray-500">No requerido</span>
                    )}
                  </td>
                  <td className={tableCellClass}>
                    {patient.is_active ? (
                      <span className="text-green-600 font-bold">Activo</span>
                    ) : (
                      <span className="text-red-600 font-bold">Inactivo</span>
                    )}
                  </td>
                  <td className={tableCellClass}>
                    <div className="flex flex-col items-center justify-center gap-2">
                      {patient.is_active ? (
                        <>
                          <Button
                            className="bg-primary-blue hover:bg-primary-blue-hover text-white px-4 py-2 rounded-[40px] font-poppins text-16 font-bold w-[130px] h-[35px]"
                            onClick={() => handleEdit(patient)}
                          >
                            Modificar
                          </Button>
                          <Button
                            className="bg-header-blue hover:bg-header-blue-hover text-white px-4 py-2 rounded-[40px] font-poppins text-16 font-bold w-[130px] h-[35px]"
                            onClick={() => setConfirmDialog({ open: true, patient })}
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
                      )}
                    </div>
                  </td>
                </tr>
              ))}
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
              className={`group flex items-center justify-center px-4 py-2 rounded-full font-poppins text-12 font-medium transition-all duration-200 shadow-sm ${
                currentPage === 1 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' 
                  : 'bg-white text-gray-700 hover:bg-primary-blue hover:text-white border border-gray-300 hover:border-primary-blue hover:shadow-md transform hover:-translate-y-0.5'
              }`}
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
            >
              <svg 
                className={`w-4 h-4 mr-2 transition-transform duration-200 ${
                  currentPage === 1 ? '' : 'group-hover:-translate-x-0.5'
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
                      className={`flex items-center justify-center w-10 h-10 rounded-full font-poppins text-12 font-medium transition-all duration-200 ${
                        currentPage === pageNumber
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
              className={`group flex items-center justify-center px-4 py-2 rounded-full font-poppins text-12 font-medium transition-all duration-200 shadow-sm ${
                currentPage === totalPages 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' 
                  : 'bg-white text-gray-700 hover:bg-primary-blue hover:text-white border border-gray-300 hover:border-primary-blue hover:shadow-md transform hover:-translate-y-0.5'
              }`}
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
            >
              Siguiente
              <svg 
                className={`w-4 h-4 ml-2 transition-transform duration-200 ${
                  currentPage === totalPages ? '' : 'group-hover:translate-x-0.5'
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
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
                    <div>
                      <label className="block font-poppins font-medium text-gray-700 mb-2">Tipo de documento</label>
                      <Select
                        name="document_type"
                        value={editForm.document_type}
                        onChange={handleEditFormChange}
                        className="w-full"
                        error={!!editFormErrors.document_type}
                      >
                        <option value="CC">Cédula de Ciudadanía</option>
                        <option value="TI">Tarjeta de Identidad</option>
                        <option value="CE">Cédula de Extranjería</option>
                        <option value="PA">Pasaporte</option>
                        <option value="RC">Registro Civil</option>
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
                        readOnly
                        disabled
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
                  </div>
                </form>

                {/* Botones de acción */}
                <div className="flex justify-center space-x-6 mt-8 pt-6 border-t border-gray-200">
                  <Button
                    className="bg-header-blue hover:bg-header-blue-hover text-white px-8 py-3 font-bold rounded-[40px] text-16 shadow-md"
                    onClick={handleCancelEdit}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="bg-primary-blue hover:bg-primary-blue-hover text-white px-8 py-3 font-bold rounded-[40px] text-16 shadow-md"
                    onClick={handleSaveEdit}
                  >
                    Guardar cambios
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de información del tutor */}
        {guardianModal.open && guardianModal.guardian && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[700px] max-h-[90vh] overflow-y-auto">
              {/* Header del modal con diseño único */}
              <div className="bg-gradient-to-br from-primary-blue to-header-blue text-white p-6 rounded-t-[24px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-12 -mb-12"></div>
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-white bg-opacity-20 p-3 rounded-full">
                      🛡️
                    </div>
                    <div>
                      <h2 className="text-26 font-bold font-poppins">Información del Tutor Legal</h2>
                      <p className="text-16 opacity-90 font-poppins">Detalles del responsable legal</p>
                    </div>
                  </div>
                  <button
                    className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-full transition-all duration-200"
                    onClick={() => setGuardianModal({ open: false, guardian: null })}
                  >
                    ✖️
                  </button>
                </div>
              </div>

              {/* Contenido del modal */}
              <div className="p-6">
                {/* Información principal del tutor */}
                <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-[16px] p-6 mb-6">
                  <div className="flex items-center mb-4">
                    <div className="bg-green-100 p-2 rounded-full mr-3">
                      👤
                    </div>
                    <h3 className="text-20 font-semibold font-poppins text-gray-800">Datos Personales</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-[12px] p-4 shadow-sm">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Nombre Completo</label>
                      <p className="text-18 font-semibold text-gray-900 font-poppins">
                        {guardianModal.guardian.person.first_name} {guardianModal.guardian.person.first_surname}
                        {guardianModal.guardian.person.second_surname && ` ${guardianModal.guardian.person.second_surname}`}
                      </p>
                    </div>
                    <div className="bg-white rounded-[12px] p-4 shadow-sm">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Documento</label>
                      <p className="text-16 font-medium text-gray-900 font-poppins">
                        {guardianModal.guardian.person.document_type} - {guardianModal.guardian.person.document_number}
                      </p>
                    </div>
                    <div className="bg-white rounded-[12px] p-4 shadow-sm">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Relación</label>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        {getRelationshipText(guardianModal.guardian.relationship_type)}
                      </span>
                    </div>
                    <div className="bg-white rounded-[12px] p-4 shadow-sm">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Edad</label>
                      <p className="text-16 font-medium text-gray-900 font-poppins">
                        {calculateAge(guardianModal.guardian.person.birthdate)} años
                      </p>
                    </div>
                  </div>
                </div>

                {/* Información de contacto */}
                {(guardianModal.guardian.person.email || guardianModal.guardian.person.phone) && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-[16px] p-6 mb-6">
                    <div className="flex items-center mb-4">
                      <div className="bg-blue-100 p-2 rounded-full mr-3">
                        📧
                      </div>
                      <h3 className="text-20 font-semibold font-poppins text-gray-800">Información de Contacto</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {guardianModal.guardian.person.email && (
                        <div className="bg-white rounded-[12px] p-4 shadow-sm">
                          <label className="block text-sm font-medium text-gray-600 mb-1">Correo Electrónico</label>
                          <p className="text-16 font-medium text-gray-900 font-poppins break-all">
                            {guardianModal.guardian.person.email}
                          </p>
                        </div>
                      )}
                      {guardianModal.guardian.person.phone && (
                        <div className="bg-white rounded-[12px] p-4 shadow-sm">
                          <label className="block text-sm font-medium text-gray-600 mb-1">Teléfono</label>
                          <p className="text-16 font-medium text-gray-900 font-poppins">
                            {guardianModal.guardian.person.phone}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Información adicional */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-[16px] p-6">
                  <div className="flex items-center mb-4">
                    <div className="bg-purple-100 p-2 rounded-full mr-3">
                      📅
                    </div>
                    <h3 className="text-20 font-semibold font-poppins text-gray-800">Detalles Adicionales</h3>
                  </div>
                  <div className="bg-white rounded-[12px] p-4 shadow-sm">
                    <label className="block text-sm font-medium text-gray-600 mb-1">Fecha de Nacimiento</label>
                    <p className="text-16 font-medium text-gray-900 font-poppins">
                      {new Date(guardianModal.guardian.person.birthdate).toLocaleDateString('es-CO', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {/* Botón de cerrar */}
                <div className="flex justify-center mt-8 pt-6 border-t border-gray-200">
                  <Button
                    className="bg-gradient-to-r from-primary-blue to-header-blue hover:from-primary-blue-hover hover:to-header-blue-hover text-white px-8 py-3 font-semibold rounded-[40px] text-16 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                    onClick={() => setGuardianModal({ open: false, guardian: null })}
                  >
                    Cerrar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={confirmDialog.open}
          title="Confirmar desactivación"
          message={`¿Seguro que deseas desactivar al paciente ${confirmDialog.patient?.person.first_name} ${confirmDialog.patient?.person.first_surname}?`}
          onConfirm={async () => {
            await handleDeactivate(confirmDialog.patient);
            setConfirmDialog({ open: false, patient: null });
          }}
          onCancel={() => setConfirmDialog({ open: false, patient: null })}
        />
      </section>
    </main>
  );
}

export default PatientManagement;
