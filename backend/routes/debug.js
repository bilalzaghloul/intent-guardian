const express = require('express');
const router = express.Router();
const axios = require('axios');

/**
 * @route   GET /api/debug/token
 * @desc    Debug token information
 * @access  Public
 */
router.get('/token', (req, res) => {
  try {
    // Get token from multiple sources
    const authHeader = req.headers['authorization'];
    const bodyToken = req.body?.token;
    const queryToken = req.query?.token;
    const sessionId = req.cookies?.sessionId || req.headers['x-session-id'] || req.query?.sessionId;
    
    console.log('\n==== TOKEN DEBUG REQUEST ====');
    console.log('[Debug] Token debug request received');
    
    // Log token sources
    console.log('[Debug] Token sources:');
    console.log(`  - Auth header: ${authHeader ? 'present' : 'not found'}`);
    console.log(`  - Body token: ${bodyToken ? 'present' : 'not found'}`);
    console.log(`  - Query token: ${queryToken ? 'present' : 'not found'}`);
    
    // Extract token details
    let tokenDetails = {};
    
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
      tokenDetails.authHeader = {
        length: token.length,
        prefix: token.substring(0, 10),
        suffix: token.substring(token.length - 10),
      };
    }
    
    if (bodyToken) {
      tokenDetails.bodyToken = {
        length: bodyToken.length,
        prefix: bodyToken.substring(0, 10),
        suffix: bodyToken.substring(bodyToken.length - 10),
      };
    }
    
    if (queryToken) {
      tokenDetails.queryToken = {
        length: queryToken.length,
        prefix: queryToken.substring(0, 10),
        suffix: queryToken.substring(queryToken.length - 10),
      };
    }
    
    // Check session
    let sessionDetails = null;
    if (sessionId && global.sessions[sessionId]) {
      const session = global.sessions[sessionId];
      sessionDetails = {
        id: sessionId,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        hasToken: !!session.token,
        tokenLength: session.token ? session.token.length : 0,
        tokenPrefix: session.token ? session.token.substring(0, 10) : null,
        tokenSuffix: session.token ? session.token.substring(session.token.length - 10) : null,
      };
    }
    
    // Test token against Genesys API
    const token = authHeader?.substring(7) || queryToken || bodyToken || (sessionDetails?.hasToken ? global.sessions[sessionId].token : null);
    
    return res.status(200).json({
      success: true,
      message: 'Token debug information',
      data: {
        tokenSources: {
          authHeader: !!authHeader,
          bodyToken: !!bodyToken,
          queryToken: !!queryToken,
        },
        tokenDetails,
        sessionId,
        sessionDetails,
        allSessions: Object.keys(global.sessions).map(id => ({
          id,
          createdAt: global.sessions[id].createdAt,
          hasToken: !!global.sessions[id].token,
          tokenLength: global.sessions[id].token ? global.sessions[id].token.length : 0,
        })),
      }
    });
  } catch (error) {
    console.error('Error in token debug:', error);
    return res.status(500).json({
      success: false,
      message: 'Error debugging token',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/debug/test-genesys
 * @desc    Test Genesys API with provided token
 * @access  Public
 */
router.post('/test-genesys', async (req, res) => {
  try {
    const { token, region = 'mypurecloud.com', flowId } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }
    
    console.log('\n==== TEST GENESYS REQUEST ====');
    console.log(`[Debug] Testing Genesys API with token length: ${token.length}`);
    console.log(`[Debug] Token starts with: ${token.substring(0, 10)}...`);
    console.log(`[Debug] Using region: ${region}`);
    
    // Clean token (remove Bearer prefix if present)
    const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;
    
    // Make a simple request to Genesys API
    const baseUrl = `https://api.${region}`;
    let apiResponse;
    
    try {
      // Try to get organization details as a simple test
      apiResponse = await axios.get(`${baseUrl}/api/v2/organizations/me`, {
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      return res.status(200).json({
        success: true,
        message: 'Genesys API test successful',
        data: {
          tokenWorks: true,
          organization: apiResponse.data
        }
      });
    } catch (apiError) {
      console.error('[Debug] Genesys API test failed:', apiError.response?.data || apiError.message);
      
      return res.status(200).json({
        success: false,
        message: 'Genesys API test failed',
        data: {
          tokenWorks: false,
          error: apiError.response?.data || apiError.message,
          status: apiError.response?.status
        }
      });
    }
  } catch (error) {
    console.error('Error testing Genesys API:', error);
    return res.status(500).json({
      success: false,
      message: 'Error testing Genesys API',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/debug/comprehensive-test
 * @desc    Test multiple Genesys API endpoints with provided token
 * @access  Public
 */
router.post('/comprehensive-test', async (req, res) => {
  try {
    const { token, region = 'mypurecloud.com' } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }
    
    console.log('\n==== COMPREHENSIVE TEST REQUEST ====');
    console.log(`[Debug] Testing Genesys API with token length: ${token.length}`);
    console.log(`[Debug] Token starts with: ${token.substring(0, 10)}...`);
    console.log(`[Debug] Using region: ${region}`);
    
    // Clean token (remove Bearer prefix if present)
    const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;
    
    // Create a log directory if it doesn't exist
    const fs = require('fs');
    const path = require('path');
    const logDir = path.join(__dirname, '..', 'debug-logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Create a log file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = path.join(logDir, `token-test-${timestamp}.log`);
    const logStream = fs.createWriteStream(logFile, { flags: 'a' });
    
    logStream.write(`Comprehensive Token Test - ${new Date().toISOString()}\n`);
    logStream.write(`Token Length: ${cleanToken.length}\n`);
    logStream.write(`Token Start: ${cleanToken.substring(0, 10)}...\n`);
    logStream.write(`Region: ${region}\n\n`);
    
    // Define endpoints to test
    const endpoints = [
      '/api/v2/authorization/permissions?pageSize=1',
      '/api/v2/organizations/me',
      '/api/v2/users/me',
      '/api/v2/flows?pageSize=1'
    ];
    
    const results = [];
    let anySuccess = false;
    
    // Test each endpoint
    for (const endpoint of endpoints) {
      try {
        console.log(`[Debug] Testing endpoint: ${endpoint}`);
        logStream.write(`Testing endpoint: ${endpoint}\n`);
        
        const startTime = Date.now();
        const response = await axios.get(`https://api.${region}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${cleanToken}`,
            'Content-Type': 'application/json'
          },
          validateStatus: () => true, // Don't throw for any status code
          timeout: 10000 // 10 second timeout
        });
        const endTime = Date.now();
        
        const result = {
          endpoint,
          status: response.status,
          statusText: response.statusText,
          time: endTime - startTime,
          success: response.status >= 200 && response.status < 300
        };
        
        if (result.success) {
          anySuccess = true;
        }
        
        results.push(result);
        
        console.log(`[Debug] Endpoint ${endpoint} result: ${result.status} ${result.statusText}`);
        logStream.write(`Result: ${result.status} ${result.statusText}\n`);
        logStream.write(`Time: ${result.time}ms\n`);
        
        if (result.success) {
          logStream.write(`Success: true\n`);
        } else {
          logStream.write(`Success: false\n`);
          logStream.write(`Error: ${JSON.stringify(response.data, null, 2)}\n`);
        }
        
        logStream.write('\n');
      } catch (error) {
        console.error(`[Debug] Error testing endpoint ${endpoint}:`, error.message);
        logStream.write(`Error testing endpoint ${endpoint}: ${error.message}\n\n`);
        
        results.push({
          endpoint,
          status: error.response?.status || 500,
          statusText: error.response?.statusText || error.message,
          time: 0,
          success: false
        });
      }
    }
    
    logStream.end();
    
    console.log(`[Debug] Comprehensive test results saved to ${logFile}`);
    
    return res.status(200).json({
      success: true,
      tokenValid: anySuccess,
      results,
      logFile: path.basename(logFile)
    });
  } catch (error) {
    console.error('Error in comprehensive test:', error);
    return res.status(500).json({
      success: false,
      message: 'Error in comprehensive test',
      error: error.message
    });
  }
});

module.exports = router;
