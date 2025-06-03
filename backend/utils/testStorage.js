const fs = require('fs');
const path = require('path');

// Create a storage directory if it doesn't exist
const storageDir = path.join(__dirname, '../data');
const testResultsDir = path.join(storageDir, 'test-results');

// Ensure directories exist
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir);
}
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir);
}

/**
 * Save test results to persistent storage
 * @param {string} testId - The unique test ID
 * @param {object} testData - The test results data
 * @returns {boolean} - Success status
 */
const saveTestResults = (testId, testData) => {
  try {
    const filePath = path.join(testResultsDir, `${testId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(testData, null, 2));
    console.log(`[TestStorage] Saved test results to ${filePath}`);
    return true;
  } catch (error) {
    console.error('[TestStorage] Error saving test results:', error.message);
    return false;
  }
};

/**
 * Get test results from persistent storage
 * @param {string} testId - The unique test ID
 * @returns {object|null} - The test results data or null if not found
 */
const getTestResults = (testId) => {
  try {
    const filePath = path.join(testResultsDir, `${testId}.json`);
    if (!fs.existsSync(filePath)) {
      console.log(`[TestStorage] Test results file not found: ${filePath}`);
      return null;
    }
    
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[TestStorage] Error reading test results:', error.message);
    return null;
  }
};

/**
 * List all available test results
 * @returns {Array} - Array of test IDs
 */
const listTestResults = () => {
  try {
    const files = fs.readdirSync(testResultsDir);
    return files
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''));
  } catch (error) {
    console.error('[TestStorage] Error listing test results:', error.message);
    return [];
  }
};

module.exports = {
  saveTestResults,
  getTestResults,
  listTestResults
};
