import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faCalendarAlt, faDownload, faSpinner } from '@fortawesome/free-solid-svg-icons';

const Reports = () => {
  const { token } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  // Obtener fecha actual y fecha hace 30 días para establecer valores por defecto
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const handleDownloadPDF = async () => {
    // Validaciones
    if (!startDate || !endDate) {
      toast.error('Por favor, selecciona ambas fechas');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      toast.error('La fecha de inicio no puede ser posterior a la fecha de fin');
      return;
    }

    setLoading(true);

    try {
      const url = `${import.meta.env.VITE_API_URL}/api/reports/consolidated-activities?startDate=${startDate}&endDate=${endDate}&format=pdf`;
      
      console.log('📥 Descargando reporte desde:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('📊 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('❌ Error response:', errorData);
        
        if (response.status === 401) {
          toast.error('No autorizado. Por favor, inicia sesión nuevamente');
        } else if (response.status === 403) {
          toast.error('No tienes permisos para acceder a este reporte');
        } else if (response.status === 400) {
          toast.error(errorData?.detail || 'Parámetros inválidos');
        } else {
          toast.error('Error al generar el reporte');
        }
        return;
      }

      // Verificar si la respuesta es un PDF
      const contentType = response.headers.get('content-type');
      console.log('📄 Content-Type:', contentType);

      if (contentType && contentType.includes('application/json')) {
        // Si es JSON, significa que no hay datos
        const data = await response.json();
        console.log('📊 JSON response:', data);
        
        if (data.data && data.data.length === 0) {
          toast.warning('No se encontraron registros en el periodo especificado');
        } else {
          toast.info(data.message || 'No hay datos para el reporte');
        }
        return;
      }

      // Convertir la respuesta a blob
      const blob = await response.blob();
      console.log('📦 Blob size:', blob.size, 'bytes');

      if (blob.size === 0) {
        toast.warning('El archivo PDF está vacío');
        return;
      }

      // Crear un enlace temporal para descargar el archivo
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Nombre del archivo con la fecha actual
      const fileName = `consolidado_actividades_${new Date().toISOString().split('T')[0]}.pdf`;
      link.download = fileName;
      
      // Agregar el enlace al DOM, hacer clic y removerlo
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Liberar el objeto URL
      window.URL.revokeObjectURL(downloadUrl);
      
      console.log('✅ PDF descargado exitosamente:', fileName);
      toast.success('Reporte descargado exitosamente');

    } catch (error) {
      console.error('💥 Error al descargar el reporte:', error);
      toast.error('Error al descargar el reporte. Por favor, intenta nuevamente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <FontAwesomeIcon icon={faFilePdf} className="text-5xl text-red-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Reportes del Sistema
          </h1>
          <p className="text-gray-600">
            Genera reportes consolidados de las actividades odontológicas
          </p>
        </div>

        {/* Card principal */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2 flex items-center">
              <FontAwesomeIcon icon={faFilePdf} className="text-red-600 mr-3" />
              Consolidado de Actividades Odontológicas
            </h2>
            <p className="text-gray-600">
              Este reporte incluye todos los tratamientos realizados en el periodo seleccionado, 
              con información del paciente, doctor y procedimiento.
            </p>
          </div>

          {/* Formulario de fechas */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Fecha de inicio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FontAwesomeIcon icon={faCalendarAlt} className="mr-2 text-blue-600" />
                  Fecha de Inicio
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={today}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Selecciona fecha de inicio"
                />
              </div>

              {/* Fecha de fin */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FontAwesomeIcon icon={faCalendarAlt} className="mr-2 text-blue-600" />
                  Fecha de Fin
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  max={today}
                  min={startDate}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Selecciona fecha de fin"
                />
              </div>
            </div>

            {/* Botones de acceso rápido */}
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => {
                  setStartDate(thirtyDaysAgo);
                  setEndDate(today);
                }}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                Últimos 30 días
              </button>
              <button
                onClick={() => {
                  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
                  setStartDate(firstDayOfMonth);
                  setEndDate(today);
                }}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                Este mes
              </button>
              <button
                onClick={() => {
                  const firstDayOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
                  setStartDate(firstDayOfYear);
                  setEndDate(today);
                }}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                Este año
              </button>
            </div>

            {/* Información del reporte */}
            {startDate && endDate && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <p className="text-sm text-blue-800">
                  <strong>Periodo seleccionado:</strong> {new Date(startDate + 'T00:00:00').toLocaleDateString('es-ES')} - {new Date(endDate + 'T00:00:00').toLocaleDateString('es-ES')}
                </p>
              </div>
            )}

            {/* Botón de descarga */}
            <div className="pt-6 border-t border-gray-200">
              <button
                onClick={handleDownloadPDF}
                disabled={loading || !startDate || !endDate}
                className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all duration-300 flex items-center justify-center gap-3 ${
                  loading || !startDate || !endDate
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                }`}
              >
                {loading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xl" />
                    Generando reporte...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faDownload} className="text-xl" />
                    Descargar Reporte PDF
                  </>
                )}
              </button>

              {(!startDate || !endDate) && (
                <p className="text-sm text-gray-500 text-center mt-2">
                  Selecciona ambas fechas para generar el reporte
                </p>
              )}
            </div>
          </div>

          {/* Información adicional */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-3">
              El reporte incluye:
            </h3>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
