import React, { useState, useEffect } from 'react';

interface ChatCategory {
  id: number;
  name: string;
  description: string;
}

interface ChatNowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChatStarted: (sessionId: number, userId: string, supportUserId?: number) => void;
  onRequestCreated: (userId: string) => void;
}

const ChatNowModal: React.FC<ChatNowModalProps> = ({ isOpen, onClose, onChatStarted, onRequestCreated }) => {
  const [categories, setCategories] = useState<ChatCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number>(1);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);


  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:8000/chat/categories');
      const data = await response.json();
      setCategories(data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8000/chat/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_name: userName || undefined,
          user_email: userEmail || undefined,
          category_id: selectedCategory,
          message: message || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Chat request sent! Waiting for support agent...');
        onRequestCreated(data.user_id);
        // Don't close modal - let WebSocket handle it
      } else {
        setError('Failed to create chat request. Please try again.');
      }
    } catch (error) {
      console.error('Error creating chat request:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
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
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            margin: 0
          }}>
            Chat Now
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '6px',
              color: '#374151'
            }}>
              Category *
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
              required
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '6px',
              color: '#374151'
            }}>
              Your Name (Optional)
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your name"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '6px',
              color: '#374151'
            }}>
              Email (Optional)
            </label>
            <input
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="Enter your email"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '6px',
              color: '#374151'
            }}>
              Message (Optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Briefly describe your issue..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                resize: 'vertical'
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#dc2626',
              fontSize: '14px',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: 'white',
                color: '#374151',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: isLoading ? '#9ca3af' : '#3b82f6',
                color: 'white',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              {isLoading ? 'Sending...' : 'Start Chat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatNowModal;
