import React from 'react';
import { useAuth } from '../context/AuthContext';
import Header from './Header';
import Footer from './Footer';
import ProgressStepper from './ProgressStepper';
import StepInstructions from './StepInstructions';

const Layout = ({
    children,
    showStepper = true,
    title,
    showInstructions = true,
    className = '',
    hideContainer = false,
    containerClassName = '',
}) => {
    const { isAuthenticated } = useAuth();

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header title={title} />

            <main className="flex-grow">
                <div className={`max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 ${className}`}>
                    {/* Page title if provided */}
                    {title && (
                        <div className="mb-6">
                            <h2 className="text-2xl font-semibold text-gray-800 transition-opacity duration-300">
                                {title}
                            </h2>
                            <div className="h-1 w-20 bg-orange-500 mt-2"></div>
                        </div>
                    )}

                    {/* Progress stepper */}
                    {showStepper && isAuthenticated && (
                        <div className="mb-6 transition-all duration-300">
                            <ProgressStepper />
                        </div>
                    )}

                    {/* Step instructions */}
                    {showInstructions && isAuthenticated && (
                        <div className="mb-6 transition-all duration-300 transform motion-safe:animate-fadeIn">
                            <StepInstructions />
                        </div>
                    )}

                    {/* Main content */}
                    {hideContainer ? (
                        children
                    ) : (
                        <div
                            className={`bg-white shadow-sm rounded-lg overflow-hidden transition-all duration-300 ${containerClassName}`}
                        >
                            <div className="p-6">{children}</div>
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Layout;
