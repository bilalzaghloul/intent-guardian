import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import Layout from '../components/Layout';

const SelectIntentsPage = () => {
    const { isAuthenticated } = useAuth();
    const {
        currentStep,
        goToStep,
        selectedFlow,
        flowDetails,
        selectedIntents,
        setSelectedIntents,
        selectedLanguages,
        setSelectedLanguages,
    } = useApp();
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // Redirect to login if not authenticated or if no flow is selected
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
        } else if (!selectedFlow || !flowDetails) {
            navigate('/select-bot');
        } else if (currentStep !== 4) {
            goToStep(4);
        }
    }, [isAuthenticated, navigate, selectedFlow, flowDetails, currentStep, goToStep]);

    // Handle intent selection change
    const handleIntentChange = (intentName) => {
        if (selectedIntents.includes(intentName)) {
            setSelectedIntents(selectedIntents.filter((name) => name !== intentName));
        } else {
            setSelectedIntents([...selectedIntents, intentName]);
        }
    };

    // Handle select all intents
    const handleSelectAllIntents = () => {
        const allIntentNames = flowDetails.intents.map((intent) => intent.name);
        setSelectedIntents(allIntentNames);
    };

    // Handle clear all intents
    const handleClearIntents = () => {
        setSelectedIntents([]);
    };

    // Handle language selection change
    const handleLanguageChange = (language) => {
        // For radio buttons, we just set the selected language directly (no array)
        setSelectedLanguages([language]);
    };

    // Handle continue button click
    const handleContinue = () => {
        if (selectedIntents.length === 0) {
            setError('Please select at least one intent');
            return;
        }

        if (selectedLanguages.length === 0) {
            setError('Please select a language');
            return;
        }

        // Navigate to generate tests page
        navigate('/generate-tests');
    };

    // Handle back button click
    const handleBack = () => {
        navigate('/select-bot');
    };

    return (
        <Layout>
            <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="genesys-card slide-in">
                    <div className="genesys-card-header">
                        <h2 className="text-xl font-semibold text-gray-900">
                            Select Intents & Languages for {selectedFlow?.name}
                        </h2>
                        <span className="badge badge-primary">Step 3 of 6</span>
                    </div>

                    <div className="genesys-card-body">
                        {error && (
                            <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md">
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

                        <div className="space-y-8">
                            {/* Intents selection */}
                            <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                                        <svg
                                            className="mr-2 h-5 w-5 text-orange-500"
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                        >
                                            <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                                            <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                                        </svg>
                                        Intents
                                    </h3>
                                    <div className="space-x-2">
                                        <button
                                            type="button"
                                            onClick={handleSelectAllIntents}
                                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-200"
                                        >
                                            <svg
                                                className="mr-1 h-4 w-4 text-gray-500"
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                            Select All
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleClearIntents}
                                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-200"
                                        >
                                            <svg
                                                className="mr-1 h-4 w-4 text-gray-500"
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                            Clear All
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-md max-h-60 overflow-y-auto border border-gray-100">
                                    <fieldset>
                                        <legend className="sr-only">Intents</legend>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {flowDetails?.intents.map((intent) => (
                                                <div
                                                    key={intent.name}
                                                    className="relative flex items-start p-2 hover:bg-gray-100 rounded-md transition-colors duration-150"
                                                >
                                                    <div className="flex items-center h-5">
                                                        <input
                                                            id={`intent-${intent.name}`}
                                                            name={`intent-${intent.name}`}
                                                            type="checkbox"
                                                            checked={selectedIntents.includes(intent.name)}
                                                            onChange={() => handleIntentChange(intent.name)}
                                                            className="focus:ring-orange-500 h-4 w-4 text-orange-600 border-gray-300 rounded transition-colors duration-200"
                                                        />
                                                    </div>
                                                    <div className="ml-3 text-sm">
                                                        <label
                                                            htmlFor={`intent-${intent.name}`}
                                                            className="font-medium text-gray-700 cursor-pointer"
                                                        >
                                                            {intent.name}
                                                        </label>
                                                        {intent.description && (
                                                            <p className="text-gray-500 text-xs mt-0.5">
                                                                {intent.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </fieldset>
                                </div>

                                <div className="mt-3 flex items-center text-sm text-gray-500">
                                    <svg
                                        className="mr-1.5 h-4 w-4 text-orange-500"
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    <span>
                                        {selectedIntents.length} of {flowDetails?.intents.length} intents selected
                                    </span>
                                </div>
                            </div>

                            {/* Languages selection */}
                            <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
                                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                                    <svg
                                        className="mr-2 h-5 w-5 text-orange-500"
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.20l-.31 1.242c-.412 1.65-1.813 2.758-3.487 2.758-1.675 0-3.075-1.108-3.487-2.758L1.8 6H0V5a1 1 0 011-1h3V3a1 1 0 011-1h2zm0 7.5a.5.5 0 100-1 .5.5 0 000 1zm5.5.5a.5.5 0 11-1 0 .5.5 0 011 0zM7 7a1 1 0 100-2 1 1 0 000 2zm5-1a1 1 0 110 2 1 1 0 010-2zM7 9a1 1 0 100-2 1 1 0 000 2zm5-1a1 1 0 110 2 1 1 0 010-2z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    Select Testing Language
                                </h3>

                                <div className="bg-gray-50 p-4 rounded-md border border-gray-100">
                                    <fieldset>
                                        <legend className="text-sm text-gray-600 mb-3">
                                            Select one language to test bot utterances:
                                        </legend>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                            {(flowDetails?.supportedLanguages || [flowDetails?.language]).map(
                                                (language) => (
                                                    <div
                                                        key={language}
                                                        className={`relative flex items-center p-3 rounded-md border ${
                                                            selectedLanguages.includes(language)
                                                                ? 'bg-orange-50 border-orange-400 ring-2 ring-orange-400'
                                                                : 'bg-white border-gray-200 hover:border-orange-300'
                                                        } transition-all duration-200`}
                                                    >
                                                        <div className="flex items-center h-5">
                                                            <input
                                                                id={`language-${language}`}
                                                                name="language-selection"
                                                                type="radio"
                                                                checked={selectedLanguages.includes(language)}
                                                                onChange={() => handleLanguageChange(language)}
                                                                className="focus:ring-orange-500 h-4 w-4 text-orange-600 border-gray-300 transition-colors duration-200"
                                                            />
                                                        </div>
                                                        <div className="ml-2">
                                                            <label
                                                                htmlFor={`language-${language}`}
                                                                className={`font-medium cursor-pointer ${
                                                                    selectedLanguages.includes(language)
                                                                        ? 'text-orange-700'
                                                                        : 'text-gray-700'
                                                                }`}
                                                            >
                                                                {language}
                                                            </label>
                                                        </div>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </fieldset>
                                </div>

                                <div className="mt-3 flex items-center text-sm text-gray-500">
                                    <svg
                                        className="mr-1.5 h-4 w-4 text-orange-500"
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    <span>
                                        {selectedLanguages.length > 0
                                            ? `Testing in ${selectedLanguages[0]}`
                                            : 'Please select a language'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="genesys-card-footer flex justify-between">
                        <button type="button" onClick={handleBack} className="btn-secondary">
                            <svg
                                className="mr-1 h-4 w-4"
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
                            Back
                        </button>
                        <button type="button" onClick={handleContinue} className="btn-primary">
                            Generate Test Utterances
                            <svg
                                className="ml-1 h-4 w-4"
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
                        </button>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default SelectIntentsPage;
