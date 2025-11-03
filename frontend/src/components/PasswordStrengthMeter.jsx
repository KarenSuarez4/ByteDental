import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...args) {
    return twMerge(clsx(args));
}

const PasswordStrengthMeter = ({
    value,
    showLabel = true,
    label = "Seguridad del código:",
    className = ""
}) => {
    const getStrength = () => {
        if (!value || value.length === 0) return "none";

        if (value.length >= 8 && /[A-Z]/.test(value) && /[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value)) {
            return "strong";
        } else if (value.length >= 6 && (/[A-Z]/.test(value) || /[0-9]/.test(value))) {
            return "medium";
        } else {
            return "weak";
        }
    };

    const strength = getStrength();

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
                return "Débil";
            case "medium":
                return "Media";
            case "strong":
                return "Fuerte";
            case "none":
                return "Sin código";
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

    if (strength === "none") return null;

    return (
        <div className={cn("flex flex-col w-full mt-2", className)}>
            {showLabel && (
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600 font-poppins">
                        {label}
                    </span>
                    <span className={cn("text-xs font-semibold font-poppins", getLabelColor())}>
                        {getLabel()}
                    </span>
                </div>
            )}
            <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                    className={cn(
                        "h-1.5 rounded-full transition-all duration-300 ease-in-out",
                        getWidth(),
                        getColor()
                    )}
                    role="progressbar"
                    aria-label={`Nivel de seguridad: ${getLabel()}`}
                    aria-valuenow={strength === "weak" ? 33 : strength === "medium" ? 66 : 100}
                    aria-valuemin="0"
                    aria-valuemax="100"
                />
            </div>
        </div>
    );
};

export default PasswordStrengthMeter;