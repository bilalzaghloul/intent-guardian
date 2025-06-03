const express = require('express');
const router = express.Router();
const axios = require('axios');
// Authentication is now handled by sessionMiddleware in server.js

/**
 * @route   GET /api/flows/list
 * @desc    Get list of available bot flows
 * @access  Private
 */
router.get('/list', async (req, res) => {
  try {
    console.log('[FlowsAPI] List request received');
    console.log('[FlowsAPI] Request query:', req.query);
    // The token should be passed directly in the request headers or query
    const directToken = req.query.token || req.headers['authorization']?.replace('Bearer ', '');
    
    let token;
    
    if (directToken) {
      console.log('[FlowsAPI] Using direct token from request');
      token = directToken;
    } else {
      console.log('[FlowsAPI] No direct token provided');
      
      // Fall back to session approach
      const sessionId = req.query.sessionId || req.headers['x-session-id'] || req.cookies?.sessionId;
      console.log('[FlowsAPI] Falling back to session ID:', sessionId);
      console.log('[FlowsAPI] Available sessions:', Object.keys(global.sessions));
      
      if (!sessionId || !global.sessions[sessionId]) {
        console.log('[FlowsAPI] No valid session found');
        return res.status(401).json({
          success: false,
          message: 'Please provide a token directly or a valid session ID',
          availableSessions: Object.keys(global.sessions)
        });
      }
      
      // Try to get token from session
      if (!global.sessions[sessionId].token) {
        console.log('[FlowsAPI] Session found but no token in it');
        return res.status(401).json({
          success: false,
          message: 'Session found but no token available'
        });
      }
      
      token = global.sessions[sessionId].token;
    }
    
    // Extract region from token or request - default to mypurecloud.de for Frankfurt
    const region = req.query.region || (req.session && req.session.region) || 'mypurecloud.de';
    const baseUrl = `https://api.${region}`;
    
    console.log(`[FlowsAPI] Using region: ${region} and token length: ${token.length}`);
    
    // Call Genesys Cloud API to get flows
    // First try to get Digital Bot Flows (newer)
    try {
      console.log('[FlowsAPI] Making API call to Genesys with token:', token.substring(0, 10) + '...');
      
      // Ensure token doesn't have 'Bearer ' prefix already
      const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;
      
      const response = await axios.get(`${baseUrl}/api/v2/flows`, {
        params: {
          type: 'bot',
          pageSize: 100
        },
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      return res.status(200).json({
        success: true,
        data: response.data.entities || []
      });
    } catch (digitalBotError) {
      console.log('Digital Bot Flows not found, trying legacy Bot Flows');
      
      // If digital bot flows fail, try legacy bot flows
      const legacyResponse = await axios.get(`${baseUrl}/api/v2/architect/botflows`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      return res.status(200).json({
        success: true,
        data: legacyResponse.data.entities || [],
        flowType: 'legacy'
      });
    }
  } catch (error) {
    console.error('Error fetching flows:', error.response?.data || error.message);
    
    return res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to fetch flows',
      error: error.response?.data || error.message
    });
  }
});

/**
 * @route   GET /api/flows/configuration
 * @desc    Get latest configuration for a flow and extract NLU metadata
 * @access  Private
 */
router.get('/configuration', async (req, res) => {
  try {
    console.log('[FlowsAPI] Configuration request received');
    console.log('[FlowsAPI] Request query:', req.query);
    
    // IMPORTANT: For this emergency fix, we'll use a direct token approach
    // The token should be passed directly in the request headers or query
    const directToken = req.query.token || req.headers['authorization']?.replace('Bearer ', '');
    
    let token;
    
    if (directToken) {
      console.log('[FlowsAPI] Using direct token from request');
      token = directToken;
    } else {
      console.log('[FlowsAPI] No direct token provided');
      
      // Fall back to session approach
      const sessionId = req.query.sessionId || req.headers['x-session-id'] || req.cookies?.sessionId;
      console.log('[FlowsAPI] Falling back to session ID:', sessionId);
      
      if (!sessionId || !global.sessions[sessionId]) {
        console.log('[FlowsAPI] No valid session found');
        return res.status(401).json({
          success: false,
          message: 'Please provide a token directly or a valid session ID'
        });
      }
      
      // Try to get token from session
      if (!global.sessions[sessionId].token) {
        console.log('[FlowsAPI] Session found but no token in it');
        return res.status(401).json({
          success: false,
          message: 'Session found but no token available'
        });
      }
      
      token = global.sessions[sessionId].token;
    }
    
    const { flowId } = req.query;
    
    console.log('[FlowsAPI] Getting configuration for flow:', flowId);
    console.log('[FlowsAPI] Using token, length:', token.length);
    
    if (!flowId) {
      return res.status(400).json({
        success: false,
        message: 'Flow ID is required'
      });
    }
    
    // Extract region from token or request - default to mypurecloud.de for Frankfurt
    const region = req.query.region || (req.session && req.session.region) || 'mypurecloud.de';
    const baseUrl = `https://api.${region}`;
    
    // Make sure token doesn't have 'Bearer ' prefix
    const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;
    
    // Get the latest configuration for the flow
    const configResponse = await axios.get(`${baseUrl}/api/v2/flows/${flowId}/latestConfiguration?deleted=true`, {
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Content-Type': 'application/json'
      },
      validateStatus: status => status < 500 // Don't throw for 4xx errors
    });
    
    // Check for auth errors
    if (configResponse.status === 401 || configResponse.status === 403) {
      console.error(`[FlowsAPI] Authentication error: ${configResponse.status}`, configResponse.data);
      return res.status(configResponse.status).json({
        success: false,
        message: 'Authentication failed. Please log in again.',
        error: configResponse.data
      });
    }
    
    // Check for other errors
    if (configResponse.status >= 400) {
      console.error(`[FlowsAPI] API error: ${configResponse.status}`, configResponse.data);
      return res.status(configResponse.status).json({
        success: false,
        message: `Failed to get flow configuration: ${configResponse.data.message || 'Unknown error'}`,
        error: configResponse.data
      });
    }
    
    // Extract NLU metadata from multiple sources
    const nluMetaData = configResponse.data.nluMetaData || {};
    const botFlowSettings = configResponse.data.botFlowSettings || {};
    const manifest = configResponse.data.manifest || {};
    
    console.log('[FlowsAPI] botFlowSettings:', JSON.stringify(botFlowSettings, null, 2));
    
    // Get domain and version IDs from botFlowSettings
    const domainId = botFlowSettings.nluDomainId || nluMetaData.domainId;
    const domainVersionId = botFlowSettings.nluDomainVersionId || nluMetaData.domainVersionId;
    
    // Log domain and version IDs
    console.log(`[FlowsAPI] Domain ID: ${domainId}, Version ID: ${domainVersionId}`);
    
    // Extract raw NLU data
    const rawNlu = nluMetaData.rawNlu || '{}';
    
    // Parse the raw NLU data
    let nluData;
    try {
      nluData = JSON.parse(rawNlu);
      console.log('[FlowsAPI] Successfully parsed NLU data');
    } catch (parseError) {
      console.error('[FlowsAPI] Error parsing NLU data:', parseError.message);
      nluData = {};
    }
    
    // Extract intents and entities for the UI
    const intents = nluData.intents || [];
    const entities = nluData.entities || [];
    const entityTypes = nluData.entityTypes || [];
    const language = nluData.language || 'en-us';
    
    // Format the data for the UI
    const extractedData = {
      intents: intents.map(intent => ({
        name: intent.name,
        entityReferences: intent.entityNameReferences || [],
        utterances: (intent.utterances || []).length
      })),
      entities: entities.map(entity => ({
        name: entity.name,
        type: entity.type
      })),
      entityTypes: entityTypes.map(entityType => ({
        name: entityType.name,
        mechanism: entityType.mechanism?.type || 'unknown'
      })),
      language
    };
    
    // Get NLU domain information
    const nluDomain = manifest.nluDomain || {};
    
    return res.status(200).json({
      success: true,
      data: {
        flowId,
        nluData: extractedData,
        domainId,
        domainVersionId,
        botFlowSettings,
        manifest: {
          nluDomain
        }
      }
    });
  } catch (error) {
    console.error('Error getting flow configuration:', error.response?.data || error.message);
    
    return res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to get flow configuration',
      error: error.response?.data || error.message
    });
  }
});

