import React, { useState, useEffect } from "react";
import Button from "../../components/Button";
import Input from "../../components/Input";
import TextArea from "../../components/TextArea";
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from "../../contexts/AuthContext";
import { createDentalService, getDentalServices } from "../../services/dentalServiceService";
import { toast } from "react-toastify";

function cn(...args) {
  return twMerge(clsx(args));
}

const RegisterDentalService = () => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    value: "",
  });

  const [formErrors, setFormErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [existingServices, setExistingServices] = useState([]);
  const { userRole, token } = useAuth();

  // Cargar servicios existentes para validar unicidad
  useEffect(() => {
    const loadExistingServices = async () => {
      if (token) {
        try {
          const services = await getDentalServices(token, { limit: 1000 });
          setExistingServices(services);
        } catch (error) {
          console.error("Error loading existing services:", error);
        }
      }
    };
    loadExistingServices();
  }, [token]);

  // Limpiar mensajes después de un tiempo
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (formError) {
      const timer = setTimeout(() => setFormError(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [formError]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Validaciones específicas para el valor
    if (name === 'value') {
      // Solo permitir números y punto decimal
      if (!/^\d*\.?\d*$/.test(value)) return;
      
      setFormData((prev) => ({ ...prev, [name]: value }));
      
      // Validar formato del valor
      const numValue = parseFloat(value);
      if (value && (isNaN(numValue) || numValue <= 0)) {
        setFormErrors(prev => ({ ...prev, [name]: 'El valor debe ser mayor a 0' }));
      } else if (value && numValue > 999999999.99) {
        setFormErrors(prev => ({ ...prev, [name]: 'El valor no puede exceder 999,999,999.99' }));
      } else {
        setFormErrors(prev => ({ ...prev, [name]: '' }));
      }
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Limpiar error específico del campo
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    // Validar campos obligatorios
    if (!formData.name.trim()) errors.name = 'El nombre del servicio es obligatorio';
    if (!formData.description.trim()) errors.description = 'La descripción del servicio es obligatoria';
    if (!formData.value) errors.value = 'El valor del servicio es obligatorio';
    
    // Validar unicidad del nombre
    const nameExists = existingServices.some(service => 
      service.name.toLowerCase().trim() === formData.name.toLowerCase().trim()
    );
    
    if (nameExists) {
      errors.name = 'Ya existe un servicio con este nombre. Por favor, elija un nombre diferente.';
    }
    
    // Validar formato del valor
    const numValue = parseFloat(formData.value);
    if (formData.value && (isNaN(numValue) || numValue <= 0)) {
      errors.value = 'El valor debe ser mayor a 0';
    } else if (formData.value && numValue > 999999999.99) {
      errors.value = 'El valor no puede exceder 999,999,999.99';
    }

    // Validar longitud de campos
    if (formData.name.length > 100) {
      errors.name = 'El nombre no puede exceder 100 caracteres';
    }
    if (formData.description && formData.description.length > 1000) {
      errors.description = 'La descripción no puede exceder 1000 caracteres';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setFormError('');

    if (!validateForm()) {
      setFormError('Por favor, complete todos los campos obligatorios (Nombre, Descripción y Valor).');
      return;
    }

    try {
      setLoading(true);
      
      const servicePayload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        value: parseFloat(formData.value),
        is_active: true,
      };

      await createDentalService(servicePayload, token);
      
      setSuccessMessage("¡Servicio odontológico registrado con éxito!");
      toast.success("¡Servicio odontológico registrado con éxito.!");
      
      // Recargar servicios existentes para futuras validaciones
      try {
        const updatedServices = await getDentalServices(token, { limit: 1000 });
        setExistingServices(updatedServices);
      } catch (error) {
        console.error("Error reloading services:", error);
      }
      
      // Resetear el formulario después del éxito
      setFormData({
        name: "",
        description: "",
        value: "",
      });
      setFormErrors({});
      
    } catch (error) {
      console.error('Error al registrar el servicio:', error);
      
      // Manejar errores específicos del backend
      const errorMessage = error.message || 'Error al registrar el servicio odontológico.';
      
      if (errorMessage.includes("nombre") && errorMessage.includes("existe")) {
        setFormErrors({ name: "Ya existe un servicio con este nombre. Por favor, elija un nombre diferente." });
        toast.error("Ya existe un servicio con este nombre.");
      } else {
        setFormError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({ name: "", description: "", value: "" });
    setFormErrors({});
    setFormError('');
    setSuccessMessage('');
  };

  // Formatear valor como moneda colombiana
  const formatCurrency = (value) => {
    if (!value) return '';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  };

  if (userRole !== "Administrador") {
    return <div className="font-poppins text-center mt-20 text-xl">No autorizado</div>;
  }

  return (
    <main className="flex min-h-[calc(100vh-94px)] bg-gray-50">
      <section className="flex-1 flex flex-col items-center px-6 py-8">
        <div className="w-full max-w-4xl">
          <h1 className="text-header-blue text-46 font-bold font-poppins mb-8 text-center">
            REGISTRAR SERVICIO ODONTOLÓGICO
          </h1>

          {/* Mensajes de error y éxito */}
          {formError && (
            <div className="mb-6 w-full p-4 bg-red-50 border-l-4 border-red-400 rounded-r-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 font-poppins">{formError}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 w-full p-4 bg-green-50 border-l-4 border-green-400 rounded-r-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-green-700 font-poppins">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Formulario */}
          <div className="bg-white rounded-[24px] shadow-xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombre del servicio */}
                <div className="md:col-span-2">
                  <label className="block font-poppins font-semibold text-gray-700 mb-2 text-18">
                    Nombre del Servicio *
                  </label>
                  <Input
                    name="name"
                    type="text"
                    placeholder="Ingrese el nombre del servicio odontológico"
                    value={formData.name}
                    onChange={handleChange}
                    error={!!formErrors.name}
                    maxLength={100}
                    className="w-full"
                  />
                  {formErrors.name && (
                    <p className="text-red-500 text-sm mt-2 font-poppins">{formErrors.name}</p>
                  )}
                </div>

                {/* Valor del servicio */}
                <div>
                  <label className="block font-poppins font-semibold text-gray-700 mb-2 text-18">
                    Valor del Servicio (COP) *
                  </label>
                  <Input
                    name="value"
                    type="text"
                    placeholder="Ingrese el valor del servicio"
                    value={formData.value}
                    onChange={handleChange}
                    error={!!formErrors.value}
                    className="w-full"
                  />
                  {formData.value && !formErrors.value && (
                    <p className="text-primary-blue text-sm mt-1 font-poppins font-medium">
                      {formatCurrency(formData.value)}
                    </p>
                  )}
                  {formErrors.value && (
                    <p className="text-red-500 text-sm mt-2 font-poppins">{formErrors.value}</p>
                  )}
                </div>

                {/* Estado (siempre activo al crear) */}
                <div>
                  <label className="block font-poppins font-semibold text-gray-700 mb-2 text-18">
                    Estado
                  </label>
                  <div className="w-full h-[50px] bg-green-50 border-2 border-green-200 rounded-[12px] flex items-center px-4">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-green-700 font-poppins text-18">Habilitado</span>
                    </div>
                  </div>
                  <p className="text-gray-500 text-18 mt-1 font-poppins">
                    Los nuevos servicios se crean en estado habilitado por defecto
                  </p>
                </div>

                {/* Descripción */}
                <div className="md:col-span-2">
                  <label className="block font-poppins font-semibold text-gray-700 mb-2 text-18">
                    Descripción *
                  </label>
                  <TextArea
                    name="description"
                    placeholder="Descripción detallada del servicio odontológico"
                    value={formData.description}
                    onChange={handleChange}
                    error={!!formErrors.description}
                    maxLength={1000}
                    rows={4}
                    className="w-full resize-none"
                  />
                  <div className="flex justify-between items-center mt-1">
                    {formErrors.description && (
                      <p className="text-red-500 text-sm font-poppins">{formErrors.description}</p>
                    )}
                    <p className="text-gray-500 text-sm font-poppins ml-auto">
                      {formData.description.length}/1000 caracteres
                    </p>
                  </div>
                </div>
              </div>

            </form>
          </div>
        </div>
        
        {/* Botones siguiendo el patrón de RegisterUser */}
        <div className="flex flex-col md:flex-row justify-center items-center md:space-x-6 space-y-4 md:space-y-0 mt-10 w-full max-w-[700px] mx-auto">
          <Button
            onClick={handleCancel}
            className="bg-header-blue hover:bg-header-blue-hover text-white w-full md:w-auto px-10 py-4 font-bold rounded-[40px] text-18 shadow-md"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className={cn(
              "w-full md:w-auto px-10 py-4 font-bold rounded-[40px] !text-18 shadow-md",
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-primary-blue hover:bg-primary-blue-hover text-white"
            )}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Guardando...
              </div>
            ) : (
              "Guardar"
            )}
          </Button>
        </div>
      </section>
    </main>
  );
};

export default RegisterDentalService;