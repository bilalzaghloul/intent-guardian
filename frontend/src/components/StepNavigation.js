import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const StepNavigation = ({
    nextEnabled = true,
    nextLabel = 'Continue',
    prevLabel = 'Back',
    nextAction = null,
    prevAction = null,
    loadingNext = false,
    loadingPrev = false,
}) => {
    const navigate = useNavigate();
    const { currentStep, nextStep, prevStep } = useApp();

    // Map steps to routes
    const stepRoutes = {
        1: '/login',
        2: '/welcome',
        3: '/select-bot',
        4: '/select-intents',
        5: '/generate-tests',
        6: '/run-tests',
        7: '/results',
    };

    const handleNext = () => {
        if (nextAction) {
            nextAction();
        } else {
            nextStep();
            navigate(stepRoutes[currentStep + 1]);
        }
    };

    const handlePrevious = () => {
        if (prevAction) {
            prevAction();
        } else {
            prevStep();
            navigate(stepRoutes[currentStep - 1]);
        }
    };

    return (
        <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-200">
            <div>
                {currentStep > 1 && (
                    <button
                        onClick={handlePrevious}
                        disabled={loadingPrev}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-200"
                    >
                        {loadingPrev ? (
                            <svg
                                className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                ></circle>
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                            </svg>
                        ) : (
                            <svg
                                className="-ml-1 mr-1 h-5 w-5"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        )}
                        {prevLabel}
                    </button>
                )}
            </div>
            <div>
                {currentStep < 7 && (
                    <button
                        onClick={handleNext}
                        disabled={!nextEnabled || loadingNext}
                        className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 ${
                            nextEnabled && !loadingNext
                                ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500'
                                : 'bg-gray-400 cursor-not-allowed'
                        }`}
                    >
                        {loadingNext ? (
                            <>
                                <svg
                                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    ></circle>
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                </svg>
                                Processing...
                            </>
                        ) : (
                            <>
                                {nextLabel}
                                <svg
                                    className="-mr-1 ml-1 h-5 w-5"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

export default StepNavigation;
