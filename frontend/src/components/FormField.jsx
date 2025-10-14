import React from 'react';

const FormField = ({ label, error, required = false, children }) => {
    return (
        <div>
            <label className="block text-gray-700 font-semibold mb-2 text-16">
                {label} {required && <span className="text-primary-blue-hover text-20">*</span>}
            </label>
            {children}
            {error && (
                <p className="text-red-500 text-sm mt-2">{error}</p>
            )}
        </div>
    );
};

export default FormField;