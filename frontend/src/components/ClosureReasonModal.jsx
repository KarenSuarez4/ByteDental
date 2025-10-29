import React from "react";
import { FaExclamationTriangle } from "react-icons/fa";
import Button from "./Button";

const ClosureReasonModal = ({
  isOpen,
  onClose,
  onSubmit,
  loading,
  error,
  success,
  closureReason,
  setClosureReason,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/10 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg relative">
        {/* Header con icono y fondo azul */}
        <div className="flex items-center justify-between px-6 py-4 rounded-t-xl bg-gradient-to-r from-primary-blue to-header-blue">
          <div className="flex items-center gap-3">
            <FaExclamationTriangle className="text-white text-2xl" />
            <h2 className="text-white text-2xl font-bold font-poppins">
              Cerrar Historia Clínica
            </h2>
          </div>
          <button
            className="text-white text-2xl hover:text-gray-200"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            &times;
          </button>
        </div>
        {/* Formulario */}
        <form
          className="px-6 py-6"
          onSubmit={e => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <label className="block text-header-blue font-semibold mb-2" htmlFor="closureReason">
            Motivo de cierre <span className="text-red-500">*</span>
          </label>
          <textarea
            id="closureReason"
            value={closureReason}
            onChange={e => setClosureReason(e.target.value)}
            placeholder="Describe el motivo de cierre..."
            required
            className="w-full border border-gray-300 rounded-[20px] p-3 mb-4 resize-none font-poppins text-16 shadow-sm"
            rows={4}
            maxLength={500}
          />
          <div className="text-gray-400 text-right text-xs mb-4">
            {closureReason.length}/500 caracteres
          </div>
          <div className="flex justify-end gap-3 mt-2">
            <Button
              type="button"
              onClick={onClose}
              className="bg-gray-300 hover:bg-gray-400 text-header-blue font-bold px-6 py-2 rounded-[40px] min-w-[160px]"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-primary-blue hover:bg-header-blue text-white font-bold px-6 py-2 rounded-[40px] min-w-[160px] flex items-center justify-center"
              loading={loading}
              disabled={loading}
            >
              Guardar cierre
            </Button>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          {success && <p className="text-green-500 text-sm mt-2">{success}</p>}
        </form>
      </div>
    </div>
  );
};

export default ClosureReasonModal;