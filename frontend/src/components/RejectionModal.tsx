import React from 'react';

interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  title?: string;
  showTicketOption?: boolean;
}

const RejectionModal: React.FC<RejectionModalProps> = ({ 
  isOpen, 
  onClose, 
  message, 
  title = "Request Rejected",
  showTicketOption = true 
}) => {
  if (!isOpen) return null;

  const handleCreateTicket = () => {
    // Close modal and trigger ticket creation
    onClose();
    // You can add ticket creation logic here
    window.dispatchEvent(new CustomEvent('openTicketModal'));
  };

  const handleTryAgain = () => {
    // Close modal and trigger new chat request
    onClose();
    // Trigger new chat request
    window.dispatchEvent(new CustomEvent('openChatModal'));
  };

  return (
    <>
      <style>
        {`
          @keyframes slideInUp {
            from {
              opacity: 0;
              transform: translateY(50px) scale(0.9);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% {
              transform: translateY(0);
            }
            40% {
              transform: translateY(-10px);
            }
            60% {
              transform: translateY(-5px);
            }
          }
          .rejection-modal-overlay {
            animation: fadeIn 0.3s ease-out;
          }
          .rejection-modal-content {
            animation: slideInUp 0.4s ease-out;
          }
          .rejection-icon {
            animation: bounce 2s infinite;
          }
        `}
      </style>
      <div 
        className="rejection-modal-overlay"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          backdropFilter: 'blur(4px)'
        }}
        onClick={onClose}
      >
        <div 
          className="rejection-modal-content"
          style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '32px',
            width: '90%',
            maxWidth: '480px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            position: 'relative'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#9ca3af',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
              e.currentTarget.style.color = '#374151';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#9ca3af';
            }}
          >
            ×
          </button>

          {/* Icon */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div 
              className="rejection-icon"
              style={{
                fontSize: '64px',
                marginBottom: '16px',
                color: '#f59e0b'
              }}
            >
              ⚠️
            </div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '700',
              margin: '0 0 8px 0',
              color: '#1f2937',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {title}
            </h2>
          </div>

          {/* Message */}
          <div style={{
            textAlign: 'center',
            marginBottom: '32px'
          }}>
            <p style={{
              fontSize: '16px',
              color: '#6b7280',
              lineHeight: '1.6',
              margin: '0',
              padding: '0 16px'
            }}>
              {message}
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {showTicketOption && (
              <button
                onClick={handleCreateTicket}
                style={{
                  padding: '14px 24px',
                  border: 'none',
                  borderRadius: '12px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                }}
              >
                🎫 Create Support Ticket
              </button>
            )}

            <button
              onClick={handleTryAgain}
              style={{
                padding: '14px 24px',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                backgroundColor: 'white',
                color: '#374151',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.color = '#3b82f6';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.color = '#374151';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              🔄 Try Again
            </button>

            <button
              onClick={onClose}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '12px',
                backgroundColor: 'transparent',
                color: '#9ca3af',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#6b7280';
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#9ca3af';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Close
            </button>
          </div>

          {/* Footer */}
          <div style={{
            textAlign: 'center',
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid #f3f4f6'
          }}>
            <p style={{
              fontSize: '12px',
              color: '#9ca3af',
              margin: '0'
            }}>
              Need immediate help? Contact us at{' '}
              <a 
                href="mailto:support@venturingdigitally.com" 
                style={{ 
                  color: '#3b82f6', 
                  textDecoration: 'none',
                  fontWeight: '500'
                }}
              >
                support@venturingdigitally.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default RejectionModal;
