import React, { useState, useEffect, useRef } from 'react';
import FeedbackPopup from './FeedbackPopup';

interface ChatMessage {
  id: number;
  sender_type: string;
  sender_id: string;
  message: string;
  message_type: string;
  is_read: boolean;
  created_at: string;
}

interface LiveChatWindowProps {
  sessionId: number;
  userId: string;
  supportUserId: number;
  onEndChat: () => void;
  wsConnection?: WebSocket | null;
  userName?: string;
}

const LiveChatWindow: React.FC<LiveChatWindowProps> = ({ 
  sessionId, 
  userId, 
  supportUserId, 
  onEndChat,
  wsConnection,
  userName = 'User'
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isChatEnded, setIsChatEnded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load existing messages
    loadMessages();
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      const response = await fetch(`http://localhost:8000/chat/sessions/${sessionId}/messages/public`);
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]); // Set empty array to prevent undefined error
    }
  };

  // Use the WebSocket connection from parent component
  useEffect(() => {
    if (wsConnection) {
      const handleMessage = (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'chat_message') {
          setMessages(prev => [...prev, {
            id: Date.now(), // Temporary ID
            sender_type: data.sender_type,
            sender_id: data.sender_id,
            message: data.message,
            message_type: data.message_type || 'text',
            is_read: false,
            created_at: new Date().toISOString()
          }]);
        } else if (data.type === 'typing') {
          setIsTyping(data.isTyping);
        } else if (data.type === 'session_ended') {
          setIsChatEnded(true);
          setShowFeedback(true);
        }
      };

      wsConnection.addEventListener('message', handleMessage);
      
      return () => {
        wsConnection.removeEventListener('message', handleMessage);
      };
    }
  }, [wsConnection]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !wsConnection || isChatEnded) return;

    const messageText = newMessage.trim();
    const messageData = {
      type: 'chat_message',
      session_id: sessionId,
      sender_type: 'user',
      sender_id: userId,
      message: messageText,
      message_type: 'text',
      support_user_id: supportUserId
    };


    // Add message to local state immediately for instant UI update
    const newMessageObj = {
      id: Date.now(),
      sender_type: 'user',
      sender_id: userId,
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

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const endChat = async () => {
    try {
      // Call backend API to end the session
      const response = await fetch(`http://localhost:8000/chat/sessions/${sessionId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        setIsChatEnded(true);
        setShowFeedback(true);
      } else {
        console.error('❌ Failed to end chat session');
      }
    } catch (error) {
      console.error('❌ Error ending chat session:', error);
    }
  };

  const handleFeedbackSubmit = async (feedback: any) => {
    try {
      const response = await fetch('http://localhost:8000/chat/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: sessionId,
          user_id: userId,
          admin_user_id: supportUserId,
          ...feedback
        })
      });

      if (response.ok) {
        setShowFeedback(false);
        // Close WebSocket connection and call parent callback
        if (wsConnection) {
          wsConnection.close();
        }
        onEndChat();
      } else {
        throw new Error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('❌ Error submitting feedback:', error);
      throw error;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '350px',
      height: '500px',
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      border: '1px solid #e5e7eb'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        backgroundColor: '#3b82f6',
        color: 'white',
        borderRadius: '12px 12px 0 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600' }}>
            Live Chat
          </div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>
            Connected to support
          </div>
        </div>
        <button
          onClick={endChat}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '4px'
          }}
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        padding: '16px',
        overflowY: 'auto',
        backgroundColor: '#f9fafb'
      }}>
        {(messages || []).map((message) => (
          <div
            key={message.id}
            style={{
              marginBottom: '12px',
              display: 'flex',
              justifyContent: message.sender_type === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            <div style={{
              maxWidth: '80%',
              padding: '8px 12px',
              borderRadius: '12px',
              backgroundColor: message.sender_type === 'user' ? '#3b82f6' : 'white',
              color: message.sender_type === 'user' ? 'white' : '#374151',
              fontSize: '14px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <div>{message.message}</div>
              <div style={{
                fontSize: '11px',
                opacity: 0.7,
                marginTop: '4px'
              }}>
                {formatTime(message.created_at)}
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-start',
            marginBottom: '12px'
          }}>
            <div style={{
              padding: '8px 12px',
              borderRadius: '12px',
              backgroundColor: 'white',
              fontSize: '14px',
              color: '#6b7280',
              fontStyle: 'italic'
            }}>
              Support is typing...
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid #e5e7eb',
        backgroundColor: 'white',
        borderRadius: '0 0 12px 12px'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isChatEnded ? "Chat has ended" : "Type your message..."}
            disabled={isChatEnded}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '20px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: isChatEnded ? '#f3f4f6' : 'white',
              color: isChatEnded ? '#9ca3af' : '#374151',
              cursor: isChatEnded ? 'not-allowed' : 'text'
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || isChatEnded}
            style={{
              padding: '8px 12px',
              backgroundColor: newMessage.trim() ? '#3b82f6' : '#9ca3af',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
              fontSize: '14px'
            }}
          >
            Send
          </button>
        </div>
      </div>

      {/* Feedback Popup */}
      <FeedbackPopup
        isOpen={showFeedback}
        onClose={() => {
          setShowFeedback(false);
          if (wsConnection) {
            wsConnection.close();
          }
          onEndChat();
        }}
        onSubmit={handleFeedbackSubmit}
        sessionId={sessionId}
        adminUserId={supportUserId}
        userName={userName}
      />
    </div>
  );
};

export default LiveChatWindow;
