import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import RouteHandler from './components/RouteHandler';
import './App.css';

// Import context providers
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';

// Import pages
import LoginPage from './pages/LoginPage';
import WelcomePage from './pages/WelcomePage';
import SelectBotPage from './pages/SelectBotPage';
import SelectIntentsPage from './pages/SelectIntentsPage';
import GenerateTestsPage from './pages/GenerateTestsPage';
import RunTestsPage from './pages/RunTestsPage';
import ResultsPage from './pages/ResultsPage';
import SessionHistoryPage from './pages/SessionHistoryPage';
import DebugPage from './pages/DebugPage';
import TokenDebugPage from './pages/TokenDebugPage';

function App() {
  // Check for saved route in localStorage
  const savedRoute = localStorage.getItem('currentPage');
  const [loading, setLoading] = useState(true);
  
  // Add a loading effect when the app first loads
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <img 
            src="/images/genesys-logo.svg" 
            alt="Genesys Logo" 
            className="h-16 w-auto mx-auto animate-pulse" 
          />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Intent<span className="text-orange-500">Guardian</span>
          </h1>
          <p className="mt-2 text-sm text-gray-500">Powered by Genesys</p>
          <div className="mt-4 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <Router>
      <AuthProvider>
        <AppProvider>
          <div className="App min-h-screen flex flex-col bg-gray-50">
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/welcome" element={<WelcomePage />} />
              <Route path="/select-bot" element={<SelectBotPage />} />
              <Route path="/select-intents" element={<SelectIntentsPage />} />
              <Route path="/generate-tests" element={<GenerateTestsPage />} />
              <Route path="/run-tests" element={<RunTestsPage />} />
              <Route path="/results" element={<ResultsPage />} />
              <Route path="/session-history" element={<SessionHistoryPage />} />
              <Route path="/debug" element={<DebugPage />} />
              <Route path="/token-debug" element={<TokenDebugPage />} />
              <Route path="/intentguardians" element={<LoginPage />} />
              <Route path="/" element={
                savedRoute && localStorage.getItem('authState') === 'true' ? 
                <Navigate to={savedRoute} replace /> : 
                <Navigate to="/login" replace />
              } />
            </Routes>
          </div>
        </AppProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
