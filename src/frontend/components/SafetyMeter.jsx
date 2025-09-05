import React from "react";
import {clcx} from 'clsx';
import {twMerge} from 'tailwind-merge';

function cn(...args) {
    return twMerge(clcx(args));
}

const SafetyMeter = ({ strength }) => {
    const getStrengthColor = () => {
        switch (strength) {
            case 'weak':
                return 'bg-#f74537';
            case 'medium':
                return 'bg-#fbab34';
            case 'strong':
                return 'bg-#3bbba1';
            default:
                return 'bg-gray-300';
        }
    }

    return (
        <div className={`h-2 rounded ${getStrengthColor()}`} />
    );
};

export default SafetyMeter;