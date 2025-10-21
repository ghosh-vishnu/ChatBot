import React, { useState, useEffect, useRef } from 'react';

interface ChatRequest {
  id: number;
  user_name: string;
  user_email?: string;
  category_name: string;
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
  started_at: string;
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
  const [adminId, setAdminId] = useState<string>('1');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
    // Refresh every 5 seconds
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // WebSocket connection for active chat session
  useEffect(() => {
    if (activeChatSession && !wsConnection) {
      // Get admin user ID from token
      const token = localStorage.getItem('admin_token');
      if (token) {
        // Extract admin ID from token by making a request to verify endpoint
        fetch('http://localhost:8000/auth/verify', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            const extractedAdminId = data.user.id || data.user.user_id;
            console.log('Admin ID from token:', extractedAdminId);
            setAdminId(extractedAdminId);
            
            const ws = new WebSocket(`ws://localhost:8000/chat/ws/support/${extractedAdminId}`);
            
            ws.onopen = () => {
              console.log('Admin WebSocket connected with ID:', extractedAdminId);
              setWsConnection(ws);
              // Send a test message to verify connection
              console.log('WebSocket connection established successfully');
            };
            
            ws.onmessage = (event) => {
              const data = JSON.parse(event.data);
              console.log('Admin received message:', data);
              
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
              }
            };
            
            ws.onclose = () => {
              console.log('Admin WebSocket disconnected');
              setWsConnection(null);
            };
            
            ws.onerror = (error) => {
              console.error('Admin WebSocket error:', error);
              console.error('WebSocket connection failed. Check if server is running and endpoint is correct.');
              setWsConnection(null);
            };
          } else {
            console.error('Failed to get admin ID from token');
          }
        })
        .catch(error => {
          console.error('Error verifying admin token:', error);
          console.error('Token verification failed. Check if admin is logged in properly.');
        });
      }
    }
    
    return () => {
      if (wsConnection) {
        wsConnection.close();
        setWsConnection(null);
      }
    };
  }, [activeChatSession, wsConnection]);

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

    console.log('Admin sending message:', messageData);

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
    console.log('Admin sending via WebSocket:', messageData);
    wsConnection.send(JSON.stringify(messageData));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      
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
      const token = localStorage.getItem('admin_token');
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
      const token = localStorage.getItem('admin_token');
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
    return new Date(timestamp).toLocaleString();
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
      <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px', color: '#1f2937' }}>
        Live Chat Queue
      </h2>

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
                      {request.category_name} • {formatTime(request.created_at)}
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
    </div>
  );
};

export default LiveChatQueue;
