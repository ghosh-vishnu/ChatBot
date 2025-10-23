import React, { useState, useEffect } from 'react'
import ProfileModal from './ProfileModal'

interface User {
  id: number
  username: string
  email: string
  full_name: string
  is_admin: boolean
  is_active: boolean
  user_type: string
  role_id?: number
  profile_image?: string
}

interface Notification {
  id: number
  type: string
  title: string
  message: string
  ticket_token?: string
  is_read: number
  created_at: string
}


interface LoginCredentials {
  username: string
  password: string
}

const UserDashboard: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  
  // Notification states
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false)
  const [notificationEventSource, setNotificationEventSource] = useState<EventSource | null>(null)

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('user_token')
    const userData = localStorage.getItem('user_data')
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
        setIsLoggedIn(true)
      } catch (e) {
        localStorage.removeItem('user_token')
        localStorage.removeItem('user_data')
      }
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Store token and user data
        localStorage.setItem('user_token', data.access_token)
        localStorage.setItem('user_data', JSON.stringify(data.user))
        
        setUser(data.user)
        setIsLoggedIn(true)
        setCredentials({ username: '', password: '' })
      } else {
        const errorData = await response.json()
        setError(errorData.detail || 'Login failed')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user_token')
    localStorage.removeItem('user_data')
    setUser(null)
    setIsLoggedIn(false)
    cleanupNotifications()
  }

  // Fetch notifications
  const fetchNotifications = async () => {
    setIsNotificationsLoading(true)
    try {
      const token = localStorage.getItem('user_token')
      const response = await fetch('http://localhost:8000/user/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setIsNotificationsLoading(false)
    }
  }

  // Fetch notification count
  const fetchNotificationCount = async () => {
    try {
      const token = localStorage.getItem('user_token')
      const response = await fetch('http://localhost:8000/user/notifications/count', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.unread_count || 0)
      }
    } catch (error) {
      console.error('Error fetching notification count:', error)
    }
  }

  // Mark notification as read
  const markNotificationRead = async (notificationId: number) => {
    try {
      const token = localStorage.getItem('user_token')
      const response = await fetch(`http://localhost:8000/user/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        // Update local state
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, is_read: 1 }
              : notif
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // Clear all notifications
  const clearAllNotifications = async () => {
    try {
      const token = localStorage.getItem('user_token')
      const response = await fetch('http://localhost:8000/user/notifications/clear', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        setNotifications([])
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error clearing notifications:', error)
    }
  }

  // Delete specific notification
  const deleteNotification = async (notificationId: number) => {
    try {
      const token = localStorage.getItem('user_token')
      const response = await fetch(`http://localhost:8000/user/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId))
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  // Setup real-time notifications
  const setupRealTimeNotifications = () => {
    if (notificationEventSource) {
      notificationEventSource.close()
    }

    const token = localStorage.getItem('user_token')
    if (!token) return

    const eventSource = new EventSource(`http://localhost:8000/user/notifications/stream?token=${token}`)
    
    eventSource.onopen = () => {
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        switch (data.type) {
          case 'connected':
            break
            
          case 'new_notification':
            const newNotification = data.data
            setNotifications(prev => [newNotification, ...prev])
            if (newNotification.is_read === 0) {
              setUnreadCount(prev => prev + 1)
            }
            break
            
          case 'notification_read':
            setNotifications(prev => 
              prev.map(notif => 
                notif.id === data.notification_id 
                  ? { ...notif, is_read: 1 }
                  : notif
              )
            )
            setUnreadCount(prev => Math.max(0, prev - 1))
            break
            
          case 'notification_deleted':
            setNotifications(prev => prev.filter(notif => notif.id !== data.notification_id))
            setUnreadCount(prev => Math.max(0, prev - 1))
            break
            
          case 'notifications_cleared':
            setNotifications([])
            setUnreadCount(0)
            break
            
          case 'notification':
            // Initial notification data
            const notification = data.data
            setNotifications(prev => {
              const exists = prev.some(n => n.id === notification.id)
              if (!exists) {
                return [notification, ...prev]
              }
              return prev
            })
            break
            
          case 'ping':
            // Keep-alive ping
            break
        }
      } catch (error) {
        console.error('Error parsing notification data:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('User notification stream error:', error)
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (isLoggedIn) {
          setupRealTimeNotifications()
        }
      }, 5000)
    }

    setNotificationEventSource(eventSource)
  }

  // Cleanup notification stream
  const cleanupNotifications = () => {
    if (notificationEventSource) {
      notificationEventSource.close()
      setNotificationEventSource(null)
    }
  }

  // Load notifications when user logs in
  useEffect(() => {
    if (isLoggedIn) {
      fetchNotifications()
      fetchNotificationCount()
      setupRealTimeNotifications()
    }
    
    // Cleanup on unmount
    return () => {
      cleanupNotifications()
    }
  }, [isLoggedIn])


  if (!isLoggedIn) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '400px'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: '0 0 8px 0' }}>
              User Login
            </h1>
            <p style={{ color: '#6b7280', margin: '0' }}>
              Enter your credentials to access the system
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                Username
              </label>
              <input
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
                placeholder="Enter your username"
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                Password
              </label>
              <input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <div style={{
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: isLoading ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: '0' }}>
              Don't have an account? Contact your administrator.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f3f4f6',
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        padding: '1rem 2rem',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', margin: '0' }}>
          User Dashboard
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div 
            onClick={() => setShowProfileModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              backgroundColor: '#f3f4f6',
              borderRadius: '20px',
              border: '1px solid #e5e7eb',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e5e7eb'
              e.currentTarget.style.transform = 'scale(1.02)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6'
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            <span style={{ color: '#6b7280', fontSize: '14px' }}>
              Welcome, {user?.full_name}
            </span>
            <span style={{ fontSize: '10px', color: '#6b7280' }}>⚙️</span>
          </div>
          
          {/* Notification Bell */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '8px',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {unreadCount > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </button>
            
            {/* Notification Dropdown */}
            {showNotifications && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: '0',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                minWidth: '320px',
                maxHeight: '400px',
                overflowY: 'auto',
                zIndex: 1000,
                marginTop: '8px'
              }}>
                <div style={{
                  padding: '16px',
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Notifications</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {notifications.length > 0 && (
                      <button
                        onClick={clearAllNotifications}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: '#dc2626',
                          fontWeight: '500'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#fef2f2'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                      >
                        Clear All
                      </button>
                    )}
                    <button
                      onClick={() => setShowNotifications(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {isNotificationsLoading ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                      Loading notifications...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                      No notifications
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => {
                          if (notification.is_read === 0) {
                            markNotificationRead(notification.id)
                          }
                        }}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid #f3f4f6',
                          cursor: 'pointer',
                          backgroundColor: notification.is_read === 0 ? '#fef3c7' : 'white',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f9fafb'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = notification.is_read === 0 ? '#fef3c7' : 'white'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ 
                              fontSize: '14px', 
                              fontWeight: '600', 
                              color: '#111827',
                              marginBottom: '4px'
                            }}>
                              {notification.title}
                            </div>
                            <div style={{ 
                              fontSize: '13px', 
                              color: '#6b7280',
                              marginBottom: '4px'
                            }}>
                              {notification.message}
                            </div>
                            <div style={{ 
                              fontSize: '12px', 
                              color: '#9ca3af'
                            }}>
                              {new Date(notification.created_at).toLocaleString()}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {notification.is_read === 0 && (
                              <div style={{
                                width: '8px',
                                height: '8px',
                                backgroundColor: '#3b82f6',
                                borderRadius: '50%',
                                marginTop: '4px'
                              }}></div>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteNotification(notification.id)
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                borderRadius: '4px',
                                color: '#dc2626',
                                opacity: '0.7',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#fef2f2'
                                e.currentTarget.style.opacity = '1'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent'
                                e.currentTarget.style.opacity = '0.7'
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3,6 5,6 21,6"/>
                                <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                                <line x1="10" y1="11" x2="10" y2="17"/>
                                <line x1="14" y1="11" x2="14" y2="17"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: '2rem' }}>
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
            Account Information
          </h2>
          
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <span style={{ fontWeight: '500', color: '#374151' }}>Username:</span>
              <span style={{ color: '#6b7280' }}>{user?.username}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <span style={{ fontWeight: '500', color: '#374151' }}>Email:</span>
              <span style={{ color: '#6b7280' }}>{user?.email}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <span style={{ fontWeight: '500', color: '#374151' }}>Full Name:</span>
              <span style={{ color: '#6b7280' }}>{user?.full_name}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <span style={{ fontWeight: '500', color: '#374151' }}>User Type:</span>
              <span style={{ 
                color: user?.user_type === 'admin' ? '#059669' : '#3b82f6',
                fontWeight: '500',
                textTransform: 'capitalize'
              }}>
                {user?.user_type}
              </span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <span style={{ fontWeight: '500', color: '#374151' }}>Status:</span>
              <span style={{ 
                color: user?.is_active ? '#059669' : '#dc2626',
                fontWeight: '500'
              }}>
                {user?.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          {user?.user_type === 'user' && (
            <div style={{ marginTop: '2rem' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
                Available Features
              </h3>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <div style={{ padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                  <span style={{ color: '#0369a1', fontSize: '14px' }}>
                    📊 View your account information
                  </span>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                  <span style={{ color: '#0369a1', fontSize: '14px' }}>
                    🔒 Secure access to your data
                  </span>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                  <span style={{ color: '#0369a1', fontSize: '14px' }}>
                    📝 Contact administrator for additional permissions
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Profile Modal */}
      {user && (
        <ProfileModal
          user={user}
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          onUpdate={(updatedUser) => {
            setUser(updatedUser)
            localStorage.setItem('user_data', JSON.stringify(updatedUser))
          }}
        />
      )}
    </div>
  )
}

export default UserDashboard
