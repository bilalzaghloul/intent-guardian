import React, { createContext, useState, useEffect, useContext } from 'react';
import { authAPI, userAPI } from '../services/api';

// Create context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(() => {
        // Initialize user state from localStorage if available
        const savedUser = localStorage.getItem('userData');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [region, setRegion] = useState(
        localStorage.getItem('region') || 'mypurecloud.de' // Load from localStorage or default to Frankfurt region
    );

    // Persist user data to localStorage whenever it changes
    useEffect(() => {
        if (user) {
            localStorage.setItem('userData', JSON.stringify(user));
        } else {
            localStorage.removeItem('userData');
        }
    }, [user]);

    // Check if user is already authenticated on mount
    useEffect(() => {
        const checkAuthStatus = async () => {
            try {
                // First check for direct token which is more reliable
                const directToken = localStorage.getItem('directToken');
                const sessionId = localStorage.getItem('sessionId');
                const authState = localStorage.getItem('authState');

                if (directToken || sessionId || authState === 'true') {
                    console.log('[AuthContext] Found saved authentication credentials');

                    // Try to get session info if we have a sessionId
                    if (sessionId) {
                        try {
                            const response = await userAPI.getSessionInfo();
                            if (response.data.success && response.data.data.hasValidToken) {
                                const userData = response.data.data.orgInfo;
                                // Extract org name from jabber ID
                                const orgName = userData.chat?.jabberId
                                    ? userData.chat.jabberId.split('@')[1].split('.orgspan')[0]
                                    : 'Unknown Organization';

                                setIsAuthenticated(true);
                                setUser({
                                    name: userData.name || 'User',
                                    id: userData.id || 'unknown',
                                    organization: orgName,
                                });
                                localStorage.setItem('authState', 'true');
                                console.log('[AuthContext] Session validated successfully');
                            } else {
                                // If we have a direct token but session is invalid, still consider authenticated
                                if (directToken) {
                                    setIsAuthenticated(true);
                                    setUser({ name: 'User', id: 'unknown', organization: 'Unknown Organization' });
                                    localStorage.setItem('authState', 'true');
                                    console.log('[AuthContext] Using direct token for authentication');
                                } else {
                                    // Clear invalid session
                                    localStorage.removeItem('sessionId');
                                    localStorage.removeItem('authState');
                                    setIsAuthenticated(false);
                                    console.log('[AuthContext] Session invalid and no direct token');
                                }
                            }
                        } catch (sessionError) {
                            console.error('Error checking session:', sessionError);
                            // If session check fails but we have a direct token, still consider authenticated
                            if (directToken) {
                                setIsAuthenticated(true);
                                setUser({ name: 'User', id: 'unknown', organization: 'Unknown Organization' });
                                localStorage.setItem('authState', 'true');
                                console.log('[AuthContext] Using direct token after session check failed');
                            } else {
                                localStorage.removeItem('sessionId');
                                localStorage.removeItem('authState');
                                setIsAuthenticated(false);
                            }
                        }
                    } else if (directToken || authState === 'true') {
                        // If we have a direct token but no session, still consider authenticated
                        setIsAuthenticated(true);
                        setUser({ name: 'User', id: 'unknown', organization: 'Unknown Organization' });
                        localStorage.setItem('authState', 'true');
                        console.log('[AuthContext] Using direct token or saved auth state');
                    }
                } else {
                    console.log('[AuthContext] No saved authentication credentials found');
                    setIsAuthenticated(false);
                }
            } catch (error) {
                console.error('Error checking auth status:', error);
                setIsAuthenticated(false);
            } finally {
                setIsLoading(false);
            }
        };

        checkAuthStatus();
    }, []);

    // Handle OAuth redirect
    const handleOAuthRedirect = async () => {
        try {
            // Parse hash from URL
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            const accessToken = params.get('access_token');

            console.log('[AuthContext] Handling OAuth redirect');
            console.log('[AuthContext] Has access token:', !!accessToken);

            if (accessToken) {
                // Make sure the token doesn't have Bearer prefix when storing
                const cleanToken = accessToken.startsWith('Bearer ') ? accessToken.substring(7) : accessToken;

                // Store clean token directly in localStorage for emergency direct API calls
                localStorage.setItem('directToken', cleanToken);
                // Store authentication state
                localStorage.setItem('authState', 'true');

                console.log('[AuthContext] Stored direct token in localStorage, length:', cleanToken.length);

                // Set user as authenticated immediately
                setIsAuthenticated(true);

                try {
                    // Relay token to backend
                    console.log('[AuthContext] Relaying token to backend');
                    const response = await authAPI.relayToken(accessToken);

                    if (response.success) {
                        // Only try to get organization details if token relay was successful
                        console.log('[AuthContext] Getting organization details');
                        try {
                            const orgResponse = await userAPI.getOrgDetails(region);

                            if (orgResponse?.data?.success && orgResponse.data.data) {
                                const userData = orgResponse.data.data;
                                // Extract org name from jabber ID
                                const orgName = userData.chat?.jabberId
                                    ? userData.chat.jabberId.split('@')[1].split('.orgspan')[0]
                                    : 'Unknown Organization';

                                setUser({
                                    name: userData.name || 'User',
                                    id: userData.id || 'unknown',
                                    organization: orgName,
                                });
                                console.log('[AuthContext] Organization details retrieved successfully');
                            } else {
                                setUser({ name: 'User', id: 'unknown', organization: 'Unknown Organization' });
                                console.warn('[AuthContext] Failed to get org details');
                            }
                        } catch (orgError) {
                            setUser({ name: 'User', id: 'unknown', organization: 'Unknown Organization' });
                            console.warn('[AuthContext] Error getting org details:', orgError.message);
                        }
                    } else {
                        setUser({ name: 'User', id: 'unknown', organization: 'Unknown Organization' });
                        console.warn('[AuthContext] Token relay failed');
                    }
                } catch (error) {
                    setUser({ name: 'User', id: 'unknown', organization: 'Unknown Organization' });
                    console.warn('[AuthContext] Error in auth process:', error.message);
                }

                // Clear hash from URL
                window.history.replaceState({}, document.title, window.location.pathname);
                return true;
            }

            console.log('[AuthContext] OAuth redirect handling failed - no access token');
            return false;
        } catch (error) {
            console.error('[AuthContext] Error handling OAuth redirect:', error);
            // Set authenticated to false in case of error
            setIsAuthenticated(false);
            return false;
        }
    };

    // Initiate OAuth login
    const login = (clientId) => {
        // Construct OAuth URL
        const redirectUri = encodeURIComponent('http://localhost:3000/intentguardians');
        const oauthUrl = `https://login.${region}/oauth/authorize?client_id=${clientId}&response_type=token&redirect_uri=${redirectUri}`;

        // Redirect to OAuth URL
        window.location.href = oauthUrl;
    };

    // Logout
    const logout = () => {
        // Clear all authentication-related data from localStorage
        localStorage.removeItem('sessionId');
        localStorage.removeItem('directToken');
        localStorage.removeItem('authState');
        localStorage.removeItem('intentGuardianState');
        localStorage.removeItem('userData');
        localStorage.removeItem('region');

        // Reset state
        setIsAuthenticated(false);
        setUser(null);
        setRegion('mypurecloud.de'); // Reset to default region

        // Clear any additional session data
        document.cookie.split(';').forEach(function (c) {
            document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
        });
    };

    // Update region
    const updateRegion = (newRegion) => {
        console.log(`[AuthContext] Updating region to: ${newRegion}`);
        // Save to state
        setRegion(newRegion);
        // Save to localStorage for persistence
        localStorage.setItem('region', newRegion);
        console.log(`[AuthContext] Region saved to localStorage: ${newRegion}`);
    };

    // Context value
    const value = {
        isAuthenticated,
        isLoading,
        user,
        region,
        login,
        logout,
        handleOAuthRedirect,
        updateRegion,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
