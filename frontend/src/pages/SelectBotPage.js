import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { flowsAPI, llmAPI } from '../services/api';
import Layout from '../components/Layout';

const SelectBotPage = () => {
    const { isAuthenticated, region } = useAuth();
    const { currentStep, goToStep, setSelectedFlow, setFlowDetails } = useApp();
    const [flows, setFlows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedFlowId, setSelectedFlowId] = useState('');
    const [selectedFlowType, setSelectedFlowType] = useState('');
    const [flowDetailsData, setFlowDetailsData] = useState(null);
    const [botDescription, setBotDescription] = useState('');
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
    const navigate = useNavigate();

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
        } else if (currentStep !== 3) {
            goToStep(3);
        }
    }, [isAuthenticated, navigate, currentStep, goToStep]);

    // Fetch flows on component mount
    useEffect(() => {
        const fetchFlows = async () => {
            try {
                setLoading(true);
                const response = await flowsAPI.getFlowsList(region);

                if (response.data.success) {
                    setFlows(response.data.data);
                    setSelectedFlowType(response.data.flowType || '');
                } else {
                    setError('Failed to fetch flows');
                }
            } catch (error) {
                console.error('Error fetching flows:', error);
                setError('Error fetching flows. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        if (isAuthenticated) {
            fetchFlows();
        }
    }, [isAuthenticated, region]);

    // Fetch flow details when a flow is selected
    useEffect(() => {
        const fetchFlowDetails = async () => {
            if (!selectedFlowId) return;

            try {
                setLoading(true);
                const response = await flowsAPI.getFlowDetails(selectedFlowId, selectedFlowType);

                if (response.data.success) {
                    setFlowDetailsData(response.data.data);
                } else {
                    setError('Failed to fetch flow details');
                }
            } catch (error) {
                console.error('Error fetching flow details:', error);
                setError('Error fetching flow details. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        if (selectedFlowId) {
            fetchFlowDetails();
        }
    }, [selectedFlowId, selectedFlowType]); // Function to generate AI description based on intents and entities
    const generateBotDescription = async (intents, entities) => {
        try {
            setIsGeneratingDescription(true);
            setBotDescription(''); // Clear existing description while generating
            console.log('[SelectBotPage] Generating description for', intents.length, 'intents');

            const response = await llmAPI.generateDescription({
                intents: intents.map((intent) => ({
                    name: intent.name,
                    description: intent.description || '',
                    entityReferences: intent.entityReferences || [],
                })),
                entities: entities.map((entity) => ({
                    name: entity.name,
                    type: entity.type || 'unknown',
                })),
            });

            console.log('[SelectBotPage] Description API response:', response.data);

            if (response.data.success) {
                setBotDescription(response.data.description);
            } else {
                console.warn('[SelectBotPage] Description generation failed:', response.data.message);
            }
        } catch (error) {
            console.error('[SelectBotPage] Error generating bot description:', error.response?.data || error.message);
            setBotDescription('Failed to generate bot description. Please try again.');
        } finally {
            setIsGeneratingDescription(false);
        }
    }; // Effect to generate bot description when flow details change
    useEffect(() => {
        // Only generate description if there are intents
        if (flowDetailsData?.intents?.length > 0 && flowDetailsData?.entities) {
            generateBotDescription(flowDetailsData.intents, flowDetailsData.entities);
        }
    }, [flowDetailsData]);

    // Handle flow selection change
    const handleFlowChange = (e) => {
        const flowId = e.target.value;
        setSelectedFlowId(flowId);
        setFlowDetailsData(null);
        setBotDescription('');
    }; // Handle continue button click
    const handleContinue = () => {
        if (!selectedFlowId || !flowDetailsData) {
            setError('Please select a bot flow');
            return;
        }

        if (!flowDetailsData.intents || flowDetailsData.intents.length === 0) {
            setError('This bot has no intents configured. Please select a different bot flow that has intents.');
            return;
        }

        // Store selected flow and details in context
        setSelectedFlow({
            id: selectedFlowId,
            type: selectedFlowType,
            name: flows.find((flow) => flow.id === selectedFlowId)?.name || 'Selected Flow',
        });

        setFlowDetails(flowDetailsData);

        // Navigate to select intents page
        navigate('/select-intents');
    };

    // Handle back button click
    const handleBack = () => {
        navigate('/welcome');
    };

    return (
        <Layout>
            <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="genesys-card slide-in">
                    <div className="genesys-card-header">
                        <h2 className="text-xl font-semibold text-gray-900">Select a Bot to Test</h2>
                        <span className="badge badge-primary">Step 2 of 6</span>
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

                        {loading ? (
                            <div className="text-center py-12">
                                <div className="spinner mx-auto"></div>
                                <p className="mt-4 text-sm text-gray-500">Loading available bots...</p>
                            </div>
                        ) : (
                            <div className="py-4">
                                <div className="mb-8">
                                    <label
                                        htmlFor="flowSelect"
                                        className="block text-sm font-medium text-gray-700 mb-2"
                                    >
                                        Select a Bot Flow
                                    </label>
                                    <div className="relative rounded-md shadow-sm">
                                        <select
                                            id="flowSelect"
                                            value={selectedFlowId}
                                            onChange={handleFlowChange}
                                            className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md transition-colors duration-200 appearance-none"
                                        >
                                            <option value="">-- Select a bot flow --</option>
                                            {flows.map((flow) => (
                                                <option key={flow.id} value={flow.id}>
                                                    {flow.name}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                            <svg
                                                className="h-5 w-5 text-gray-400"
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        </div>
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500">
                                        Choose a bot flow to test its intents and utterances
                                    </p>
                                </div>

                                {selectedFlowId && !flowDetailsData && (
                                    <div className="text-center py-8">
                                        <div className="spinner mx-auto"></div>
                                        <p className="mt-4 text-sm text-gray-500">Loading flow details...</p>
                                    </div>
                                )}

                                {selectedFlowId && flowDetailsData && (
                                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 shadow-sm">
                                        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                                            <svg
                                                className="mr-2 h-5 w-5 text-orange-500"
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                            >
                                                <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                            </svg>
                                            Flow Details
                                        </h3>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="bg-white p-4 rounded-md shadow-sm">
                                                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                                    <svg
                                                        className="mr-1 h-4 w-4 text-gray-500"
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
                                                    Bot Description
                                                </h4>
                                                <div className="space-y-4">
                                                    {/* Original Description */}
                                                    {flowDetailsData.description && (
                                                        <div>
                                                            <h5 className="text-xs font-medium text-gray-700 mb-1">
                                                                Bot Description:
                                                            </h5>
                                                            <p className="text-sm text-gray-500">
                                                                {flowDetailsData.description}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* AI Generated Description */}
                                                    <div>
                                                        <h5 className="text-xs font-medium text-gray-700 mb-1 flex items-center">
                                                            AI-Generated Description:
                                                            {isGeneratingDescription && (
                                                                <div className="ml-2 flex items-center">
                                                                    <span className="text-xs text-orange-500 mr-2">
                                                                        Analyzing bot capabilities...
                                                                    </span>
                                                                    <div className="ai-loader">
                                                                        <div className="ai-dot"></div>
                                                                        <div className="ai-dot"></div>
                                                                        <div className="ai-dot"></div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </h5>
                                                        <p className="text-sm text-gray-500">
                                                            {isGeneratingDescription
                                                                ? "Generating a smart summary of your bot's capabilities..."
                                                                : botDescription ||
                                                                  'AI-generated summary will appear here...'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-white p-4 rounded-md shadow-sm">
                                                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                                    <svg
                                                        className="mr-1 h-4 w-4 text-gray-500"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 20 20"
                                                        fill="currentColor"
                                                    >
                                                        <path d="M2 5a2 2 0 002-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                                                        <path
                                                            d="M15 7v2a4 4 0 01-4 4H9.20l-.31 1.242c-.412 1.65-1.813 2.758-3.487 2.758-1.675 0-3.075-1.108-3.487-2.758L1.8 6H0V5a1 1 0 011-1h3V3a1 1 0 011-1h2zm0 7.5a.5.5 0 100-1 .5.5 0 000 1zm5.5.5a.5.5 0 11-1 0 .5.5 0 011 0zM7 7a1 1 0 100-2 1 1 0 000 2zm5-1a1 1 0 110 2 1 1 0 010-2zM7 9a1 1 0 100-2 1 1 0 000 2zm5-1a1 1 0 110 2 1 1 0 010-2z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                    Intents
                                                </h4>
                                                <div className="mt-2 space-y-2">
                                                    <div className="flex items-center mb-3">
                                                        <span className="text-2xl font-semibold text-orange-500">
                                                            {flowDetailsData.intents
                                                                ? flowDetailsData.intents.length
                                                                : 0}
                                                        </span>
                                                        <span className="ml-2 text-sm text-gray-500">
                                                            intents available
                                                        </span>
                                                    </div>

                                                    <div className="text-sm text-gray-600">
                                                        {flowDetailsData.intents?.length === 0 ? (
                                                            <div className="text-center py-4">
                                                                <div className="flex items-center justify-center">
                                                                    <svg
                                                                        className="h-6 w-6 text-orange-500 mr-2"
                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                        fill="none"
                                                                        viewBox="0 0 24 24"
                                                                        stroke="currentColor"
                                                                    >
                                                                        <path
                                                                            strokeLinecap="round"
                                                                            strokeLinejoin="round"
                                                                            strokeWidth={2}
                                                                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                                                        />
                                                                    </svg>
                                                                    <span className="text-orange-600 font-medium">
                                                                        No intents found
                                                                    </span>
                                                                </div>
                                                                <p className="mt-2 text-gray-500">
                                                                    This bot has no intents configured. Please select a
                                                                    different bot that has intents to test.
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-1">
                                                                <h5 className="font-medium text-gray-700">
                                                                    Bot Intents:
                                                                </h5>
                                                                <div className="mt-2 max-h-48 overflow-y-auto">
                                                                    <table className="min-w-full border-collapse">
                                                                        <thead className="bg-gray-50 sticky top-0">
                                                                            <tr>
                                                                                <th className="text-xs font-medium text-gray-500 px-2 py-1.5 text-left">
                                                                                    Intent
                                                                                </th>
                                                                                <th className="text-xs font-medium text-gray-500 px-2 py-1.5 text-right">
                                                                                    Entities
                                                                                </th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="bg-white divide-y divide-gray-100">
                                                                            {flowDetailsData.intents.map((intent) => (
                                                                                <tr
                                                                                    key={intent.name}
                                                                                    className="hover:bg-gray-50"
                                                                                >
                                                                                    <td className="whitespace-nowrap px-2 py-1.5 text-sm text-gray-900">
                                                                                        {intent.name}
                                                                                    </td>
                                                                                    <td className="whitespace-nowrap px-2 py-1.5 text-xs text-gray-500 text-right">
                                                                                        {intent.entityReferences
                                                                                            ?.length ? (
                                                                                            <span>
                                                                                                {
                                                                                                    intent
                                                                                                        .entityReferences
                                                                                                        .length
                                                                                                }{' '}
                                                                                                entities
                                                                                            </span>
                                                                                        ) : (
                                                                                            <span>No entities</span>
                                                                                        )}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-white p-4 rounded-md shadow-sm">
                                                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                                    <svg
                                                        className="mr-1 h-4 w-4 text-gray-500"
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
                                                    Languages
                                                </h4>
                                                <div className="mt-1 flex flex-wrap gap-1">
                                                    <span className="badge badge-primary">
                                                        {flowDetailsData.language?.toLowerCase() || 'en-us'}
                                                    </span>
                                                    {flowDetailsData.supportedLanguages &&
                                                        [
                                                            ...new Set(
                                                                flowDetailsData.supportedLanguages
                                                                    .filter(
                                                                        (lang) =>
                                                                            lang?.toLowerCase() !==
                                                                            flowDetailsData.language?.toLowerCase()
                                                                    )
                                                                    .map((lang) => lang?.toLowerCase())
                                                                    .filter(Boolean)
                                                            ),
                                                        ].map((lang) => (
                                                            <span key={lang} className="badge badge-primary">
                                                                {lang}
                                                            </span>
                                                        ))}
                                                </div>
                                            </div>

                                            <div className="bg-white p-4 rounded-md shadow-sm">
                                                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                                    <svg
                                                        className="mr-1 h-4 w-4 text-gray-500"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 20 20"
                                                        fill="currentColor"
                                                    >
                                                        <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                                    </svg>
                                                    Entities
                                                </h4>
                                                <div className="mt-1">
                                                    {flowDetailsData.entities && flowDetailsData.entities.length > 0 ? (
                                                        <ul className="text-sm text-gray-500 space-y-1">
                                                            {flowDetailsData.entities.slice(0, 5).map((entity) => (
                                                                <li key={entity.name} className="flex items-center">
                                                                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500 mr-2"></span>
                                                                    {entity.name}{' '}
                                                                    <span className="text-xs text-gray-400 ml-1">
                                                                        ({entity.type})
                                                                    </span>
                                                                </li>
                                                            ))}
                                                            {flowDetailsData.entities.length > 5 && (
                                                                <li className="text-xs text-gray-400 italic">
                                                                    ...and {flowDetailsData.entities.length - 5} more
                                                                </li>
                                                            )}
                                                        </ul>
                                                    ) : (
                                                        <p className="text-sm text-gray-500">No entities defined</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
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
                        <button
                            type="button"
                            onClick={handleContinue}
                            disabled={!selectedFlowId || !flowDetailsData}
                            className={
                                !selectedFlowId || !flowDetailsData
                                    ? 'btn-primary opacity-50 cursor-not-allowed'
                                    : 'btn-primary'
                            }
                        >
                            Continue
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

export default SelectBotPage;
