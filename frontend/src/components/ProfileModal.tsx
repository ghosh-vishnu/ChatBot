import React, { useState, useRef } from 'react'

interface User {
  id: number
  username: string
  email: string
  full_name: string
  is_admin: boolean
  is_active: boolean
  user_type: string
  role_id?: number
  role_name?: string
}

interface ProfileModalProps {
  user: User
  isOpen: boolean
  onClose: () => void
  onUpdate: (updatedUser: User) => void
}

const ProfileModal: React.FC<ProfileModalProps> = ({ user, isOpen, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Profile form state
  const [profileData, setProfileData] = useState({
    full_name: user.full_name,
    email: user.email,
    username: user.username
  })
  
  // Password form state
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  
  // Profile image state
  const [profileImage, setProfileImage] = useState<string | null>(user.profile_image || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token')
      const response = await fetch('http://localhost:8000/auth/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      })

      if (response.ok) {
        const data = await response.json()
        onUpdate(data.user)
        setSuccess('Profile updated successfully!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const errorData = await response.json()
        setError(errorData.detail || 'Failed to update profile')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('New passwords do not match')
      setIsLoading(false)
      return
    }

    try {
      const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token')
      const response = await fetch('http://localhost:8000/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password
        })
      })

      if (response.ok) {
        setSuccess('Password changed successfully!')
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const errorData = await response.json()
        setError(errorData.detail || 'Failed to change password')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const imageData = e.target?.result as string
        setProfileImage(imageData)
        
        // Save image to database
        try {
          const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token')
          const response = await fetch('http://localhost:8000/auth/update-profile-image', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ profile_image: imageData })
          })

          if (response.ok) {
            setSuccess('Profile image updated successfully!')
            setTimeout(() => setSuccess(''), 3000)
          } else {
            const errorData = await response.json()
            setError(errorData.detail || 'Failed to update profile image')
          }
        } catch (error) {
          setError('Network error. Please try again.')
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  if (!isOpen) return null

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
        width: '90%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 24px 0 24px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: 0 }}>
              Profile Settings
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6b7280'
              }}
            >
              ×
            </button>
          </div>
          
          {/* Profile Image */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '20px', marginBottom: '20px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: profileImage ? 'transparent' : '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundImage: profileImage ? `url(${profileImage})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative',
              cursor: 'pointer'
            }}
            onClick={() => fileInputRef.current?.click()}
            >
              {!profileImage && (
                <span style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>
                  {getInitials(user.full_name)}
                </span>
              )}
              <div style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                width: '24px',
                height: '24px',
                backgroundColor: '#3b82f6',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid white'
              }}>
                <span style={{ color: 'white', fontSize: '12px' }}>📷</span>
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 4px 0' }}>
                {user.full_name}
              </h3>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 4px 0' }}>
                @{user.username}
              </p>
              <p style={{ fontSize: '12px', color: '#3b82f6', margin: 0, textTransform: 'uppercase', fontWeight: '500' }}>
                {user.role_name || user.user_type}
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e5e7eb',
          padding: '0 24px'
        }}>
          <button
            onClick={() => setActiveTab('profile')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'profile' ? '2px solid #3b82f6' : '2px solid transparent',
              color: activeTab === 'profile' ? '#3b82f6' : '#6b7280',
              fontWeight: activeTab === 'profile' ? '600' : '400',
              cursor: 'pointer'
            }}
          >
            Profile Information
          </button>
          <button
            onClick={() => setActiveTab('password')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'password' ? '2px solid #3b82f6' : '2px solid transparent',
              color: activeTab === 'password' ? '#3b82f6' : '#6b7280',
              fontWeight: activeTab === 'password' ? '600' : '400',
              cursor: 'pointer'
            }}
          >
            Change Password
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {error && (
            <div style={{
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              backgroundColor: '#d1fae5',
              color: '#059669',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              {success}
            </div>
          )}

          {activeTab === 'profile' ? (
            <form onSubmit={handleProfileUpdate}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileData.full_name}
                  onChange={(e) => setProfileData({...profileData, full_name: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  Username
                </label>
                <input
                  type="text"
                  value={profileData.username}
                  onChange={(e) => setProfileData({...profileData, username: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '12px 24px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    color: '#374151',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    padding: '12px 24px',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: isLoading ? '#9ca3af' : '#3b82f6',
                    color: 'white',
                    cursor: isLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isLoading ? 'Updating...' : 'Update Profile'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handlePasswordChange}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                  required
                  minLength={6}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                  required
                  minLength={6}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '12px 24px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    color: '#374151',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    padding: '12px 24px',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: isLoading ? '#9ca3af' : '#3b82f6',
                    color: 'white',
                    cursor: isLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isLoading ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProfileModal
