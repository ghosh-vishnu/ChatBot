import React, { useState, useEffect, useRef } from 'react';

interface ChatRequest {
  id: number;
  user_name: string;
  user_email?: string;
  category_name: string;
  subcategory_name?: string;
  message?: string;
  created_at: string;
  expires_at: string;
}

interface ChatSession {
  id: number;
  request_id: number;
  user_id: string;
  user_name: string;
  user_email?: string;
  category_name: string;
  subcategory_name?: string;
  started_at: string;
  ended_at?: string;
}

const LiveChatQueue: React.FC = () => {
  const [requests, setRequests] = useState<ChatRequest[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeChatSession, setActiveChatSession] = useState<ChatSession | null>(null);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [adminId, setAdminId] = useState<string | null>(null);
  const [feedbackStats, setFeedbackStats] = useState<any>(null);
  const [showFeedbackStats, setShowFeedbackStats] = useState(false);
  const [totalSessions, setTotalSessions] = useState(0);
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [rejectedRequests, setRejectedRequests] = useState<any[]>([]);
  const [showRejectedRequests, setShowRejectedRequests] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper: get admin token from localStorage (completely dynamic)
  const getAdminToken = () => {
    // Check all possible token keys dynamically
    // This supports any number of support users without hardcoding
    const possibleKeys = [
      'anand_token', 'ravi_token', 'vishnu_token', 'deepak_token', 'support_token',
      'admin_token', 'token', 'user_token', 'auth_token'
    ];
    
    for (const key of possibleKeys) {
      const token = localStorage.getItem(key);
      if (token) {
        return token;
      }
    }
    
    return '';
  };

  // Helper: establish admin WebSocket connection (id is resolved via /auth/verify)
  const connectAdminWebSocket = () => {
    if (wsConnection) {
      return; // already connected
    }
    const token = getAdminToken();
    if (!token) {
      return;
    }

    fetch('http://localhost:8000/auth/verify', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (!data?.valid && !data?.success) {
          return;
        }
        const extractedAdminId = data.user.id || data.user.user_id;
        setAdminId(extractedAdminId);

        const ws = new WebSocket(`ws://localhost:8000/chat/ws/support/${extractedAdminId}`);
        
        ws.onopen = () => {
          setWsConnection(ws);
        };
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'chat_message') {
            setMessages(prev => [...prev, {
              id: Date.now(),
              sender_type: data.sender_type,
              sender_id: data.sender_id,
              message: data.message,
              message_type: data.message_type || 'text',
              is_read: false,
              created_at: new Date().toISOString()
            }]);
          } else if (data.type === 'request_canceled') {
            // Remove canceled request from pending requests
            setRequests(prev => prev.filter(req => req.id !== data.data.request_id));
          }
        };
        ws.onclose = () => {
          setWsConnection(null);
        };
        ws.onerror = (error) => {
          console.error('Admin WebSocket error:', error);
          setWsConnection(null);
          // Retry connection after 3 seconds
          setTimeout(() => {
            connectAdminWebSocket();
          }, 3000);
        };
      })
      .catch(err => {
        console.error('connectAdminWebSocket verify error:', err);
      });
  };

  useEffect(() => {
    fetchData();
    // Refresh every 5 seconds
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // WebSocket connection - establish immediately when component mounts
  useEffect(() => {
    if (!wsConnection) {
      connectAdminWebSocket();
    }
    return () => {
      if (wsConnection) {
        wsConnection.close();
        setWsConnection(null);
      }
    };
  }, []); // Empty dependency array to run only once on mount

  // Ensure WebSocket is connected when a chat session is opened
  useEffect(() => {
    if (activeChatSession && !wsConnection) {
      connectAdminWebSocket();
    }
  }, [activeChatSession, wsConnection]);

  // Load messages when active chat session changes
  useEffect(() => {
    if (activeChatSession) {
      loadMessages();
    }
  }, [activeChatSession]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !wsConnection || !activeChatSession) return;

    const messageText = newMessage.trim();
    const messageData = {
      type: 'chat_message',
      session_id: activeChatSession.id,
      sender_type: 'support',
      sender_id: adminId, // Use actual admin ID
      message: messageText,
      message_type: 'text',
      user_id: activeChatSession.user_id
    };


    // Add message to local state immediately for instant UI update
    const newMessageObj = {
      id: Date.now(),
      sender_type: 'support',
      sender_id: adminId,
      message: messageText,
      message_type: 'text',
      is_read: false,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newMessageObj]);
    setNewMessage('');
    
    // Send via WebSocket
    wsConnection.send(JSON.stringify(messageData));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const endChatSession = async () => {
    if (!activeChatSession) {
      return;
    }
    
    
    try {
      const token = getAdminToken();
      
      const url = `http://localhost:8000/chat/sessions/${activeChatSession.id}/end`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      
      if (response.ok) {
        const data = await response.json();
        // Close the chat modal
        setActiveChatSession(null);
        setMessages([]);
        // Refresh the data to update session status
        fetchData();
      } else {
        const errorData = await response.text();
        console.error('❌ Failed to end chat session:', response.status, errorData);
      }
    } catch (error) {
      console.error('❌ Error ending chat session:', error);
    }
  };

  const loadMessages = async () => {
    if (!activeChatSession) return;
    
    try {
      const token = getAdminToken();
      const response = await fetch(`http://localhost:8000/chat/sessions/${activeChatSession.id}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const fetchFeedbackStats = async () => {
    try {
      const token = getAdminToken();
      const response = await fetch('http://localhost:8000/chat/feedback/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFeedbackStats(data);
      }
    } catch (error) {
      console.error('Error fetching feedback stats:', error);
    }
  };

  const fetchData = async () => {
    try {
      const token = getAdminToken();
      
      // Fetch pending requests
      const requestsResponse = await fetch('http://localhost:8000/chat/requests', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        setRequests(requestsData.requests);
      }
  
      // Fetch active sessions
      const sessionsResponse = await fetch('http://localhost:8000/chat/sessions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json();
        setSessions(sessionsData.sessions);
      }

      // Fetch feedback stats
      await fetchFeedbackStats();

      // Fetch total sessions count
      const totalSessionsResponse = await fetch('http://localhost:8000/chat/sessions/total', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (totalSessionsResponse.ok) {
        const totalData = await totalSessionsResponse.json();
        setTotalSessions(totalData.total_sessions || 0);
      }

      // Fetch all sessions
      const allSessionsResponse = await fetch('http://localhost:8000/chat/sessions/all', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (allSessionsResponse.ok) {
        const allSessionsData = await allSessionsResponse.json();
        setAllSessions(allSessionsData.sessions || []);
      }

      // Fetch rejected requests
      const rejectedRequestsResponse = await fetch('http://localhost:8000/chat/requests/rejected', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (rejectedRequestsResponse.ok) {
        const rejectedData = await rejectedRequestsResponse.json();
        setRejectedRequests(rejectedData.rejected_requests || []);
      }
  
      setError('');
    } catch (error) {
      console.error('Error fetching chat data:', error);
      setError('Failed to load chat data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId: number) => {
    try {
      const token = getAdminToken();
      const response = await fetch(`http://localhost:8000/chat/requests/${requestId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json()
        
        // Create a chat session object to open the modal
        const newSession: ChatSession = {
          id: data.session_id,
          request_id: requestId,
          user_id: data.user_id,
          user_name: requests.find(r => r.id === requestId)?.user_name || 'User',
          user_email: requests.find(r => r.id === requestId)?.user_email,
          category_name: requests.find(r => r.id === requestId)?.category_name || '',
          started_at: new Date().toISOString()
        }
        
        // Open chat modal immediately
        setActiveChatSession(newSession)
        
        fetchData() // Refresh data
      } else {
        alert('Failed to accept chat request')
      }
    } catch (error) {
      console.error('Error accepting request:', error);
      alert('Error accepting chat request');
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      const token = getAdminToken();
      const response = await fetch(`http://localhost:8000/chat/requests/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert('Chat request rejected');
        fetchData(); // Refresh data
      } else {
        alert('Failed to reject chat request');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Error rejecting chat request');
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid time';
      }
      
      // Format as: MM/DD/YYYY, HH:MM:SS AM/PM
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (error) {
      return 'Invalid time';
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m remaining`;
  };

  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#6b7280' }}>Loading chat queue...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#1f2937' }}>
          Live Chat Queue
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => setShowRejectedRequests(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Rejected Requests({rejectedRequests.length})
          </button>
          <button
            onClick={() => setShowFeedbackStats(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            📊 Feedback Stats
          </button>
          <div style={{
            padding: '8px 12px',
            borderRadius: '20px',
            fontSize: '14px',
            backgroundColor: wsConnection ? '#dcfce7' : '#fef2f2',
            color: wsConnection ? '#166534' : '#dc2626'
          }}>
            {wsConnection ? '🟢 Connected' : '🔴 Connecting...'}
          </div>
          {!wsConnection && (
            <button
              onClick={connectAdminWebSocket}
              style={{
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Connect WebSocket
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          color: '#dc2626',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {/* Pending Requests */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
          Pending Requests ({requests.length})
        </h3>
        
        {requests.length === 0 ? (
          <div style={{
            padding: '20px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            textAlign: 'center',
            color: '#6b7280'
          }}>
            No pending chat requests
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {requests.map((request) => (
              <div key={request.id} style={{
                padding: '16px',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                      {request.user_name}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                      {request.category_name}
                      {request.subcategory_name && ` → ${request.subcategory_name}`}
                      {' • '}{formatTime(request.created_at)}
                    </div>
                    {request.user_email && (
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                        {request.user_email}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: '500' }}>
                    {getTimeRemaining(request.expires_at)}
                  </div>
                </div>
                
                {request.message && (
                  <div style={{
                    padding: '8px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '4px',
                    fontSize: '14px',
                    color: '#374151',
                    marginBottom: '12px'
                  }}>
                    "{request.message}"
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleAcceptRequest(request.id)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRejectRequest(request.id)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Sessions */}
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
          Active Sessions ({sessions.length})
        </h3>
        
        {sessions.length === 0 ? (
          <div style={{
            padding: '20px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            textAlign: 'center',
            color: '#6b7280'
          }}>
            No active chat sessions
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {sessions.map((session) => (
              <div key={session.id} style={{
                padding: '16px',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                      {session.user_name}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                      {session.category_name} • Started {formatTime(session.started_at)}
                    </div>
                    {session.user_email && (
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                        {session.user_email}
                      </div>
                    )}
                  </div>
                  <div style={{
                    padding: '4px 8px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    Active
                  </div>
                </div>
                
                <div style={{ marginTop: '12px' }}>
                  <button
                    onClick={() => {
                      setActiveChatSession(session)
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    Open Chat
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Sessions */}
      <div style={{ marginTop: '32px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
          All Sessions ({allSessions.length})
        </h3>
        
        {allSessions.length === 0 ? (
          <div style={{
            padding: '20px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            textAlign: 'center',
            color: '#6b7280'
          }}>
            No chat sessions found
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {allSessions.map((session) => (
              <div key={session.id} style={{
                padding: '16px',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                      {session.user_name}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                      {session.user_email}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                      Category: {session.category_name}
                      {session.subcategory_name && (
                        <span style={{ color: '#9ca3af' }}> → {session.subcategory_name}</span>
                      )}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                      Support: {session.support_name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                      Started: {formatTime(session.started_at)}
                    </div>
                    {session.ended_at && (
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                        Ended: {formatTime(session.ended_at)}
                      </div>
                    )}
                  </div>
                  <div style={{
                    padding: '4px 8px',
                    backgroundColor: session.status === 'active' ? '#10b981' : '#6b7280',
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {session.status === 'active' ? 'Active' : 'Ended'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat Interface Modal */}
      {activeChatSession && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '800px',
            height: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
          }}>
            {/* Chat Header */}
            <div style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '15px 20px',
              borderTopLeftRadius: '12px',
              borderTopRightRadius: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px' }}>
                  Chat with {activeChatSession.user_name || 'User'}
                </h3>
                <p style={{ margin: '5px 0 0 0', fontSize: '13px', opacity: 0.9 }}>
                  {activeChatSession.category_name} • {activeChatSession.user_email}
                </p>
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', opacity: 0.7 }}>
                  {wsConnection ? '🟢 Connected' : '🔴 Connecting...'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  onClick={endChatSession}
                  style={{
                    backgroundColor: '#dc2626',
                    border: 'none',
                    color: 'white',
                    fontSize: '12px',
                    cursor: 'pointer',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontWeight: '500'
                  }}
                >
                  End Chat
                </button>
                <button
                  onClick={() => setActiveChatSession(null)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'white',
                    fontSize: '24px',
                    cursor: 'pointer',
                    padding: '0 10px'
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Chat Messages Area */}
            <div style={{
              flex: 1,
              padding: '20px',
              overflowY: 'auto',
              backgroundColor: '#f9fafb'
            }}>
              {messages.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  color: '#6b7280',
                  fontSize: '14px',
                  marginTop: '20px'
                }}>
                  Chat session started. You can now communicate with the user.
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    style={{
                      marginBottom: '12px',
                      display: 'flex',
                      justifyContent: message.sender_type === 'support' ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div style={{
                      maxWidth: '80%',
                      padding: '8px 12px',
                      borderRadius: '12px',
                      backgroundColor: message.sender_type === 'support' ? '#3b82f6' : 'white',
                      color: message.sender_type === 'support' ? 'white' : '#374151',
                      fontSize: '14px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}>
                      <div>{message.message}</div>
                      <div style={{
                        fontSize: '11px',
                        opacity: 0.7,
                        marginTop: '4px'
                      }}>
                        {new Date(message.created_at).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Area */}
            <div style={{
              padding: '15px 20px',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: 'white',
              borderBottomLeftRadius: '12px',
              borderBottomRightRadius: '12px'
            }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '20px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!wsConnection || !newMessage.trim()}
                  style={{
                    backgroundColor: wsConnection && newMessage.trim() ? '#3b82f6' : '#9ca3af',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '44px',
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Stats Modal */}
      {showFeedbackStats && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
          }}>
            {/* Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '30px',
              borderBottom: '1px solid #e5e7eb',
              paddingBottom: '20px'
            }}>
              <h2 style={{ 
                margin: 0, 
                fontSize: '24px', 
                fontWeight: '600',
                color: '#1f2937'
              }}>
                📊 Feedback Analytics
              </h2>
              <button
                onClick={() => setShowFeedbackStats(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ×
              </button>
            </div>

            {feedbackStats ? (
              <div>
                {/* Overall Stats */}
                <div style={{ marginBottom: '30px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
                    Overall Statistics
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div style={{
                      padding: '20px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6' }}>
                        {feedbackStats.total_feedback}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Feedback</div>
                    </div>
                    <div style={{
                      padding: '20px',
                      backgroundColor: '#f0fdf4',
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>
                        {feedbackStats.average_ratings.overall}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>Avg Overall Rating</div>
                    </div>
                    <div style={{
                      padding: '20px',
                      backgroundColor: '#fef3c7',
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b' }}>
                        {feedbackStats.recommendation_rate}%
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>Recommendation Rate</div>
                    </div>
                  </div>
                </div>

                {/* Rating Breakdown */}
                <div style={{ marginBottom: '30px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
                    Rating Breakdown
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                    <div style={{
                      padding: '16px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
                        {feedbackStats.average_ratings.support_quality}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Support Quality</div>
                    </div>
                    <div style={{
                      padding: '16px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
                        {feedbackStats.average_ratings.response_time}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Response Time</div>
                    </div>
                  </div>
                </div>

                {/* Recent Feedback */}
                {feedbackStats.recent_feedback && feedbackStats.recent_feedback.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
                      Recent Feedback
                    </h3>
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {feedbackStats.recent_feedback.map((feedback: any, index: number) => (
                        <div key={index} style={{
                          padding: '16px',
                          backgroundColor: '#f8fafc',
                          borderRadius: '8px',
                          marginBottom: '12px',
                          border: '1px solid #e5e7eb'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div>
                              <div style={{ fontWeight: '600', color: '#1f2937' }}>
                                {feedback.user_name} ({feedback.user_email})
                              </div>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                Session #{feedback.session_id} • {new Date(feedback.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                Overall: {feedback.overall_rating}/5
                              </div>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                Support: {feedback.support_quality}/5
                              </div>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                Response: {feedback.response_time}/5
                              </div>
                            </div>
                          </div>
                          {feedback.comments && (
                            <div style={{
                              fontSize: '14px',
                              color: '#374151',
                              fontStyle: 'italic',
                              marginTop: '8px',
                              padding: '8px',
                              backgroundColor: 'white',
                              borderRadius: '4px'
                            }}>
                              "{feedback.comments}"
                            </div>
                          )}
                          <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                            {feedback.would_recommend ? '✅ Would recommend' : '❌ Would not recommend'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                No feedback data available
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rejected Requests Modal */}
      {showRejectedRequests && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
          }}>
            {/* Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '30px',
              borderBottom: '1px solid #e5e7eb',
              paddingBottom: '20px'
            }}>
              <h2 style={{ 
                margin: 0, 
                fontSize: '24px', 
                fontWeight: '600',
                color: '#1f2937'
              }}>
                Rejected Request({rejectedRequests.length})
              </h2>
              <button
                onClick={() => setShowRejectedRequests(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ×
              </button>
            </div>

            {/* Content */}
            {rejectedRequests.length > 0 ? (
              <div>
                <div style={{ display: 'grid', gap: '16px' }}>
                  {rejectedRequests.map((request) => (
                    <div key={request.id} style={{
                      padding: '20px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '8px',
                      borderLeft: '4px solid #ef4444'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                            {request.user_name}
                          </div>
                          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                            {request.user_email}
                          </div>
                        </div>
                        <div style={{
                          padding: '4px 8px',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          Rejected
                        </div>
                      </div>
                      
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '14px', color: '#374151', marginBottom: '4px' }}>
                          <strong>Category:</strong> {request.category_name}
                          {request.subcategory_name && (
                            <span style={{ color: '#6b7280' }}> → {request.subcategory_name}</span>
                          )}
                        </div>
                        <div style={{ fontSize: '14px', color: '#374151', marginBottom: '4px' }}>
                          <strong>Rejected by:</strong> {request.rejected_by}
                        </div>
                        <div style={{ fontSize: '14px', color: '#374151', marginBottom: '4px' }}>
                          <strong>Requested at:</strong> {new Date(request.created_at).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '14px', color: '#374151', marginBottom: '4px' }}>
                          <strong>Rejected at:</strong> {new Date(request.rejected_at).toLocaleString()}
                        </div>
                      </div>

                      {request.message && (
                        <div style={{
                          backgroundColor: 'white',
                          padding: '12px',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb',
                          marginBottom: '12px'
                        }}>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                            User's Query:
                          </div>
                          <div style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.5' }}>
                            {request.message}
                          </div>
                        </div>
                      )}

                      {request.rejection_reason && (
                        <div style={{
                          backgroundColor: '#fef2f2',
                          padding: '12px',
                          borderRadius: '6px',
                          border: '1px solid #fecaca'
                        }}>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: '#dc2626', marginBottom: '4px' }}>
                            Rejection Reason:
                          </div>
                          <div style={{ fontSize: '14px', color: '#7f1d1d', lineHeight: '1.5' }}>
                            {request.rejection_reason}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                No rejected requests found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveChatQueue;