/**
 * @route   GET /api/flows/details
 * @desc    Get details of a specific flow
 * @access  Private
 */
router.get('/details', async (req, res) => {
  try {
    console.log('[FlowsAPI] Details request received');
    console.log('[FlowsAPI] Request query:', req.query);
    
    // IMPORTANT: For this emergency fix, we'll use a direct token approach
    // The token should be passed directly in the request headers or query
    const directToken = req.query.token || req.headers['authorization']?.replace('Bearer ', '');
    
    let token;
    
    if (directToken) {
      console.log('[FlowsAPI] Using direct token from request');
      token = directToken;
    } else {
      console.log('[FlowsAPI] No direct token provided');
      
      // Fall back to session approach
      const sessionId = req.query.sessionId || req.headers['x-session-id'] || req.cookies?.sessionId;
      console.log('[FlowsAPI] Falling back to session ID:', sessionId);
      console.log('[FlowsAPI] Available sessions:', Object.keys(global.sessions || {}));
      
      if (!sessionId || !global.sessions || !global.sessions[sessionId]) {
        console.log('[FlowsAPI] No valid session found');
        return res.status(401).json({
          success: false,
          message: 'Please provide a token directly or a valid session ID',
          availableSessions: Object.keys(global.sessions || {})
        });
      }
      
      // Try to get token from session
      if (!global.sessions[sessionId].token) {
        console.log('[FlowsAPI] Session found but no token in it');
        return res.status(401).json({
          success: false,
          message: 'Session found but no token available'
        });
      }
      
      token = global.sessions[sessionId].token;
    }
    
    const { flowId } = req.query;
    
    if (!flowId) {
      return res.status(400).json({
        success: false,
        message: 'Flow ID is required'
      });
    }
    
    // Extract region from token or request - default to mypurecloud.de for Frankfurt
    const region = req.query.region || (req.session && req.session.region) || 'mypurecloud.de';
    const baseUrl = `https://api.${region}`;
    
    // Make sure token doesn't have 'Bearer ' prefix
    const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;
    
    try {
      console.log(`[FlowsAPI] Calling API: ${baseUrl}/api/v2/flows/${flowId}`);
      
      // First get flow details from Genesys API
      const flowResponse = await axios.get(`${baseUrl}/api/v2/flows/${flowId}`, {
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'Content-Type': 'application/json'
        },
        validateStatus: status => status < 500 // Don't throw for 4xx errors
      });
      
      // Check for auth errors
      if (flowResponse.status === 401 || flowResponse.status === 403) {
        console.error(`[FlowsAPI] Authentication error: ${flowResponse.status}`, flowResponse.data);
        return res.status(flowResponse.status).json({
          success: false,
          message: 'Authentication failed. Please log in again.',
          error: flowResponse.data
        });
      }
      
      // Check for other errors
      if (flowResponse.status >= 400) {
        console.error(`[FlowsAPI] API error: ${flowResponse.status}`, flowResponse.data);
        return res.status(flowResponse.status).json({
          success: false,
          message: `Failed to get flow details: ${flowResponse.data.message || 'Unknown error'}`,
          error: flowResponse.data
        });
      }
      
      console.log(`[FlowsAPI] Calling API: ${baseUrl}/api/v2/flows/${flowId}/latestConfiguration?deleted=true`);
      
      // Then get the flow configuration to extract NLU metadata
      const configResponse = await axios.get(`${baseUrl}/api/v2/flows/${flowId}/latestConfiguration?deleted=true`, {
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'Content-Type': 'application/json'
        },
        validateStatus: status => status < 500 // Don't throw for 4xx errors
      });
      
      // Check for auth errors
      if (configResponse.status === 401 || configResponse.status === 403) {
        console.error(`[FlowsAPI] Authentication error: ${configResponse.status}`, configResponse.data);
        return res.status(configResponse.status).json({
          success: false,
          message: 'Authentication failed. Please log in again.',
          error: configResponse.data
        });
      }
      
      // Check for other errors
      if (configResponse.status >= 400) {
        console.error(`[FlowsAPI] API error: ${configResponse.status}`, configResponse.data);
        return res.status(configResponse.status).json({
          success: false,
          message: `Failed to get flow configuration: ${configResponse.data.message || 'Unknown error'}`,
          error: configResponse.data
        });
      }
      
      // Extract NLU metadata from multiple sources
      const nluMetaData = configResponse.data.nluMetaData || {};
      const botFlowSettings = configResponse.data.botFlowSettings || {};
      const manifest = configResponse.data.manifest || {};
      
      // Get domain and version IDs from botFlowSettings
      const domainId = botFlowSettings.nluDomainId || nluMetaData.domainId;
      const domainVersionId = botFlowSettings.nluDomainVersionId || nluMetaData.domainVersionId;
      
      console.log(`[FlowsAPI] Domain ID: ${domainId}, Version ID: ${domainVersionId}`);
      
      // Extract raw NLU data
      const rawNlu = nluMetaData.rawNlu || '{}';
      
      // Parse the raw NLU data
      let nluData;
      try {
        nluData = JSON.parse(rawNlu);
        console.log('[FlowsAPI] Successfully parsed NLU data');
      } catch (parseError) {
        console.error('[FlowsAPI] Error parsing NLU data:', parseError.message);
        nluData = {};
      }
      
      // Extract intents and entities for the UI
      const intents = nluData.intents || [];
      const entities = nluData.entities || [];
      const entityTypes = nluData.entityTypes || [];
      const language = nluData.language || 'en-us';
      const supportedLanguages = configResponse.data.supportedLanguages || [];
      
      // Format the data for the UI
      const flowDetails = {
        id: flowId,
        name: flowResponse.data.name,
        description: flowResponse.data.description || 'No description available',
        type: flowResponse.data.type,
        intents: intents.map(intent => ({
          name: intent.name,
          entityReferences: intent.entityNameReferences || [],
          utterances: (intent.utterances || []).length
        })),
        entities: entities.map(entity => {
          // Find the corresponding entityType to get the values
          const entityType = entityTypes.find(et => et.name === entity.type);
          let values = [];
          
          // Extract values from the entityType mechanism if it exists and is a List
          if (entityType && entityType.mechanism && entityType.mechanism.type === 'List' && 
              entityType.mechanism.items && Array.isArray(entityType.mechanism.items)) {
            // Extract the primary values from the items
            values = entityType.mechanism.items.map(item => item.value);
          }
          
          return {
            name: entity.name,
            type: entity.type,
            values: values
          };
        }),
        entityTypes: entityTypes.map(entityType => {
          const mechanismType = entityType.mechanism?.type || 'unknown';
          const mechanismItems = entityType.mechanism?.items || [];
          
          return {
            name: entityType.name,
            mechanism: mechanismType,
            items: mechanismItems.map(item => ({
              value: item.value,
              synonyms: item.synonyms || []
            }))
          };
        }),
        language,
        supportedLanguages,
        nluDomainId: domainId,
        nluDomainVersionId: domainVersionId,
        botFlowSettings
      };
      
      return res.status(200).json({
        success: true,
        data: flowDetails
      });
    } catch (apiError) {
      console.error('[FlowsAPI] API error:', apiError.message);
      return res.status(apiError.response?.status || 500).json({
        success: false,
        message: 'Failed to get flow details',
        error: apiError.response?.data || apiError.message
      });
    }
  } catch (error) {
    console.error('[FlowsAPI] Error in details endpoint:', error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to get flow details',
      error: error.response?.data || error.message
    });
  }
});

module.exports = router;
