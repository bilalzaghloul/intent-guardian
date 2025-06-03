const express = require('express');
const router = express.Router();
const testStorage = require('../utils/testStorage');
// Authentication is now handled by sessionMiddleware in server.js

/**
 * @route   GET /api/test/report
 * @desc    Get test report summary
 * @access  Private
 */
router.get('/report', (req, res) => {
    try {
        const { testId } = req.query;

        console.log('[Test] Report request for testId:', testId);
        console.log('[Test] Session keys:', Object.keys(req.session || {}));
        console.log('[Test] testResults exists:', !!req.session?.testResults);
        console.log('[Test] lastTestResults exists:', !!req.session?.lastTestResults);

        // If testResults doesn't exist but lastTestResults does, use that
        if (!req.session.testResults && req.session.lastTestResults) {
            console.log('[Test] Using lastTestResults for report');
            req.session.testResults = {
                [req.session.lastTestResults.id]: req.session.lastTestResults,
            };

            // Also save to persistent storage
            if (req.session.lastTestResults.id) {
                testStorage.saveTestResults(req.session.lastTestResults.id, req.session.lastTestResults);
            }
        }

        // Check if any test results exist in session
        if (!req.session.testResults && !req.session.lastTestResults) {
            console.log('[Test] No test results found in session');

            // If testId is provided, try to find it in persistent storage
            if (testId) {
                const persistedResults = testStorage.getTestResults(testId);
                if (persistedResults) {
                    console.log(`[Test] Found test report with ID ${testId} in persistent storage`);
                    return res.status(200).json({
                        success: true,
                        data: persistedResults,
                    });
                }
            }

            return res.status(404).json({
                success: false,
                message: 'No test results found in session or storage',
            });
        }

        if (testId) {
            // Try to find the test report in multiple locations
            let testReport = null;

            // First check in testResults
            if (req.session.testResults && req.session.testResults[testId]) {
                console.log(`[Test] Found test report with ID ${testId} in testResults`);
                testReport = req.session.testResults[testId];

                // Save to persistent storage if not already saved
                testStorage.saveTestResults(testId, testReport);
            }
            // Then check if lastTestResults matches the ID
            else if (req.session.lastTestResults && req.session.lastTestResults.id === testId) {
                console.log(`[Test] Found test report with ID ${testId} in lastTestResults`);
                testReport = req.session.lastTestResults;

                // Save to persistent storage if not already saved
                testStorage.saveTestResults(testId, testReport);
            }
            // Check if testId is a batch-test ID that matches lastTestResults
            else if (req.session.lastTestResults && testId.startsWith('batch-test-')) {
                console.log(`[Test] Checking if lastTestResults matches batch ID ${testId}`);
                if (req.session.lastTestResults.id && req.session.lastTestResults.id.toString() === testId) {
                    console.log(`[Test] Found matching batch test ID in lastTestResults`);
                    testReport = req.session.lastTestResults;

                    // Save to persistent storage if not already saved
                    testStorage.saveTestResults(testId, testReport);
                }
            }

            // If not found in session, try persistent storage
            if (!testReport) {
                console.log(`[Test] Test report with ID ${testId} not found in session, checking persistent storage`);
                testReport = testStorage.getTestResults(testId);

                if (testReport) {
                    console.log(`[Test] Found test report with ID ${testId} in persistent storage`);
                } else {
                    console.log(`[Test] Test report with ID ${testId} not found in any location`);
                    if (req.session.testResults) {
                        console.log('[Test] Available test IDs:', Object.keys(req.session.testResults));
                    }
                    if (req.session.lastTestResults) {
                        console.log('[Test] lastTestResults ID:', req.session.lastTestResults.id);
                    }

                    return res.status(404).json({
                        success: false,
                        message: `Test report with ID ${testId} not found`,
                    });
                }
            }

            return res.status(200).json({
                success: true,
                data: testReport,
            });
        } else {
            // Return all test reports (summaries only)
            const testReports = Object.entries(req.session.testResults).map(([id, report]) => ({
                test_id: id,
                timestamp: report.timestamp,
                language: report.language,
                flowId: report.flowId,
                summary: report.summary,
            }));

            return res.status(200).json({
                success: true,
                data: testReports,
            });
        }
    } catch (error) {
        console.error('Error fetching test report:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Failed to fetch test report',
            error: error.message,
        });
    }
});

