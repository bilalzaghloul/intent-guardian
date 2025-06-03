import React from 'react';
import { useApp } from '../context/AppContext';

const StepInstructions = () => {
    const { currentStep } = useApp();

    // Define instructions for each step
    const getInstructions = () => {
        switch (currentStep) {
            case 1:
                return {
                    title: 'Sign in to your Genesys Cloud Account',
                    steps: [
                        'Select your Genesys Cloud region',
                        'Enter your OAuth Client ID',
                        'Click "Login" to authenticate with Genesys Cloud',
                    ],
                    tip: 'You can find your Client ID in Genesys Cloud under Admin > Integrations > OAuth',
                };
            case 2:
                return {
                    title: 'Welcome to Intent Guardian',
                    steps: [
                        'Review what the app can do for you',
                        'Learn how Intent Guardian can help test your NLU models',
                        'Click "Select Bot" when ready to proceed',
                    ],
                    tip: 'Intent Guardian helps you test your bots by generating realistic user utterances',
                };
            case 3:
                return {
                    title: 'Select a Bot Flow',
                    steps: [
                        'Browse the list of available bots in your Genesys Cloud organization',
                        'Click on a bot to view its details',
                        'Select the bot you want to test',
                        'Click "Continue" to proceed to intent selection',
                    ],
                    tip: 'Choose a bot that has NLU intents configured for best results',
                };
            case 4:
                return {
                    title: 'Select Intents and Languages',
                    steps: [
                        'Choose the specific intents you want to test',
                        'Select the languages to generate test utterances for',
                        'Click "Generate Test Utterances" to proceed to test generation',
                    ],
                    tip: 'You can select multiple intents and languages for comprehensive testing',
                };
            case 5:
                return {
                    title: 'Generate Test Utterances',
                    steps: [
                        'Review the selected intents and languages',
                        'Click "Re-/Generate" to create test utterances using AI',
                        'Edit generated utterances if needed',
                        'Click "Run Tests" when satisfied with the test utterances',
                    ],
                    tip: 'You can request more test utterances if you need more variety',
                };
            case 6:
                return {
                    title: 'Run Tests Against Genesys NLU',
                    steps: [
                        'Review the generated test utterances',
                        'Click "Test Current Language" to test your NLU model',
                        'Wait for the tests to complete',
                        'Click "View Results" to see how your NLU model performed',
                    ],
                    tip: 'Testing may take a moment depending on the number of utterances',
                };
            case 7:
                return {
                    title: 'Review Test Results',
                    steps: [
                        'Analyze the success rate of your NLU model',
                        'View detailed results for each intent',
                        'Export results in JSON or CSV format if needed',
                        'Return to any previous step to make adjustments',
                    ],
                    tip: 'Look for patterns in misidentified utterances to improve your NLU model',
                };
            default:
                return {
                    title: 'Intent Guardian',
                    steps: ['Follow the guided process to test your NLU model'],
                    tip: 'You can navigate between steps using the progress bar above',
                };
        }
    };

    const instructions = getInstructions();

    return (
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-md p-4 mb-6">
            <div className="flex">
                <div className="flex-shrink-0">
                    <svg
                        className="h-5 w-5 text-blue-500"
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
                </div>
                <div className="ml-3">
                    <h3 className="text-md font-medium text-blue-800">{instructions.title}</h3>
                    <div className="mt-2 text-sm text-blue-700">
                        <ol className="list-decimal ml-5 space-y-1">
                            {instructions.steps.map((step, index) => (
                                <li key={index}>{step}</li>
                            ))}
                        </ol>
                    </div>
                    {instructions.tip && (
                        <div className="mt-3 text-sm">
                            <p className="text-blue-600 font-medium">
                                <span role="img" aria-label="Tip">
                                    💡
                                </span>{' '}
                                Tip: {instructions.tip}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StepInstructions;
