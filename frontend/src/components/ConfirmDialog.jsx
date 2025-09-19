import React from "react";
import Button from "./Button";

const ConfirmDialog = ({ open, title, message, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-header-blue bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-[20px] shadow-lg p-8 w-full max-w-[400px] text-center font-poppins">
        <h2 className="text-header-blue text-24 font-bold mb-4">{title}</h2>
        <p className="text-gray-700 text-16 mb-8">{message}</p>
        <div className="flex justify-center gap-6">
          <Button
            className="bg-primary-blue hover:bg-primary-blue-hover text-white px-6 py-2 rounded-[40px] font-bold text-18"
            onClick={onConfirm}
          >
            Aceptar
          </Button>
          <Button
            className="bg-header-blue hover:bg-header-blue-hover text-white px-6 py-2 rounded-[40px] font-bold text-18"
            onClick={onCancel}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;