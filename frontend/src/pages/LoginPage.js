import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const LoginPage = () => {
    const { isAuthenticated, login, handleOAuthRedirect, region, updateRegion } = useAuth();
    const [clientId, setClientId] = useState('');
    const [isProcessingRedirect, setIsProcessingRedirect] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // Region options
    const regionOptions = [
        { value: 'mypurecloud.com', label: 'US East (Virginia)' },
        { value: 'usw2.pure.cloud', label: 'US West (Oregon)' },
        { value: 'mypurecloud.ie', label: 'EU (Ireland)' },
        { value: 'mypurecloud.de', label: 'EU (Frankfurt)' },
        { value: 'mypurecloud.jp', label: 'Asia Pacific (Tokyo)' },
        { value: 'mypurecloud.com.au', label: 'Asia Pacific (Sydney)' },
        { value: 'cac1.pure.cloud', label: 'Canada (Central)' },
        { value: 'sae1.pure.cloud', label: 'South America (São Paulo)' },
        { value: 'euw2.pure.cloud', label: 'EU (London)' },
        { value: 'aps1.pure.cloud', label: 'Asia Pacific (Seoul)' },
        { value: 'ind1.pure.cloud', label: 'Asia Pacific (Mumbai)' },
        { value: 'mec1.pure.cloud', label: 'Middle East (Dubai)' },
    ];

    // Check for OAuth redirect or error parameters on component mount
    useEffect(() => {
        const checkForRedirect = async () => {
            // Check for OAuth redirect
            if (window.location.hash && window.location.hash.includes('access_token')) {
                setIsProcessingRedirect(true);
                try {
                    const success = await handleOAuthRedirect();
                    if (success) {
                        navigate('/welcome');
                    } else {
                        setError('Failed to process authentication. Please try again.');
                    }
                } catch (error) {
                    console.error('Error handling redirect:', error);
                    setError('An error occurred during authentication. Please try again.');
                } finally {
                    setIsProcessingRedirect(false);
                }
            }

            // Check for error parameters in URL
            const urlParams = new URLSearchParams(window.location.search);
            const errorParam = urlParams.get('error');

            if (errorParam) {
                switch (errorParam) {
                    case 'session_expired':
                        setError('Your session has expired. Please log in again.');
                        break;
                    case 'token_invalid':
                        setError('Your authentication token is invalid. Please log in again.');
                        break;
                    case 'auth_required':
                        setError('Authentication is required to access this resource.');
                        break;
                    default:
                        setError('An authentication error occurred. Please log in again.');
                }

                // Clear the error parameter from the URL
                const newUrl = window.location.pathname;
                window.history.replaceState({}, document.title, newUrl);
            }
        };

        checkForRedirect();
    }, [handleOAuthRedirect, navigate]);

    // Redirect to welcome page if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/welcome');
        }
    }, [isAuthenticated, navigate]);

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();

        if (!clientId.trim()) {
            setError('Client ID is required');
            return;
        }

        // Clear any previous errors
        setError('');

        // Initiate OAuth login
        login(clientId.trim());
    };

    // Handle region change
    const handleRegionChange = (e) => {
        updateRegion(e.target.value);
    };

    return (
        <Layout showStepper={true} showInstructions={true} hideContainer={true}>
            <div className="min-h-[60vh] flex flex-col justify-center py-6 sm:px-6 lg:px-8 motion-safe:animate-fadeIn">
                <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                    <img
                        src="/intent-guardian-logo.png"
                        alt="Intent Guardian Logo"
                        className="h-24 w-auto mx-auto motion-safe:animate-bounce-slow"
                    />
                    <h1 className="mt-4 text-center text-3xl font-extrabold text-gray-900">
                        Intent<span className="text-orange-500">Guardian</span>
                    </h1>
                    <h2 className="mt-2 text-center text-xl text-gray-600">NLU Testing Tool for Genesys Cloud</h2>
                </div>

                <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md motion-safe:animate-slideUp">
                    <div className="genesys-card bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10 border border-gray-100">
                        {isProcessingRedirect ? (
                            <div className="text-center py-8">
                                <p className="text-gray-700 mb-4 font-medium">Processing authentication...</p>
                                <div className="flex justify-center">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
                                </div>
                            </div>
                        ) : (
                            <form className="space-y-6" onSubmit={handleSubmit}>
                                {error && (
                                    <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md motion-safe:animate-fadeIn">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <svg
                                                    className="h-5 w-5 text-red-500"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <p className="text-sm">{error}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label htmlFor="region" className="block text-sm font-medium text-gray-700">
                                        Step 1: Select your Genesys Cloud Region
                                    </label>
                                    <select
                                        id="region"
                                        name="region"
                                        value={region}
                                        onChange={handleRegionChange}
                                        className="mt-2 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md transition-colors duration-200"
                                    >
                                        {regionOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="mt-6 pt-4 border-t border-gray-100">
                                    <label htmlFor="clientId" className="block text-sm font-medium text-gray-700">
                                        Step 2: Enter your OAuth Client ID
                                    </label>
                                    <div className="mt-2 relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg
                                                className="h-5 w-5 text-gray-400"
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        </div>
                                        <input
                                            id="clientId"
                                            name="clientId"
                                            type="text"
                                            value={clientId}
                                            onChange={(e) => setClientId(e.target.value)}
                                            required
                                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm transition-colors duration-200"
                                            placeholder="Enter your OAuth Client ID"
                                        />
                                    </div>
                                    <p className="mt-2 text-sm text-gray-500 bg-gray-50 p-2 rounded-md border border-gray-100">
                                        <span className="font-medium">Need help?</span> Find your OAuth Client ID in
                                        Genesys Cloud Admin &gt; Integrations &gt; OAuth
                                    </p>
                                </div>

                                <div className="pt-6 mt-6 border-t border-gray-100">
                                    <button
                                        type="submit"
                                        className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-200"
                                    >
                                        <svg
                                            className="mr-2 h-5 w-5"
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                        Step 3: Log in with Genesys Cloud
                                    </button>
                                </div>

                                <div className="mt-6 border-t border-gray-200 pt-4 text-sm text-center">
                                    <p className="text-gray-600">
                                        This application uses OAuth Implicit Grant to authenticate with Genesys Cloud.
                                        <br />
                                        Your credentials are never stored.
                                    </p>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default LoginPage;
