import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...args) {
  return twMerge(clsx(args));
}

const SafetyMeter = ({ strength }) => {
  const getWidth = () => {
    switch (strength) {
      case "weak":
        return "w-1/3";
      case "medium":
        return "w-2/3";
      case "strong":
        return "w-full";
      default:
        return "w-0";
    }
  };

  const getColor = () => {
    switch (strength) {
      case "weak":
        return "bg-weak";
      case "medium":
        return "bg-medium";
      case "strong":
        return "bg-strong";
      default:
        return "bg-transparent";
    }
  };

  const getLabel = () => {
    switch (strength) {
      case "weak":
        return "Baja";
      case "medium":
        return "Media";
      case "strong":
        return "Alta";
      case "none":
        return "Sin contraseña";
      default:
        return "";
    }
  };

  const getLabelColor = () => {
    switch (strength) {
      case "weak":
        return "text-weak";
      case "medium":
        return "text-medium";
      case "strong":
        return "text-strong";
      default:
        return "text-gray-500";
    }
  };

  return (
    <div className="flex flex-col items-start w-full mt-2">
      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300 ease-in-out",
            getWidth(),
            getColor()
          )}
        />
      </div>
      <p className={cn("text-xs mt-1 font-poppins font-semibold", getLabelColor())}>
        {getLabel()}
      </p>
    </div>
  );
};

export default SafetyMeter;