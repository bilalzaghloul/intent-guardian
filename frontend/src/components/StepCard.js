import React from 'react';

const StepCard = ({ title, subtitle = null, icon = null, children, className = '', highlighted = false }) => {
    return (
        <div
            className={`bg-white rounded-lg shadow-sm overflow-hidden ${
                highlighted ? 'ring-2 ring-orange-500' : ''
            } transition-all duration-200 hover:shadow-md ${className}`}
        >
            <div className="p-6">
                <div className="flex items-center mb-4">
                    {icon && (
                        <div className="mr-3 flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                                {icon}
                            </div>
                        </div>
                    )}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
                        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
                    </div>
                </div>
                <div className="mt-2">{children}</div>
            </div>
        </div>
    );
};

export default StepCard;
