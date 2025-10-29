import React from 'react';

const ProcedureDistributionChart = ({ data, totalProcedures }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg mb-2">No hay datos disponibles</p>
          <p className="text-sm">Intenta ajustar los filtros o verifica que existan procedimientos registrados</p>
        </div>
      </div>
    );
  }

  const maxQuantity = Math.max(...data.map(item => item.quantity));
  
  // Función para generar colores únicos para cada procedimiento
  const getColor = (index) => {
    return `hsl(${220 + (index * 30)}, 70%, 50%)`;
  };

  // Función para generar color hover más oscuro
  const getHoverColor = (index) => {
    return `hsl(${220 + (index * 30)}, 70%, 40%)`;
  };
  
  return (
    <div className="h-80">
      {/* Información general */}
      <div className="mb-4 text-center">
        <p className="text-sm text-gray-600">
          Total de procedimientos: <span className="font-semibold">{totalProcedures}</span>
        </p>
      </div>

      {/* Gráfico */}
      <div className="relative h-48 border-b border-l border-gray-200 bg-gray-50">
        <div className="absolute inset-0 flex items-end justify-around px-2">
          {data.map((item, index) => {
            const barHeight = maxQuantity > 0 ? (item.quantity / maxQuantity) * 100 : 0;
            const barColor = getColor(index);
            const hoverColor = getHoverColor(index);
            
            return (
              <div key={index} className="flex flex-col items-center" style={{ width: `${85 / data.length}%` }}>
                {/* Valor y porcentaje encima de la barra - más pegado */}
                <div className="mb-0.5 text-center">
                  <div className="text-xs font-semibold text-gray-700">{item.quantity}</div>
                  <div className="text-xs font-medium" style={{ color: barColor }}>
                    {item.percentage.toFixed(1)}%
                  </div>
                </div>
                
                {/* Barra */}
                <div
                  className="w-full transition-all duration-200 rounded-t-sm relative group cursor-pointer"
                  style={{
                    backgroundColor: barColor,
                    height: `${barHeight}%`,
                    minHeight: item.quantity > 0 ? '8px' : '0'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = hoverColor;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = barColor;
                  }}
                  title={`${item.procedure}: ${item.quantity} procedimientos (${item.percentage.toFixed(1)}%)`}
                >
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                    {item.procedure}
                    <br />
                    {item.quantity} procedimientos
                    <br />
                    {item.percentage.toFixed(1)}% del total
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Etiquetas de los ejes */}
        <div className="absolute -left-9 top-1/2 transform -translate-y-1/2 -rotate-90 text-xs text-gray-600">
          Cantidad
        </div>
      </div>
      
      {/* Etiquetas de procedimientos debajo del gráfico - nombres completos */}
      <div className="mt-4 space-y-2 max-h-20 overflow-y-auto">
        <div className="text-center text-xs text-gray-600 font-medium mb-2">
          Tipos de Procedimientos
        </div>
        <div className="grid grid-cols-1 gap-1 px-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center text-xs">
              <div 
                className="w-3 h-3 rounded-sm mr-2 flex-shrink-0"
                style={{ backgroundColor: getColor(index) }}
              ></div>
              <div className="flex-1 text-gray-700 text-left">
                <span className="font-medium">{item.procedure}</span>
                <span className="text-gray-500 ml-1">
                  ({item.quantity} - {item.percentage.toFixed(1)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProcedureDistributionChart;