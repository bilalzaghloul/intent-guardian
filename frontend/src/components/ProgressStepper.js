import React from 'react';
import { useApp } from '../context/AppContext';

const ProgressStepper = () => {
    const { currentStep } = useApp();

    const steps = [
        { id: 1, name: 'Login', icon: 'login' },
        { id: 2, name: 'Welcome', icon: 'home' },
        { id: 3, name: 'Select Bot', icon: 'robot' },
        { id: 4, name: 'Select Intents', icon: 'list' },
        { id: 5, name: 'Generate Tests', icon: 'generate' },
        { id: 6, name: 'Run Tests', icon: 'play' },
        { id: 7, name: 'Results', icon: 'chart' },
    ];

    // Function to render the appropriate icon for each step
    const renderIcon = (icon) => {
        switch (icon) {
            case 'login':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path
                            fillRule="evenodd"
                            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                            clipRule="evenodd"
                        />
                    </svg>
                );
            case 'home':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    </svg>
                );
            case 'robot':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path
                            fillRule="evenodd"
                            d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                            clipRule="evenodd"
                        />
                    </svg>
                );
            case 'list':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                        <path
                            fillRule="evenodd"
                            d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                            clipRule="evenodd"
                        />
                    </svg>
                );
            case 'generate':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                            clipRule="evenodd"
                        />
                    </svg>
                );
            case 'play':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                            clipRule="evenodd"
                        />
                    </svg>
                );
            case 'chart':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                        <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                    </svg>
                );
            default:
                return null;
        }
    };

    return (
        <div className="px-4 sm:px-6 lg:px-8 mb-8">
            <div className="overflow-x-auto py-4 bg-white rounded-xl shadow-sm">
                <div className="relative">
                    {/* Progress bar underneath */}
                    <div className="hidden sm:block absolute top-1/2 left-0 w-full transform -translate-y-1/2 px-10">
                        <div className="h-1 bg-gray-200 rounded-full">
                            <div
                                className="h-1 bg-orange-500 rounded-full transition-all duration-500 ease-in-out"
                                style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Steps on top */}
                    <div className="flex justify-between items-center relative px-4 sm:px-8">
                        {steps.map((step, index) => (
                            <div key={step.id} className="flex flex-col items-center relative z-10">
                                {/* Step circle */}
                                <div
                                    className={`flex items-center justify-center h-12 w-12 rounded-full border-2 
                  ${
                      currentStep > step.id
                          ? 'bg-orange-500 border-orange-500 text-white'
                          : currentStep === step.id
                          ? 'bg-white border-orange-500 text-orange-500 ring-4 ring-orange-100'
                          : 'bg-white border-gray-300 text-gray-400'
                  } transition-all duration-300 ease-in-out transform ${currentStep === step.id ? 'scale-110' : ''}`}
                                >
                                    {currentStep > step.id ? (
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-6 w-6"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            strokeWidth={2}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        renderIcon(step.icon)
                                    )}
                                </div>

                                {/* Step name with tooltip */}
                                <div className="relative mt-3">
                                    <div
                                        className={`text-sm font-medium text-center ${
                                            currentStep === step.id
                                                ? 'text-orange-600 font-bold'
                                                : currentStep > step.id
                                                ? 'text-gray-700'
                                                : 'text-gray-400'
                                        }`}
                                    >
                                        {step.name}
                                    </div>

                                    {/* Current step indicator */}
                                    {currentStep === step.id && (
                                        <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
                                            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProgressStepper;
