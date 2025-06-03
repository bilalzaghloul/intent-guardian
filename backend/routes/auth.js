const express = require('express');

// Export a function that takes sessions as a parameter
module.exports = (sessions) => {
  console.log('[Auth] Module initialized with sessions object');
  console.log('[Auth] Sessions object reference:', sessions === global.sessions ? 'Same as global' : 'Different from global');
  console.log('[Auth] Available sessions:', Object.keys(sessions));
  const router = express.Router();

  /**
   * @route   GET /api/auth/health
   * @desc    Health check endpoint
   * @access  Public
   */
  router.get('/health', (req, res) => {
    return res.status(200).json({
      success: true,
      message: 'Auth service is healthy',
      timestamp: new Date().toISOString()
    });
  });

  /**
   * @route   POST /api/auth/relay-token
   * @desc    Receive and store OAuth token from frontend
   * @access  Public
   */
  router.post('/relay-token', (req, res) => {
  try {
    const { token, region } = req.body;
    
    console.log('\n==== TOKEN RELAY REQUEST ====');
    console.log('[Auth] Received token relay request');
    console.log(`[Auth] Token provided: ${token ? 'yes' : 'no'}`);
    console.log(`[Auth] Region provided: ${region || 'no'}`);
    
    if (token) {
      console.log(`[Auth] Token length: ${token.length}`);
      console.log(`[Auth] Token starts with: ${token.substring(0, 10)}...`);
      console.log(`[Auth] Token format check - starts with 'Bearer'?: ${token.startsWith('Bearer ')}`);
    }
    
    console.log('[Auth] Request headers:', req.headers);
    console.log('[Auth] Request cookies:', req.cookies);
    
    if (!token) {
      console.log('[Auth] No token provided in request');
      return res.status(400).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    // Generate a session ID
    const sessionId = Math.random().toString(36).substring(2, 15);
    console.log(`[Auth] Generated new session ID: ${sessionId}`);
    
    // Clean the token (remove Bearer prefix if present)
    const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;
    console.log(`[Auth] Cleaned token length: ${cleanToken.length}`);
    console.log(`[Auth] Cleaned token starts with: ${cleanToken.substring(0, 10)}...`);
    
    // Store token in session
    sessions[sessionId] = {
      token: cleanToken, // Store the clean token without Bearer prefix
      createdAt: new Date(),
      userInfo: null,
      lastActivity: new Date(),
      region: region || 'mypurecloud.de' // Store the region, default to Frankfurt if not provided
    };
    
    console.log(`[Auth] Region stored in session: ${sessions[sessionId].region}`);
    
    console.log(`[Auth] Session created with token. Available sessions: ${Object.keys(sessions).length}`);
    console.log(`[Auth] Session details:`, {
      sessionId,
      tokenLength: cleanToken.length,
      createdAt: new Date().toISOString()
    });
    
    // Set session cookie
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    console.log('[Auth] Session cookie set');
    
    return res.status(200).json({
      success: true,
      message: 'Token received and stored successfully',
      sessionId
    });
  } catch (error) {
    console.error('Error in relay-token:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while processing token'
    });
  }
});

/**
 * Middleware to verify token
 */
const verifyToken = (req, res, next) => {
  const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
  
  if (!sessionId || !sessions[sessionId]) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized - No valid session'
    });
  }
  
  // Check token expiration (Genesys tokens typically expire after 24 hours)
  const sessionAge = new Date() - new Date(sessions[sessionId].createdAt);
  if (sessionAge > 24 * 60 * 60 * 1000) { // 24 hours in milliseconds
    delete sessions[sessionId];
    return res.status(401).json({
      success: false,
      message: 'Token expired, please log in again'
    });
  }
  
  // Update last activity
  sessions[sessionId].lastActivity = new Date();
  
  // Attach session to request
  req.session = sessions[sessionId];
  req.sessionId = sessionId;
  
  next();
};

  // Return the router
  return router;
};
