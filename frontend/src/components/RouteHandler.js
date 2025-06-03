import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

/**
 * RouteHandler component that manages route persistence across page reloads
 * and ensures users stay on their current page when refreshing
 */
const RouteHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const { currentStep } = useApp();
  
  // Save current route to localStorage whenever it changes
  useEffect(() => {
    // Only save authenticated routes
    if (isAuthenticated && location.pathname !== '/login' && location.pathname !== '/intentguardians') {
      localStorage.setItem('lastRoute', location.pathname);
      console.log('[RouteHandler] Saved current route:', location.pathname);
    }
  }, [location.pathname, isAuthenticated]);
  
  // Restore route on initial load
  useEffect(() => {
    // Only attempt to restore route after authentication check is complete
    if (!isLoading) {
      const lastRoute = localStorage.getItem('lastRoute');
      const currentRoute = location.pathname;
      
      // If we're at the root or login page and there's a saved route and we're authenticated,
      // navigate to the saved route
      if ((currentRoute === '/' || currentRoute === '/login') && 
          lastRoute && 
          isAuthenticated) {
        console.log('[RouteHandler] Restoring last route:', lastRoute);
        navigate(lastRoute, { replace: true });
      }
      // If we're at the root and not authenticated, go to login
      else if (currentRoute === '/' && !isAuthenticated) {
        navigate('/login', { replace: true });
      }
    }
  }, [isLoading, isAuthenticated, location.pathname, navigate]);
  
  // Map current step to the correct route if needed
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const stepToRouteMap = {
        1: '/login',
        2: '/welcome',
        3: '/select-bot',
        4: '/select-intents',
        5: '/generate-tests',
        6: '/run-tests',
        7: '/results'
      };
      
      const currentRoute = location.pathname;
      const expectedRoute = stepToRouteMap[currentStep];
      
      // If we're on a different route than what the current step indicates,
      // and we're not on a special route like debug, update localStorage
      if (expectedRoute && 
          currentRoute !== expectedRoute && 
          !currentRoute.includes('/debug') && 
          !currentRoute.includes('/session-history')) {
        localStorage.setItem('lastRoute', expectedRoute);
        console.log('[RouteHandler] Updated last route based on current step:', expectedRoute);
      }
    }
  }, [currentStep, isAuthenticated, isLoading, location.pathname]);
  
  // This component doesn't render anything
  return null;
};

export default RouteHandler;
