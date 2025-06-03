import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';

const DebugPage = () => {
  const [sessionInfo, setSessionInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(localStorage.getItem('sessionId') || '');

  useEffect(() => {
    fetchSessionInfo();
  }, []);

  const fetchSessionInfo = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:5000/api/debug/sessions?sessionId=${sessionId}`, {
        withCredentials: true,
        headers: {
          'x-session-id': sessionId
        }
      });
      setSessionInfo(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching session info:', err);
      setError('Failed to fetch session information');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchSessionInfo();
  };

  const handleSessionIdChange = (e) => {
    setSessionId(e.target.value);
  };

  const handleCheckSession = () => {
    fetchSessionInfo();
  };

  return (
    <Layout title="Debug Session">
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Session Debug</h1>
        
        <div className="mb-6 p-4 bg-gray-100 rounded-lg">
          <div className="flex items-center mb-4">
            <input
              type="text"
              value={sessionId}
              onChange={handleSessionIdChange}
              placeholder="Session ID"
              className="flex-1 p-2 border rounded mr-2"
            />
            <button
              onClick={handleCheckSession}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Check Session
            </button>
          </div>
          
          <div className="flex justify-between">
            <p>Current Session ID: <span className="font-mono">{localStorage.getItem('sessionId') || 'None'}</span></p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center p-4">Loading session information...</div>
        ) : error ? (
          <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>
        ) : sessionInfo ? (
          <div className="bg-white shadow rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">Session Information</h2>
            
            <div className="mb-4">
              <h3 className="font-semibold">Session Count: {sessionInfo.sessionCount}</h3>
              <p>Available Session IDs:</p>
              <ul className="list-disc pl-5">
                {sessionInfo.sessionIds.map(id => (
                  <li key={id} className="font-mono">
                    {id} {id === sessionInfo.requestedSessionId ? '(current)' : ''}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="mb-4">
              <h3 className="font-semibold">Requested Session ID:</h3>
              <p className="font-mono">{sessionInfo.requestedSessionId || 'None'}</p>
            </div>
            
            <div className="mb-4">
              <h3 className="font-semibold">Session Exists: {sessionInfo.sessionExists ? 'Yes' : 'No'}</h3>
            </div>
            
            {sessionInfo.sessionData && (
              <div>
                <h3 className="font-semibold">Session Data:</h3>
                <pre className="bg-gray-100 p-2 rounded overflow-auto">
                  {JSON.stringify(sessionInfo.sessionData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center p-4">No session information available</div>
        )}
      </div>
    </Layout>
  );
};

export default DebugPage;
