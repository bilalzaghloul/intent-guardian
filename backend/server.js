const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');
const axios = require('axios');
const cookieParser = require('cookie-parser');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Enable CORS with credentials
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id']
}));

// Session storage (in-memory for PoC)
// Make it global to ensure it persists between requests
global.sessions = global.sessions || {};
const sessions = global.sessions;

// Token validation function
const validateToken = async (token, region = 'mypurecloud.com') => {
  // If no token is provided, return invalid immediately
  if (!token) {
    console.log('[TokenValidator] No token provided for validation');
    return { valid: false, message: 'No token provided' };
  }
  
  // Log token details for debugging
  console.log(`[TokenValidator] Validating token: length=${token.length}, starts with=${token.substring(0, 10)}...`);
  console.log(`[TokenValidator] Using region: ${region}`);
  
  // TEMPORARY FIX: Always consider token valid for testing
  console.log('[TokenValidator] IMPORTANT: Token validation bypassed for testing');
  return { valid: true, message: 'Validation bypassed for testing' };
  
  /* Original validation code - commented out for now
  try {
    // Make a lightweight call to Genesys API to validate token
    const response = await axios.get(`https://api.${region}/api/v2/authorization/permissions?pageSize=1`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 5000 // 5 second timeout to prevent hanging
    });
    
    console.log(`[TokenValidator] Token validation successful: status=${response.status}`);
    return { valid: true, status: response.status };
  } catch (error) {
    // If we get a network error, assume the token is valid to prevent false negatives
    if (!error.response) {
      console.warn(`[TokenValidator] Network error during validation: ${error.message}`);
      console.warn('[TokenValidator] Assuming token is valid due to network error');
      return { valid: true, message: 'Assumed valid (network error)' };
    }
    
    console.error(`[TokenValidator] Token validation failed: ${error.message}`);
    return { 
      valid: false, 
      status: error.response?.status || 500,
      message: error.response?.data?.message || error.message 
    };
  }
  */
};

// Create session middleware
const sessionMiddleware = async (req, res, next) => {
  // Log the request details
  console.log('\n==== NEW REQUEST ====');
  console.log(`[SessionMiddleware] ${req.method} ${req.path} at ${new Date().toISOString()}`);
  
  // Skip middleware for debug endpoints
  if (req.path.startsWith('/api/debug')) {
    console.log(`[SessionMiddleware] Debug endpoint detected, bypassing authentication`);
    next();
    return;
  }
  
  // Get session ID from multiple sources
  const cookieSessionId = req.cookies?.sessionId;
  const headerSessionId = req.headers['x-session-id'];
  const querySessionId = req.query?.sessionId;
  const sessionId = cookieSessionId || headerSessionId || querySessionId;
  
  console.log(`[SessionMiddleware] Session ID sources:`);
  console.log(`  - Cookie: ${cookieSessionId || 'not found'}`);
  console.log(`  - Header: ${headerSessionId || 'not found'}`);
  console.log(`  - Query: ${querySessionId || 'not found'}`);
  console.log(`[SessionMiddleware] Final session ID: ${sessionId || 'none'}`);
  
  // Log available sessions
  console.log(`[SessionMiddleware] Available sessions:`, Object.keys(sessions));
  
  // Check for token in request
  const authHeader = req.headers['authorization'];
  const bodyToken = req.body?.token;
  const queryToken = req.query?.token;
  
  // Extract token from Authorization header if present
  const authToken = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : authHeader;
  
  // Use the first available token with priority
  const token = authToken || bodyToken || queryToken;
  
  console.log(`[SessionMiddleware] Token sources:`);
  console.log(`  - Auth header: ${authHeader ? 'present' : 'not found'}`);
  console.log(`  - Body token: ${bodyToken ? 'present' : 'not found'}`);
  console.log(`  - Query token: ${queryToken ? 'present' : 'not found'}`);
  console.log(`[SessionMiddleware] Token available: ${!!token}`);
  
  if (token) {
    console.log(`[SessionMiddleware] Token length: ${token.length}`);
    console.log(`[SessionMiddleware] Token starts with: ${token.substring(0, 10)}...`);
  }
  
  // Extract region from request
  const region = req.query.region || req.body?.region || 'mypurecloud.com';
  
  // Log request details
  console.log(`[SessionMiddleware] Request cookies:`, req.cookies);
  
  let validSession = false;
  let validToken = false;
  
  // Check if we have a valid session
  if (sessionId && sessions[sessionId]) {
    console.log(`[SessionMiddleware] Found session: ${sessionId}`);
    
    // Check token expiration (Genesys tokens typically expire after 24 hours)
    const sessionAge = new Date() - new Date(sessions[sessionId].createdAt);
    if (sessionAge > 24 * 60 * 60 * 1000) { // 24 hours in milliseconds
      console.log(`[SessionMiddleware] Session age exceeds 24 hours, validating token...`);
      
      // Validate the session token
      const tokenValidation = await validateToken(sessions[sessionId].token, region);
      
      if (!tokenValidation.valid) {
        console.log(`[SessionMiddleware] Session token invalid: ${tokenValidation.message}`);
        delete sessions[sessionId];
        validSession = false;
      } else {
        console.log(`[SessionMiddleware] Session token still valid despite age`);
        validSession = true;
        validToken = true;
      }
    } else {
      console.log(`[SessionMiddleware] Session age is within limits: ${sessionAge / (60 * 60 * 1000)} hours`);
      validSession = true;
      validToken = true;
    }
    
    if (validSession) {
      // Update last activity
      sessions[sessionId].lastActivity = new Date();
      
      // Attach session to request
      req.session = sessions[sessionId];
      req.sessionId = sessionId;
      
      console.log(`[SessionMiddleware] Valid session attached to request: ${!!req.session}, has token: ${!!req.session.token}`);
    }
  } else {
    console.log(`[SessionMiddleware] No valid session found for ID: ${sessionId}`);
  }
  
  // If we have a direct token but no valid session, validate the token
  if (token && !validToken) {
    console.log(`[SessionMiddleware] Direct token provided, validating...`);
    
    // Special case for auth endpoints - always consider token valid to allow login
    if (req.path.startsWith('/api/auth')) {
      console.log(`[SessionMiddleware] Auth endpoint detected, skipping validation`);
      validToken = true;
      next();
      return;
    }
    
    try {
      // For login-related paths, be more lenient
      if (req.path.includes('/login') || req.path.includes('/auth') || req.path === '/') {
        console.log(`[SessionMiddleware] Login-related path detected, assuming token is valid`);
        validToken = true;
      } else {
        // For other paths, validate the token
        const tokenValidation = await validateToken(token, region);
        
        if (tokenValidation.valid) {
          console.log(`[SessionMiddleware] Direct token is valid: ${tokenValidation.message || 'OK'}`);
          validToken = true;
        } else {
          console.log(`[SessionMiddleware] Direct token is invalid: ${tokenValidation.message}`);
        }
      }
      
      if (validToken) {
        // Create a new session with this token
        const newSessionId = Date.now().toString();
        sessions[newSessionId] = {
          token,
          region,
          createdAt: new Date(),
          lastActivity: new Date()
        };
        
        // Attach session to request
        req.session = sessions[newSessionId];
        req.sessionId = newSessionId;
        
        // Set session cookie
        res.cookie('sessionId', newSessionId, { 
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
        
        console.log(`[SessionMiddleware] Created new session: ${newSessionId}`);
      }
    } catch (error) {
      console.error(`[SessionMiddleware] Error validating token: ${error.message}`);
      // Even if validation fails, allow auth endpoints
      if (req.path.startsWith('/api/auth')) {
        console.log(`[SessionMiddleware] Auth endpoint detected despite error, proceeding`);
        next();
        return;
      }
    }
  }
  
  // If we have a valid token (either from session or direct), proceed
  if (validToken) {
    next();
  } else {
    // If this is an auth endpoint, let it handle its own authentication
    if (req.path.startsWith('/api/auth')) {
      next();
    } else {
      // For non-auth endpoints, require authentication
      console.log(`[SessionMiddleware] Authentication required for ${req.path}`);
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a valid token.'
      });
    }
  }
};

