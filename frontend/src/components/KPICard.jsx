import React from 'react';

const KPICard = ({ title, value, subtitle, icon, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-500 text-blue-600',
    green: 'bg-green-500 text-green-600',
    purple: 'bg-purple-500 text-purple-600',
    orange: 'bg-orange-500 text-orange-600'
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className={`w-12 h-12 rounded-full bg-opacity-10 flex items-center justify-center ${colorClasses[color]}`}>
            <span className="text-2xl">{icon}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default KPICard;