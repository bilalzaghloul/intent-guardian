import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include credentials with requests
});

// Add request interceptor to include session ID and token in requests
api.interceptors.request.use(
  (config) => {
    const sessionId = localStorage.getItem('sessionId');
    const directToken = localStorage.getItem('directToken');
    
    // Add session ID if available
    if (sessionId) {
      console.log(`[API] Adding session ID to request: ${sessionId}`);
      // Add session ID to headers
      config.headers['x-session-id'] = sessionId;
      
      // Also add it as a cookie for browsers that support it
      document.cookie = `sessionId=${sessionId}; path=/`;
      
      // For specific endpoints that need extra authentication, add it to URL params as well
      if (config.url.includes('/flows/details') || config.url.includes('/user/org')) {
        // Add sessionId to params if they exist, otherwise create params
        config.params = config.params || {};
        config.params.sessionId = sessionId;
        console.log(`[API] Added session ID to params for ${config.url}`);
      }
    } else {
      console.log('[API] No session ID found in localStorage');
    }
    
    // Always add token if available (for better reliability)
    if (directToken) {
      console.log(`[API] Adding direct token to request`);
      
      // Clean the token (remove Bearer prefix if present)
      const cleanToken = directToken.startsWith('Bearer ') ? directToken.substring(7) : directToken;
      
      // Add token to Authorization header
      config.headers['Authorization'] = `Bearer ${cleanToken}`;
      
      // Add token to params for endpoints that need it
      if (config.url.includes('/flows') || config.url.includes('/genesys') || config.url.includes('/user')) {
        config.params = config.params || {};
        config.params.token = cleanToken;
        console.log(`[API] Added token to params for ${config.url}`);
      }
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Log the error
    console.error('[API] Request failed:', error.response?.status, error.response?.data || error.message);
    
    // Handle authentication errors (401, 403)
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Check if this is already a retry to prevent infinite loops
      if (originalRequest._retry) {
        console.error('[API] Authentication retry failed, redirecting to login');
        
        // Clear local storage
        localStorage.removeItem('sessionId');
        localStorage.removeItem('directToken');
        
        // Redirect to login page
        window.location.href = '/login?error=session_expired';
        return Promise.reject(error);
      }
      
      // Mark this request as a retry
      originalRequest._retry = true;
      
      // Check if we have a direct token to try
      const directToken = localStorage.getItem('directToken');
      if (directToken) {
        console.log('[API] Attempting to use direct token for retry');
        
        // Clean the token
        const cleanToken = directToken.startsWith('Bearer ') 
          ? directToken.substring(7) 
          : directToken;
        
        // Update the request with the token
        originalRequest.headers['Authorization'] = `Bearer ${cleanToken}`;
        if (originalRequest.params) {
          originalRequest.params.token = cleanToken;
        } else {
          originalRequest.params = { token: cleanToken };
        }
        
        // Try the request again
        try {
          return await axios(originalRequest);
        } catch (retryError) {
          console.error('[API] Retry with direct token failed:', retryError.message);
          
          // If retry fails, redirect to login
          localStorage.removeItem('sessionId');
          localStorage.removeItem('directToken');
          window.location.href = '/login?error=token_invalid';
          return Promise.reject(retryError);
        }
      } else {
        console.error('[API] No direct token available for retry');
        
        // Redirect to login page
        localStorage.removeItem('sessionId');
        window.location.href = '/login?error=auth_required';
        return Promise.reject(error);
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  // Relay token to backend
  relayToken: async (token) => {
    console.log('[AuthAPI] Relaying token to backend');
    try {
      // Get the region from localStorage
      const region = localStorage.getItem('region') || 'mypurecloud.de';
      console.log(`[AuthAPI] Including region in token relay: ${region}`);
      
      const response = await api.post('/auth/relay-token', { token, region });
      console.log('[AuthAPI] Token relay response:', response.data);
      
      if (response.data.sessionId) {
        console.log(`[AuthAPI] Storing session ID in localStorage: ${response.data.sessionId}`);
        localStorage.setItem('sessionId', response.data.sessionId);
      } else {
        console.warn('[AuthAPI] No sessionId in response');
      }
      return response.data;
    } catch (error) {
      console.error('[AuthAPI] Token relay error:', error);
      throw error;
    }
  },
};

// User API
export const userAPI = {
  // Get user details
  getOrgDetails: async (region) => {
    console.log(`[UserAPI] Getting user details for region: ${region}`);
    try {
      // Make sure we have a region, default to Frankfurt
      const effectiveRegion = region || localStorage.getItem('region') || 'mypurecloud.de';
      console.log(`[UserAPI] Using effective region: ${effectiveRegion}`);
      
      // Get direct token if available
      const directToken = localStorage.getItem('directToken');
      const cleanToken = directToken && directToken.startsWith('Bearer ') 
        ? directToken.substring(7) 
        : directToken;
      
      const response = await api.get('/user/org', { 
        params: { 
          region: effectiveRegion,
          token: cleanToken // Pass token directly in query params
        }
      });
      console.log('[UserAPI] User details response:', response.data);
      return response;
    } catch (error) {
      console.error('[UserAPI] Error getting user details:', error);
      throw error;
    }
  },
  
  // Get session info
  getSessionInfo: async () => {
    console.log('[UserAPI] Getting session info');
    try {
      const response = await api.get('/user/session');
      console.log('[UserAPI] Session info response:', response.data);
      return response;
    } catch (error) {
      console.error('[UserAPI] Error getting session info:', error);
      throw error;
    }
  },
};

// Flows API
export const flowsAPI = {
  // Get list of flows
  getFlowsList: async (region) => {
    console.log(`[FlowsAPI] Getting flows list for region: ${region}`);
    try {
      const sessionId = localStorage.getItem('sessionId');
      const directToken = localStorage.getItem('directToken');
      console.log(`[FlowsAPI] Using session ID: ${sessionId}`);
      console.log(`[FlowsAPI] Direct token available: ${!!directToken}`);
      
      // Store the region in localStorage for other API calls
      localStorage.setItem('region', region);
      
      // Make sure to pass the raw token without 'Bearer ' prefix
      const cleanToken = directToken && directToken.startsWith('Bearer ') 
        ? directToken.substring(7) 
        : directToken;
        
      console.log(`[FlowsAPI] Token format check - starts with 'Bearer'?: ${directToken && directToken.startsWith('Bearer ')}`);
      
      // Include the direct token in the request for emergency direct API access
      const response = await api.get('/flows/list', { 
        params: { 
          region,
          token: cleanToken // Pass clean token directly in query params
        },
        headers: { 
          'x-session-id': sessionId,
          'Authorization': `Bearer ${cleanToken}` // Always use Bearer prefix in headers
        }
      });
      console.log('[FlowsAPI] Flows list response:', response.data);
      return response;
    } catch (error) {
      console.error('[FlowsAPI] Error getting flows list:', error);
      throw error;
    }
  },
  
  // Get flow details
  getFlowDetails: async (flowId, flowType) => {
    console.log(`[FlowsAPI] Getting flow details for flowId: ${flowId}, flowType: ${flowType}`);
    try {
      const sessionId = localStorage.getItem('sessionId');
      const directToken = localStorage.getItem('directToken');
      console.log(`[FlowsAPI] Using session ID: ${sessionId}`);
      console.log(`[FlowsAPI] Direct token available: ${!!directToken}`);
      
      // Make sure we have the region
      const region = localStorage.getItem('region') || 'mypurecloud.com';
      console.log(`[FlowsAPI] Using region: ${region}`);
      
      // Include the direct token in the request for emergency direct API access
      // Make sure to pass the raw token without 'Bearer ' prefix
      const cleanToken = directToken && directToken.startsWith('Bearer ') 
        ? directToken.substring(7) 
        : directToken;
        
      console.log(`[FlowsAPI] Token format check - starts with 'Bearer'?: ${directToken && directToken.startsWith('Bearer ')}`);
      
      const response = await api.get('/flows/details', { 
        params: { 
          flowId, 
          flowType,
          region,
          token: cleanToken // Pass clean token directly in query params
        },
        headers: { 
          'x-session-id': sessionId,
          'Authorization': `Bearer ${cleanToken}` // Always use Bearer prefix in headers
        }
      });
      console.log('[FlowsAPI] Flow details response:', response.data);
      return response;
    } catch (error) {
      console.error('[FlowsAPI] Error getting flow details:', error);
      throw error;
    }
  },
};

// LLM API
export const llmAPI = {
  // Generate test utterances
  generateTests: (data) => api.post('/llm/generate-tests', data),
  
  // Generate more test utterances (includes previous messages for context)
  generateMoreTests: (data) => api.post('/llm/generate-more-tests', data),
};

// Genesys API
export const genesysAPI = {
  // Test a single utterance
  testUtterance: async (data) => {
    console.log('[GenesysAPI] Testing single utterance');
    const directToken = localStorage.getItem('directToken');
    return api.post('/genesys/test-utterance', {
      ...data,
      token: directToken // Include token in request body
    });
  },
  
  // Test multiple utterances in batch
  batchTest: async (data) => {
    console.log('[GenesysAPI] Running batch test');
    const directToken = localStorage.getItem('directToken');
    const region = localStorage.getItem('region') || 'mypurecloud.com';
    
    // Make sure to pass the raw token without 'Bearer ' prefix
    const cleanToken = directToken && directToken.startsWith('Bearer ') 
      ? directToken.substring(7) 
      : directToken;
      
    console.log(`[GenesysAPI] Token available: ${!!cleanToken}`);
    console.log(`[GenesysAPI] Using region: ${region}`);
    
    return api.post('/genesys/batch-test', {
      ...data,
      token: cleanToken // Include token in request body
    }, {
      params: { token: cleanToken }, // Also include in query params
      headers: { 'Authorization': `Bearer ${cleanToken}` } // And in headers
    });
  },
};

// Test API
export const testAPI = {
  // Get test report
  getTestReport: (testId) => api.get('/test/report', { params: { testId } }),
  
  // Get session log
  getSessionLog: () => api.get('/test/session-log'),
  
  // Export test results
  exportResults: (testId, format) => api.post('/test/export', { testId, format }, {
    responseType: format === 'csv' ? 'blob' : 'json',
  }),
};

export default {
  auth: authAPI,
  user: userAPI,
  flows: flowsAPI,
  llm: llmAPI,
  genesys: genesysAPI,
  test: testAPI,
};
