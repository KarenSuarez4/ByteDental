import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Select from "../../components/Select";
import ConfirmDialog from "../../components/ConfirmDialog";
import SearchInput from "../../components/SearchInput"; 
import FilterBar from "../../components/FilterBar"; 
import DateInput from "../../components/DateInput";  
import { FaTimes } from "react-icons/fa";
import { MdEdit } from "react-icons/md";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getAllUsers as getUsers, updateUser, deactivateUser, activateUser, getRoles } from "../../services/userService";

const tableHeaderClass = "bg-header-blue text-white font-semibold text-center font-poppins text-18";
const tableCellClass = "text-center font-poppins text-16 py-2";

function UserManagement() {
  const { token, userRole } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editFormErrors, setEditFormErrors] = useState({});
  const [editError, setEditError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, user: null });
  const [phoneEditError, setPhoneEditError] = useState("");

  // Filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState(""); 
  const [filterRole, setFilterRole] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  const [totalPages, setTotalPages] = useState(1);

  const filterConfig = [
    {
      key: 'role',
      value: filterRole,
      onChange: (e) => {
        setFilterRole(e.target.value);
        setCurrentPage(1);
      },
      options: [
        { value: 'ALL', label: 'Todos los roles' },
        ...roles.map(role => ({ value: role.id.toString(), label: role.name }))
      ],
      ariaLabel: 'Filtrar por rol de usuario',
      className: 'w-[210px]'
    },
    {
      key: 'status',
      value: filterStatus,
      onChange: (e) => {
        setFilterStatus(e.target.value);
        setCurrentPage(1);
      },
      options: [
        { value: 'ALL', label: 'Todos' },
        { value: 'ACTIVO', label: 'Activo' },
        { value: 'INACTIVO', label: 'Inactivo' }
      ],
      ariaLabel: 'Filtrar por estado del usuario',
      className: 'w-[180px]'
    }
  ];

  const resetToFirstPage = () => {
    setCurrentPage(1);
  };

  useEffect(() => {
    if (userRole !== "Administrador" || !token) return;
    setLoading(true);
    getUsers(token)
      .then(setUsers)
      .catch(() => setEditError("Error cargando usuarios")) //toast.error("Error cargando usuarios")
      .finally(() => setLoading(false));
    getRoles(token)
      .then(setRoles)
      .catch(() => { });
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

  // Calcular edad a partir de la fecha de nacimiento
  const calculateAge = (birthDate) => {
    if (!birthDate || birthDate.length !== 10) return null;
    
    const today = new Date();
    const birth = new Date(birthDate);
    
    if (isNaN(birth.getTime())) return null;
    
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  // Abrir modal de edición
  const handleEdit = (user) => {
    setEditUser(user);
    setEditForm({
      document_number: user.document_number,
      document_type: user.document_type,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone || "",
      role_id: user.role_id,
      specialty: user.specialty || "",
      birthdate: user.birthdate || "",
      is_active: user.is_active
    });
    setEditError("");
    setSuccessMsg("");
    setEditFormErrors({});
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;

    if (name === 'birthdate') {
      setEditForm(prev => ({ ...prev, [name]: value }));
      
      const newErrors = { ...editFormErrors };
      
      if (newErrors.birthdate) {
        delete newErrors.birthdate;
      }

      if (value && value.length === 10) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const birthDate = new Date(value);

        if (isNaN(birthDate.getTime())) {
          newErrors.birthdate = 'Fecha de nacimiento inválida';
        } else if (birthDate > today) {
          newErrors.birthdate = 'La fecha de nacimiento no puede ser en el futuro';
        } else {

          const age = calculateAge(value);
          if (age < 18) {
            newErrors.birthdate = 'Los usuarios del sistema deben ser mayores de 18 años';
          } else if (age > 80) {
            newErrors.birthdate = 'Edad inválida - debe estar entre 18 y 80 años';
          }
        }
      }

      setEditFormErrors(newErrors);
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

    if (name === "first_name" || name === "last_name") {
      // Función para validar solo letras, espacios y caracteres acentuados
      const isValidName = (name) => {
        const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]*$/;
        return nameRegex.test(name) && name.trim().length > 0;
      };

      // Prevenir entrada de números y caracteres especiales
      if (value && !isValidName(value)) {
        return; // No actualizar el estado si contiene caracteres inválidos
      }
      
      // Convertir a mayúsculas automáticamente
      const upperCaseValue = value.toUpperCase();
      
      setEditForm(prev => ({ ...prev, [name]: upperCaseValue }));
      
      const newErrors = { ...editFormErrors };
      if (!upperCaseValue) {
        newErrors[name] = name === "first_name" ? "Nombre es obligatorio" : "Apellido es obligatorio";
      } else {
        delete newErrors[name];
      }
      setEditFormErrors(newErrors);
      return;
    }

    setEditForm(prev => {
      // Si cambia el rol y no es Doctor, borra la especialidad
      if (name === "role_id") {
        const selectedRole = roles.find(role => role.id === parseInt(value));
        if (selectedRole?.name !== "Doctor") {
          return { ...prev, role_id: parseInt(value), specialty: "" };
        }
        return { ...prev, role_id: parseInt(value) };
      }
      return { ...prev, [name]: value };
    });
  };

  const validateEditForm = () => {
    const errors = {};
    if (!editForm.document_type) errors.document_type = "El tipo de documento es obligatorio.";
    if (!editForm.document_number) errors.document_number = "El número de documento es obligatorio.";
    if (!editForm.first_name) errors.first_name = "El nombre es obligatorio.";
    if (!editForm.last_name) errors.last_name = "El apellido es obligatorio.";
    if (!editForm.email) errors.email = "El correo es obligatorio.";
    else if (!editForm.email.includes('@') || !editForm.email.includes('.')) errors.email = "Ingrese un correo electrónico válido.";
    if (!editForm.role_id) errors.role_id = "El rol es obligatorio.";
    if (roles.find(r => r.id === editForm.role_id)?.name === "Doctor" && !editForm.specialty)
      errors.specialty = "La especialidad es obligatoria para el rol Doctor.";
    if (editForm.phone && editForm.phone.length !== 10) {
      errors.phone = "Ingrese un número válido.";
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

    if (editForm.birthdate) {
      if (editForm.birthdate.length !== 10) {
        errors.birthdate = 'Ingrese la fecha completa';
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const birthDate = new Date(editForm.birthdate);

        if (isNaN(birthDate.getTime())) {
          errors.birthdate = 'Fecha de nacimiento inválida';
        } else if (birthDate > today) {
          errors.birthdate = 'La fecha de nacimiento no puede ser en el futuro';
        } else {
          const age = calculateAge(editForm.birthdate);
          if (age < 18) {
            errors.birthdate = 'Los usuarios del sistema deben ser mayores de 18 años';
          } else if (age > 80) {
            errors.birthdate = 'Edad inválida - debe estar entre 18 y 80 años';
          }
        }
      }
    }

    setEditFormErrors(errors);
    setPhoneEditError(errors.phone || "");
    return Object.keys(errors).length === 0;
  };

  // Guardar cambios
  const handleSaveEdit = async () => {
    if (!validateEditForm()) return;

    try {
      setEditLoading(true);
      setEditError("");

      const updateData = {
        document_number: editForm.document_number,
        document_type: editForm.document_type,
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        email: editForm.email,
        phone: editForm.phone || null,
        role_id: parseInt(editForm.role_id),
        specialty: editForm.specialty || null,
        birthdate: editForm.birthdate || null,
        is_active: editForm.is_active
      };

      await updateUser(editUser.uid, updateData, token);
      
      setSuccessMsg("Usuario actualizado exitosamente");
      toast.success("Usuario actualizado exitosamente");
      setEditUser(null);
      setEditForm({});
      setEditFormErrors({});
      
      setLoading(true);
      const updatedUsers = await getUsers(token);
      setUsers(updatedUsers);
      setLoading(false);
      
    } catch (error) {
      setEditError(error.message || "Error al actualizar usuario");
      toast.error(error.message || "Error al actualizar usuario");
    } finally {
      setEditLoading(false);
    }
  };

  // Cancelar edición
  const handleCancelEdit = () => {
    setEditUser(null);
    setEditError("");
    setSuccessMsg("");
    setEditLoading(false);
  };

  // Desactivar usuario
  const handleDeactivate = async (user) => {
    try {
      await deactivateUser(user.uid, token);
      setSuccessMsg("Usuario desactivado correctamente");
      toast.success("Usuario desactivado correctamente");
      setLoading(true);
      const updatedUsers = await getUsers(token);
      setUsers(updatedUsers);
      setLoading(false);
    } catch (err) {
      setEditError(err.message || "Error al desactivar usuario");
      toast.error(err.message || "Error al desactivar usuario");
    }
  };

  const filteredUsers = users.filter(user => {
    // Función auxiliar para normalizar texto (quitar acentos y convertir a minúsculas)
    const normalizeText = (text) => {
      return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''); // Remover acentos
    };

    // Si no hay término de búsqueda, solo aplicar filtros de rol y estado
    if (searchTerm === "") {
      const roleMatch = filterRole === "ALL" || user.role_id === parseInt(filterRole);
      const statusMatch = filterStatus === "ALL" || (filterStatus === "ACTIVO" ? user.is_active : !user.is_active);
      return roleMatch && statusMatch;
    }

    // Normalizar término de búsqueda
    const normalizedSearchTerm = normalizeText(searchTerm);

    // Buscar en documento (exacto, no normalizado para números)
    const docMatch = user.document_number.includes(searchTerm);

    // Crear texto completo para búsqueda (nombres + apellidos)
    const fullSearchText = `${user.first_name} ${user.last_name}`.trim();
    const normalizedFullText = normalizeText(fullSearchText);

    // Buscar el término normalizado en el texto completo normalizado
    const nameMatch = normalizedFullText.includes(normalizedSearchTerm);

    // También buscar términos individuales si el usuario busca por palabras separadas
    const searchWords = normalizedSearchTerm.split(/\s+/).filter(word => word.length > 0);
    const individualWordsMatch = searchWords.every(word =>
      normalizedFullText.includes(word)
    );

    // El usuario coincide si encuentra el término en documento, nombre completo, o palabras individuales
    const searchMatch = docMatch || nameMatch || individualWordsMatch;

    // Aplicar también filtros de rol y estado
    const roleMatch = filterRole === "ALL" || user.role_id === parseInt(filterRole);
    const statusMatch = filterStatus === "ALL" || (filterStatus === "ACTIVO" ? user.is_active : !user.is_active);

    return searchMatch && roleMatch && statusMatch;
  }).sort((a, b) => a.uid - b.uid); // Ordenar por ID ascendente

  // Calcular total de páginas
  const totalPagesCount = Math.ceil(filteredUsers.length / itemsPerPage);

  // Obtener usuarios para la página current
  const currentUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Actualizar total de páginas cuando cambian los filtros
  useEffect(() => {
    const newTotalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    setTotalPages(newTotalPages);

    // Si la página actual es mayor al nuevo total, ir a la primera página
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredUsers.length, itemsPerPage, currentPage]);

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

  const specialties = [
    "Periodoncia",
    "Endodoncia",
    "Cirugía oral y maxilofacial",
    "Odontopediatría",
  ];

  const isDoctor = roles.find(r => r.id === editForm.role_id)?.name === "Doctor";

  if (userRole !== "Administrador") return <div className="font-poppins text-center mt-20 text-xl">No autorizado</div>;
  if (loading) return <div className="font-poppins text-center mt-10 text-18">Cargando usuarios...</div>;

  return (
    <main className="flex min-h-[calc(100vh-94px)] bg-gray-50 overflow-hidden">
      <section className="flex-1 flex flex-col items-center px-3">
        <h1 className="text-header-blue text-46 font-bold font-poppins mb-1 pt-6 text-center pb-6">
          GESTIÓN DE USUARIOS
        </h1>

        {editError && (
          <div className="mb-2 w-full max-w-[900px] p-3 bg-red-100 border border-red-400 text-red-700 rounded text-center text-18">
            {editError}
          </div>
        )}
        {successMsg && (
          <div className="mb-2 w-full max-w-[900px] p-3 bg-green-100 border border-green-400 text-green-700 rounded text-center transition-opacity duration-500 text-18">
            {successMsg}
          </div>
        )}

        {/* REEMPLAZAR la sección de filtros con FilterBar */}
        <FilterBar
          searchValue={searchTerm}
          onSearchChange={(e) => setSearchTerm(e.target.value)}
          filters={filterConfig}
          onPageReset={resetToFirstPage}
          searchPlaceholder="Buscar por documento, nombres o apellidos"
          searchAriaLabel="Buscar usuario por documento, nombres o apellidos"
          className="max-w-[1000px]"
        />

        {/* Tabla de usuarios con scroll vertical */}
        <div className="w-full max-w-[1200px] bg-white rounded-[12px] shadow-md overflow-x-auto"
          style={{ maxHeight: "calc(100vh - 226px)", overflowY: "auto" }}>
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 h-10">
              <tr>
                <th className={tableHeaderClass}>Documento</th>
                <th className={tableHeaderClass}>Tipo</th>
                <th className={tableHeaderClass}>Nombre</th>
                <th className={tableHeaderClass}>Apellido</th>
                <th className={tableHeaderClass}>Correo</th>
                <th className={tableHeaderClass}>Teléfono</th>
                <th className={tableHeaderClass}>Fecha Nac.</th> 
                <th className={tableHeaderClass}>Rol</th>
                <th className={tableHeaderClass}>Especialidad</th>
                <th className={tableHeaderClass}>Estado</th>
                <th className={tableHeaderClass}>Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentUsers.map(user => (
                <tr key={user.uid}>
                  <td className={tableCellClass}>{user.document_number}</td>
                  <td className={tableCellClass}>{user.document_type}</td>
                  <td className={tableCellClass}>{user.first_name}</td>
                  <td className={tableCellClass}>{user.last_name}</td>
                  <td className={tableCellClass}>{user.email}</td>
                  <td className={tableCellClass}>{user.phone}</td>
                  <td className={tableCellClass}> 
                    {user.birthdate ? 
                      new Date(user.birthdate).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      }) 
                      : '-'
                    }
                  </td>
                  <td className={tableCellClass}>{user.role_name}</td>
                  <td className={tableCellClass}>{user.specialty || "-"}</td>
                  <td className={tableCellClass}>
                    {user.is_active ? (
                      <span className="text-green-600 font-bold">Activo</span>
                    ) : (
                      <span className="text-red-600 font-bold">Inactivo</span>
                    )}
                  </td>
                  <td className={tableCellClass}>
                    <div className="flex flex-col items-center justify-center gap-2">
                      {user.is_active ? (
                        <>
                          <Button
                            className="bg-primary-blue hover:bg-primary-blue-hover text-white px-4 py-2 rounded-[40px] font-poppins text-16 font-bold w-[130px] h-[35px]"
                            onClick={() => handleEdit(user)}
                          >
                            Modificar
                          </Button>
                          <Button
                            className="bg-header-blue hover:bg-header-blue-hover text-white px-4 py-2 rounded-[40px] font-poppins text-16 font-bold w-[130px] h-[35px]"
                            onClick={() => setConfirmDialog({ open: true, user })}
                          >
                            Desactivar
                          </Button>
                        </>
                      ) : (
                        <Button
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-[40px] font-poppins text-16 font-bold w-[130px] h-[35px]"
                          onClick={async () => {
                            try {
                              await activateUser(user.uid, token);
                              setSuccessMsg("Usuario activado correctamente");
                              toast.success("Usuario activado correctamente");
                              setLoading(true);
                              const updatedUsers = await getUsers(token);
                              setUsers(updatedUsers);
                              setLoading(false);
                            } catch (err) {
                              setEditError(err.message || "Error al activar usuario");
                              toast.error(err.message || "Error al activar usuario");
                            }
                          }}
                        >
                          Activar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {currentUsers.length === 0 && (
                <tr>
                  <td colSpan="11" className="text-center py-8 text-gray-500 font-poppins text-16">  
                    {searchTerm ? "La información proporcionada no corresponde a ningún registro existente" : "No hay usuarios registrados"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Controles de paginación */}
        {totalPages > 1 && (
          <div className="w-full max-w-[1000px] flex justify-center items-center mt-6 gap-3">
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
        {filteredUsers.length > 0 && (
          <div className="w-full max-w-[1000px] flex justify-center mt-3">
            <div className="bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
              <p className="text-gray-600 font-poppins text-12 font-medium">
                <span className="text-primary-blue font-semibold">
                  {(currentPage - 1) * itemsPerPage + 1}
                </span>
                {' - '}
                <span className="text-primary-blue font-semibold">
                  {Math.min(currentPage * itemsPerPage, filteredUsers.length)}
                </span>
                {' de '}
                <span className="text-primary-blue font-semibold">
                  {filteredUsers.length}
                </span>
                {' usuarios'}
              </p>
            </div>
          </div>
        )}

        {/* Modal de edición */}
        {editUser && (
          <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[1000px] max-h-[90vh] overflow-y-auto">
              {/* Header del modal */}
              <div className="bg-gradient-to-br from-primary-blue to-header-blue text-white p-6 rounded-t-[24px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-28 h-28 bg-white opacity-10 rounded-full -ml-14 -mb-14"></div>
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-white bg-opacity-20 p-3 rounded-full">
                      <MdEdit className="text-24 text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-26 font-bold font-poppins">Editar Usuario</h2>
                      <p className="text-16 opacity-90 font-poppins">Actualizar información del usuario del sistema</p>
                    </div>
                  </div>
                  <button
                    className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2.5 rounded-full transition-all duration-200"
                    onClick={handleCancelEdit}
                  >
                    <FaTimes className="text-20 text-gray-700" />
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
                        onChange={e => setEditForm(f => ({ ...f, document_type: e.target.value }))}
                        className="w-full"
                        error={!!editFormErrors.document_type}
                      >
                        <option value="CC">Cédula de Ciudadanía</option>
                        <option value="TI">Tarjeta de Identidad</option>
                        <option value="CE">Cédula de Extranjería</option>
                        <option value="PP">Pasaporte</option>
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
                        onChange={e => setEditForm(f => ({ ...f, document_number: e.target.value }))}
                        className="w-full bg-gray-100 cursor-not-allowed"
                        error={!!editFormErrors.document_number}
                        readOnly={true}
                      />
                      {editFormErrors.document_number && (
                        <p className="text-red-500 text-sm font-poppins mt-1">{editFormErrors.document_number}</p>
                      )}
                    </div>
                    <div>
                      <label className="block font-poppins font-medium text-gray-700 mb-2">Nombre</label>
                      <Input
                        name="first_name"
                        value={editForm.first_name}
                        onChange={handleEditFormChange} 
                        className="w-full"
                        error={!!editFormErrors.first_name}
                      />
                      {editFormErrors.first_name && (
                        <p className="text-red-500 text-sm font-poppins mt-1">{editFormErrors.first_name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block font-poppins font-medium text-gray-700 mb-2">Apellido</label>
                      <Input
                        name="last_name"
                        value={editForm.last_name}
                        onChange={handleEditFormChange} 
                        className="w-full"
                        error={!!editFormErrors.last_name}
                      />
                      {editFormErrors.last_name && (
                        <p className="text-red-500 text-sm font-poppins mt-1">{editFormErrors.last_name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block font-poppins font-medium text-gray-700 mb-2">Correo electrónico</label>
                      <Input
                        name="email"
                        value={editForm.email}
                        onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
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
                      <label className="block font-poppins font-medium text-gray-700 mb-2">Rol</label>
                      <Select
                        name="role_id"
                        value={editForm.role_id}
                        onChange={handleEditFormChange}
                        className="w-full"
                        error={!!editFormErrors.role_id}
                      >
                        {roles.map(role => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </Select>
                      {editFormErrors.role_id && (
                        <p className="text-red-500 text-sm font-poppins mt-1">{editFormErrors.role_id}</p>
                      )}
                    </div>
                    {isDoctor && (
                      <div>
                        <label className="block font-poppins font-medium text-gray-700 mb-2">
                          Especialidad <span className="text-red-500">*</span>
                        </label>
                        <Select
                          name="specialty"
                          value={editForm.specialty || ""}
                          onChange={handleEditFormChange}
                          className="w-full"
                          error={!!editFormErrors.specialty}
                        >
                          <option value="">Seleccione una especialidad</option>
                          {specialties.map((specialty) => (
                            <option key={specialty} value={specialty}>{specialty}</option>
                          ))}
                        </Select>
                        {editFormErrors.specialty && (
                          <p className="text-red-500 text-sm font-poppins mt-1">{editFormErrors.specialty}</p>
                        )}
                      </div>
                    )}
                    <div>
                      <label className="block font-poppins font-medium text-gray-700 mb-2">Fecha de nacimiento</label>
                      <DateInput
                        name="birthdate"
                        value={editForm.birthdate}
                        onChange={handleEditFormChange}
                        error={!!editFormErrors.birthdate}
                        className="w-full"
                      />
                      {editFormErrors.birthdate && (
                        <p className="text-red-500 text-sm font-poppins mt-1">{editFormErrors.birthdate}</p>
                      )}
                    </div>
                  </div>
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

        <ConfirmDialog
          open={confirmDialog.open}
          title="Confirmar desactivación"
          message={`¿Seguro que deseas desactivar a ${confirmDialog.user?.first_name} ${confirmDialog.user?.last_name}?`}
          onConfirm={async () => {
            await handleDeactivate(confirmDialog.user);
            setConfirmDialog({ open: false, user: null });
          }}
          onCancel={() => setConfirmDialog({ open: false, user: null })}
        />
      </section>
    </main>
  );
}

export default UserManagement;
