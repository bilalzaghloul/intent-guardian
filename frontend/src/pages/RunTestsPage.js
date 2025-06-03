import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { genesysAPI } from '../services/api';
import Layout from '../components/Layout';

const RunTestsPage = () => {
    const { isAuthenticated } = useAuth();
    const {
        currentStep,
        goToStep,
        selectedFlow,
        flowDetails,
        selectedLanguages,
        testUtterances,
        setTestResults,
        addTestToHistory,
    } = useApp();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(0);
    const [currentLanguage, setCurrentLanguage] = useState('');
    const [testStatus, setTestStatus] = useState({});
    const [intentFilter, setIntentFilter] = useState('all'); // 'all', 'match', 'mismatch'
    const [slotFilter, setSlotFilter] = useState('all'); // 'all', 'match', 'mismatch'
    const navigate = useNavigate();

    // Save current page to localStorage for route persistence
    useEffect(() => {
        if (isAuthenticated) {
            localStorage.setItem('currentPage', '/run-tests');
            // Also track for back/forward navigation
            sessionStorage.setItem('prevPathname', '/run-tests');
        }
    }, [isAuthenticated]);

    // Redirect to login if not authenticated or if no flow/utterances are selected
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
        } else if (!selectedFlow || !flowDetails) {
            // Check if this is a page reload before redirecting
            const isPageReload =
                performance.navigation && performance.navigation.type === performance.navigation.TYPE_RELOAD;

            if (!isPageReload) {
                navigate('/select-bot');
            }
        } else if (Object.keys(testUtterances).length === 0) {
            // Check if this is a page reload before redirecting
            const isPageReload =
                performance.navigation && performance.navigation.type === performance.navigation.TYPE_RELOAD;

            if (!isPageReload) {
                navigate('/generate-tests');
            }
        } else if (currentStep !== 6) {
            goToStep(6);
        }

        // Set default current language if not set
        if (selectedLanguages.length > 0 && !currentLanguage) {
            setCurrentLanguage(selectedLanguages[0]);
        }
    }, [
        isAuthenticated,
        navigate,
        selectedFlow,
        flowDetails,
        testUtterances,
        selectedLanguages,
        currentLanguage,
        currentStep,
        goToStep,
    ]);

    // Run tests for the current language
    const runTests = async () => {
        if (!currentLanguage || !testUtterances[currentLanguage]) {
            setError('No test utterances available for the selected language');
            return;
        }

        try {
            setLoading(true);
            setError('');
            setProgress(0);

            // Initialize test status
            const initialStatus = {};
            testUtterances[currentLanguage].forEach((_, index) => {
                initialStatus[index] = { status: 'pending' };
            });
            setTestStatus(initialStatus);

            // Get token from localStorage
            const directToken = localStorage.getItem('directToken');
            const region = localStorage.getItem('region') || 'mypurecloud.de';

            console.log(`[RunTests] Using token from localStorage: ${!!directToken}`);
            console.log(`[RunTests] Using region: ${region}`);

            if (!directToken) {
                setError('No authentication token found. Please log in again.');
                setLoading(false);
                return;
            }

            // Prepare data for batch test
            const testData = {
                utterances: testUtterances[currentLanguage],
                language: currentLanguage,
                flowId: selectedFlow.id,
                flowType: selectedFlow.type,
                token: directToken, // Include token directly in request body
                region: region, // Include region directly in request body
            };

            // Run batch test
            const response = await genesysAPI.batchTest(testData);

            if (response.data.success) {
                // The API now returns the results directly in the response.data object
                const results = response.data;
                console.log('[RunTests] Received test results:', results);

                // Update test results in context
                setTestResults((prevResults) => {
                    const updatedResults = { ...prevResults };
                    updatedResults[currentLanguage] = results;
                    return updatedResults;
                });

                // Add to test history
                addTestToHistory({
                    timestamp: new Date(),
                    language: currentLanguage,
                    flowId: selectedFlow.id,
                    flowName: selectedFlow.name,
                    summary: results.summary,
                    testId: results.testId || 'batch-test-' + new Date().getTime(),
                });

                // Update test status
                const newStatus = {};
                results.results.forEach((result, index) => {
                    newStatus[index] = {
                        status: result.overall_match ? 'success' : 'failure',
                        result,
                    };
                });
                setTestStatus(newStatus);
            } else {
                setError('Failed to run tests');
            }
        } catch (error) {
            console.error('Error running tests:', error);
            setError('Error running tests. Please try again.');
        } finally {
            setLoading(false);
            setProgress(100);
        }
    };

    // Run tests for all languages
    const runAllTests = async () => {
        try {
            setLoading(true);
            setError('');

            // Run tests for each language
            for (const language of selectedLanguages) {
                setCurrentLanguage(language);
                setProgress(0);

                // Initialize test status
                const initialStatus = {};
                testUtterances[language].forEach((_, index) => {
                    initialStatus[index] = { status: 'pending' };
                });
                setTestStatus(initialStatus);

                // Prepare data for batch test
                const testData = {
                    utterances: testUtterances[language],
                    language,
                    flowId: selectedFlow.id,
                    flowType: selectedFlow.type,
                };

                try {
                    // Run batch test
                    const response = await genesysAPI.batchTest(testData);

                    if (response.data.success) {
                        const results = response.data;

                        // Update test results in context
                        setTestResults((prevResults) => {
                            const updatedResults = { ...prevResults };
                            updatedResults[language] = results;
                            return updatedResults;
                        });

                        // Add to test history
                        addTestToHistory({
                            timestamp: new Date(),
                            language,
                            flowId: selectedFlow.id,
                            flowName: selectedFlow.name,
                            summary: results.summary,
                            testId: results.testId || 'batch-test-' + new Date().getTime(),
                        });

                        // Update progress
                        setProgress(((selectedLanguages.indexOf(language) + 1) / selectedLanguages.length) * 100);
                    } else {
                        setError(`Failed to run tests for language: ${language}`);
                    }
                } catch (err) {
                    console.error(`Error running tests for language ${language}:`, err);
                    setError(`Error running tests for language: ${language}`);
                }
            }
        } catch (error) {
            console.error('Error running all tests:', error);
            setError('Error running tests. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle language change
    const handleLanguageChange = (e) => {
        setCurrentLanguage(e.target.value);
    };

    // Handle continue button click
    const handleContinue = () => {
        navigate('/results');
    };

    // Handle back button click
    const handleBack = () => {
        // Ensure we maintain the step context and preserve the utterances
        console.log('[RunTests] Navigating back to generate-tests');
        goToStep(5); // Make sure we go to the correct step
        navigate('/generate-tests');
    };

    return (
        <Layout>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200">
                    <h2 className="text-xl font-medium text-gray-900">Run Tests</h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Run tests against the selected Genesys bot and intents.
                    </p>
                </div>

                <div className="px-6 py-5">
                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    <div className="mb-6">
                        <div className="flex flex-col md:flex-row md:items-center md:space-x-4">
                            <div className="mb-4 md:mb-0 md:w-1/3">
                                <label htmlFor="language-select" className="block text-sm font-medium text-gray-700">
                                    Test Language:
                                </label>
                                <select
                                    id="language-select"
                                    value={currentLanguage}
                                    onChange={handleLanguageChange}
                                    className="form-select mt-1 block w-full"
                                    disabled={loading}
                                >
                                    {selectedLanguages.map((lang) => (
                                        <option key={lang} value={lang}>
                                            {lang}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex space-x-4">
                                <button
                                    type="button"
                                    onClick={runTests}
                                    disabled={loading}
                                    className="btn-primary flex items-center"
                                >
                                    {loading ? (
                                        <>
                                            <div className="spinner-sm mr-2"></div>
                                            Testing current language...
                                        </>
                                    ) : (
                                        'Test Current Language'
                                    )}
                                </button>
                                {/* 
                <button
                  type="button"
                  onClick={runAllTests}
                  disabled={loading}
                  className="btn-primary flex items-center"
                >
                  {loading ? (
                    <>
                      <div className="spinner-sm mr-2"></div>
                      Testing all languages...
                    </>
                  ) : 'Test All Languages'}
                </button>
                 */}
                            </div>
                        </div>
                    </div>

                    {loading && progress > 0 && (
                        <div className="mt-4">
                            <div className="relative pt-1">
                                <div className="flex mb-2 items-center justify-between">
                                    <div>
                                        <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-orange-600 bg-orange-200">
                                            Progress
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-semibold inline-block text-orange-600">
                                            {progress}%
                                        </span>
                                    </div>
                                </div>
                                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-orange-200">
                                    <div
                                        style={{ width: `${progress}%` }}
                                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-orange-500"
                                    ></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Filters */}
                    {currentLanguage && testUtterances[currentLanguage] && (
                        <div className="mb-4 flex space-x-4">
                            <div>
                                <label htmlFor="intentFilter" className="block text-sm font-medium text-gray-700">
                                    Intent Match
                                </label>
                                <select
                                    id="intentFilter"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                                    value={intentFilter}
                                    onChange={(e) => setIntentFilter(e.target.value)}
                                >
                                    <option value="all">All</option>
                                    <option value="match">Matched</option>
                                    <option value="mismatch">Mismatched</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="slotFilter" className="block text-sm font-medium text-gray-700">
                                    Slot Match
                                </label>
                                <select
                                    id="slotFilter"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                                    value={slotFilter}
                                    onChange={(e) => setSlotFilter(e.target.value)}
                                >
                                    <option value="all">All</option>
                                    <option value="match">Matched</option>
                                    <option value="mismatch">Mismatched</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Test utterances table */}
                    {currentLanguage && testUtterances[currentLanguage] && (
                        <div className="mt-6 overflow-x-auto">
                            <table className="genesys-table min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th
                                            scope="col"
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Status
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Utterance
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Expected Intent
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Recognized Intent
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Confidence
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Expected Slots
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Recognized Slots
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {testUtterances[currentLanguage]
                                        .filter((utterance, index) => {
                                            const testResult = testStatus[index]?.result;
                                            if (!testResult) return true;

                                            // Apply intent filter
                                            if (intentFilter !== 'all') {
                                                const intentMatches =
                                                    testResult.recognized_intent === utterance.expected_intent;
                                                if (intentFilter === 'match' && !intentMatches) return false;
                                                if (intentFilter === 'mismatch' && intentMatches) return false;
                                            }

                                            // Apply slot filter
                                            if (slotFilter !== 'all') {
                                                const expectedSlots = utterance.expected_slots || {};
                                                const recognizedSlots = testResult.slots || [];
                                                const expectedSlotCount = Object.keys(expectedSlots).length;
                                                const recognizedSlotCount = recognizedSlots.length;
                                                const slotsMatch =
                                                    expectedSlotCount === recognizedSlotCount &&
                                                    recognizedSlots.every(
                                                        (slot) =>
                                                            expectedSlots[slot.name] ===
                                                            (slot.value?.resolved || slot.value?.raw)
                                                    );
                                                if (slotFilter === 'match' && !slotsMatch) return false;
                                                if (slotFilter === 'mismatch' && slotsMatch) return false;
                                            }

                                            return true;
                                        })
                                        .map((utterance, index) => (
                                            <tr key={index}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {testStatus[index]?.status === 'success' ? (
                                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                            Success
                                                        </span>
                                                    ) : testStatus[index]?.status === 'failure' ? (
                                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                                            ✗ Failure
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                                            Pending
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {utterance.text}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {utterance.expected_intent}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {testStatus[index]?.result?.recognized_intent || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {testStatus[index]?.result?.confidence
                                                        ? `${(testStatus[index].result.confidence * 100).toFixed(1)}%`
                                                        : '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {utterance.expected_slots &&
                                                    Object.keys(utterance.expected_slots).length > 0 ? (
                                                        <div>
                                                            {Object.entries(utterance.expected_slots).map(
                                                                ([name, value], i) => (
                                                                    <div key={i} className="text-xs">
                                                                        <span className="font-semibold">{name}:</span>{' '}
                                                                        {value}
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    ) : (
                                                        '-'
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {testStatus[index]?.result?.slots &&
                                                    testStatus[index].result.slots.length > 0 ? (
                                                        <div>
                                                            {testStatus[index].result.slots.map((slot, i) => (
                                                                <div key={i} className="text-xs">
                                                                    <span className="font-semibold">{slot.name}:</span>{' '}
                                                                    {slot.value?.resolved || slot.value?.raw || '-'}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        '-'
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="mt-6 flex justify-between">
                        <button type="button" onClick={handleBack} className="btn-secondary flex items-center">
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
                            Back
                        </button>
                        <button type="button" onClick={handleContinue} className="btn-primary flex items-center">
                            View Results
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
        </Layout>
    );
};

export default RunTestsPage;
