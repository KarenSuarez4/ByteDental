import React from 'react';

const ProceduresByDoctorChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg mb-2">No hay datos disponibles</p>
          <p className="text-sm">No se encontraron procedimientos para mostrar en el período seleccionado</p>
        </div>
      </div>
    );
  }

  const maxProcedures = Math.max(...data.map(item => item.total_procedures));
  
  // Función para generar colores únicos para cada doctor
  const getColor = (index) => {
    const colors = [
      'hsl(200, 70%, 50%)', // Azul
      'hsl(140, 70%, 45%)', // Verde
      'hsl(25, 80%, 55%)',  // Naranja
      'hsl(280, 70%, 50%)', // Púrpura
      'hsl(350, 70%, 50%)', // Rojo
      'hsl(190, 70%, 45%)', // Cian
      'hsl(60, 70%, 45%)',  // Amarillo
      'hsl(320, 70%, 50%)', // Magenta
      'hsl(120, 50%, 40%)', // Verde oscuro
      'hsl(260, 60%, 55%)', // Violeta
    ];
    
    if (index < colors.length) {
      return colors[index];
    } else {
      const hue = (index * 360 / data.length) % 360;
      const saturation = 60 + (index % 3) * 10;
      const lightness = 45 + (index % 2) * 10;
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
  };

  // Función para generar color hover más oscuro
  const getHoverColor = (index) => {
    const baseColor = getColor(index);
    const hslMatch = baseColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (hslMatch) {
      const [, h, s, l] = hslMatch;
      return `hsl(${h}, ${s}%, ${Math.max(parseInt(l) - 10, 20)}%)`;
    }
    return baseColor;
  };

  const totalProcedures = data.reduce((sum, item) => sum + item.total_procedures, 0);

  return (
    <div className="h-80">
      {/* Información general */}
      <div className="mb-4 text-center">
        <p className="text-sm text-gray-600">
          Total de procedimientos: <span className="font-semibold">{totalProcedures}</span>
        </p>
      </div>

      {/* Gráfico */}
      <div className="relative h-52 border-b border-l border-gray-200 bg-gray-50">
        <div className="absolute inset-0 flex items-end justify-around px-2">
          {data.map((item, index) => {
            const barHeight = maxProcedures > 0 ? (item.total_procedures / maxProcedures) * 100 : 0;
            const barColor = getColor(index);
            const hoverColor = getHoverColor(index);
            
            return (
              <div key={index} className="flex flex-col items-center" style={{ width: `${85 / data.length}%` }}>
                {/* Porcentaje encima de la barra */}
                <div className="mb-1 text-center">
                  <div className="text-xs font-semibold" style={{ color: barColor }}>
                    {item.percentage.toFixed(1)}%
                  </div>
                  <div className="text-xs font-medium text-gray-700">
                    {item.total_procedures}
                  </div>
                </div>
                
                {/* Barra */}
                <div
                  className="w-full transition-all duration-200 rounded-t-sm relative group cursor-pointer"
                  style={{
                    backgroundColor: barColor,
                    height: `${barHeight}%`,
                    minHeight: item.total_procedures > 0 ? '12px' : '0'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = hoverColor;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = barColor;
                  }}
                  title={`Dr. ${item.doctor}: ${item.total_procedures} procedimientos (${item.percentage.toFixed(1)}%)`}
                >
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs rounded py-2 px-3 whitespace-nowrap z-10">
                    <div className="font-medium">Dr. {item.doctor}</div>
                    <div>{item.total_procedures} procedimientos</div>
                    <div>{item.percentage.toFixed(1)}% del total</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Etiquetas de los ejes */}
        <div className="absolute -left-13 top-1/2 transform -translate-y-1/2 -rotate-90 text-xs text-gray-600 font-medium">
          Procedimientos
        </div>
      </div>
      
      {/* Información detallada debajo del gráfico */}
      <div className="mt-6 space-y-2 max-h-16 overflow-y-auto">
        <div className="text-center text-xs text-gray-600 font-medium mb-2">
          Detalle por Doctor
        </div>
        <div className="grid grid-cols-1 gap-1 px-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between text-xs">
              <div className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-sm mr-2 flex-shrink-0"
                  style={{ backgroundColor: getColor(index) }}
                ></div>
                <span className="font-medium text-gray-700">Dr. {item.doctor}</span>
              </div>
              <div className="text-gray-600">
                <span className="font-semibold">{item.total_procedures}</span> procedimientos 
                <span className="text-gray-500 ml-1">({item.percentage.toFixed(1)}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProceduresByDoctorChart;