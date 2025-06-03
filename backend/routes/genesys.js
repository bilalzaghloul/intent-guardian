const express = require('express');
const router = express.Router();
const axios = require('axios');
const testStorage = require('../utils/testStorage');
// Authentication is now handled by sessionMiddleware in server.js

/**
 * @route   POST /api/genesys/test-utterance
 * @desc    Test a single utterance against Genesys NLU
 * @access  Private
 */
router.post('/test-utterance', async (req, res) => {
  try {
    console.log('\n==== TEST UTTERANCE REQUEST ====');
    console.log('[Genesys] Test utterance request received');
    
    // Get token from multiple sources with priority order
    const bodyToken = req.body.token;
    const queryToken = req.query.token;
    const authHeader = req.headers['authorization'];
    const sessionToken = req.session?.token;
    
    // Extract token from Authorization header if present
    const authToken = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;
    
    // Use the first available token with priority
    const token = bodyToken || queryToken || authToken || sessionToken;
    
    const { utterance, language, flowId, flowType, region: bodyRegion } = req.body;
    
    console.log('[Genesys] Token sources:');
    console.log(`  - Body token: ${bodyToken ? 'present' : 'not found'}`);
    console.log(`  - Query token: ${queryToken ? 'present' : 'not found'}`);
    console.log(`  - Auth header: ${authHeader ? 'present' : 'not found'}`);
    console.log(`  - Session token: ${sessionToken ? 'present' : 'not found'}`);
    console.log('[Genesys] Token available:', !!token);
    console.log('[Genesys] Token length:', token ? token.length : 0);
    
    if (token) {
      console.log(`[Genesys] Token starts with: ${token.substring(0, 10)}...`);
    }
    
    // Log request details at debug level
    console.log('[Genesys] Request body:', JSON.stringify(req.body, null, 2));
    console.log('[Genesys] Request query:', JSON.stringify(req.query, null, 2));
    console.log('[Genesys] Request headers:', JSON.stringify(req.headers, null, 2));
    
    if (!utterance || !language || !flowId) {
      return res.status(400).json({
        success: false,
        message: 'Utterance, language, and flowId are required'
      });
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token available for API call'
      });
    }
    
    // Extract region from multiple sources
    const region = req.query.region || bodyRegion || (req.session && req.session.region) || 'mypurecloud.com';
    console.log(`[Genesys] Using region: ${region}`);
    const baseUrl = `https://api.${region}`;
    
    // Make sure token doesn't have 'Bearer ' prefix
    const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;
    console.log(`[Genesys] Using clean token, length: ${cleanToken.length}`);
    console.log(`[Genesys] Token starts with: ${cleanToken.substring(0, 10)}...`);
    
    let nluResponse;
    
    // Different endpoints based on flow type
    if (flowType === 'legacy') {
      console.log(`[Genesys] Making API call to legacy bot flow endpoint: ${baseUrl}/api/v2/architect/botflows/${flowId}/predict`);
      // For legacy bot flows
      console.log(`[Genesys] Using language: ${language} for utterance: "${utterance}"`);
      const legacyPayload = {
        input: {
          text: utterance,
          language: language.toLowerCase()
        }
      };
      console.log(`[Genesys] Legacy payload: ${JSON.stringify(legacyPayload, null, 2)}`);
      
      nluResponse = await axios.post(`${baseUrl}/api/v2/architect/botflows/${flowId}/predict`, legacyPayload, {
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'Content-Type': 'application/json'
        }
      });
    } else {
      console.log(`[Genesys] Making API call to digital bot flow endpoint: ${baseUrl}/api/v2/flows/${flowId}/predict`);
      // For digital bot flows (newer)
      console.log(`[Genesys] Using language: ${language} for utterance: "${utterance}"`);
      const digitalPayload = {
        input: {
          text: utterance,
          language: language.toLowerCase()
        }
      };
      console.log(`[Genesys] Digital payload: ${JSON.stringify(digitalPayload, null, 2)}`);
      
      nluResponse = await axios.post(`${baseUrl}/api/v2/flows/${flowId}/predict`, digitalPayload, {
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Process the NLU response
    const result = {
      utterance,
      language,
      recognized_intent: nluResponse.data.intent?.name || 'none',
      confidence: nluResponse.data.intent?.confidence || 0,
      slots: nluResponse.data.slots || {},
      raw_response: nluResponse.data
    };
    
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error testing utterance:', error.response?.data || error.message);
    
    return res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to test utterance',
      error: error.response?.data || error.message
    });
  }
});

