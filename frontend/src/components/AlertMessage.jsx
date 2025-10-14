import React from 'react';
import { clsx } from 'clsx';
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimesCircle } from 'react-icons/fa';

const AlertMessage = ({
    type = 'error',
    message,
    className = '',
    showIcon = true,
    customIcon = null
}) => {
    const styles = {
        error: {
            container: 'bg-red-100 border-red-400 text-red-700',
            icon: <FaTimesCircle className="w-5 h-5 text-red-600" aria-hidden="true" />
        },
        success: {
            container: 'bg-green-100 border-green-400 text-green-700',
            icon: <FaCheckCircle className="w-5 h-5 text-green-600" aria-hidden="true" />
        },
        info: {
            container: 'bg-primary-blue/5 border-primary-blue/30 text-header-blue',
            icon: <FaInfoCircle className="w-5 h-5 text-primary-blue" aria-hidden="true" />
        },
        warning: {
            container: 'bg-yellow-100 border-yellow-400 text-yellow-700',
            icon: <FaExclamationTriangle className="w-5 h-5 text-yellow-600" aria-hidden="true" />
        }
    };

    if (!message) return null;

    const currentStyle = styles[type] || styles.error;
    const iconToShow = customIcon || (showIcon ? currentStyle.icon : null);

    return (
        <div className={clsx(
            'mb-4 w-full max-w-[800px] p-3 border rounded',
            currentStyle.container,
            className
        )}>
            <div className={clsx(
                'flex items-start gap-3',
                iconToShow ? 'justify-start' : 'justify-center'
            )}>
                {iconToShow && (
                    <div className="flex-shrink-0 mt-0.5">
                        {iconToShow}
                    </div>
                )}
                <div className={clsx(
                    'font-poppins text-center' 
                )}>
                    {typeof message === 'string' ? (
                        <span>{message}</span>
                    ) : (
                        message
                    )}
                </div>
            </div>
        </div>
    );
};

export default AlertMessage;