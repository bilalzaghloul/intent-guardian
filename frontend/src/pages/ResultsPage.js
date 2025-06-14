import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import Layout from '../components/Layout';

const ResultsPage = () => {
  const { isAuthenticated } = useAuth();
  const { currentStep, goToStep, testResults, selectedLanguages } = useApp();
  const [language, setLanguage] = useState('');
  const [exportFormat, setExportFormat] = useState('CSV');
  const [showOnlyFailed, setShowOnlyFailed] = useState(false);
  const [filteredResults, setFilteredResults] = useState([]);
  const [intentFilter, setIntentFilter] = useState('all'); // 'all', 'match', 'mismatch'
  const [slotFilter, setSlotFilter] = useState('all'); // 'all', 'match', 'mismatch'
  const [selectedIntentName, setSelectedIntentName] = useState('all');
  const [selectedSlotName, setSelectedSlotName] = useState('all');
  const [availableIntents, setAvailableIntents] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    intentPassed: 0,
    intentFailed: 0,
    intentSuccessRate: 0,
    slotPassed: 0,
    slotFailed: 0,
    slotSuccessRate: 0
  });
  const navigate = useNavigate();

  // Save current page to localStorage for route persistence
  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('currentPage', '/results');
    }
  }, [isAuthenticated]);

  // Redirect to login if not authenticated or if no test results are available
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (Object.keys(testResults).length === 0) {
      const isPageReload = performance.navigation &&
        performance.navigation.type === performance.navigation.TYPE_RELOAD;

      if (!isPageReload) {
        navigate('/run-tests');
      }
    } else if (currentStep !== 7) {
      goToStep(7);
    }

    // Set default language if not set
    if (selectedLanguages.length > 0 && !language) {
      setLanguage(selectedLanguages[0]);
    }
  }, [isAuthenticated, navigate, testResults, selectedLanguages, language, currentStep, goToStep]);

  // Extract available intents and slots when test results change
  useEffect(() => {
    if (language && testResults[language]?.results) {
      // Get unique intent names
      const intents = new Set();
      // Get unique slot names
      const slots = new Set();

      testResults[language].results.forEach(result => {
        // Add expected and recognized intents
        if (result.utterance?.expected_intent) {
          intents.add(result.utterance.expected_intent);
        }
        if (result.recognized_intent) {
          intents.add(result.recognized_intent);
        }

        // Add slot names from expected and recognized slots
        if (result.utterance?.expected_slots) {
          Object.keys(result.utterance.expected_slots).forEach(slot => slots.add(slot));
        }
        if (result.slots) {
          result.slots.forEach(slot => slots.add(slot.name));
        }
      });

      setAvailableIntents(Array.from(intents).sort());
      setAvailableSlots(Array.from(slots).sort());
    }
  }, [language, testResults]);

  // Filter results when language or showOnlyFailed changes
  useEffect(() => {
    if (language && testResults[language]) {
      // Extract results array from test results
      let resultsArray = [];
      if (Array.isArray(testResults[language])) {
        // If testResults[language] is already an array
        resultsArray = testResults[language];
      } else if (testResults[language].results && Array.isArray(testResults[language].results)) {
        // If testResults[language] has a results property that is an array
        resultsArray = testResults[language].results;
      } else {
        // If we can't find a results array, log an error and use an empty array
        console.error('Could not find results array in test results:', testResults[language]);
      }

      // Apply all filters
      const filtered = resultsArray.filter(result => {
        // Skip if showOnlyFailed is true and this result passed
        if (showOnlyFailed) {
          const expectedIntent = result.utterance?.expected_intent || result.expected_intent;
          const intentMatch = expectedIntent.trim() === result.recognized_intent.trim();
          if (intentMatch && result.slots_match) return false;
        }

        // Filter by intent match status
        if (intentFilter !== 'all') {
          const expectedIntent = result.utterance?.expected_intent || result.expected_intent;
          const intentMatch = expectedIntent.trim() === result.recognized_intent.trim();
          if (intentFilter === 'match' && !intentMatch) return false;
          if (intentFilter === 'mismatch' && intentMatch) return false;
        }

        // Filter by slot match status
        if (slotFilter !== 'all') {
          if (slotFilter === 'match' && !result.slots_match) return false;
          if (slotFilter === 'mismatch' && result.slots_match) return false;
        }

        // Filter by specific intent name
        if (selectedIntentName !== 'all') {
          const expectedIntent = result.utterance?.expected_intent || result.expected_intent;
          if (expectedIntent !== selectedIntentName && result.recognized_intent !== selectedIntentName) {
            return false;
          }
        }

        // Filter by specific slot name
        if (selectedSlotName !== 'all') {
          const hasExpectedSlot = result.utterance?.expected_slots && 
            Object.keys(result.utterance.expected_slots).includes(selectedSlotName);
          const hasRecognizedSlot = result.slots && 
            result.slots.some(slot => slot.name === selectedSlotName);
          if (!hasExpectedSlot && !hasRecognizedSlot) {
            return false;
          }
        }

        return true;
      });

      setFilteredResults(filtered);

      // Calculate summary metrics
      const total = filtered.length;

      // Intent matching metrics
      const intentPassed = filtered.filter(result => {
        const expectedIntent = result.utterance?.expected_intent || result.expected_intent;
        return expectedIntent.trim() === result.recognized_intent.trim();
      }).length;
      const intentFailed = total - intentPassed;
      const intentSuccessRate = total > 0 ? (intentPassed / total) * 100 : 0;

      // Slot matching metrics
      const slotPassed = filtered.filter(result => result.slots_match).length;
      const slotFailed = total - slotPassed;
      const slotSuccessRate = total > 0 ? (slotPassed / total) * 100 : 0;

      setSummary({
        total,
        intentPassed,
        intentFailed,
        intentSuccessRate,
        slotPassed,
        slotFailed,
        slotSuccessRate
      });
    } else {
      setFilteredResults([]);
      setSummary({
        total: 0,
        intentPassed: 0,
        intentFailed: 0,
        intentSuccessRate: 0,
        slotPassed: 0,
        slotFailed: 0,
        slotSuccessRate: 0
      });
    }
  }, [language, showOnlyFailed, intentFilter, slotFilter, selectedIntentName, selectedSlotName, testResults]);

  // Handle language change
  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
  };

  // Handle export format change
  const handleExportFormatChange = (e) => {
    setExportFormat(e.target.value);
  };

  // Handle filter change
  const handleFilterChange = (e) => {
    setShowOnlyFailed(e.target.checked);
  };

  // Handle export results
  const handleExport = () => {
    if (!language || !testResults[language]) {
      return;
    }

    let data;
    const results = showOnlyFailed
      ? testResults[language].results.filter(result => !result.overall_match)
      : testResults[language].results;

    if (exportFormat === 'JSON') {
      data = JSON.stringify(results, null, 2);
    } else if (exportFormat === 'CSV') {
      // Convert to CSV
      const headers = ['Utterance', 'Expected Intent', 'Recognized Intent', 'Intent Match', 'Slot Match', 'Confidence', 'Expected Slots', 'Recognized Slots'];
      
      // Helper function to escape CSV fields
      const escapeCSV = (field) => {
        if (field === null || field === undefined) return '""';
        const str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      // Helper function to format slots
      const formatSlots = (slots) => {
        if (!slots || (Array.isArray(slots) && slots.length === 0) || (typeof slots === 'object' && Object.keys(slots).length === 0)) {
          return '-';
        }
        
        if (Array.isArray(slots)) {
          // For recognized slots array
          return slots.map(slot => `${slot.name}: ${slot.value?.resolved || slot.value?.raw || '-'}`).join('; ');
        } else {
          // For expected slots object
          return Object.entries(slots).map(([name, value]) => `${name}: ${value}`).join('; ');
        }
      };

      const rows = results.map(result => [
        escapeCSV(result.utterance?.text || result.text || (typeof result.utterance === 'string' ? result.utterance : '-')),
        escapeCSV(result.utterance?.expected_intent || result.expected_intent || '-'),
        escapeCSV(result.recognized_intent || '-'),
        escapeCSV(intentMatch(result) ? 'Pass' : 'Fail'),
        escapeCSV(result.slots_match ? 'Pass' : 'Fail'),
        escapeCSV(result.confidence ? `${(result.confidence * 100).toFixed(1)}%` : '-'),
        escapeCSV(formatSlots(result.utterance?.expected_slots || result.expected_slots)),
        escapeCSV(formatSlots(result.slots))
      ]);

      data = [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    // Create download link
    const blob = new Blob([data], { type: exportFormat === 'JSON' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `intent-test-results-${language}.${exportFormat.toLowerCase()}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle new test button click
  const handleNewTest = () => {
    navigate('/generate-tests');
  };

  // Handle retest button click
  const handleRetest = () => {
    navigate('/run-tests');
  };

  // New handlers for filters
  const handleIntentFilterChange = (e) => {
    setIntentFilter(e.target.value);
  };

  const handleSlotFilterChange = (e) => {
    setSlotFilter(e.target.value);
  };

  const handleIntentNameChange = (e) => {
    setSelectedIntentName(e.target.value);
  };

  const handleSlotNameChange = (e) => {
    setSelectedSlotName(e.target.value);
  };

  // Helper function to check if intent matches
  const intentMatch = (result) => {
    const expectedIntent = result.utterance?.expected_intent || result.expected_intent;
    return expectedIntent.trim() === result.recognized_intent.trim();
  };

  return (
    <Layout>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-xl font-medium text-gray-900">Test Results</h2>
          <p className="mt-1 text-sm text-gray-500">
            View and analyze the results of your NLU tests.
          </p>
        </div>

        <div className="px-6 py-5">
          {/* Filter controls */}
          <div className="flex flex-wrap gap-4 mb-6">
            {/* Language selector */}
            <div className="w-full sm:w-48">
              <label htmlFor="language-select" className="block text-sm font-medium text-gray-700 mb-1">
                Language:
              </label>
              <select
                id="language-select"
                value={language}
                onChange={handleLanguageChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md"
              >
                {selectedLanguages.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
                <option value="all">All Languages</option>
              </select>
            </div>

            {/* Intent match filter */}
            <div className="w-full sm:w-48">
              <label htmlFor="intent-match-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Intent Match:
              </label>
              <select
                id="intent-match-filter"
                value={intentFilter}
                onChange={handleIntentFilterChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md"
              >
                <option value="all">All Results</option>
                <option value="match">Matched</option>
                <option value="mismatch">Mismatched</option>
              </select>
            </div>

            {/* Slot match filter */}
            <div className="w-full sm:w-48">
              <label htmlFor="slot-match-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Slot Match:
              </label>
              <select
                id="slot-match-filter"
                value={slotFilter}
                onChange={handleSlotFilterChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md"
              >
                <option value="all">All Results</option>
                <option value="match">Matched</option>
                <option value="mismatch">Mismatched</option>
              </select>
            </div>

            {/* Intent name filter */}
            <div className="w-full sm:w-48">
              <label htmlFor="intent-name-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Intent Name:
              </label>
              <select
                id="intent-name-filter"
                value={selectedIntentName}
                onChange={handleIntentNameChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md"
              >
                <option value="all">All Intents</option>
                {availableIntents.map(intent => (
                  <option key={intent} value={intent}>{intent}</option>
                ))}
              </select>
            </div>

            {/* Slot name filter */}
            <div className="w-full sm:w-48">
              <label htmlFor="slot-name-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Slot Name:
              </label>
              <select
                id="slot-name-filter"
                value={selectedSlotName}
                onChange={handleSlotNameChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md"
              >
                <option value="all">All Slots</option>
                {availableSlots.map(slot => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>

            {/* Export format and show failed toggle */}
            <div className="w-full sm:w-48">
              <label htmlFor="export-format" className="block text-sm font-medium text-gray-700 mb-1">
                Export Format:
              </label>
              <select
                id="export-format"
                value={exportFormat}
                onChange={handleExportFormatChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md"
              >
                <option value="JSON">JSON</option>
                <option value="CSV">CSV</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                id="show-failed-only"
                type="checkbox"
                checked={showOnlyFailed}
                onChange={handleFilterChange}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
              />
              <label htmlFor="show-failed-only" className="ml-2 block text-sm text-gray-900">
                Show only failed tests
              </label>
            </div>
          </div>

          {/* Results summary */}
          <div className="mb-6">
            {/* Test Summary - Total tests counter */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden mb-4">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-medium text-gray-900">Test Summary</h3>
              </div>
              <div className="px-6 py-5">
                <div className="flex items-center justify-center">
                  <div className="w-32 h-32 relative rounded-full flex items-center justify-center bg-gray-50 border-4 border-gray-100">
                    <div className="text-3xl font-bold text-gray-700">{summary.total}</div>
                    <div className="text-xs text-gray-500 mt-1">Total Tests</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Metrics - Two cards side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Intent Recognition Card */}
              <div className="bg-white border border-blue-200 rounded-lg shadow-sm overflow-hidden">
                <div className="bg-blue-50 px-6 py-3 border-b border-blue-100">
                  <h3 className="text-md font-medium text-gray-900">Intent Recognition</h3>
                </div>
                <div className="px-6 py-4">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-24 h-24 relative rounded-full flex items-center justify-center bg-blue-50 border-4 border-blue-100">
                      <div className="text-2xl font-bold text-blue-600">{(summary.intentSuccessRate || 0).toFixed(1)}%</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="text-xl font-bold text-green-600">{summary.intentPassed}</div>
                      <div className="text-xs font-medium text-gray-500">Passed</div>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg">
                      <div className="text-xl font-bold text-red-600">{summary.intentFailed}</div>
                      <div className="text-xs font-medium text-gray-500">Failed</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Slot Matching Card */}
              <div className="bg-white border border-purple-200 rounded-lg shadow-sm overflow-hidden">
                <div className="bg-purple-50 px-6 py-3 border-b border-purple-100">
                  <h3 className="text-md font-medium text-gray-900">Slot Matching</h3>
                </div>
                <div className="px-6 py-4">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-24 h-24 relative rounded-full flex items-center justify-center bg-purple-50 border-4 border-purple-100">
                      <div className="text-2xl font-bold text-purple-600">{(summary.slotSuccessRate || 0).toFixed(1)}%</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="text-xl font-bold text-green-600">{summary.slotPassed}</div>
                      <div className="text-xs font-medium text-gray-500">Passed</div>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg">
                      <div className="text-xl font-bold text-red-600">{summary.slotFailed}</div>
                      <div className="text-xs font-medium text-gray-500">Failed</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results table */}
        <div className="overflow-x-auto">
          <table className="genesys-table min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Intent Match
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slot Match
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utterance
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expected Intent
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recognized Intent
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confidence
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expected Slots
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recognized Slots
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredResults.map((result, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {intentMatch(result) ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        ✓ Pass
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        ✗ Fail
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {result.slots_match ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        ✓ Pass
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        ✗ Fail
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {/* Try multiple possible locations for the utterance text */}
                    {result.utterance?.text || result.text ||
                      (typeof result.utterance === 'string' ? result.utterance : '-')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {/* Try multiple possible locations for the expected intent */}
                    {result.utterance?.expected_intent || result.expected_intent || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {result.recognized_intent}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {result.confidence ? (result.confidence * 100).toFixed(1) + '%' : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(result.utterance?.expected_slots || result.expected_slots) &&
                      Object.keys(result.utterance?.expected_slots || result.expected_slots || {}).length > 0 ? (
                      <div>
                        {Object.entries(result.utterance?.expected_slots || result.expected_slots || {}).map(([name, value], i) => (
                          <div key={i} className="text-xs">
                            <span className="font-semibold">{name}:</span> {value}
                          </div>
                        ))}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {result.slots && result.slots.length > 0 ? (
                      <div>
                        {result.slots.map((slot, i) => (
                          <div key={i} className="text-xs">
                            <span className="font-semibold">{slot.name}:</span> {slot.value?.resolved || slot.value?.raw || '-'}
                          </div>
                        ))}
                      </div>
                    ) : '-'}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-between">
          <div>
            <button
              type="button"
              onClick={handleRetest}
              className="btn-secondary flex items-center"
            >
              <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retest
            </button>
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleExport}
              className="btn-secondary flex items-center"
            >
              <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Results
            </button>
            <button
              type="button"
              onClick={handleNewTest}
              className="btn-primary flex items-center"
            >
              <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Test
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ResultsPage;
