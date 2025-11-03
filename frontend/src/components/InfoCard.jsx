import React from 'react';

const InfoCard = ({ title, icon, bgColor, iconColor, content, className }) => {
    return (
        <div className={`${bgColor} rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col ${className}`}>
            {/* ✅ Header con icono y título */}
            <div className="p-4 pb-2">
                <div className="flex items-center mb-3">
                    <div className={`${iconColor} text-2xl mr-3 flex-shrink-0`} aria-hidden="true">
                        {icon}
                    </div>
                    <h3 className="font-semibold text-gray-800 text-sm leading-tight">
                        {title}
                    </h3>
                </div>
            </div>

            {/* ✅ Contenido principal centrado */}
            <div className="flex-1 px-4 pb-4 flex items-center justify-center">
                <div className="text-gray-700 text-sm text-center">
                    {Array.isArray(content) ? (
                        <ul className="list-disc list-inside space-y-1 text-left" role="list">
                            {content.map((item, index) => (
                                <li key={index} className="leading-relaxed">{item}</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="leading-relaxed">
                            {content || 'No especificado'}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InfoCard;