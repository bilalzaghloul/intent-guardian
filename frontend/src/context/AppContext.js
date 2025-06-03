import React, { createContext, useState, useContext, useEffect } from 'react';

// Create context
const AppContext = createContext();

// App provider component
export const AppProvider = ({ children }) => {
    // Load initial state from localStorage
    const loadStateFromStorage = () => {
        try {
            const storedState = localStorage.getItem('intentGuardianState');
            if (storedState) {
                return JSON.parse(storedState);
            }
        } catch (error) {
            console.error('Error loading state from localStorage:', error);
        }
        return null;
    };

    const initialState = loadStateFromStorage() || {};

    // Selected flow state
    const [selectedFlow, setSelectedFlow] = useState(initialState.selectedFlow || null);
    const [flowDetails, setFlowDetails] = useState(initialState.flowDetails || null);

    // Selected intents and languages for testing
    const [selectedIntents, setSelectedIntents] = useState(initialState.selectedIntents || []);
    const [selectedLanguages, setSelectedLanguages] = useState(initialState.selectedLanguages || []);

    // Generated test utterances
    const [testUtterances, setTestUtterances] = useState(() => {
        // Ensure we properly initialize from localStorage with appropriate parsing
        if (initialState.testUtterances && typeof initialState.testUtterances === 'object') {
            console.log('[AppContext] Loaded test utterances from localStorage');
            return initialState.testUtterances;
        }
        return {};
    });

    // Test results
    const [testResults, setTestResults] = useState(initialState.testResults || null);
    const [testHistory, setTestHistory] = useState(initialState.testHistory || []);

    // Current step in the application flow
    const [currentStep, setCurrentStep] = useState(initialState.currentStep || 1); // 1: Login, 2: Welcome, 3: Select Bot, 4: Select Intents, 5: Generate, 6: Run, 7: Report

    // Save state to localStorage whenever it changes
    useEffect(() => {
        const stateToSave = {
            selectedFlow,
            flowDetails,
            selectedIntents,
            selectedLanguages,
            testUtterances,
            testResults,
            testHistory,
            currentStep,
        };

        try {
            localStorage.setItem('intentGuardianState', JSON.stringify(stateToSave));
        } catch (error) {
            console.error('Error saving state to localStorage:', error);
        }
    }, [
        selectedFlow,
        flowDetails,
        selectedIntents,
        selectedLanguages,
        testUtterances,
        testResults,
        testHistory,
        currentStep,
    ]);

    // Progress to next step
    const nextStep = () => {
        setCurrentStep((prev) => Math.min(prev + 1, 7));
    };

    // Go back to previous step
    const prevStep = () => {
        setCurrentStep((prev) => Math.max(prev - 1, 1));
    };

    // Go to specific step
    const goToStep = (step) => {
        if (step >= 1 && step <= 7) {
            setCurrentStep(step);
        }
    };

    // Reset the application state
    const resetApp = () => {
        setSelectedFlow(null);
        setFlowDetails(null);
        setSelectedIntents([]);
        setSelectedLanguages([]);
        setTestUtterances({});
        setTestResults(null);
        setCurrentStep(1);

        // Clear localStorage
        try {
            localStorage.removeItem('intentGuardianState');
        } catch (error) {
            console.error('Error clearing localStorage:', error);
        }
    };

    // Add test result to history
    const addTestToHistory = (testResult) => {
        // Store the complete test result in the history
        // Make sure the complete results are available for later viewing
        const completeTestResult = {
            ...testResult,
            // Store the complete results if they're not already included
            completeResults: testResult.results || testResults[testResult.language]?.results || [],
        };

        console.log('Adding test to history:', completeTestResult);
        setTestHistory((prev) => [completeTestResult, ...prev]);

        // Also update the testResults state with this result
        // This ensures the results are available when viewing from history
        if (testResult.testId) {
            setTestResults((prev) => ({
                ...prev,
                [testResult.testId]: completeTestResult,
            }));
        }
    };

    // Context value
    const value = {
        // Flow selection
        selectedFlow,
        setSelectedFlow,
        flowDetails,
        setFlowDetails,

        // Intent and language selection
        selectedIntents,
        setSelectedIntents,
        selectedLanguages,
        setSelectedLanguages,

        // Test utterances
        testUtterances,
        setTestUtterances,

        // Test results
        testResults,
        setTestResults,
        testHistory,
        addTestToHistory,

        // Navigation
        currentStep,
        nextStep,
        prevStep,
        goToStep,
        resetApp,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Custom hook to use app context
export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};

export default AppContext;
