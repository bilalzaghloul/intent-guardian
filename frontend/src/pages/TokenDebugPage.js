import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Layout from '../components/Layout';

const TokenDebugPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [tokenInfo, setTokenInfo] = useState({
    directToken: null,
    sessionId: null,
    region: null
  });
  const [copied, setCopied] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }

    // Get token information from localStorage
    const directToken = localStorage.getItem('directToken');
    const sessionId = localStorage.getItem('sessionId');
    const region = localStorage.getItem('region');

    setTokenInfo({
      directToken,
      sessionId,
      region
    });
  }, [isAuthenticated, navigate]);

  const copyToken = () => {
    if (tokenInfo.directToken) {
      navigator.clipboard.writeText(tokenInfo.directToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const sendTestRequest = async () => {
    try {
      // Create a direct fetch request to the backend with the token
      const response = await fetch(`http://localhost:5000/api/genesys/test-utterance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenInfo.directToken}`
        },
        body: JSON.stringify({
          utterance: 'Test utterance',
          language: 'en-US',
          flowId: '1ffa1992-7e92-489a-9d41-013d865b0c5e',
          flowType: '',
          token: tokenInfo.directToken,
          region: tokenInfo.region || 'mypurecloud.com'
        })
      });

      const data = await response.json();
      console.log('Test response:', data);
      alert(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Test error:', error);
      alert(`Error: ${error.message}`);
    }
  };
  
  const runComprehensiveTest = async () => {
    setLoading(true);
    setError(null);
    setTestResults(null);
    
    try {
      const response = await axios.post('http://localhost:5000/api/debug/comprehensive-test', {
        token: tokenInfo.directToken,
        region: tokenInfo.region || 'mypurecloud.com'
      });
      
      console.log('Comprehensive test results:', response.data);
      setTestResults(response.data);
    } catch (err) {
      console.error('Comprehensive test error:', err);
      setError(err.message || 'An error occurred during the test');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="genesys-card slide-in">
          <div className="genesys-card-header">
            <h2 className="text-xl font-semibold text-gray-900">
              Token Debug
            </h2>
            <span className="badge badge-primary">
              Authentication
            </span>
          </div>
          <div className="genesys-card-body">
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Token Information</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Direct Token:</label>
                <div className="flex">
                  <input 
                    type="text" 
                    className="form-input flex-grow rounded-l-md" 
                    value={tokenInfo.directToken ? `${tokenInfo.directToken.substring(0, 10)}...` : 'Not found'} 
                    readOnly 
                  />
                  <button 
                    className="btn-secondary rounded-l-none" 
                    type="button"
                    onClick={copyToken}
                    disabled={!tokenInfo.directToken}
                  >
                    <div className="flex items-center">
                      <svg className="mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                        <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
                      </svg>
                      {copied ? 'Copied!' : 'Copy'}
                    </div>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Token length: {tokenInfo.directToken ? tokenInfo.directToken.length : 0}
                </p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Session ID:</label>
                <input 
                  type="text" 
                  className="form-input w-full rounded-md" 
                  value={tokenInfo.sessionId || 'Not found'} 
                  readOnly 
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Region:</label>
                <input 
                  type="text" 
                  className="form-input w-full rounded-md" 
                  value={tokenInfo.region || 'Not set (default: mypurecloud.com)'} 
                  readOnly 
                />
              </div>
              
              <div className="flex space-x-4">
                <button 
                  className="btn-secondary flex items-center"
                  onClick={sendTestRequest}
                  disabled={!tokenInfo.directToken}
                >
                  <svg className="mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Basic Test
                </button>
                
                <button 
                  className="btn-primary flex items-center"
                  onClick={runComprehensiveTest}
                  disabled={!tokenInfo.directToken || loading}
                >
                  {loading ? (
                    <>
                      <div className="spinner-sm mr-2"></div>
                      Testing...
                    </>
                  ) : (
                    <>
                      <svg className="mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                      Comprehensive Test
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {error && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            {testResults && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Test Results</h3>
                </div>
                <div className="px-6 py-4">
                  <div className={`p-4 mb-4 rounded-md ${testResults.tokenValid ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    <div className="flex">
                      <div className="flex-shrink-0">
                        {testResults.tokenValid ? (
                          <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium">
                          Token is <strong>{testResults.tokenValid ? 'Valid' : 'Invalid'}</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <h4 className="text-base font-medium text-gray-900 mb-3">Endpoint Tests:</h4>
                  <div className="overflow-x-auto">
                    <table className="genesys-table min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Endpoint
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Status
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Result
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Time
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {testResults.results.map((result, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {result.endpoint}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {result.status} {result.statusText}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`badge ${result.success ? 'badge-success' : 'badge-danger'}`}>
                                {result.success ? 'Success' : 'Failed'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {result.time}ms
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-4 text-xs text-gray-500">
                    Log file: {testResults.logFile}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TokenDebugPage;
