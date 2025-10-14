import React from 'react';

const FormSection = ({ id, title, children }) => {
    return (
        <section
            id={id}
            className="bg-white rounded-[12px] shadow-sm border border-gray-200 p-4 sm:p-6"
        >
            <h2 className="text-xl sm:text-24 font-bold text-header-blue font-poppins mb-4">
                {title}
            </h2>
            <div className="space-y-4">
                {children}
            </div>
        </section>
    );
};

export default FormSection;