import React, { useState } from 'react';

interface FeedbackPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: FeedbackData) => void;
  sessionId: number;
  adminUserId: number;
  userName: string;
}

interface FeedbackData {
  overall_rating: number;
  support_quality: number;
  response_time: number;
  comments: string;
  would_recommend: boolean;
}

const FeedbackPopup: React.FC<FeedbackPopupProps> = ({
  isOpen,
  onClose,
  onSubmit,
  sessionId,
  adminUserId,
  userName
}) => {
  const [feedback, setFeedback] = useState<FeedbackData>({
    overall_rating: 0,
    support_quality: 0,
    response_time: 0,
    comments: '',
    would_recommend: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRatingChange = (field: keyof FeedbackData, value: number) => {
    setFeedback(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCommentsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFeedback(prev => ({
      ...prev,
      comments: e.target.value
    }));
  };

  const handleRecommendChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFeedback(prev => ({
      ...prev,
      would_recommend: e.target.checked
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (feedback.overall_rating === 0 || feedback.support_quality === 0 || feedback.response_time === 0) {
      alert('Please provide ratings for all categories');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmit(feedback);
      // Reset form
      setFeedback({
        overall_rating: 0,
        support_quality: 0,
        response_time: 0,
        comments: '',
        would_recommend: false
      });
      onClose();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRating: React.FC<{
    value: number;
    onChange: (value: number) => void;
    label: string;
  }> = ({ value, onChange, label }) => (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ 
        display: 'block', 
        marginBottom: '8px', 
        fontWeight: '500',
        color: '#374151'
      }}>
        {label} *
      </label>
      <div style={{ display: 'flex', gap: '4px' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '24px',
              color: star <= value ? '#fbbf24' : '#d1d5db',
              padding: '0',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => {
              if (star > value) {
                e.currentTarget.style.color = '#fbbf24';
              }
            }}
            onMouseLeave={(e) => {
              if (star > value) {
                e.currentTarget.style.color = '#d1d5db';
              }
            }}
          >
            ★
          </button>
        ))}
      </div>
      <div style={{ 
        fontSize: '12px', 
        color: '#6b7280', 
        marginTop: '4px' 
      }}>
        {value === 0 ? 'Please select a rating' : 
         value === 1 ? 'Poor' :
         value === 2 ? 'Fair' :
         value === 3 ? 'Good' :
         value === 4 ? 'Very Good' : 'Excellent'}
      </div>
    </div>
  );

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
      zIndex: 10000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '30px',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
      }}>
        {/* Header */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '30px',
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '20px'
        }}>
          <h2 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '24px', 
            fontWeight: '600',
            color: '#1f2937'
          }}>
            Rate Your Chat Experience
          </h2>
          <p style={{ 
            margin: 0, 
            color: '#6b7280',
            fontSize: '14px'
          }}>
            Help us improve our support quality
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Overall Rating */}
          <StarRating
            value={feedback.overall_rating}
            onChange={(value) => handleRatingChange('overall_rating', value)}
            label="Overall Experience"
          />

          {/* Support Quality */}
          <StarRating
            value={feedback.support_quality}
            onChange={(value) => handleRatingChange('support_quality', value)}
            label="Support Quality"
          />

          {/* Response Time */}
          <StarRating
            value={feedback.response_time}
            onChange={(value) => handleRatingChange('response_time', value)}
            label="Response Time"
          />

          {/* Comments */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '500',
              color: '#374151'
            }}>
              Additional Comments (Optional)
            </label>
            <textarea
              value={feedback.comments}
              onChange={handleCommentsChange}
              placeholder="Tell us about your experience..."
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Would Recommend */}
          <div style={{ 
            marginBottom: '30px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <input
              type="checkbox"
              id="would_recommend"
              checked={feedback.would_recommend}
              onChange={handleRecommendChange}
              style={{
                width: '16px',
                height: '16px',
                cursor: 'pointer'
              }}
            />
            <label 
              htmlFor="would_recommend"
              style={{
                cursor: 'pointer',
                fontSize: '14px',
                color: '#374151'
              }}
            >
              I would recommend this support service to others
            </label>
          </div>

          {/* Action Buttons */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            justifyContent: 'flex-end',
            borderTop: '1px solid #e5e7eb',
            paddingTop: '20px'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '10px 20px',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: isSubmitting ? 0.6 : 1
              }}
            >
              Skip
            </button>
            <button
              type="submit"
              disabled={isSubmitting || feedback.overall_rating === 0 || feedback.support_quality === 0 || feedback.response_time === 0}
              style={{
                padding: '10px 20px',
                backgroundColor: isSubmitting || feedback.overall_rating === 0 || feedback.support_quality === 0 || feedback.response_time === 0 ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isSubmitting || feedback.overall_rating === 0 || feedback.support_quality === 0 || feedback.response_time === 0 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackPopup;
