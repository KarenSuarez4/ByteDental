import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Select from "../../components/Select";
import TextArea from "../../components/TextArea";
import ConfirmDialog from "../../components/ConfirmDialog";
import { 
  getDentalServices, 
  updateDentalService, 
  changeServiceStatus 
} from "../../services/dentalServiceService";

const tableHeaderClass = "bg-header-blue text-white font-semibold text-center font-poppins text-18";
const tableCellClass = "text-center font-poppins text-16 py-2";

function DentalServiceManagement() {
  const { token, userRole } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editService, setEditService] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editFormErrors, setEditFormErrors] = useState({});
  const [editError, setEditError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [confirmDialog, setConfirmDialog] = useState({ open: false, service: null, action: null });

  // Filtros y búsqueda
  const [searchName, setSearchName] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (userRole !== "Administrador") return;
    if (!token) return; // No ejecutar si no hay token disponible
    
    loadServices();
  }, [token, userRole]);

  const loadServices = async () => {
    // Validar que haya token antes de hacer cualquier solicitud
    if (!token) {
      console.warn("No token available for loading services");
      return;
    }

    try {
      setLoading(true);
      
      const filters = {
        skip: 0,
        limit: 1000, // Cargar todos los servicios para el filtrado local
        is_active: null,
        search: "",
        min_price: null,
        max_price: null
      };
      
      const response = await getDentalServices(token, filters);
      setServices(response);
    } catch (err) {
      setEditError("Error cargando servicios odontológicos");
      console.error("Error loading services:", err);
    } finally {
      setLoading(false);
    }
  };

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

  // Formatear valor como moneda colombiana
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Abrir modal de edición
  const handleEdit = (service) => {
    setEditService(service);
    setEditForm({
      name: service.name,
      description: service.description || "",
      value: service.value.toString(),
      is_active: service.is_active,
    });
    setEditError("");
    setSuccessMsg("");
    setEditFormErrors({});
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;

    // Validaciones específicas para el valor
    if (name === 'value') {
      // Solo permitir números y punto decimal
      if (!/^\d*\.?\d*$/.test(value)) return;
      
      setEditForm(prev => ({ ...prev, [name]: value }));
      
      // Validar formato del valor
      const numValue = parseFloat(value);
      if (value && (isNaN(numValue) || numValue <= 0)) {
        setEditFormErrors(prev => ({ ...prev, [name]: 'El valor debe ser mayor a 0' }));
      } else if (value && numValue > 999999999.99) {
        setEditFormErrors(prev => ({ ...prev, [name]: 'El valor no puede exceder 999,999,999.99' }));
      } else {
        setEditFormErrors(prev => ({ ...prev, [name]: '' }));
      }
      return;
    }

    setEditForm(prev => ({ ...prev, [name]: value }));
    
    // Limpiar error específico del campo
    if (editFormErrors[name]) {
      setEditFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateEditForm = () => {
    const errors = {};

    // Validar campos obligatorios
    if (!editForm.name.trim()) errors.name = "El nombre del servicio es obligatorio.";
    if (!editForm.value) errors.value = "El valor del servicio es obligatorio.";

    // Validar formato del valor
    const numValue = parseFloat(editForm.value);
    if (editForm.value && (isNaN(numValue) || numValue <= 0)) {
      errors.value = 'El valor debe ser mayor a 0';
    } else if (editForm.value && numValue > 999999999.99) {
      errors.value = 'El valor no puede exceder 999,999,999.99';
    }

    // Validar longitud de campos
    if (editForm.name.length > 100) {
      errors.name = 'El nombre no puede exceder 100 caracteres';
    }
    if (editForm.description && editForm.description.length > 1000) {
      errors.description = 'La descripción no puede exceder 1000 caracteres';
    }

    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Guardar cambios
  const handleSaveEdit = async () => {
    if (!validateEditForm()) return;
    
    try {
      const updateData = {
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        value: parseFloat(editForm.value),
        is_active: editForm.is_active,
      };

      await updateDentalService(editService.id, updateData, token);
      
      setSuccessMsg("Servicio actualizado correctamente");
      setEditService(null);
      await loadServices();
      setEditFormErrors({});
    } catch (err) {
      setEditFormErrors({ general: err.message || "Error al actualizar servicio" });
    }
  };

  // Cancelar edición
  const handleCancelEdit = () => {
    setEditService(null);
    setEditError("");
    setSuccessMsg("");
    setEditFormErrors({});
  };

  // Cambiar estado del servicio
  const handleToggleStatus = async (service) => {
    try {
      const newStatus = !service.is_active;
      
      const statusData = {
        is_active: newStatus,
        reason: `Cambio de estado desde gestión de servicios`
      };
      
      await changeServiceStatus(service.id, statusData, token);
      
      setSuccessMsg(`Servicio ${newStatus ? 'habilitado' : 'deshabilitado'} correctamente`);
      await loadServices();
    } catch (err) {
      setEditError(err.message || `Error al ${service.is_active ? 'deshabilitar' : 'habilitar'} servicio`);
    }
  };



  // Filtros y paginación
  const filteredServices = services.filter(service => {
    const nameMatch = searchName === "" || service.name.toLowerCase().includes(searchName.toLowerCase());
    const statusMatch = filterStatus === "ALL" || (filterStatus === "ACTIVO" ? service.is_active : !service.is_active);
    const minPriceMatch = minPrice === "" || service.value >= parseFloat(minPrice);
    const maxPriceMatch = maxPrice === "" || service.value <= parseFloat(maxPrice);
    
    return nameMatch && statusMatch && minPriceMatch && maxPriceMatch;
  });
  
  // Obtener servicios para la página actual
  const currentServices = filteredServices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Actualizar total de páginas cuando cambian los filtros
  useEffect(() => {
    const newTotalPages = Math.ceil(filteredServices.length / itemsPerPage);
    setTotalPages(newTotalPages);
    
    // Si la página actual es mayor al nuevo total, ir a la primera página
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredServices.length, itemsPerPage, currentPage]);

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

  if (userRole !== "Administrador") {
    return <div className="font-poppins text-center mt-20 text-xl">No autorizado</div>;
  }
  
  if (loading) {
    return <div className="font-poppins text-center mt-10 text-18">Cargando servicios odontológicos...</div>;
  }

  return (
    <main className="flex min-h-[calc(100vh-94px)] bg-gray-50 overflow-hidden">
      <section className="flex-1 flex flex-col items-center px-3">
        <h1 className="text-header-blue text-46 font-bold font-poppins mb-1 pt-6 text-center pb-6">
          GESTIÓN DE SERVICIOS ODONTOLÓGICOS
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
          <div className="flex items-center gap-4 flex-wrap">
            <Input
              className="w-[250px] h-[35px] font-poppins"
              placeholder="Buscar por nombre"
              value={searchName}
              onChange={(e) => {
                setSearchName(e.target.value);
                setCurrentPage(1);
              }}
            />
            <Select
              className="w-[150px] h-[35px] font-poppins"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="ALL">Todos</option>
              <option value="ACTIVO">Habilitado</option>
              <option value="INACTIVO">Deshabilitado</option>
            </Select>
            <div className="flex items-center gap-2">
              <label className="text-gray-700 font-poppins text-14 font-medium whitespace-nowrap">Rango de precio:</label>
              <Input
                className="w-[140px] h-[35px] font-poppins !text-14 !placeholder:text-14"
                placeholder="Desde"
                type="number"
                value={minPrice}
                onChange={(e) => {
                  setMinPrice(e.target.value);
                  setCurrentPage(1);
                }}
              />
              <span className="text-gray-500 font-poppins text-14">-</span>
              <Input
                className="w-[140px] h-[35px] font-poppins !text-14 !placeholder:text-14"
                placeholder="Hasta"
                type="number"
                value={maxPrice}
                onChange={(e) => {
                  setMaxPrice(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </div>

        {/* Tabla de servicios con scroll vertical */}
        <div className="w-full max-w-[1200px] bg-white rounded-[12px] shadow-md overflow-x-auto"
             style={{ maxHeight: "calc(100vh - 226px)", overflowY: "auto" }}>
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 h-10">
              <tr>
                <th className={tableHeaderClass}>ID</th>
                <th className={tableHeaderClass}>Nombre</th>
                <th className={tableHeaderClass}>Descripción</th>
                <th className={tableHeaderClass}>Valor</th>
                <th className={tableHeaderClass}>Estado</th>
                <th className={tableHeaderClass}>Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentServices.map(service => (
                <tr key={service.id}>
                  <td className={tableCellClass}>{service.id}</td>
                  <td className={tableCellClass}>
                    <div className="font-semibold text-gray-900">{service.name}</div>
                  </td>
                  <td className={tableCellClass}>
                    <div className="max-w-[400px] px-2">
                      {service.description ? (
                        <div 
                          className="cursor-help text-left leading-5 text-14" 
                          title={service.description}
                          style={{ 
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            wordBreak: 'break-word'
                          }}
                        >
                          {service.description}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-14">Sin descripción</span>
                      )}
                    </div>
                  </td>
                  <td className={tableCellClass}>
                    <div className="font-semibold text-primary-blue">
                      {formatCurrency(service.value)}
                    </div>
                  </td>
                  <td className={tableCellClass}>
                    {service.is_active ? (
                      <span className="text-green-600 font-bold">Habilitado</span>
                    ) : (
                      <span className="text-red-600 font-bold">Deshabilitado</span>
                    )}
                  </td>
                  <td className={tableCellClass}>
                    <div className="flex flex-col items-center justify-center gap-2">
                      {service.is_active ? (
                        <>
                          <Button
                            className="bg-primary-blue hover:bg-primary-blue-hover text-white px-4 py-2 rounded-[40px] font-poppins text-14 font-bold w-[100px] h-[32px]"
                            onClick={() => handleEdit(service)}
                          >
                            Modificar
                          </Button>
                          <Button
                            className="bg-header-blue hover:bg-header-blue-hover text-white px-4 py-2 rounded-[40px] font-poppins text-14 font-bold w-[100px] h-[32px]"
                            onClick={() => setConfirmDialog({ 
                              open: true, 
                              service, 
                              action: 'toggle',
                              message: `¿Seguro que deseas deshabilitar el servicio "${service.name}"?`
                            })}
                          >
                            Deshabilitar
                          </Button>
                        </>
                      ) : (
                        <Button
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-[40px] font-poppins text-14 font-bold w-[100px] h-[32px]"
                          onClick={() => handleToggleStatus(service)}
                        >
                          Habilitar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {currentServices.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500 font-poppins text-16">
                    {searchName ? "La información proporcionada no corresponde a ningún registro existente" : "No hay servicios odontológicos registrados"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Controles de paginación */}
        {totalPages > 1 && (
          <div className="w-full max-w-[1200px] flex justify-center items-center mt-6 gap-3">
            <button
              className={`group flex items-center justify-center px-4 py-2 rounded-full font-poppins text-12 font-medium transition-all duration-200 shadow-sm ${
                currentPage === 1 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' 
                  : 'bg-white text-gray-700 hover:bg-primary-blue hover:text-white border border-gray-300 hover:border-primary-blue hover:shadow-md transform hover:-translate-y-0.5'
              }`}
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
            >
              Anterior
            </button>

            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
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
              ))}
            </div>

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
            </button>
          </div>
        )}

        {/* Información de paginación */}
        {filteredServices.length > 0 && (
          <div className="w-full max-w-[1200px] flex justify-center mt-3">
            <div className="bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
              <p className="text-gray-600 font-poppins text-12 font-medium">
                <span className="text-primary-blue font-semibold">
                  {(currentPage - 1) * itemsPerPage + 1}
                </span>
                {' - '}
                <span className="text-primary-blue font-semibold">
                  {Math.min(currentPage * itemsPerPage, filteredServices.length)}
                </span>
                {' de '}
                <span className="text-primary-blue font-semibold">
                  {filteredServices.length}
                </span>
                {' servicios'}
              </p>
            </div>
          </div>
        )}

        {/* Modal de edición */}
        {editService && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[700px] max-h-[90vh] overflow-y-auto">
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
                      <h2 className="text-24 font-bold font-poppins">Editar Servicio</h2>
                      <p className="text-16 opacity-90 font-poppins">Actualizar información del servicio</p>
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
                  <div>
                    <label className="block font-poppins font-medium text-gray-700 mb-2">Nombre del servicio</label>
                    <Input
                      name="name"
                      value={editForm.name}
                      onChange={handleEditFormChange}
                      className="w-full"
                      error={!!editFormErrors.name}
                      maxLength={100}
                    />
                    {editFormErrors.name && (
                      <p className="text-red-500 text-sm font-poppins mt-1">{editFormErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block font-poppins font-medium text-gray-700 mb-2">Valor (COP)</label>
                    <Input
                      name="value"
                      value={editForm.value}
                      onChange={handleEditFormChange}
                      className="w-full"
                      error={!!editFormErrors.value}
                    />
                    {editForm.value && !editFormErrors.value && (
                      <p className="text-primary-blue text-sm mt-1 font-poppins font-medium">
                        {formatCurrency(parseFloat(editForm.value))}
                      </p>
                    )}
                    {editFormErrors.value && (
                      <p className="text-red-500 text-sm font-poppins mt-1">{editFormErrors.value}</p>
                    )}
                  </div>

                  <div>
                    <label className="block font-poppins font-medium text-gray-700 mb-2">Estado</label>
                    <Select
                      name="is_active"
                      value={editForm.is_active}
                      onChange={handleEditFormChange}
                      className="w-full"
                    >
                      <option value={true}>Habilitado</option>
                      <option value={false}>Deshabilitado</option>
                    </Select>
                  </div>

                  <div>
                    <label className="block font-poppins font-medium text-gray-700 mb-2">Descripción</label>
                    <TextArea
                      name="description"
                      value={editForm.description}
                      onChange={handleEditFormChange}
                      className="w-full resize-none"
                      error={!!editFormErrors.description}
                      maxLength={1000}
                      rows={4}
                    />
                    <div className="flex justify-between items-center mt-1">
                      {editFormErrors.description && (
                        <p className="text-red-500 text-sm font-poppins">{editFormErrors.description}</p>
                      )}
                      <p className="text-gray-500 text-sm font-poppins ml-auto">
                        {editForm.description.length}/1000 caracteres
                      </p>
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

        {/* Diálogo de confirmación */}
        <ConfirmDialog
          open={confirmDialog.open}
          title="Confirmar cambio de estado"
          message={confirmDialog.message}
          onConfirm={async () => {
            await handleToggleStatus(confirmDialog.service);
            setConfirmDialog({ open: false, service: null, action: null, message: '' });
          }}
          onCancel={() => setConfirmDialog({ open: false, service: null, action: null, message: '' })}
        />
      </section>
    </main>
  );
}

export default DentalServiceManagement;