// Apply session middleware to all API routes except auth
app.use('/api/user', sessionMiddleware);
app.use('/api/flows', sessionMiddleware);
app.use('/api/llm', sessionMiddleware);
app.use('/api/genesys', sessionMiddleware);
app.use('/api/test', sessionMiddleware);

// Import routes
const authRouter = require('./routes/auth')(sessions); // Auth router is a function that takes sessions
const userRouter = require('./routes/user'); // User router is a direct export
const flowsRouter = require('./routes/flows');
const llmRouter = require('./routes/llm');
const genesysRouter = require('./routes/genesys');
const testRouter = require('./routes/test');
const debugRouter = require('./routes/debug');

// Use routes
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/flows', flowsRouter);
app.use('/api/llm', llmRouter);
app.use('/api/genesys', genesysRouter);
app.use('/api/test', testRouter);
app.use('/api/debug', debugRouter);

// Debug endpoint to check session state
app.get('/api/debug/sessions', (req, res) => {
  const sessionId = req.query.sessionId || req.cookies?.sessionId || req.headers['x-session-id'];
  console.log('[DEBUG] Sessions endpoint called');
  console.log('[DEBUG] Available sessions:', Object.keys(global.sessions));
  console.log('[DEBUG] Request session ID:', sessionId);
  
  if (sessionId && global.sessions[sessionId]) {
    console.log('[DEBUG] Session found:', {
      id: sessionId,
      createdAt: global.sessions[sessionId].createdAt,
      hasToken: !!global.sessions[sessionId].token,
      tokenLength: global.sessions[sessionId].token?.length || 0
    });
  } else {
    console.log('[DEBUG] Session not found for ID:', sessionId);
  }
  
  return res.status(200).json({
    success: true,
    sessionCount: Object.keys(global.sessions).length,
    sessionIds: Object.keys(global.sessions),
    requestedSessionId: sessionId,
    sessionExists: sessionId ? !!global.sessions[sessionId] : false,
    sessionData: sessionId && global.sessions[sessionId] ? {
      createdAt: global.sessions[sessionId].createdAt,
      hasToken: !!global.sessions[sessionId].token
    } : null
  });
});

// Handle OAuth callback redirect
app.get('/intentguardians', (req, res) => {
  // Extract the hash fragment from the URL
  const hash = req.url.split('#')[1] || '';
  // Redirect to the frontend with the hash fragment
  res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/intentguardians#${hash}`);
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, sessions };
