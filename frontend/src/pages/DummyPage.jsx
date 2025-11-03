import React from 'react';

const DummyPage = ({ title }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50">
      <h1 className="text-header-blue text-46 font-bold font-poppins">{title}</h1>
      <p className="mt-4 text-gray-700">Esta es la página de {title.toLowerCase()}.</p>
    </div>
  );
};

export default DummyPage;
