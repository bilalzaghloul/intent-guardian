const fs = require('fs');
const path = require('path');

// Create a timestamp
const timestamp = new Date().toISOString();

// Create a test directory
const testDir = path.join(__dirname, 'test-logs');
if (!fs.existsSync(testDir)) {
  try {
    fs.mkdirSync(testDir, { recursive: true });
    console.log(`Created test directory: ${testDir}`);
  } catch (err) {
    console.error(`Failed to create test directory: ${err.message}`);
  }
}

// Write a test log file
const testFile = path.join(testDir, 'test-log.txt');
try {
  fs.writeFileSync(testFile, `Test log created at ${timestamp}\n`);
  console.log(`Wrote test log to: ${testFile}`);
} catch (err) {
  console.error(`Failed to write test log: ${err.message}`);
}

// Print to stdout directly
process.stdout.write(`\n\nDIRECT STDOUT: Test executed at ${timestamp}\n\n`);

// Exit with success
console.log('Test completed successfully');
process.exit(0);
