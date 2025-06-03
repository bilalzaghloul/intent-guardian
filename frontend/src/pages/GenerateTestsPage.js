import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { llmAPI } from '../services/api';
import Layout from '../components/Layout';
import '../styles/genesys.css';

const GenerateTestsPage = () => {
    const { isAuthenticated } = useAuth();
    const {
        currentStep,
        goToStep,
        selectedFlow,
        flowDetails,
        selectedIntents,
        selectedLanguages,
        testUtterances,
        setTestUtterances,
    } = useApp();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentLanguage, setCurrentLanguage] = useState('');
    const [editableUtterances, setEditableUtterances] = useState([]);
    const navigate = useNavigate();

    // Redirect to login if not authenticated or if no flow/intents/languages are selected
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
        } else if (!selectedFlow || !flowDetails) {
            navigate('/select-bot');
        } else if (selectedIntents.length === 0 || selectedLanguages.length === 0) {
            navigate('/select-intents');
        } else if (currentStep !== 5) {
            goToStep(5);
        }

        // Set default current language if not set
        if (selectedLanguages.length > 0 && !currentLanguage) {
            setCurrentLanguage(selectedLanguages[0]);
        }

        // Check if we're coming back from the Run Tests page and need to restore data
        const prevPathname = sessionStorage.getItem('prevPathname');
        if (prevPathname === '/run-tests') {
            console.log('[GenerateTests] Detected navigation back from Run Tests page');

            // Check if we need to restore test utterances
            try {
                const backupData = sessionStorage.getItem('intentGuardianUtterancesBackup');
                if (backupData) {
                    const backup = JSON.parse(backupData);
                    const now = new Date().getTime();

                    // Only use backup if it's less than 10 minutes old
                    if (now - backup.timestamp < 10 * 60 * 1000) {
                        console.log(`[GenerateTests] Found recent utterances backup for ${backup.language}`);

                        // Only set if we don't already have utterances for this language
                        if (!testUtterances[backup.language] || testUtterances[backup.language].length === 0) {
                            console.log('[GenerateTests] Restoring utterances from backup');
                            setTestUtterances((prev) => {
                                const updated = { ...prev };
                                updated[backup.language] = backup.data;
                                return updated;
                            });

                            setCurrentLanguage(backup.language);
                        }
                    }
                }
            } catch (error) {
                console.error('Error restoring utterances backup:', error);
            }
        }

        // Store current pathname for navigation tracking
        sessionStorage.setItem('prevPathname', '/generate-tests');
    }, [
        isAuthenticated,
        navigate,
        selectedFlow,
        flowDetails,
        selectedIntents,
        selectedLanguages,
        currentLanguage,
        currentStep,
        goToStep,
        testUtterances,
    ]);

    // Load utterances when language changes or component mounts
    useEffect(() => {
        if (!currentLanguage) return;

        console.log(`[GenerateTests] Loading utterances for language: ${currentLanguage}`);
        if (testUtterances[currentLanguage]) {
            // Create a deep copy to avoid reference issues
            setEditableUtterances(JSON.parse(JSON.stringify(testUtterances[currentLanguage])));
        } else {
            setEditableUtterances([]);
        }
    }, [currentLanguage, testUtterances]);

    // Save utterances when component unmounts or language changes
    useEffect(() => {
        return () => {
            // Clear any pending auto-save timeout
            if (window.saveUtterancesTimeout) {
                clearTimeout(window.saveUtterancesTimeout);
            }

            // Only save on unmount if we have unsaved changes
            if (
                currentLanguage &&
                editableUtterances.length > 0 &&
                testUtterances[currentLanguage] !== editableUtterances
            ) {
                saveUtterancesToContext();
            }
        };
    }, [currentLanguage]);

    // Generate test utterances
    const generateUtterances = async (requestMore = false) => {
        if (!currentLanguage) {
            setError('Please select a language');
            return;
        }

        try {
            setLoading(true);
            setError('');

            // Prepare data for LLM API
            const intentsData = selectedIntents.map((intentName) => {
                const intent = flowDetails.intents.find((i) => i.name === intentName);
                const intentSlots = {};

                // Find entities used by this intent
                if (intent && intent.entityReferences) {
                    // Get entities that are referenced by this intent
                    intent.entityReferences.forEach((entityName) => {
                        const entity = flowDetails.entities.find((e) => e.name === entityName);
                        if (entity && entity.values && entity.values.length > 0) {
                            // Use the actual values from the entity
                            intentSlots[entity.name] = entity.values;
                        }
                    });
                }

                return {
                    name: intentName,
                    slots: intentSlots,
                };
            });

            let response;

            if (requestMore && testUtterances[currentLanguage] && testUtterances[currentLanguage].length > 0) {
                // If requesting more utterances, include the existing ones for context
                console.log('[GenerateTests] Requesting more utterances');

                // Get the existing utterances for this language
                const existingUtterances = testUtterances[currentLanguage];

                // Call LLM API to generate more test utterances
                response = await llmAPI.generateMoreTests({
                    intents: intentsData,
                    language: currentLanguage,
                    existingUtterances: existingUtterances,
                    // Include the previous LLM response in the messages array as required
                    messages: [
                        {
                            role: 'user',
                            content:
                                'You are a conversational AI testing assistant. I will provide you with a list of intents, some of which include slots. Your task is to generate 10 realistic user utterances per intent. The output should be a flat list, where each utterance is labeled with its expected intent and, if applicable, the expected slot(s) and their values.\n\nSome utterances should include slot values naturally, while others should not. Not every utterance is required to mention a slot, even if one is defined. Slot values should be incorporated in a conversational way, like a real customer would speak.\n\n✳️ Mix of Realism and Errors:\n- The utterances should be a **balanced mix** of:\n  - **Correctly written utterances** (natural, grammatically fine)\n  - **Slightly imperfect ones** (informal tone, mild typos, grammar mistakes, or missing punctuation)\n- Do not make all utterances sloppy or typo-heavy; around **40–50%** can have informal issues or typos.\n\n🧾 Output Format:\nReturn a **JSON array of objects**, no explanations, no markdown:\nEach object must have:\n- `utterance`: the user input string\n- `expected_intent`: the name of the intent\n- `expected_slots`: an object showing slot-value pairs (or an empty object if no slots apply)\n\nExample structure:\n{\n  "utterance": "i wanna open a checking accnt",\n  "expected_intent": "account_opening",\n  "expected_slots": {\n    "account_type": "checking"\n  }\n}\n\n---\n\n### Example Input:\n\nIntents:\n1. account_opening\n   - Slot: account_type\n     - Type: list\n     - Values: ["saving", "checking"]\n\n2. activate_card\n   - No slots\n\n3. block_card\n   - No slots\n\nNow generate 10 varied utterances per intent, as described above, mixing formal and informal phrasing.',
                        },
                        {
                            role: 'assistant',
                            content: JSON.stringify(existingUtterances),
                        },
                        {
                            role: 'user',
                            content:
                                "Generate the next batch, ensuring they are unique and haven't been generated previosuly.",
                        },
                    ],
                });
            } else {
                // Call LLM API to generate initial test utterances
                response = await llmAPI.generateTests({
                    intents: intentsData,
                    language: currentLanguage,
                });
            }

            if (response.data.success) {
                // Update test utterances in context
                const newUtterances = response.data.data;

                if (requestMore && testUtterances[currentLanguage]) {
                    // If requesting more, combine with existing utterances
                    const existingUtterances = testUtterances[currentLanguage];
                    const combinedUtterances = [...existingUtterances, ...newUtterances];

                    // Create a copy for editing
                    setEditableUtterances(JSON.parse(JSON.stringify(combinedUtterances)));

                    // Store in context
                    setTestUtterances((prevUtterances) => {
                        // Update the current language with combined utterances
                        const updatedUtterances = { ...prevUtterances };
                        updatedUtterances[currentLanguage] = combinedUtterances;
                        return updatedUtterances;
                    });
                } else {
                    // Create a copy for editing
                    setEditableUtterances(JSON.parse(JSON.stringify(newUtterances)));

                    // Store in context
                    setTestUtterances((prevUtterances) => {
                        // Create a new map with the current language
                        const updatedUtterances = { ...prevUtterances };
                        updatedUtterances[currentLanguage] = newUtterances;
                        return updatedUtterances;
                    });
                }
            } else {
                setError('Failed to generate test utterances');
            }
        } catch (error) {
            console.error('Error generating test utterances:', error);
            setError('Error generating test utterances. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Generate more test utterances
    const generateMoreUtterances = () => {
        generateUtterances(true);
    };

    // Function to verify that utterances are properly saved in the context
    const verifyUtterancesPersistence = () => {
        if (currentLanguage && editableUtterances.length > 0) {
            console.log('[GenerateTests] Verifying utterances persistence...');

            // Verify the utterances in the context match what we have in our editable state
            if (
                !testUtterances[currentLanguage] ||
                JSON.stringify(testUtterances[currentLanguage]) !== JSON.stringify(editableUtterances)
            ) {
                console.log('[GenerateTests] Utterances mismatch detected, saving to context');
                saveUtterancesToContext();
                return false;
            }
            return true;
        }
        return true;
    };

    // Handle language change
    const handleLanguageChange = (e) => {
        const newLanguage = e.target.value;

        // Don't do anything if the language hasn't changed
        if (newLanguage === currentLanguage) {
            return;
        }

        // Save current language utterances if they've been modified
        if (currentLanguage && editableUtterances.length > 0) {
            const currentUtterances = testUtterances[currentLanguage];
            const hasChanges = JSON.stringify(editableUtterances) !== JSON.stringify(currentUtterances);

            if (hasChanges) {
                console.log(`[GenerateTests] Saving current language utterances before switch: ${currentLanguage}`);
                // Immediately update context to prevent race conditions
                setTestUtterances((prev) => ({
                    ...prev,
                    [currentLanguage]: editableUtterances,
                }));
            }
        }

        // Set new language - the useEffect hook will handle loading the utterances
        setCurrentLanguage(newLanguage);
    };

    // Handle utterance edit
    const handleUtteranceEdit = (index, field, value) => {
        setEditableUtterances((prevUtterances) => {
            const updatedUtterances = [...prevUtterances];

            if (field.startsWith('slot_')) {
                // Handle slot value edit
                const slotName = field.substring(5);
                updatedUtterances[index].expected_slots = updatedUtterances[index].expected_slots || {};

                if (value) {
                    updatedUtterances[index].expected_slots[slotName] = value;
                } else {
                    delete updatedUtterances[index].expected_slots[slotName];
                }
            } else {
                // Handle other fields
                updatedUtterances[index][field] = value;
            }

            // Schedule auto-save
            if (window.saveUtterancesTimeout) {
                clearTimeout(window.saveUtterancesTimeout);
            }
            window.saveUtterancesTimeout = setTimeout(() => {
                setTestUtterances((prev) => ({
                    ...prev,
                    [currentLanguage]: updatedUtterances,
                }));
            }, 1000);

            return updatedUtterances;
        });
    };

    // Save utterances to context
    const saveUtterancesToContext = (utterances = editableUtterances) => {
        // Only save if we have a language and utterances
        if (!currentLanguage || !utterances?.length) return;

        // Immediately update context
        setTestUtterances((prev) => ({
            ...prev,
            [currentLanguage]: utterances,
        }));
    };

    // Public method for other functions to call
    const saveUtterances = () => {
        saveUtterancesToContext();
    };

    // Helper to check if any utterances have been generated
    const hasGeneratedUtterances = () => {
        return Object.keys(testUtterances).length > 0;
    };

    // Handle continue button click
    const handleContinue = () => {
        // Save any edited utterances
        saveUtterances();

        // Verify utterances are properly saved before navigation
        const isVerified = verifyUtterancesPersistence();
        console.log(`[GenerateTests] Utterances persistence verification: ${isVerified ? 'Passed' : 'Failed'}`);

        // Store current utterances in sessionStorage as a backup
        if (currentLanguage && editableUtterances.length > 0) {
            try {
                const utterancesBackup = {
                    timestamp: new Date().getTime(),
                    language: currentLanguage,
                    data: editableUtterances,
                };
                sessionStorage.setItem('intentGuardianUtterancesBackup', JSON.stringify(utterancesBackup));
                console.log('[GenerateTests] Utterances backup saved to sessionStorage');
            } catch (error) {
                console.error('Error saving utterances backup:', error);
            }
        }

        // Log state for debugging
        console.log('[GenerateTests] Current utterances state before navigation:', {
            currentLanguage,
            testUtterancesKeys: Object.keys(testUtterances),
            editableUtterancesCount: editableUtterances.length,
        });

        // Go to next step
        goToStep(6);
        navigate('/run-tests');
    };

    // Handle back button click
    const handleBack = () => {
        // Save any edited utterances before leaving
        saveUtterances();

        goToStep(4);
        navigate('/select-intents');
    };

    // Get unique slot names from all utterances
    const getUniqueSlotNames = () => {
        const slotNames = new Set();

        // Add slot names from editable utterances
        editableUtterances.forEach((utterance) => {
            if (utterance.expected_slots) {
                Object.keys(utterance.expected_slots).forEach((slotName) => {
                    slotNames.add(slotName);
                });
            }
        });

        // Add slot names from selected intents
        selectedIntents.forEach((intentName) => {
            const intent = flowDetails.intents.find((i) => i.name === intentName);
            if (intent && intent.entityReferences) {
                intent.entityReferences.forEach((entityName) => {
                    slotNames.add(entityName);
                });
            }
        });

        return Array.from(slotNames);
    };

    return (
        <Layout>
            <div className="min-h-screen bg-gray-100">
                <div className="py-10">
                    <header>
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <h1 className="text-3xl font-bold leading-tight text-gray-900">Generate Test Utterances</h1>
                        </div>
                    </header>

                    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                        <div className="genesys-card slide-in">
                            <div className="genesys-card-header">
                                <h2 className="text-xl font-semibold text-gray-900">
                                    <span className="text-orange-500 mr-2">Step 3 of 5</span>
                                    Generate Test Utterances
                                </h2>
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

                                <div className="mb-6 bg-gray-50 p-6 rounded-lg border border-gray-200">
                                    <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                                        <div className="w-full md:w-1/3">
                                            <label
                                                htmlFor="language"
                                                className="block text-sm font-medium text-gray-700 mb-1"
                                            >
                                                <div className="flex items-center">
                                                    <svg
                                                        className="mr-1 h-4 w-4 text-orange-500"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 20 20"
                                                        fill="currentColor"
                                                    >
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.20l-.31 1.242c-.412 1.65-1.813 2.758-3.487 2.758-1.675 0-3.075-1.108-3.487-2.758L1.8 6H0V5a1 1 0 011-1h3V3a1 1 0 011-1h2z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                    Select Language
                                                </div>
                                            </label>
                                            <select
                                                id="language"
                                                name="language"
                                                value={currentLanguage}
                                                onChange={handleLanguageChange}
                                                className="form-select w-full rounded-md"
                                                disabled={loading}
                                            >
                                                {selectedLanguages.map((language) => (
                                                    <option key={language} value={language}>
                                                        {language}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex space-x-3">
                                            <button
                                                type="button"
                                                onClick={() => generateUtterances(false)}
                                                disabled={loading}
                                                className="btn-primary flex items-center"
                                            >
                                                {loading ? (
                                                    <>
                                                        <div className="spinner-sm mr-2"></div>
                                                        Generating...
                                                    </>
                                                ) : testUtterances[currentLanguage] ? (
                                                    <>
                                                        <svg
                                                            className="mr-1 h-4 w-4"
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            viewBox="0 0 20 20"
                                                            fill="currentColor"
                                                        >
                                                            <path
                                                                fillRule="evenodd"
                                                                d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                                                                clipRule="evenodd"
                                                            />
                                                        </svg>
                                                        Regenerate
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg
                                                            className="mr-1 h-4 w-4"
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            viewBox="0 0 20 20"
                                                            fill="currentColor"
                                                        >
                                                            <path
                                                                fillRule="evenodd"
                                                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                                                                clipRule="evenodd"
                                                            />
                                                        </svg>
                                                        Generate
                                                    </>
                                                )}
                                            </button>

                                            {testUtterances[currentLanguage] &&
                                                testUtterances[currentLanguage].length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={generateMoreUtterances}
                                                        disabled={loading}
                                                        className="btn-secondary flex items-center"
                                                    >
                                                        {loading ? (
                                                            <>
                                                                <div className="spinner-sm mr-2"></div>
                                                                Generating...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg
                                                                    className="mr-1 h-4 w-4"
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                    viewBox="0 0 20 20"
                                                                    fill="currentColor"
                                                                >
                                                                    <path
                                                                        fillRule="evenodd"
                                                                        d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                                                                        clipRule="evenodd"
                                                                    />
                                                                </svg>
                                                                Request More
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                        </div>
                                    </div>
                                </div>

                                {/* Test utterances table */}
                                {editableUtterances.length > 0 ? (
                                    <div className="mt-6 overflow-x-auto">
                                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                                            <table className="genesys-table min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th
                                                            scope="col"
                                                            className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                                                        >
                                                            <div className="flex items-center">
                                                                <svg
                                                                    className="mr-2 h-4 w-4 text-orange-500"
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                    viewBox="0 0 20 20"
                                                                    fill="currentColor"
                                                                >
                                                                    <path
                                                                        fillRule="evenodd"
                                                                        d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z"
                                                                        clipRule="evenodd"
                                                                    />
                                                                </svg>
                                                                Utterance
                                                            </div>
                                                        </th>
                                                        <th
                                                            scope="col"
                                                            className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                                                        >
                                                            <div className="flex items-center">
                                                                <svg
                                                                    className="mr-2 h-4 w-4 text-orange-500"
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                    viewBox="0 0 20 20"
                                                                    fill="currentColor"
                                                                >
                                                                    <path
                                                                        fillRule="evenodd"
                                                                        d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                                                        clipRule="evenodd"
                                                                    />
                                                                </svg>
                                                                Expected Intent
                                                            </div>
                                                        </th>
                                                        {getUniqueSlotNames().map((slotName) => (
                                                            <th
                                                                key={slotName}
                                                                scope="col"
                                                                className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                                                            >
                                                                <div className="flex items-center">
                                                                    <svg
                                                                        className="mr-2 h-4 w-4 text-orange-500"
                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                        viewBox="0 0 20 20"
                                                                        fill="currentColor"
                                                                    >
                                                                        <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                                                                    </svg>
                                                                    Slot: {slotName}
                                                                </div>
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {editableUtterances.map((utterance, index) => (
                                                        <tr key={index}>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <input
                                                                    type="text"
                                                                    value={utterance.text}
                                                                    onChange={(e) =>
                                                                        handleUtteranceEdit(
                                                                            index,
                                                                            'text',
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                    className="form-input w-full rounded-md"
                                                                />
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <select
                                                                    value={utterance.expected_intent}
                                                                    onChange={(e) =>
                                                                        handleUtteranceEdit(
                                                                            index,
                                                                            'expected_intent',
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                    className="form-select w-full rounded-md"
                                                                >
                                                                    {selectedIntents.map((intent) => (
                                                                        <option key={intent} value={intent}>
                                                                            {intent}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </td>
                                                            {getUniqueSlotNames().map((slotName) => (
                                                                <td
                                                                    key={slotName}
                                                                    className="px-6 py-4 whitespace-nowrap"
                                                                >
                                                                    <input
                                                                        type="text"
                                                                        value={
                                                                            utterance.expected_slots?.[slotName] || ''
                                                                        }
                                                                        onChange={(e) =>
                                                                            handleUtteranceEdit(
                                                                                index,
                                                                                `slot_${slotName}`,
                                                                                e.target.value
                                                                            )
                                                                        }
                                                                        className="form-input w-full rounded-md"
                                                                    />
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200 my-6">
                                        <svg
                                            className="mx-auto h-16 w-16 text-orange-500"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            aria-hidden="true"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                                            />
                                        </svg>
                                        <h3 className="mt-4 text-lg font-medium text-gray-900">
                                            No Utterances Generated Yet
                                        </h3>
                                        <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">
                                            Select a language from the dropdown above and click the Generate button to
                                            create test utterances for your selected intents.
                                        </p>
                                        <button
                                            onClick={() => generateUtterances(false)}
                                            disabled={loading}
                                            className="mt-4 btn-primary inline-flex items-center"
                                        >
                                            <svg
                                                className="mr-2 h-4 w-4"
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                            Generate Utterances
                                        </button>
                                    </div>
                                )}

                                <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={handleBack}
                                        className="btn-secondary flex items-center"
                                    >
                                        <svg
                                            className="mr-2 h-4 w-4"
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
                                        Back to Select Intents
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleContinue}
                                        className="btn-primary flex items-center"
                                        disabled={!hasGeneratedUtterances()}
                                    >
                                        Run Tests
                                        <svg
                                            className="ml-2 h-4 w-4"
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
                    </main>
                </div>
            </div>
        </Layout>
    );
};

export default GenerateTestsPage;
