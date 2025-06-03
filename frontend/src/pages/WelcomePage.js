import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import Layout from '../components/Layout';

const WelcomePage = () => {
    const { user, isAuthenticated, logout } = useAuth();
    const { currentStep, goToStep } = useApp();
    const navigate = useNavigate();

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
        } else if (currentStep !== 2) {
            goToStep(2);
        }
    }, [isAuthenticated, navigate, currentStep, goToStep]);

    // Handle select bot button click
    const handleSelectBot = () => {
        navigate('/select-bot');
    };

    // Handle resume session button click (to be implemented)
    const handleResumeSession = () => {
        navigate('/session-history');
    };

    return (
        <Layout>
            <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="genesys-card slide-in">
                    <div className="genesys-card-header">
                        <h2 className="text-xl font-semibold text-gray-900">
                            Welcome to Intent<span className="text-orange-500">Guardian</span>
                        </h2>
                        <span className="badge badge-primary">{user?.name || 'Genesys Cloud User'}</span>
                    </div>

                    <div className="genesys-card-body">
                        <div className="text-center py-6">
                            <div className="bg-orange-50 rounded-full p-4 inline-block mb-4">
                                <svg
                                    className="h-12 w-12 text-orange-500"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            </div>

                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Successfully authenticated with Genesys Cloud
                            </h3>

                            <p className="text-gray-600 max-w-md mx-auto mb-8">
                                Intent<span className="text-orange-500">Guardian</span> helps you test and validate your
                                NLU models by analyzing utterances against your Genesys bots. Choose an option below to
                                continue.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                                <div
                                    onClick={handleSelectBot}
                                    className="genesys-card hover:cursor-pointer hover:border-orange-300 border border-transparent transition-all duration-200"
                                >
                                    <div className="p-6">
                                        <div className="flex items-center justify-center h-12 w-12 rounded-md bg-orange-500 text-white mx-auto">
                                            <svg
                                                className="h-6 w-6"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="2"
                                                    d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                                                />
                                            </svg>
                                        </div>
                                        <h3 className="mt-4 text-lg font-medium text-gray-900">New Test Session</h3>
                                        <p className="mt-2 text-sm text-gray-500">
                                            Start a new test session by selecting a bot and intents to test against.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={handleSelectBot}
                                            className="mt-4 btn-primary w-full"
                                        >
                                            Select Bot
                                        </button>
                                    </div>
                                </div>

                                <div
                                    onClick={handleResumeSession}
                                    className="genesys-card hover:cursor-pointer hover:border-orange-300 border border-transparent transition-all duration-200"
                                >
                                    <div className="p-6">
                                        <div className="flex items-center justify-center h-12 w-12 rounded-md bg-gray-500 text-white mx-auto">
                                            <svg
                                                className="h-6 w-6"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="2"
                                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                        </div>
                                        <h3 className="mt-4 text-lg font-medium text-gray-900">Resume Session</h3>
                                        <p className="mt-2 text-sm text-gray-500">
                                            Continue from a previous test session or view past test results.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={handleResumeSession}
                                            className="mt-4 btn-secondary w-full"
                                        >
                                            View History
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default WelcomePage;
