import React from 'react';

const TreatmentsByMonthChart = ({ data, selectedYear, onYearChange, loading }) => {
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-header-blue mx-auto mb-2"></div>
          <p className="text-sm">Cargando datos...</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg mb-2">No hay datos disponibles</p>
          <p className="text-sm">No se encontraron tratamientos para el año seleccionado</p>
        </div>
      </div>
    );
  }

  const maxTreatments = Math.max(...data.map(item => item.total_treatments));
  const minTreatments = 0; // Siempre empezar desde 0
  const padding = maxTreatments * 0.1; // 10% de padding solo arriba
  const chartMax = maxTreatments + padding;
  
  // Función para formatear el mes (de "2024-01" a "Ene 2024")
  const formatMonth = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const monthNames = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
    ];
    return `${monthNames[parseInt(month) - 1]}`;
  };

  // Generar años para el selector (últimos 5 años + año actual)
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i >= currentYear - 5; i--) {
      years.push(i);
    }
    return years;
  };

  // Función para calcular la posición Y corregida
  const calculateY = (value) => {
    if (chartMax === 0) return 100; // Si no hay datos, poner en la parte inferior
    return ((chartMax - value) / chartMax) * 100;
  };

  // Separar la línea en segmentos cuando hay valores cero
  const createLineSegments = () => {
    const segments = [];
    let currentSegment = [];
    
    data.forEach((item, index) => {
      const x = ((index + 0.5) / data.length) * 100;
      const y = calculateY(item.total_treatments);
      
      if (item.total_treatments > 0) {
        currentSegment.push(`${x},${y}`);
      } else {
        // Si hay un segmento en progreso, guardarlo
        if (currentSegment.length > 0) {
          segments.push(currentSegment.join(' '));
          currentSegment = [];
        }
        // Para valores cero, crear un punto individual
        segments.push(`${x},${y}`);
      }
    });
    
    // Agregar el último segmento si existe
    if (currentSegment.length > 0) {
      segments.push(currentSegment.join(' '));
    }
    
    return segments;
  };

  const lineSegments = createLineSegments();
  const totalTreatments = data.reduce((sum, item) => sum + item.total_treatments, 0);

  return (
    <div className="h-full flex flex-col">
      {/* Selector de año y información general */}
      <div className="mb-4 flex justify-between items-center flex-shrink-0">
        <div className="text-sm text-gray-600">
          Total de tratamientos: <span className="font-semibold">{totalTreatments}</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Año:</label>
          <select
            value={selectedYear || ''}
            onChange={(e) => onYearChange(e.target.value ? parseInt(e.target.value) : null)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-header-blue"
          >
            <option value="">Últimos 12 meses</option>
            {generateYearOptions().map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Gráfico - ocupa la mayor parte del espacio */}
      <div className="relative flex-1 border-b border-l border-gray-200 bg-gray-50 min-h-[250px]">
        <svg className="absolute inset-0 w-full h-full">
          {/* Líneas de grid horizontales */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
            const y = (1 - ratio) * 100;
            const value = Math.round(chartMax * ratio);
            return (
              <g key={index}>
                <line
                  x1="0"
                  y1={`${y}%`}
                  x2="100%"
                  y2={`${y}%`}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                  strokeDasharray={index === 0 ? "none" : "2,2"}
                />
                <text
                  x="-8"
                  y={`${y}%`}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="text-xs fill-gray-600"
                >
                  {value}
                </text>
              </g>
            );
          })}

          {/* Líneas principales - renderizar cada segmento por separado */}
          {lineSegments.map((segment, segmentIndex) => {
            const points = segment.split(' ');
            if (points.length === 1) {
              // Es un punto individual (valor cero), no dibujar línea
              return null;
            }
            return (
              <polyline
                key={segmentIndex}
                fill="none"
                stroke="#2563eb"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={segment}
              />
            );
          })}

          {/* Puntos y etiquetas */}
          {data.map((item, index) => {
            const x = ((index + 0.5) / data.length) * 100;
            const y = calculateY(item.total_treatments);
            const isZero = item.total_treatments === 0;
            
            return (
              <g key={index}>
                {/* Punto */}
                <circle
                  cx={`${x}%`}
                  cy={`${y}%`}
                  r="4"
                  fill={isZero ? "#ef4444" : "#2563eb"} // Rojo para ceros, azul para valores positivos
                  stroke="white"
                  strokeWidth="2"
                  className="cursor-pointer transition-all"
                />
                
                {/* Área hover invisible para tooltip */}
                <circle
                  cx={`${x}%`}
                  cy={`${y}%`}
                  r="12"
                  fill="transparent"
                  className="cursor-pointer"
                >
                  <title>{`${formatMonth(item.month)} ${item.month.split('-')[0]}: ${item.total_treatments} tratamientos`}</title>
                </circle>
                
                {/* Etiqueta de cantidad */}
                <text
                  x={`${x}%`}
                  y={`${Math.max(y - 8, 8)}%`}
                  textAnchor="middle"
                  className={`text-xs font-semibold ${isZero ? 'fill-red-500' : 'fill-gray-700'}`}
                >
                  {item.total_treatments}
                </text>
              </g>
            );
          })}
        </svg>
        
        {/* Etiqueta del eje Y */}
        <div className="absolute -left-12 top-1/2 transform -translate-y-1/2 -rotate-90 text-xs text-gray-600 font-medium">
          Tratamientos
        </div>
      </div>
      
      {/* Etiquetas del eje X */}
      <div className="mt-3 flex justify-around flex-shrink-0">
        {data.map((item, index) => (
          <div key={index} className="text-xs text-gray-600 text-center font-medium">
            {formatMonth(item.month)}
            <div className="text-xs text-gray-500">
              {item.month.split('-')[0]}
            </div>
          </div>
        ))}
      </div>

      {/* Información detallada con más espacio */}
      <div className="mt-4 flex-shrink-0">
        <div className="text-center text-xs text-gray-600 font-medium mb-3">
          Detalle Mensual
        </div>
        <div className="h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 px-2">
            {data.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
                <span className="font-medium text-gray-700">
                  {formatMonth(item.month)} {item.month.split('-')[0]}
                </span>
                <span className={`font-semibold ${item.total_treatments === 0 ? 'text-red-500' : 'text-blue-600'}`}>
                  {item.total_treatments}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TreatmentsByMonthChart;