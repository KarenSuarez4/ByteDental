import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

const Reports = () => {
  const { token } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('activities');

  // Obtener fecha actual y fecha hace 30 días para establecer valores por defecto
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Opciones de reportes
  const reportOptions = [
    {
      value: 'activities',
      label: 'Reporte de Actividades Odontológicas',
      description: 'Reporte detallado de todos los tratamientos realizados',
      endpoint: 'activities'
    },
    {
      value: 'monthly',
      label: 'Reporte Mensual Consolidado',
      description: 'Resumen consolidado de actividades por mes',
      endpoint: 'monthly'
    }
  ];

  useEffect(() => {
    // Establecer fechas por defecto
    setStartDate(thirtyDaysAgo);
    setEndDate(today);
  }, []);

  const handleQuickDateSelection = (type) => {
    const currentDate = new Date();
    let startDateCalc = '';
    
    switch (type) {
      case '30days':
        startDateCalc = thirtyDaysAgo;
        break;
      case 'thisMonth':
        startDateCalc = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
        break;
      case 'thisYear':
        startDateCalc = new Date(currentDate.getFullYear(), 0, 1).toISOString().split('T')[0];
        break;
      default:
        return;
    }
    
    setStartDate(startDateCalc);
    setEndDate(today);
  };

  // Función mejorada para formatear fechas
  const formatDateForAPI = (dateString) => {
    if (!dateString) return null;
    
    // Asegurar que la fecha esté en formato YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      console.error('Formato de fecha inválido:', dateString);
      return null;
    }
    
    // Simplemente agregar la hora sin manipulación de zona horaria
    return `${dateString}T00:00:00`;
  };

  const formatEndDateForAPI = (dateString) => {
    if (!dateString) return null;
    
    // Asegurar que la fecha esté en formato YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      console.error('Formato de fecha inválido:', dateString);
      return null;
    }
    
    // Simplemente agregar la hora sin manipulación de zona horaria
    return `${dateString}T23:59:59`;
  };

  const handleDownloadPDF = async () => {
    // Validaciones mejoradas
    if (reportType === 'activities' && (!startDate || !endDate)) {
      toast.error('Por favor, selecciona ambas fechas para el reporte de actividades');
      return;
    }

    if (reportType === 'monthly' && !endDate) {
      toast.error('Por favor, selecciona el mes para el reporte mensual');
      return;
    }

    if (!reportType) {
      toast.error('Por favor, selecciona el tipo de reporte');
      return;
    }

    // Validación adicional solo para reporte de actividades
    if (reportType === 'activities') {
      const start = new Date(startDate + 'T00:00:00');
      const end = new Date(endDate + 'T23:59:59');
      const today = new Date();

      if (start > end) {
        toast.error('La fecha de inicio no puede ser posterior a la fecha de fin');
        return;
      }

      // Verificar que las fechas no sean futuras (con tolerancia de 1 día)
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (start > todayStart || end > todayStart) {
        toast.error('Las fechas no pueden ser futuras');
        return;
      }
    }

    setLoading(true);

    try {
      // Obtener el endpoint según el tipo de reporte seleccionado
      const selectedReport = reportOptions.find(option => option.value === reportType);
      const endpoint = selectedReport?.endpoint || 'activities';
      
      const url = `${import.meta.env.VITE_API_URL}/api/reports/${endpoint}?format=pdf`;

      // Preparar el cuerpo de la solicitud según el tipo de reporte
      let requestBody;
      
      if (reportType === 'activities') {
        const formattedStartDate = formatDateForAPI(startDate);
        const formattedEndDate = formatEndDateForAPI(endDate);
        
        if (!formattedStartDate || !formattedEndDate) {
          toast.error('Error en el formato de las fechas seleccionadas');
          return;
        }
        
        requestBody = {
          start_date: formattedStartDate,
          end_date: formattedEndDate
        };
      } else if (reportType === 'monthly') {
        const formattedEndDate = formatEndDateForAPI(endDate);
        
        if (!formattedEndDate) {
          toast.error('Error en el formato de la fecha seleccionada');
          return;
        }
        
        requestBody = {
          report_date: formattedEndDate
        };
      }

      console.log('📅 Datos enviados al backend:', {
        url,
        method: 'POST',
        body: requestBody,
        originalDates: { startDate, endDate }
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📡 Respuesta del servidor:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        let errorMessage = 'Error al generar el reporte';
        let errorDetails = null;
        
        try {
          const responseText = await response.text();
          console.log('❌ Respuesta de error completa:', responseText);
          
          if (responseText) {
            try {
              const errorData = JSON.parse(responseText);
              errorDetails = errorData;
              if (errorData.detail) {
                errorMessage = errorData.detail;
              }
            } catch (jsonError) {
              console.error('Error parseando JSON:', jsonError);
              errorMessage = `Error del servidor: ${responseText.substring(0, 200)}`;
            }
          }
        } catch (readError) {
          console.error('Error leyendo respuesta:', readError);
        }
        
        // Manejo específico de errores
        if (response.status === 401) {
          toast.error('No autorizado. Por favor, inicia sesión nuevamente');
        } else if (response.status === 403) {
          toast.error('No tienes permisos para acceder a este reporte');
        } else if (response.status === 400) {
          toast.error(`Error de validación: ${errorMessage}`);
          console.error('Detalles del error 400:', errorDetails);
        } else if (response.status === 404) {
          toast.warning('No se encontraron datos para el período especificado');
        } else if (response.status === 500) {
          toast.error(`Error interno del servidor: ${errorMessage}`);
        } else {
          toast.error(errorMessage);
        }
        return;
      }

      // Verificar si la respuesta es un PDF
      const contentType = response.headers.get('content-type');
      console.log('📄 Content-Type:', contentType);

      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log('📊 Datos JSON recibidos:', data);
        
        if (data.activities && data.activities.length === 0) {
          toast.warning('No se encontraron registros en el periodo especificado');
        } else if (data.procedures && data.procedures.length === 0) {
          toast.warning('No se encontraron registros en el periodo especificado');
        } else {
          toast.info(data.message || 'No hay datos para el reporte');
        }
        return;
      }

      // Convertir la respuesta a blob
      const blob = await response.blob();
      console.log('📁 Tamaño del PDF:', blob.size, 'bytes');

      if (blob.size === 0) {
        toast.warning('El archivo PDF está vacío');
        return;
      }

      // Crear un enlace temporal para descargar el archivo
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Nombre del archivo según el tipo de reporte
      const reportTypeText = reportType === 'monthly' ? 'mensual_consolidado' : 'actividades';
      const dateString = reportType === 'monthly' 
        ? new Date(endDate + 'T00:00:00').toISOString().slice(0, 7).replace('-', '') // YYYYMM para mensual
        : `${startDate.replace(/-/g, '')}_${endDate.replace(/-/g, '')}`; // YYYYMMDD_YYYYMMDD para actividades
      
      const fileName = `reporte_${reportTypeText}_${dateString}.pdf`;
      link.download = fileName;
      
      console.log('⬇️ Iniciando descarga:', fileName);
      
      // Agregar el enlace al DOM, hacer clic y removerlo
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Liberar el objeto URL
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success('Reporte descargado exitosamente');

    } catch (error) {
      console.error('💥 Error en la solicitud:', error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        toast.error('Error de conexión. Verifica que el servidor esté funcionando');
      } else {
        toast.error(`Error al descargar el reporte: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };


  const calculateDays = () => {
    if (!startDate || !endDate) return '0';
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays.toString();
  };

  const getSelectedReportInfo = () => {
    return reportOptions.find(option => option.value === reportType);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Reportes del Sistema
          </h1>
          <p className="text-gray-600">
            Genera reportes consolidados de las actividades odontológicas
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Periodo Seleccionado</p>
                <p className="text-2xl font-bold text-gray-900">{calculateDays()} días</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100 text-red-600 mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Tipo de Reporte</p>
                <p className="text-lg font-bold text-gray-900">
                  {reportType === 'monthly' ? 'Mensual' : 'Actividades'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className={`p-3 rounded-full mr-4 ${loading ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Estado</p>
                <p className="text-2xl font-bold text-gray-900">{loading ? 'Generando...' : 'Listo'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
            </svg>
            Filtros
          </h2>
          
          {/* Selector de tipo de reporte */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Reporte
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {reportOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {getSelectedReportInfo() && (
              <p className="mt-2 text-sm text-gray-500">
                {getSelectedReportInfo().description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Inicio
                {reportType === 'monthly' && (
                  <span className="text-xs text-gray-500 ml-1">(Solo se usará la fecha fin para el mes)</span>
                )}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={today}
                disabled={reportType === 'monthly'}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  reportType === 'monthly' ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {reportType === 'monthly' ? 'Mes del Reporte' : 'Fecha Fin'}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                max={today}
                min={reportType === 'activities' ? startDate : undefined}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Botones de acceso rápido - Solo para reporte de actividades */}
          {reportType === 'activities' && (
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => handleQuickDateSelection('30days')}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Últimos 30 días
              </button>
              <button
                onClick={() => handleQuickDateSelection('thisMonth')}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Este mes
              </button>
              <button
                onClick={() => handleQuickDateSelection('thisYear')}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Este año
              </button>
            </div>
          )}

          {/* Información del periodo seleccionado */}
          {startDate && endDate && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Periodo seleccionado:</strong>{' '}
                {reportType === 'monthly' 
                  ? `${new Date(endDate + 'T00:00:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`
                  : `${new Date(startDate + 'T00:00:00').toLocaleDateString('es-ES')} - ${new Date(endDate + 'T00:00:00').toLocaleDateString('es-ES')}`
                }
              </p>
            </div>
          )}
        </div>

        {/* Información del Reporte */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2 flex items-center">
              <svg className="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {getSelectedReportInfo()?.label || 'Reporte Seleccionado'}
            </h2>
            <p className="text-gray-600">
              {getSelectedReportInfo()?.description || 'Selecciona un tipo de reporte para ver su descripción'}
            </p>
          </div>

          {/* Información del reporte según el tipo */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">
              El reporte incluye:
            </h3>
            {reportType === 'activities' ? (
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>Fecha y hora de cada tratamiento</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>Información del paciente (nombre, documento, teléfono)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>Procedimiento realizado</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>Doctor que realizó el tratamiento</span>
                </li>
              </ul>
            ) : (
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>Resumen mensual de actividades</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>Total de procedimientos por mes</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>Estadísticas de doctores y pacientes</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>Tendencias y análisis comparativo</span>
                </li>
              </ul>
            )}
          </div>

          {/* Botón de descarga */}
          <div className="flex justify-center">
            <button
              onClick={handleDownloadPDF}
              disabled={loading || !endDate || (reportType === 'activities' && !startDate)}
              className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white ${
                loading || !endDate || (reportType === 'activities' && !startDate)
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generando reporte...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Descargar Reporte PDF
                </>
              )}
            </button>
          </div>

          {((!endDate) || (reportType === 'activities' && !startDate)) && (
            <p className="text-sm text-gray-500 text-center mt-4">
              {reportType === 'activities' 
                ? 'Selecciona ambas fechas para generar el reporte'
                : 'Selecciona el mes para generar el reporte'
              }
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
