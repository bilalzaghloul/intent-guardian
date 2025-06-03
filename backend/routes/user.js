const express = require('express');
const router = express.Router();
const axios = require('axios');

/**
 * @route   GET /api/user/org
 * @desc    Get organization details for logged-in user
 * @access  Private
 */
router.get('/org', async (req, res) => {
  console.log('\n==== ORG REQUEST ====');
  console.log('[User] Organization details request received');
  
  // Get token from multiple sources
  const sessionToken = req.session?.token;
  const authHeader = req.headers['authorization'];
  const queryToken = req.query?.token;
  
  console.log(`[User] Token sources:`);
  console.log(`  - Session token: ${sessionToken ? 'present' : 'not found'}`);
  console.log(`  - Auth header: ${authHeader ? 'present' : 'not found'}`);
  console.log(`  - Query token: ${queryToken ? 'present' : 'not found'}`);
  
  // Use the first available token
  const token = sessionToken || 
               (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader) || 
               queryToken;
  
  if (!token) {
    console.log('[User] No token available from any source');
    return res.status(401).json({
      success: false,
      message: 'Unauthorized - No valid token found'
    });
  }
  
  console.log(`[User] Using token with length: ${token.length}`);
  console.log(`[User] Token starts with: ${token.substring(0, 10)}...`);
  
  try {
    // Extract region from token or request
    const region = req.query.region || 'mypurecloud.de'; // Default to Frankfurt region
    const baseUrl = `https://api.${region}`;
    
    // Store region in session for use in other endpoints
    if (req.session) {
      req.session.region = region;
      console.log(`[User] Region stored in session: ${region}`);
    }
    
    console.log(`[User] Using region: ${region}`);
    console.log(`[User] API base URL: ${baseUrl}`);
    
    // For debugging, use a lightweight API call first to validate token
    let testSuccess = false;
    try {
      console.log('[User] Making test API call to validate token...');
      const testResponse = await axios.get(`${baseUrl}/api/v2/authorization/permissions?pageSize=1`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 8000 // 8 second timeout
      });
      console.log(`[User] Test API call successful: ${testResponse.status}`);
      testSuccess = true;
    } catch (testError) {
      console.warn(`[User] Test API call failed: ${testError.message}`);
      console.warn(`[User] Status code: ${testError.response?.status || 'unknown'}`);
      console.warn(`[User] Error data: ${JSON.stringify(testError.response?.data || {})}`);
      
      // If the token is invalid, return a more helpful error
      if (testError.response?.status === 401) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token - authentication failed',
          error: testError.response?.data || { message: testError.message }
        });
      }
    }
    
    // Call Genesys Cloud API to get user details instead of organization
    console.log('[User] Calling Genesys API for user details...');
    try {
      const response = await axios.get(`${baseUrl}/api/v2/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });
      
      console.log('[User] User details retrieved successfully');
      
      // Store user info in session if available
      if (req.session) {
        req.session.orgInfo = response.data;
        console.log('[User] User info stored in session');
      }
      
      return res.status(200).json({
        success: true,
        data: response.data
      });
    } catch (userError) {
      console.error(`[User] Error fetching user details: ${userError.message}`);
      console.error(`[User] Status code: ${userError.response?.status || 'unknown'}`);
      
      // If test was successful but user details failed, return a fallback response
      if (testSuccess) {
        console.log('[User] Test was successful but user details failed, returning fallback');
        return res.status(200).json({
          success: true,
          data: {
            id: 'unknown',
            name: 'Unknown User',
            _fallback: true
          },
          message: 'Using fallback user data due to API error'
        });
      }
      
      // Otherwise return the error
      return res.status(userError.response?.status || 500).json({
        success: false,
        message: 'Failed to fetch user details',
        error: userError.response?.data || { message: userError.message }
      });
    }
  } catch (error) {
    console.error('Unexpected error in /org endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/user/session
 * @desc    Get current session info
 * @access  Private
 */
router.get('/session', (req, res) => {
  // Check if user is authenticated
  if (!req.session || !req.session.token) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized - No valid session'
    });
  }
  // Return session info without sensitive data
  const sessionInfo = {
    createdAt: req.session.createdAt,
    lastActivity: req.session.lastActivity,
    orgInfo: req.session.orgInfo,
    hasValidToken: !!req.session.token
  };
  
  return res.status(200).json({
    success: true,
    data: sessionInfo
  });
});

module.exports = router;