/**
 * @route   GET /api/test/session-log
 * @desc    Get user session log
 * @access  Private
 */
router.get('/session-log', (req, res) => {
    try {
        // Create session log from available data
        const sessionLog = {
            session_id: req.sessionId,
            created_at: req.session.createdAt,
            last_activity: req.session.lastActivity,
            organization: req.session.orgInfo?.name || 'Unknown',
            selected_flow: req.session.selectedFlow || null,
            test_runs: Object.entries(req.session.testResults || {}).map(([id, report]) => ({
                test_id: id,
                timestamp: report.timestamp,
                language: report.language,
                summary: report.summary,
            })),
        };

        return res.status(200).json({
            success: true,
            data: sessionLog,
        });
    } catch (error) {
        console.error('Error fetching session log:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Failed to fetch session log',
            error: error.message,
        });
    }
});

/**
 * @route   POST /api/test/export
 * @desc    Export test results as JSON or CSV
 * @access  Private
 */
router.post('/export', (req, res) => {
    try {
        // Get parameters from either query or body
        const testId = req.body.testId || req.query.testId;
        const format = req.body.format || req.query.format || 'json';

        console.log('[Test] Export request received for testId:', testId, 'format:', format);

        if (!testId) {
            return res.status(400).json({
                success: false,
                message: 'Test ID is required',
            });
        }

        // Log the session structure for debugging
        console.log('[Test] Session structure:', Object.keys(req.session || {}));
        console.log('[Test] Session testResults exists:', !!req.session?.testResults);
        console.log('[Test] Session lastTestResults exists:', !!req.session?.lastTestResults);

        if (req.session?.lastTestResults) {
            console.log(
                '[Test] lastTestResults:',
                JSON.stringify(req.session.lastTestResults, null, 2).substring(0, 200) + '...'
            );
        }

        if (req.session?.testResults) {
            console.log('[Test] testResults keys:', Object.keys(req.session.testResults));
            console.log(
                '[Test] testResults structure:',
                JSON.stringify(req.session.testResults || {}, null, 2).substring(0, 200) + '...'
            );
        }

        // Check if testResults exists in session
        if (!req.session.testResults && !req.session.lastTestResults) {
            console.log('[Test] No test results found in session, checking persistent storage');

            // Try to find the test in persistent storage
            const persistedResults = testStorage.getTestResults(testId);

            if (persistedResults) {
                console.log(`[Test] Found test report with ID ${testId} in persistent storage`);
                // Use the persisted results
                if (!req.session.testResults) {
                    req.session.testResults = {};
                }
                req.session.testResults[testId] = persistedResults;
            } else {
                // If still not found, check all available test results in storage
                const allTestIds = testStorage.listTestResults();
                console.log('[Test] Available test IDs in persistent storage:', allTestIds);

                if (allTestIds.length > 0) {
                    // Sort by timestamp (batch-test-timestamp format) to get the most recent
                    allTestIds.sort().reverse();
                    const latestTestId = allTestIds[0];
                    console.log(`[Test] Using most recent test results: ${latestTestId}`);

                    const latestResults = testStorage.getTestResults(latestTestId);
                    if (latestResults) {
                        if (!req.session.testResults) {
                            req.session.testResults = {};
                        }
                        req.session.testResults[latestTestId] = latestResults;

                        // Update the testId to use the latest results
                        console.log(`[Test] Updating testId from ${testId} to ${latestTestId}`);
                        testId = latestTestId;
                    }
                } else {
                    console.log('[Test] No test results found in session or persistent storage');
                    return res.status(404).json({
                        success: false,
                        message: 'No test results found in session or persistent storage',
                    });
                }
            }
        }

        // If testResults doesn't exist but lastTestResults does, use that
        if (!req.session.testResults && req.session.lastTestResults) {
            console.log('[Test] Using lastTestResults instead of testResults');
            req.session.testResults = {
                [req.session.lastTestResults.id]: req.session.lastTestResults,
            };
        }

        // Try to find test results by testId
        let testResults = req.session.testResults[testId];
        console.log(`[Test] Looking for testId: ${testId}, found:`, !!testResults);

        // If not found in session, try persistent storage
        if (!testResults) {
            console.log(`[Test] Test results not found in session, checking persistent storage`);
            testResults = testStorage.getTestResults(testId);
            if (testResults) {
                console.log(`[Test] Found test results with ID ${testId} in persistent storage`);
            } else {
                console.log(`[Test] Test results not found in persistent storage for ID: ${testId}`);
            }
        }

        // If still not found, check if testId is a language code
        if (!testResults) {
            // Get all test results and look for one with matching language
            if (req.session.testResults) {
                const allTestResults = Object.values(req.session.testResults);
                console.log('[Test] All test results count:', allTestResults.length);

                // Try to find by language
                const matchingResult = allTestResults.find((result) => result.language === testId);
                console.log('[Test] Found by language:', !!matchingResult);

                if (matchingResult) {
                    console.log('[Test] Found test results by language code:', testId);
                    testResults = matchingResult;
                }
            }

            // If still not found, try to use lastTestResults
            if (!testResults && req.session.lastTestResults && req.session.lastTestResults.results) {
                console.log('[Test] Using lastTestResults directly');
                testResults = req.session.lastTestResults;
            }

            // If still not found, check all persistent storage
            if (!testResults) {
                console.log('[Test] Test results not found in session, checking all persistent storage');
                const allTestIds = testStorage.listTestResults();
                console.log('[Test] Available test IDs in persistent storage:', allTestIds);

                // If we have any test results, use the most recent one
                if (allTestIds.length > 0) {
                    // Sort by timestamp (batch-test-timestamp format)
                    allTestIds.sort().reverse();
                    const latestTestId = allTestIds[0];
                    console.log('[Test] Using most recent test results:', latestTestId);
                    testResults = testStorage.getTestResults(latestTestId);
                }
            }

            // If still not found, return 404
            if (!testResults) {
                console.log('[Test] Test results not found for testId or language:', testId);
                if (req.session.testResults) {
                    console.log('[Test] Available test IDs in session:', Object.keys(req.session.testResults));
                }

                return res.status(404).json({
                    success: false,
                    message: 'Test results not found',
                });
            }
        }

        // Make sure testResults has a results array
        if (!testResults.results || !Array.isArray(testResults.results)) {
            console.log('[Test] Test results missing results array or not an array:', testResults);

            // Try to fix the structure if possible
            if (Array.isArray(testResults)) {
                // If testResults is itself an array, wrap it
                testResults = { results: testResults };
            } else {
                // Create an empty results array as fallback
                testResults.results = [];
            }
        }

        if (format === 'csv') {
            // Convert to CSV
            const csvHeader =
                'Utterance,Expected Intent,Recognized Intent,Intent Match,Confidence,Expected Slots,Recognized Slots,Slots Match,Overall Match\n';

            const csvRows = testResults.results
                .map((result) => {
                    const expectedSlotsStr = JSON.stringify(result.expected_slots || {});
                    const recognizedSlotsStr = JSON.stringify(result.slots || {});

                    return [
                        `"${(result.utterance || '').replace(/"/g, '""')}"`,
                        result.expected_intent || '',
                        result.recognized_intent || '',
                        result.intent_match ? 'Yes' : 'No',
                        result.confidence || 0,
                        `"${expectedSlotsStr.replace(/"/g, '""')}"`,
                        `"${recognizedSlotsStr.replace(/"/g, '""')}"`,
                        result.slots_match ? 'Yes' : 'No',
                        result.overall_match ? 'Yes' : 'No',
                    ].join(',');
                })
                .join('\n');

            const csvContent = csvHeader + csvRows;

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="test-results-${testId}.csv"`);

            return res.status(200).send(csvContent);
        } else {
            // Default to JSON
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="test-results-${testId}.json"`);

            return res.status(200).json(testResults);
        }
    } catch (error) {
        console.error('Error exporting test results:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Failed to export test results',
            error: error.message,
        });
    }
});

module.exports = router;
