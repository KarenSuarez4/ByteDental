import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Select from "../../components/Select";
import ConfirmDialog from "../../components/ConfirmDialog";
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
  const [confirmDialog, setConfirmDialog] = useState({ open: false, user: null });
  const [phoneEditError, setPhoneEditError] = useState("");

  // Filtros y búsqueda
  const [searchDoc, setSearchDoc] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(4);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (userRole !== "Administrador" || !token) return;
    setLoading(true);
    getUsers(token)
      .then(setUsers)
      .catch(() => setEditError("Error cargando usuarios"))
      .finally(() => setLoading(false));
    getRoles(token)
      .then(setRoles)
      .catch(() => {});
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
  const handleEdit = (user) => {
    setEditUser(user);
    setEditForm({
      document_number: user.document_number,
      document_type: user.document_type,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone,
      role_id: user.role_id,
      specialty: user.specialty,
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

    setEditFormErrors(errors);
    setPhoneEditError(errors.phone || "");
    return Object.keys(errors).length === 0;
  };

  // Guardar cambios
  const handleSaveEdit = async () => {
    if (!validateEditForm()) return;
    try {
      await updateUser(editUser.uid, editForm, token);
      setSuccessMsg("Usuario actualizado correctamente");
      setEditUser(null);
      setLoading(true);
      const updatedUsers = await getUsers(token);
      setUsers(updatedUsers);
      setLoading(false);
      setEditFormErrors({});
    } catch (err) {
      setEditFormErrors({ general: err.message || "Error al actualizar usuario" });
    }
  };

  // Cancelar edición
  const handleCancelEdit = () => {
    setEditUser(null);
    setEditError("");
    setSuccessMsg("");
  };

  // Desactivar usuario
  const handleDeactivate = async (user) => {
    try {
      await deactivateUser(user.uid, token);
      setSuccessMsg("Usuario desactivado correctamente");
      setLoading(true);
      const updatedUsers = await getUsers(token);
      setUsers(updatedUsers);
      setLoading(false);
    } catch (err) {
      setEditError(err.message || "Error al desactivar usuario");
    }
  };

  // Filtros
  const filteredUsers = users.filter(user => {
    const docMatch = searchDoc === "" || user.document_number.includes(searchDoc);
    const roleMatch = filterRole === "ALL" || user.role_id === parseInt(filterRole);
    const statusMatch = filterStatus === "ALL" || (filterStatus === "ACTIVO" ? user.is_active : !user.is_active);
    return docMatch && roleMatch && statusMatch;
  });

  // Calcular total de páginas
  const totalPagesCount = Math.ceil(filteredUsers.length / itemsPerPage);
  
  // Obtener usuarios para la página actual
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

        {/* Filtros y búsqueda */}
        <div className="w-full max-w-[1000px] flex flex-wrap items-center justify-between mb-3 gap-4">
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
              className="w-[210px] h-[35px]  font-poppins"
              value={filterRole}
              onChange={(e) => {
                setFilterRole(e.target.value);
                setCurrentPage(1); // Resetear a primera página al filtrar
              }}
            >
              <option value="ALL">Todos los roles</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </Select>
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

        {/* Tabla de usuarios con scroll vertical */}
        <div className="w-full max-w-[1000px] bg-white rounded-[12px] shadow-md overflow-x-auto"
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
                              setLoading(true);
                              const updatedUsers = await getUsers(token);
                              setUsers(updatedUsers);
                              setLoading(false);
                            } catch (err) {
                              setEditError(err.message || "Error al activar usuario");
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
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[1000px] max-h-[90vh] overflow-y-auto">
              {/* Header del modal */}
              <div className="bg-gradient-to-br from-primary-blue to-header-blue text-white p-6 rounded-t-[24px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-28 h-28 bg-white opacity-10 rounded-full -ml-14 -mb-14"></div>
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-white bg-opacity-20 p-3 rounded-full">
                      ✏️
                    </div>
                    <div>
                      <h2 className="text-26 font-bold font-poppins">Editar Usuario</h2>
                      <p className="text-16 opacity-90 font-poppins">Actualizar información del usuario del sistema</p>
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
                        className="w-full"
                        error={!!editFormErrors.document_number}
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
                        onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))}
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
                        onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))}
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
                    <div>
                      <label className="block font-poppins font-medium text-gray-700 mb-2">
                        Especialidad {isDoctor && <span className="text-red-500">*</span>}
                      </label>
                      <Select
                        name="specialty"
                        value={editForm.specialty || ""}
                        onChange={handleEditFormChange}
                        disabled={!isDoctor}
                        className={`w-full ${!isDoctor ? 'bg-gray-100' : ''}`}
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
                      {!isDoctor && (
                        <p className="text-gray-500 text-sm font-poppins mt-1">Solo requerido para usuarios con rol de Doctor</p>
                      )}
                    </div>
                  </div>
                </form>

                {/* Botones de acción */}
                <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
                  <Button
                    className="bg-gray-500 hover:bg-gray-600 text-white px-8 py-3 font-semibold rounded-[40px] text-16 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                    onClick={handleCancelEdit}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-primary-blue to-header-blue hover:from-primary-blue-hover hover:to-header-blue-hover text-white px-8 py-3 font-semibold rounded-[40px] text-16 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                    onClick={handleSaveEdit}
                  >
                    Guardar Cambios
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