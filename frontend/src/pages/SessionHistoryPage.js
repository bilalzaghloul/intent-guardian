import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { testAPI } from '../services/api';
import Layout from '../components/Layout';

const SessionHistoryPage = () => {
  const { isAuthenticated } = useAuth();
  const { testHistory } = useApp();
  const [sessionLog, setSessionLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Fetch session log on component mount
  useEffect(() => {
    const fetchSessionLog = async () => {
      try {
        setLoading(true);
        const response = await testAPI.getSessionLog();
        
        if (response.data.success) {
          setSessionLog(response.data.data);
        } else {
          setError('Failed to fetch session log');
        }
      } catch (error) {
        console.error('Error fetching session log:', error);
        setError('Error fetching session log. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchSessionLog();
    }
  }, [isAuthenticated]);

  // Handle back button click
  const handleBack = () => {
    navigate('/welcome');
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="genesys-card slide-in">
          <div className="genesys-card-header">
            <h2 className="text-xl font-semibold text-gray-900">
              Session History
            </h2>
            <span className="badge badge-primary">
              Test Records
            </span>
          </div>
          <div className="genesys-card-body">
            {error && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12">
                <div className="spinner mx-auto"></div>
                <p className="mt-4 text-sm text-gray-500">Loading session history...</p>
              </div>
            ) : (
              <>
                {/* Session Info */}
                {sessionLog && (
                  <div className="mb-8">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Current Session</h3>
                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                      <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col">
                          <dt className="text-sm font-medium text-gray-500 mb-1">Session ID</dt>
                          <dd className="text-sm text-gray-900 font-semibold">{sessionLog.session_id}</dd>
                        </div>
                        <div className="flex flex-col">
                          <dt className="text-sm font-medium text-gray-500 mb-1">Created At</dt>
                          <dd className="text-sm text-gray-900 font-semibold">{formatDate(sessionLog.created_at)}</dd>
                        </div>
                        <div className="flex flex-col">
                          <dt className="text-sm font-medium text-gray-500 mb-1">Organization</dt>
                          <dd className="text-sm text-gray-900 font-semibold">{sessionLog.organization}</dd>
                        </div>
                        <div className="flex flex-col">
                          <dt className="text-sm font-medium text-gray-500 mb-1">Last Activity</dt>
                          <dd className="text-sm text-gray-900 font-semibold">{formatDate(sessionLog.last_activity)}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                )}

                {/* Test History */}
                <div>
                  <div className="flex items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Test Runs</h3>
                    <span className="ml-2 badge badge-secondary">{testHistory.length}</span>
                  </div>
                  
                  {testHistory.length > 0 ? (
                    <div className="mt-4">
                      <div className="flex flex-col">
                        <div className="-my-2 overflow-x-auto">
                          <div className="py-2 align-middle inline-block min-w-full">
                            <div className="overflow-hidden border border-gray-200 rounded-lg">
                              <table className="genesys-table min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                      <div className="flex items-center">
                                        <svg className="mr-2 h-4 w-4 text-orange-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                        </svg>
                                        Date
                                      </div>
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                      <div className="flex items-center">
                                        <svg className="mr-2 h-4 w-4 text-orange-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                          <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                                          <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                                        </svg>
                                        Flow
                                      </div>
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                      <div className="flex items-center">
                                        <svg className="mr-2 h-4 w-4 text-orange-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.20l-.31 1.242c-.412 1.65-1.813 2.758-3.487 2.758-1.675 0-3.075-1.108-3.487-2.758L1.8 6H0V5a1 1 0 011-1h3V3a1 1 0 011-1h2z" clipRule="evenodd" />
                                        </svg>
                                        Language
                                      </div>
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                      <div className="flex items-center">
                                        <svg className="mr-2 h-4 w-4 text-orange-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Success Rate
                                      </div>
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                      <div className="flex items-center">
                                        <svg className="mr-2 h-4 w-4 text-orange-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                        </svg>
                                        Actions
                                      </div>
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {testHistory.map((test, index) => (
                                    <tr key={index}>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatDate(test.timestamp)}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {test.flowName}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {test.language}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {test.summary ? 
                                          (test.summary.matched !== undefined && test.summary.total !== undefined) ?
                                          `${((test.summary.matched / test.summary.total) * 100).toFixed(1)}%` :
                                          (test.summary.overall_match_rate !== undefined) ?
                                          `${(test.summary.overall_match_rate * 100).toFixed(1)}%` :
                                          'N/A' : 'N/A'}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <button
                                          onClick={() => {
                                            console.log('Viewing test results:', test);
                                            // Use the correct test ID property based on what's available
                                            const testId = test.testId || test.id || test.test_id;
                                            navigate(`/results?testId=${testId}`);
                                          }}
                                          className="btn-link flex items-center"
                                        >
                                          <svg className="mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                          </svg>
                                          View Results
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                      <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      </svg>
                      <h3 className="mt-4 text-base font-medium text-gray-900">No test runs yet</h3>
                      <p className="mt-2 text-sm text-gray-500">
                        Start by selecting a bot flow and running tests.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={handleBack}
                className="btn-secondary flex items-center"
              >
                <svg className="mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SessionHistoryPage;
