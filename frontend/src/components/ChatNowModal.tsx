import React, { useState, useEffect, useRef } from 'react';

interface ChatCategory {
  id: number;
  name: string;
  description: string;
}

interface ChatSubcategory {
  id: number;
  category_id: number;
  name: string;
  description: string;
  is_active: boolean;
}

interface ChatNowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChatStarted: (sessionId: number, userId: string, supportUserId?: number) => void;
  onRequestCreated: (userId: string) => void;
  onTimeout?: () => void;
}

const ChatNowModal: React.FC<ChatNowModalProps> = ({ isOpen, onClose, onChatStarted, onRequestCreated, onTimeout }) => {
  const [categories, setCategories] = useState<ChatCategory[]>([]);
  const [subcategories, setSubcategories] = useState<ChatSubcategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number>(1);
  const [selectedSubcategory, setSelectedSubcategory] = useState<number | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isWaiting, setIsWaiting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [actualRequestId, setActualRequestId] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      // Reset states when modal opens
      setIsWaiting(false);
      setTimeLeft(0);
      setRequestId(null);
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    // Cleanup timer on unmount
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [isOpen]);

  // Timer countdown effect
  useEffect(() => {
    if (timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            // Timer expired - auto close modal
            setIsWaiting(false);
            setError('Request timed out. Please try again.');
            if (onTimeout) {
              onTimeout();
            }
            return 0;
          }
          return newTime;
        });
      }, 1000);
    } else {
      // Clear timer when timeLeft reaches 0
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    // Cleanup function
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timeLeft, onTimeout]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:8000/chat/categories');
      const data = await response.json();
      setCategories(data.categories);
      if (data.categories.length > 0) {
        setSelectedCategory(data.categories[0].id);
        // Fetch subcategories for the first category
        fetchSubcategories(data.categories[0].id);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchSubcategories = async (categoryId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/chat/subcategories/${categoryId}`);
      if (response.ok) {
        const data = await response.json();
        setSubcategories(data);
        // Reset selected subcategory when category changes
        setSelectedSubcategory(data.length > 0 ? data[0].id : null);
      }
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      setSubcategories([]);
      setSelectedSubcategory(null);
    }
  };

  const cancelRequest = async () => {
    if (!actualRequestId || !requestId) {
      console.error('No request to cancel');
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/chat/request/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          request_id: actualRequestId,
          user_id: requestId
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Reset states
        setIsWaiting(false);
        setTimeLeft(0);
        setRequestId(null);
        setActualRequestId(null);
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        // Close modal
        onClose();
      } else {
        setError('Failed to cancel request. Please try again.');
      }
    } catch (error) {
      console.error('Error canceling request:', error);
      setError('Network error. Please try again.');
    }
  };

  const handleCategoryChange = (categoryId: number) => {
    setSelectedCategory(categoryId);
    fetchSubcategories(categoryId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!selectedCategory) {
      setError('Please select a category');
      return;
    }
    
    if (subcategories && subcategories.length > 0 && !selectedSubcategory) {
      setError('Please select a subcategory');
      return;
    }
    
    if (!userName.trim()) {
      setError('Name is required');
      return;
    }
    
    if (!message.trim()) {
      setError('Message is required');
      return;
    }
    
    if (message.trim().length < 20) {
      setError('Message must be at least 20 characters long');
      return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8000/chat/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_name: userName.trim(),
          user_email: userEmail.trim() || undefined,
          category_id: selectedCategory,
          subcategory_id: selectedSubcategory,
          message: message.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Start waiting state with timer
        setIsWaiting(true);
        setTimeLeft(120); // 120 seconds (2 minutes) timer
        setRequestId(data.user_id);
        setActualRequestId(data.request_id);
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
    <>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
        `}
      </style>
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

        {isWaiting ? (
          // Waiting state with timer
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px',
              color: '#3b82f6',
              animation: timeLeft <= 20 ? 'pulse 1s infinite' : 'none'
            }}>
              ⏱️
            </div>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '8px',
              color: '#374151'
            }}>
              Waiting for Support Agent...
            </h3>
            <div style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: timeLeft <= 20 ? '#dc2626' : timeLeft <= 40 ? '#f59e0b' : '#3b82f6',
              marginBottom: '16px',
              fontFamily: 'monospace'
            }}>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
            <div style={{
              width: '100%',
              height: '12px',
              backgroundColor: '#e5e7eb',
              borderRadius: '6px',
              overflow: 'hidden',
              marginBottom: '16px',
              position: 'relative'
            }}>
              <div style={{
                width: `${(timeLeft / 120) * 100}%`,
                height: '100%',
                backgroundColor: timeLeft <= 20 ? '#dc2626' : timeLeft <= 40 ? '#f59e0b' : '#3b82f6',
                transition: 'width 1s linear, background-color 0.3s ease',
                borderRadius: '6px',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '8px',
                  color: 'white',
                  fontWeight: 'bold',
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                }}>
                  {Math.round((timeLeft / 120) * 100)}%
                </div>
              </div>
            </div>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              marginBottom: '20px'
            }}>
              Your request has been sent. A support agent will connect with you shortly.
            </p>
            <button
              onClick={cancelRequest}
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
              Cancel Request
            </button>
          </div>
        ) : (
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
              onChange={(e) => handleCategoryChange(Number(e.target.value))}
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

          {/* Subcategory Dropdown */}
          {subcategories && subcategories.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '6px',
                color: '#374151'
              }}>
                Subcategory *
              </label>
              <select
                value={selectedSubcategory || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedSubcategory(value ? Number(value) : null);
                }}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                required
              >
                <option value="">Select a subcategory...</option>
                {subcategories && subcategories.length > 0 ? (
                  subcategories.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>Loading subcategories...</option>
                )}
              </select>
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '6px',
              color: '#374151'
            }}>
              Your Name *
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your name"
              required
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
              Message * (Minimum 20 characters)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Briefly describe your issue... (minimum 20 characters)"
              rows={3}
              required
              minLength={20}
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
        )}
      </div>
      </div>
    </>
  );
};

export default ChatNowModal;