/**
 * @route   POST /api/genesys/batch-test
 * @desc    Test multiple utterances against a Genesys bot flow using the Language Understanding API
 * @access  Private
 */
router.post('/batch-test', async (req, res) => {
  try {
    console.log('[Genesys] Batch test request received');
    
    // Extract parameters from request body
    const { utterances, flowId, language = 'en-us' } = req.body;
    const bodyRegion = req.body.region;
    
    console.log(`[Genesys] Testing ${utterances?.length || 0} utterances against flow ${flowId}`);
    
    // Get token from multiple sources with priority order
    const bodyToken = req.body.token;
    const queryToken = req.query.token;
    const authHeader = req.headers['authorization'];
    const sessionToken = req.session?.token;
    
    // Extract token from Authorization header if present
    const authToken = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;
    
    // Use the first available token with priority
    const directToken = bodyToken || queryToken || authToken || sessionToken;
    
    console.log('[Genesys] Token sources:');
    console.log(`  - Body token: ${bodyToken ? 'present' : 'not found'}`);
    console.log(`  - Query token: ${queryToken ? 'present' : 'not found'}`);
    console.log(`  - Auth header: ${authHeader ? 'present' : 'not found'}`);
    console.log(`  - Session token: ${sessionToken ? 'present' : 'not found'}`);
    console.log('[Genesys] Token available:', !!directToken);
    
    let token;
    
    if (directToken) {
      console.log('[Genesys] Using direct token from request');
      token = directToken;
    } else {
      console.log('[Genesys] No direct token provided');
      
      // Fall back to session approach
      const sessionId = req.body.sessionId || req.headers['x-session-id'] || req.cookies?.sessionId;
      console.log('[Genesys] Falling back to session ID:', sessionId);
      console.log('[Genesys] Available sessions:', Object.keys(global.sessions || {}));
      
      if (!sessionId || !global.sessions || !global.sessions[sessionId]) {
        console.log('[Genesys] No valid session found');
        return res.status(401).json({
          success: false,
          message: 'Please provide a token directly or a valid session ID',
          availableSessions: Object.keys(global.sessions || {})
        });
      }
      
      // Try to get token from session
      if (!global.sessions[sessionId].token) {
        console.log('[Genesys] Session found but no token in it');
        return res.status(401).json({
          success: false,
          message: 'Session found but no token available'
        });
      }
      
      token = global.sessions[sessionId].token;
    }
    
    if (!token) {
      console.log('[Genesys] No token available for API call');
      return res.status(401).json({
        success: false,
        message: 'No token available for API call'
      });
    }
    
    console.log(`[Genesys] Using token for batch test, length: ${token.length}`);
    console.log(`[Genesys] Token starts with: ${token.substring(0, 10)}...`);
    
    if (!utterances || !Array.isArray(utterances) || utterances.length === 0) {
      console.log('[Genesys] No utterances provided');
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of utterances to test'
      });
    }
    
    if (!flowId) {
      console.log('[Genesys] No flow ID provided');
      return res.status(400).json({
        success: false,
        message: 'Please provide a flow ID'
      });
    }
    
    // Make sure token doesn't have 'Bearer ' prefix
    const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;
    
    // Extract region from multiple sources - default to Frankfurt
    const region = req.query.region || bodyRegion || (req.session && req.session.region) || 'mypurecloud.de';
    console.log(`[Genesys] Using region for batch test: ${region}`);
    
    const baseUrl = `https://api.${region}`;
    const results = [];
    
    // Define these variables at the outer scope so they're accessible throughout the function
    let domainId, domainVersionId;
    
    try {
      // First, get the flow configuration to extract domain and version IDs
      console.log(`[Genesys] Fetching flow configuration for flow ID: ${flowId}`);
      
      try {
        console.log('[Genesys] Calling internal API to get flow configuration');
        // Use our own flows/configuration endpoint to get the domain and version IDs
        const configResponse = await axios.get(
          `http://localhost:5000/api/flows/configuration?flowId=${flowId}&region=${region}`, 
          {
            headers: {
              'Authorization': `Bearer ${cleanToken}`,
              'Content-Type': 'application/json'
            },
            params: {
              token: cleanToken // Pass token directly in query params for better reliability
            },
            validateStatus: status => true // Don't throw for any status code
          }
        );
        
        // Check for auth errors
        if (configResponse.status === 401 || configResponse.status === 403) {
          console.error(`[Genesys] Authentication error: ${configResponse.status}`, configResponse.data);
          return res.status(configResponse.status).json({
            success: false,
            message: 'Authentication failed. Please log in again.',
            error: configResponse.data.error || configResponse.data
          });
        }
        
        // Check for other errors
        if (configResponse.status >= 400) {
          console.error(`[Genesys] API error: ${configResponse.status}`, configResponse.data);
          return res.status(configResponse.status).json({
            success: false,
            message: configResponse.data.message || 'Failed to get flow configuration',
            error: configResponse.data.error || configResponse.data
          });
        }
        
        console.log('[Genesys] Flow configuration retrieved successfully');
        console.log('[Genesys] Flow configuration response:', JSON.stringify(configResponse.data, null, 2));
        
        // Extract domain and version IDs from the response
        if (!configResponse.data || !configResponse.data.data) {
          console.error('[Genesys] Invalid flow configuration response format');
          return res.status(500).json({
            success: false,
            message: 'Invalid flow configuration response format',
            response: configResponse.data
          });
        }
        
        const { data } = configResponse.data;
        
        // Extract domain and version IDs from the response
        console.log('[Genesys] Extracting domain and version IDs from response data:', JSON.stringify(data, null, 2));
        
        if (data.nluDomainId && data.nluDomainVersionId) {
          // Direct access from data
          domainId = data.nluDomainId;
          domainVersionId = data.nluDomainVersionId;
          console.log('[Genesys] Found domain and version IDs directly in response');
        } else if (data.botFlowSettings && data.botFlowSettings.nluDomainId && data.botFlowSettings.nluDomainVersionId) {
          // Access from botFlowSettings
          domainId = data.botFlowSettings.nluDomainId;
          domainVersionId = data.botFlowSettings.nluDomainVersionId;
          console.log('[Genesys] Found domain and version IDs in botFlowSettings');
        } else if (data.domainId && data.domainVersionId) {
          // Legacy format
          domainId = data.domainId;
          domainVersionId = data.domainVersionId;
          console.log('[Genesys] Found domain and version IDs in legacy format');
        } else if (data.manifest && data.manifest.nluDomain) {
          // Try to get from manifest.nluDomain
          domainId = data.manifest.nluDomain.id;
          domainVersionId = data.manifest.nluDomain.version;
          console.log('[Genesys] Found domain and version IDs in manifest.nluDomain');
        }
        
        console.log(`[Genesys] Extracted domainId: ${domainId}, domainVersionId: ${domainVersionId}`);
        
        // Double check that we have valid domain and version IDs
        if (!domainId || !domainVersionId) {
          console.error('[Genesys] Domain ID or version ID not found in flow configuration');
          console.error('[Genesys] Flow configuration data:', JSON.stringify(data, null, 2));
          
          // Try one more approach - check if there's a domainId and versionId in the raw response
          if (configResponse.data && configResponse.data.data) {
            const rawData = configResponse.data.data;
            
            // Look for any properties that might contain domain or version information
            const possibleKeys = Object.keys(rawData);
            console.log('[Genesys] Available keys in response:', possibleKeys);
            
            // Try to find domain and version IDs in any property that contains 'domain' or 'version'
            for (const key of possibleKeys) {
              if (key.toLowerCase().includes('domain') && !key.toLowerCase().includes('version') && rawData[key]) {
                domainId = rawData[key];
                console.log(`[Genesys] Found possible domainId in key ${key}: ${domainId}`);
              }
              if (key.toLowerCase().includes('version') && rawData[key]) {
                domainVersionId = rawData[key];
                console.log(`[Genesys] Found possible domainVersionId in key ${key}: ${domainVersionId}`);
              }
            }
          }
          
          // If we still don't have domain and version IDs, return an error
          if (!domainId || !domainVersionId) {
            return res.status(400).json({
              success: false,
              message: 'Domain ID or version ID not found in flow configuration',
              flowConfig: data
            });
          }
        }
        
        console.log(`[Genesys] Final Domain ID: ${domainId}, Version ID: ${domainVersionId}`);
      } catch (innerError) {
        console.error('[Genesys] Error calling flow configuration endpoint:', innerError.message);
        return res.status(500).json({
          success: false,
          message: 'Error calling flow configuration endpoint',
          error: innerError.message
        });
      }
      
      console.log(`[Genesys] Domain ID: ${domainId}, Version ID: ${domainVersionId}`);
      
      // Process each utterance using the Language Understanding API
      for (const utterance of utterances) {
        try {
          // Call Genesys API directly using the Language Understanding API
          console.log(`[Genesys] Testing utterance: "${utterance.text}"`);
          
          // Format the request according to the example
          console.log(`[Genesys] Making NLU API call to ${baseUrl}/api/v2/languageunderstanding/domains/${domainId}/versions/${domainVersionId}/detect`);
          console.log(`[Genesys] Using token with length: ${cleanToken.length}`);
          console.log(`[Genesys] Token starts with: ${cleanToken.substring(0, 10)}...`);
          console.log(`[Genesys] Using language: ${language} for utterance: "${utterance.text}"`);
          
          // Prepare request payload with language parameter
          // Include language at both the top level and in the input object to ensure compatibility
          const requestPayload = {
            input: {
              text: utterance.text,
              language: language.toLowerCase()
            }
          };
          
          console.log(`[Genesys] Request payload: ${JSON.stringify(requestPayload, null, 2)}`);
          
          const nluResponse = await axios.post(
            `${baseUrl}/api/v2/languageunderstanding/domains/${domainId}/versions/${domainVersionId}/detect`, 
            requestPayload, 
            {
              headers: {
                'Authorization': `Bearer ${cleanToken}`,
                'Content-Type': 'application/json'
              },
              validateStatus: status => status < 500 // Don't throw for 4xx errors
            }
          );
          
          // Process the NLU response based on the Language Understanding API format
          console.log(`[Genesys] Response received for utterance: "${utterance.text}"`);
          
          // Extract the top intent from the response
          const intents = nluResponse.data.output?.intents || [];
          const topIntent = intents.length > 0 ? intents[0] : { name: 'none', probability: 0 };
          
          const utteranceResult = {
            utterance: utterance.text,
            language,
            recognized_intent: topIntent.name,
            confidence: topIntent.probability,
            slots: topIntent.entities || [],
            raw_response: nluResponse.data
          };
          
          console.log(`[Genesys] Recognized intent: ${utteranceResult.recognized_intent} with confidence: ${utteranceResult.confidence}`);
          
          // Compare expected vs. actual results
          const expectedIntent = utterance.expected_intent;
          const expectedSlots = utterance.expected_slots || {};
          
          // Check if intent matches
          const intentMatch = utteranceResult.recognized_intent === expectedIntent;
          
          // Check if slots match
          let slotsMatch = true;
          
          // If we have expected slots, check if they match
          if (Object.keys(expectedSlots).length > 0) {
            // Convert slots array to a map for easier lookup
            const slotsMap = {};
            utteranceResult.slots.forEach(slot => {
              slotsMap[slot.name] = slot.value && (slot.value.resolved || slot.value.raw);
            });
            
            console.log(`[Genesys] Expected slots: ${JSON.stringify(expectedSlots)}`);
            console.log(`[Genesys] Actual slots: ${JSON.stringify(slotsMap)}`);
            
            // Check each expected slot
            for (const [slotName, expectedValue] of Object.entries(expectedSlots)) {
              const actualValue = slotsMap[slotName];
              
              // If the slot is missing or value doesn't match, mark as not matching
              if (!actualValue || actualValue !== expectedValue) {
                console.log(`[Genesys] Slot mismatch: ${slotName} expected=${expectedValue}, actual=${actualValue}`);
                slotsMatch = false;
                break;
              }
            }
          } else if (utteranceResult.slots.length > 0) {
            // If we have no expected slots but got some, that's still a match
            console.log(`[Genesys] No expected slots, but got ${utteranceResult.slots.length} slots`);
            slotsMatch = true;
          }
          
          results.push({
            ...utteranceResult,
            expected_intent: expectedIntent,
            expected_slots: expectedSlots,
            intent_match: intentMatch,
            slots_match: slotsMatch,
            overall_match: intentMatch && slotsMatch
          });
        } catch (utteranceError) {
          console.error(`[Genesys] Error testing utterance "${utterance.text}":`, utteranceError.message);
          
          // Add failed result
          results.push({
            utterance: utterance.text,
            language,
            error: utteranceError.message,
            expected_intent: utterance.expected_intent,
            expected_slots: utterance.expected_slots || {},
            intent_match: false,
            slots_match: false,
            overall_match: false
          });
        }
      }
      
      // Store test results in session if available
      const testId = `batch-test-${Date.now()}`;
      console.log(`[Genesys] Generated test ID: ${testId}`);
      
      if (req.session) {
        // Create a complete test results object with all necessary data
        const testResultsObj = {
          id: testId,
          test_id: testId, // Include both formats for compatibility
          language,
          results,
          timestamp: new Date().toISOString(),
          flowId: flowId,
          summary: {
            total: results.length,
            matched: results.filter(r => r.overall_match).length,
            failed: results.filter(r => !r.overall_match).length
          }
        };
        
        // Store as lastTestResults for backward compatibility
        req.session.lastTestResults = testResultsObj;
        
        // Also store in testResults object for export functionality
        if (!req.session.testResults) {
          req.session.testResults = {};
        }
        
        // Store with the testId as the key
        req.session.testResults[testId] = testResultsObj;
        
        // Also save to persistent storage
        testStorage.saveTestResults(testId, testResultsObj);
        
        console.log(`[Genesys] Stored test results in session and persistent storage with ID: ${testId}`);
      } else {
        console.log('[Genesys] No valid session found, skipping session storage');
      }
      
      // Return results
      return res.status(200).json({
        success: true,
        results,
        summary: {
          total: results.length,
          matched: results.filter(r => r.overall_match).length,
          failed: results.filter(r => !r.overall_match).length
        }
      });
    } catch (configError) {
      console.error('[Genesys] Error getting flow configuration:', configError.message);
      
      return res.status(500).json({
        success: false,
        message: 'Error getting flow configuration',
        error: configError.message
      });
    }
  } catch (error) {
    console.error('[Genesys] Batch test error:', error.message);
    
    return res.status(500).json({
      success: false,
      message: 'Error processing batch test',
      error: error.message
    });
  }
});

module.exports = router;
