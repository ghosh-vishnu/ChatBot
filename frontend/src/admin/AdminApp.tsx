import React, { useState, useEffect } from 'react'

interface LoginCredentials {
  username: string
  password: string
}

interface RegisterCredentials {
  username: string
  password: string
  email: string
  full_name: string
}

interface DashboardData {
  total_sessions: number
  total_conversations: number
  total_messages: number
  avg_response_time: number
  user_satisfaction: number
  active_users: number
  conversations_today: number
  server_status: string
  response_time: number
  uptime: number
}

interface Conversation {
  id: string
  user_query: string
  ai_response: string
  timestamp: string
  satisfaction_score?: number
  response_time: number
}

interface FAQItem {
  id: string
  question: string
  answer: string
  category: string
  views: number
  success_rate: number
  last_updated: string
}

interface UserAnalytics {
  total_users: number
  active_users: number
  new_users_today: number
  geographic_distribution: { country: string; count: number }[]
  device_analytics: { device: string; count: number }[]
  browser_analytics: { browser: string; count: number }[]
  avg_session_duration: number
  satisfaction_score: number
}

interface AIModelData {
  model_name: string
  version: string
  performance_score: number
  accuracy_rate: number
  response_time: number
  training_data_size: number
  last_trained: string
  status: string
}

const AdminApp: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loginError, setLoginError] = useState('')
  const [registerError, setRegisterError] = useState('')
  const [showRegister, setShowRegister] = useState(false)
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: ''
  })
  const [registerData, setRegisterData] = useState<RegisterCredentials>({
    username: '',
    password: '',
    email: '',
    full_name: ''
  })
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isDataLoading, setIsDataLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [activeTab, setActiveTab] = useState('overview')
  const [faqs, setFaqs] = useState<FAQItem[]>([])
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null)
  const [aiModels, setAiModels] = useState<AIModelData[]>([])
  const [showAddFAQ, setShowAddFAQ] = useState(false)
  const [editingFAQ, setEditingFAQ] = useState<FAQItem | null>(null)
  const [newFAQ, setNewFAQ] = useState({ question: '', answer: '', category: 'General' })

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (token) {
      // Verify token with backend
      verifyToken(token)
    } else {
      setIsLoading(false)
    }
  }, [])

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch('http://localhost:8000/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setIsAuthenticated(true)
        fetchDashboardData()
      } else {
        localStorage.removeItem('admin_token')
        setIsAuthenticated(false)
      }
    } catch (error) {
      console.error('Token verification error:', error)
      localStorage.removeItem('admin_token')
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch dashboard data from backend
  const fetchDashboardData = async () => {
    setIsDataLoading(true)
    try {
      const token = localStorage.getItem('admin_token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      
      // Fetch dashboard stats
      const statsResponse = await fetch('http://localhost:8000/admin/stats', {
        headers
      })
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setDashboardData(statsData)
      } else {
        console.error('Stats API error:', statsResponse.status)
      }

      // Fetch recent conversations
      const conversationsResponse = await fetch('http://localhost:8000/admin/conversations', {
        headers
      })
      if (conversationsResponse.ok) {
        const conversationsData = await conversationsResponse.json()
        setConversations(conversationsData.conversations || [])
      } else {
        console.error('Conversations API error:', conversationsResponse.status)
      }

      // Fetch FAQs
      const faqsResponse = await fetch('http://localhost:8000/admin/faqs', {
        headers
      })
      if (faqsResponse.ok) {
        const faqsData = await faqsResponse.json()
        setFaqs(faqsData.faqs || [])
      } else {
        console.error('FAQs API error:', faqsResponse.status)
      }

      // Fetch User Analytics
      const userAnalyticsResponse = await fetch('http://localhost:8000/admin/user-analytics', {
        headers
      })
      if (userAnalyticsResponse.ok) {
        const userAnalyticsData = await userAnalyticsResponse.json()
        setUserAnalytics(userAnalyticsData)
      } else {
        console.error('User Analytics API error:', userAnalyticsResponse.status)
      }

      // Fetch AI Models
      const aiModelsResponse = await fetch('http://localhost:8000/admin/ai-models', {
        headers
      })
      if (aiModelsResponse.ok) {
        const aiModelsData = await aiModelsResponse.json()
        setAiModels(aiModelsData.models || [])
      } else {
        console.error('AI Models API error:', aiModelsResponse.status)
      }

      setLastRefresh(new Date())
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsDataLoading(false)
    }
  }

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(fetchDashboardData, 30000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setIsLoading(true)

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
        localStorage.setItem('admin_token', data.access_token)
        setIsAuthenticated(true)
        fetchDashboardData()
      } else {
        const errorData = await response.json()
        setLoginError(errorData.detail || 'Invalid username or password')
      }
    } catch (error) {
      console.error('Login error:', error)
      setLoginError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegisterError('')
    setIsLoading(true)

    try {
      const response = await fetch('http://localhost:8000/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData),
      })

      if (response.ok) {
        const data = await response.json()
        alert('Registration successful! Please login with your credentials.')
        setShowRegister(false)
        setRegisterData({ username: '', password: '', email: '', full_name: '' })
      } else {
        const errorData = await response.json()
        setRegisterError(errorData.detail || 'Registration failed')
      }
    } catch (error) {
      console.error('Registration error:', error)
      setRegisterError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    setIsAuthenticated(false)
    setCredentials({ username: '', password: '' })
  }

  // FAQ Management Functions
  const createFAQ = async () => {
    try {
      const response = await fetch('http://localhost:8000/admin/faqs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newFAQ),
      })
      
      if (response.ok) {
        const result = await response.json()
        setFaqs([...faqs, result.faq])
        setNewFAQ({ question: '', answer: '', category: 'General' })
        setShowAddFAQ(false)
      }
    } catch (error) {
      console.error('Error creating FAQ:', error)
    }
  }

  const editFAQ = (faq: FAQItem) => {
    setEditingFAQ(faq)
    setNewFAQ({ question: faq.question, answer: faq.answer, category: faq.category })
    setShowAddFAQ(true)
  }

  const updateFAQ = async () => {
    if (!editingFAQ) return
    
    try {
      const response = await fetch(`http://localhost:8000/admin/faqs/${editingFAQ.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newFAQ),
      })
      
      if (response.ok) {
        const result = await response.json()
        setFaqs(faqs.map(faq => faq.id === editingFAQ.id ? result.faq : faq))
        setNewFAQ({ question: '', answer: '', category: 'General' })
        setShowAddFAQ(false)
        setEditingFAQ(null)
      }
    } catch (error) {
      console.error('Error updating FAQ:', error)
    }
  }

  const deleteFAQ = async (faqId: string) => {
    if (!confirm('Are you sure you want to delete this FAQ?')) return
    
    try {
      const response = await fetch(`http://localhost:8000/admin/faqs/${faqId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        setFaqs(faqs.filter(faq => faq.id !== faqId))
      }
    } catch (error) {
      console.error('Error deleting FAQ:', error)
    }
  }

  // Reset all data function
  const resetAllData = async () => {
    if (!confirm('Are you sure you want to reset ALL data? This will clear all conversations, FAQs, and metrics.')) return
    
    try {
      const response = await fetch('http://localhost:8000/admin/reset-data', {
        method: 'POST',
      })
      
      if (response.ok) {
        const result = await response.json()
        alert(`Data reset successfully!\n\nConversations: ${result.conversations_count}\nFAQs: ${result.faqs_count}\nAI Models: ${result.ai_models_count}`)
        // Refresh all data
        fetchDashboardData()
      }
    } catch (error) {
      console.error('Error resetting data:', error)
      alert('Error resetting data. Please try again.')
    }
  }

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab()
      case 'analytics':
        return renderAnalyticsTab()
      case 'chat':
        return renderChatManagementTab()
      case 'faq':
        return renderFAQManagementTab()
      case 'users':
        return renderUserAnalyticsTab()
      case 'ai':
        return renderAIModelsTab()
      case 'content':
        return renderContentManagementTab()
      case 'integrations':
        return renderIntegrationsTab()
      case 'security':
        return renderSecurityTab()
      case 'reports':
        return renderReportsTab()
      case 'monitoring':
        return renderMonitoringTab()
      default:
        return renderOverviewTab()
    }
  }

  // Overview Tab
  const renderOverviewTab = () => (
    <div style={{ padding: '24px 16px' }}>
      {/* Refresh Button */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px' 
      }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: '0' }}>
            Dashboard Overview
          </h2>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0' }}>
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={fetchDashboardData}
            disabled={isDataLoading}
            style={{ 
              backgroundColor: '#3b82f6', 
              color: 'white', 
              padding: '12px 24px', 
              borderRadius: '8px', 
              border: 'none', 
              fontSize: '14px', 
              cursor: isDataLoading ? 'not-allowed' : 'pointer',
              opacity: isDataLoading ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {isDataLoading ? ' ' : ' '} Refresh Data
          </button>
          <button
            onClick={resetAllData}
            style={{ 
              backgroundColor: '#dc2626', 
              color: 'white', 
              padding: '12px 24px', 
              borderRadius: '8px', 
              border: 'none', 
              fontSize: '14px', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            Reset All Data
          </button>
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '24px',
        marginBottom: '32px'
      }}>
        {/* Analytics Card */}
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          padding: '24px', 
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' 
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 16px' }}>
            Analytics Dashboard
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Total Sessions:</span>
              <span style={{ fontWeight: '600', color: '#111827' }}>
                {dashboardData?.total_sessions || 'Loading...'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Total Messages:</span>
              <span style={{ fontWeight: '600', color: '#111827' }}>
                {dashboardData?.total_messages || 'Loading...'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Avg Response Time:</span>
              <span style={{ fontWeight: '600', color: '#111827' }}>
                {dashboardData?.avg_response_time ? `${dashboardData.avg_response_time}ms` : 'Loading...'}
              </span>
            </div>
          </div>
        </div>

        {/* User Management Card */}
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          padding: '24px', 
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' 
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 16px' }}>
            👥 User Management
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Active Users:</span>
              <span style={{ fontWeight: '600', color: '#111827' }}>
                {dashboardData?.active_users || 'Loading...'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Conversations Today:</span>
              <span style={{ fontWeight: '600', color: '#111827' }}>
                {dashboardData?.conversations_today || 'Loading...'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Satisfaction:</span>
              <span style={{ fontWeight: '600', color: '#10b981' }}>
                {dashboardData?.user_satisfaction ? `${dashboardData.user_satisfaction}%` : 'Loading...'}
              </span>
            </div>
          </div>
        </div>

        {/* System Monitoring Card */}
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          padding: '24px', 
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' 
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 16px' }}>
            System Monitoring
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Server Status:</span>
              <span style={{ 
                fontWeight: '600', 
                color: dashboardData?.server_status === 'healthy' ? '#10b981' : '#dc2626' 
              }}>
                {dashboardData?.server_status || 'Loading...'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Response Time:</span>
              <span style={{ fontWeight: '600', color: '#111827' }}>
                {dashboardData?.response_time ? `${dashboardData.response_time}ms` : 'Loading...'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Uptime:</span>
              <span style={{ fontWeight: '600', color: '#111827' }}>
                {dashboardData?.uptime ? `${dashboardData.uptime}%` : 'Loading...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Conversations */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        padding: '24px', 
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' 
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 16px' }}>
          Recent Conversations
        </h3>
        {isDataLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              border: '4px solid #e5e7eb', 
              borderTop: '4px solid #3b82f6', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }}></div>
            <p style={{ marginTop: '16px', color: '#6b7280' }}>Loading conversations...</p>
          </div>
        ) : conversations.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {conversations.slice(0, 5).map((conversation) => (
              <div key={conversation.id} style={{ 
                border: '1px solid #e5e7eb', 
                borderRadius: '8px', 
                padding: '16px',
                backgroundColor: '#f9fafb'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                      User: {conversation.user_query}
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '14px' }}>
                      AI: {conversation.ai_response}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '12px', color: '#9ca3af' }}>
                    <div>{new Date(conversation.timestamp).toLocaleString()}</div>
                    <div>{conversation.response_time}ms</div>
                    {conversation.satisfaction_score && (
                      <div style={{ color: conversation.satisfaction_score >= 4 ? '#10b981' : '#f59e0b' }}>
                        ⭐ {conversation.satisfaction_score}/5
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            No conversations found
          </div>
        )}
      </div>
    </div>
  )

  // Placeholder functions for other tabs
  const renderAnalyticsTab = () => (
    <div style={{ padding: '24px 16px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: '0 0 24px' }}>
        Real-time Analytics
      </h2>
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        padding: '24px', 
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 8px' }}>
          Advanced Analytics Coming Soon
        </h3>
        <p style={{ color: '#6b7280', margin: '0' }}>
          Live chat monitoring, user activity tracking, response time metrics, popular questions analytics, and conversion rate tracking will be available here.
        </p>
      </div>
    </div>
  )

  const renderChatManagementTab = () => (
    <div style={{ padding: '24px 16px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: '0 0 24px' }}>
        Chat Management
      </h2>
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        padding: '24px', 
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 8px' }}>
          Chat Management Tools Coming Soon
        </h3>
        <p style={{ color: '#6b7280', margin: '0' }}>
          Live chat supervision, chat history viewer, message filtering/search, user session management, and chat export functionality will be available here.
        </p>
      </div>
    </div>
  )

  const renderFAQManagementTab = () => (
    <div style={{ padding: '24px 16px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px' 
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: '0' }}>
          FAQ Management
        </h2>
        <button
          onClick={() => setShowAddFAQ(true)}
          style={{ 
            backgroundColor: '#10b981', 
            color: 'white', 
            padding: '12px 24px', 
            borderRadius: '8px', 
            border: 'none', 
            fontSize: '14px', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
        Add New FAQ
        </button>
      </div>

      {/* FAQ Statistics */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          padding: '20px', 
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '8px' }}>
            {faqs.length}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Total FAQs</div>
        </div>
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          padding: '20px', 
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981', marginBottom: '8px' }}>
            {faqs.length > 0 ? Math.round(faqs.reduce((sum, faq) => sum + faq.success_rate, 0) / faqs.length) : 0}%
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Avg Success Rate</div>
        </div>
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          padding: '20px', 
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '8px' }}>
            {faqs.length > 0 ? faqs.reduce((sum, faq) => sum + faq.views, 0) : 0}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Views</div>
        </div>
      </div>

      {/* FAQ List */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        padding: '24px', 
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' 
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 16px' }}>
          FAQ List
        </h3>
        {isDataLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              border: '4px solid #e5e7eb', 
              borderTop: '4px solid #3b82f6', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }}></div>
            <p style={{ marginTop: '16px', color: '#6b7280' }}>Loading FAQs...</p>
          </div>
        ) : faqs.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {faqs.map((faq) => (
              <div key={faq.id} style={{ 
                border: '1px solid #e5e7eb', 
                borderRadius: '8px', 
                padding: '20px',
                backgroundColor: '#f9fafb'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      display: 'inline-block',
                      backgroundColor: '#3b82f6', 
                      color: 'white', 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      fontSize: '12px', 
                      marginBottom: '8px' 
                    }}>
                      {faq.category}
                    </div>
                    <div style={{ fontWeight: '600', color: '#111827', marginBottom: '8px', fontSize: '16px' }}>
                      {faq.question}
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.5' }}>
                      {faq.answer}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                    <button
                      onClick={() => editFAQ(faq)}
                      style={{ 
                        backgroundColor: '#3b82f6', 
                        color: 'white', 
                        padding: '8px 12px', 
                        borderRadius: '6px', 
                        border: 'none', 
                        fontSize: '12px', 
                        cursor: 'pointer' 
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteFAQ(faq.id)}
                      style={{ 
                        backgroundColor: '#dc2626', 
                        color: 'white', 
                        padding: '8px 12px', 
                        borderRadius: '6px', 
                        border: 'none', 
                        fontSize: '12px', 
                        cursor: 'pointer' 
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9ca3af' }}>
                  <div>Views: {faq.views} | Success Rate: {faq.success_rate}%</div>
                  <div>Updated: {new Date(faq.last_updated).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            No FAQs found. Click "Add New FAQ" to get started.
          </div>
        )}
      </div>
    </div>
  )

  const renderUserAnalyticsTab = () => (
    <div style={{ padding: '24px 16px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: '0 0 24px' }}>
        User Analytics
      </h2>
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        padding: '24px', 
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 8px' }}>
          User Analytics Dashboard Coming Soon
        </h3>
        <p style={{ color: '#6b7280', margin: '0' }}>
          User behavior tracking, geographic distribution, device/browser analytics, session duration tracking, and user satisfaction metrics will be available here.
        </p>
      </div>
    </div>
  )

  const renderAIModelsTab = () => (
    <div style={{ padding: '24px 16px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: '0 0 24px' }}>
        AI Model Management
      </h2>
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        padding: '24px', 
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 8px' }}>
          AI Model Management Coming Soon
        </h3>
        <p style={{ color: '#6b7280', margin: '0' }}>
          Model performance monitoring, response accuracy tracking, training data management, model version control, and A/B testing for responses will be available here.
        </p>
      </div>
    </div>
  )

  const renderContentManagementTab = () => (
    <div style={{ padding: '24px 16px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: '0 0 24px' }}>
        Content Management
      </h2>
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        padding: '24px', 
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 8px' }}>
          Content Management System Coming Soon
        </h3>
        <p style={{ color: '#6b7280', margin: '0' }}>
          Knowledge base editor, content versioning, approval workflows, content performance tracking, and SEO optimization tools will be available here.
        </p>
      </div>
    </div>
  )

  const renderIntegrationsTab = () => (
    <div style={{ padding: '24px 16px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: '0 0 24px' }}>
        🔗 Integration Management
      </h2>
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        padding: '24px', 
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔗</div>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 8px' }}>
          Integration Management Coming Soon
        </h3>
        <p style={{ color: '#6b7280', margin: '0' }}>
          API key management, third-party integrations, webhook configuration, external service monitoring, and data synchronization will be available here.
        </p>
      </div>
    </div>
  )

  const renderSecurityTab = () => (
    <div style={{ padding: '24px 16px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: '0 0 24px' }}>
        Security & Access
      </h2>
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        padding: '24px', 
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 8px' }}>
          Security & Access Management Coming Soon
        </h3>
        <p style={{ color: '#6b7280', margin: '0' }}>
          User role management, permission controls, audit logs, security monitoring, and data encryption settings will be available here.
        </p>
      </div>
    </div>
  )

  const renderReportsTab = () => (
    <div style={{ padding: '24px 16px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: '0 0 24px' }}>
        Reporting & Insights
      </h2>
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        padding: '24px', 
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 8px' }}>
          Reporting & Insights Coming Soon
        </h3>
        <p style={{ color: '#6b7280', margin: '0' }}>
          Custom reports, data visualization, export capabilities, scheduled reports, and performance dashboards will be available here.
        </p>
      </div>
    </div>
  )

  const renderMonitoringTab = () => (
    <div style={{ padding: '24px 16px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: '0 0 24px' }}>
        System Monitoring
      </h2>
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        padding: '24px', 
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚙️</div>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 8px' }}>
          Advanced System Monitoring Coming Soon
        </h3>
        <p style={{ color: '#6b7280', margin: '0' }}>
          Server health monitoring, performance metrics, error tracking, backup management, and system alerts will be available here.
        </p>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#f3f4f6', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ 
          width: '48px', 
          height: '48px', 
          border: '4px solid #e5e7eb', 
          borderTop: '4px solid #3b82f6', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite' 
        }}></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#f3f4f6', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ 
          maxWidth: '400px', 
          width: '100%', 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', 
          padding: '32px' 
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 16px' 
            }}>
              <span style={{ fontSize: '24px', color: 'white' }}>⚙️</span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: '0 0 8px' }}>
              {showRegister ? 'Create Account' : 'Admin Login'}
            </h1>
            <p style={{ color: '#6b7280', margin: '0' }}>
              Venturing Digitally Admin Panel
            </p>
          </div>

          {!showRegister ? (
            // Login Form
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '8px' 
                }}>
                  Username
                </label>
                <input
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '8px', 
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Enter username"
                  required
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '8px' 
                }}>
                  Password
                </label>
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '8px', 
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Enter password"
                  required
                />
              </div>

              {loginError && (
                <div style={{ 
                  backgroundColor: '#fef2f2', 
                  border: '1px solid #fecaca', 
                  color: '#dc2626', 
                  padding: '12px 16px', 
                  borderRadius: '8px' 
                }}>
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                style={{ 
                  width: '100%', 
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', 
                  color: 'white', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  border: 'none', 
                  fontSize: '16px', 
                  fontWeight: '500', 
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.transform = 'translateY(-1px)'}
                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
              >
                Login to Admin Panel
              </button>
            </form>
          ) : (
            // Register Form
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '8px' 
                }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={registerData.full_name}
                  onChange={(e) => setRegisterData(prev => ({ ...prev, full_name: e.target.value }))}
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '8px', 
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '8px' 
                }}>
                  Email
                </label>
                <input
                  type="email"
                  value={registerData.email}
                  onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '8px', 
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Enter email"
                  required
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '8px' 
                }}>
                  Username
                </label>
                <input
                  type="text"
                  value={registerData.username}
                  onChange={(e) => setRegisterData(prev => ({ ...prev, username: e.target.value }))}
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '8px', 
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Enter username"
                  required
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '8px' 
                }}>
                  Password
                </label>
                <input
                  type="password"
                  value={registerData.password}
                  onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '8px', 
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Enter password"
                  required
                />
              </div>

              {registerError && (
                <div style={{ 
                  backgroundColor: '#fef2f2', 
                  border: '1px solid #fecaca', 
                  color: '#dc2626', 
                  padding: '12px 16px', 
                  borderRadius: '8px' 
                }}>
                  {registerError}
                </div>
              )}

              <button
                type="submit"
                style={{ 
                  width: '100%', 
                  background: 'linear-gradient(135deg, #10b981, #059669)', 
                  color: 'white', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  border: 'none', 
                  fontSize: '16px', 
                  fontWeight: '500', 
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.transform = 'translateY(-1px)'}
                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
              >
                Create Account
              </button>
            </form>
          )}

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            {!showRegister ? (
              <>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 16px' }}>
                  Demo Credentials: <strong>admin</strong> / <strong>admin123</strong>
                </p>
                <button
                  onClick={() => setShowRegister(true)}
                  style={{ 
                    backgroundColor: 'transparent', 
                    color: '#3b82f6', 
                    border: 'none', 
                    fontSize: '14px', 
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Don't have an account? Sign up here
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowRegister(false)}
                style={{ 
                  backgroundColor: 'transparent', 
                  color: '#3b82f6', 
                  border: 'none', 
                  fontSize: '14px', 
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Already have an account? Login here
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* Admin Header */}
      <div style={{ 
        backgroundColor: 'white', 
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', 
        borderBottom: '1px solid #e5e7eb' 
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          padding: '0 16px' 
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '16px 0' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <span style={{ color: 'white', fontWeight: 'bold' }}>A</span>
              </div>
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', margin: '0' }}>
                  Advanced Admin Dashboard
                </h1>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: '0' }}>
                  Venturing Digitally Management Suite
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '12px', 
                  height: '12px', 
                  backgroundColor: '#10b981', 
                  borderRadius: '50%' 
                }}></div>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>Online</span>
              </div>
              <button
                onClick={handleLogout}
                style={{ 
                  backgroundColor: '#dc2626', 
                  color: 'white', 
                  padding: '8px 16px', 
                  borderRadius: '8px', 
                  border: 'none', 
                  fontSize: '14px', 
                  cursor: 'pointer' 
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ 
        backgroundColor: 'white', 
        borderBottom: '1px solid #e5e7eb',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          padding: '0 16px' 
        }}>
          <div style={{ 
            display: 'flex', 
            gap: '8px',
            overflowX: 'auto',
            padding: '8px 0'
          }}>
            {[
              { id: 'overview', label: '📊 Overview', icon: '📊' },
              { id: 'analytics', label: '📈 Analytics', icon: '📈' },
              { id: 'chat', label: '💬 Chat Management', icon: '💬' },
              { id: 'faq', label: '📄 FAQ Management', icon: '📄' },
              { id: 'users', label: '👥 User Analytics', icon: '👥' },
              { id: 'ai', label: '🤖 AI Models', icon: '🤖' },
              { id: 'content', label: '📝 Content', icon: '📝' },
              { id: 'integrations', label: '🔗 Integrations', icon: '🔗' },
              { id: 'security', label: '🔒 Security', icon: '🔒' },
              { id: 'reports', label: '📋 Reports', icon: '📋' },
              { id: 'monitoring', label: '⚙️ Monitoring', icon: '⚙️' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{ 
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: activeTab === tab.id ? '#3b82f6' : 'transparent',
                  color: activeTab === tab.id ? 'white' : '#6b7280',
                  fontSize: '14px',
                  fontWeight: activeTab === tab.id ? '600' : '400',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  if (activeTab !== tab.id) {
                    e.target.style.backgroundColor = '#f3f4f6'
                    e.target.style.color = '#374151'
                  }
                }}
                onMouseOut={(e) => {
                  if (activeTab !== tab.id) {
                    e.target.style.backgroundColor = 'transparent'
                    e.target.style.color = '#6b7280'
                  }
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {renderTabContent()}

      {/* FAQ Form Modal */}
      {showAddFAQ && (
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
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', margin: '0' }}>
                {editingFAQ ? 'Edit FAQ' : 'Add New FAQ'}
              </h3>
              <button
                onClick={() => {
                  setShowAddFAQ(false)
                  setEditingFAQ(null)
                  setNewFAQ({ question: '', answer: '', category: 'General' })
                }}
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Category
                </label>
                <select
                  value={newFAQ.category}
                  onChange={(e) => setNewFAQ({ ...newFAQ, category: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="General">General</option>
                  <option value="Pricing">Pricing</option>
                  <option value="Technical">Technical</option>
                  <option value="Support">Support</option>
                  <option value="Integration">Integration</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Question
                </label>
                <input
                  type="text"
                  value={newFAQ.question}
                  onChange={(e) => setNewFAQ({ ...newFAQ, question: e.target.value })}
                  placeholder="Enter the question..."
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Answer
                </label>
                <textarea
                  value={newFAQ.answer}
                  onChange={(e) => setNewFAQ({ ...newFAQ, answer: e.target.value })}
                  placeholder="Enter the answer..."
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowAddFAQ(false)
                    setEditingFAQ(null)
                    setNewFAQ({ question: '', answer: '', category: 'General' })
                  }}
                  style={{
                    backgroundColor: '#6b7280',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={editingFAQ ? updateFAQ : createFAQ}
                  disabled={!newFAQ.question.trim() || !newFAQ.answer.trim()}
                  style={{
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '14px',
                    cursor: (!newFAQ.question.trim() || !newFAQ.answer.trim()) ? 'not-allowed' : 'pointer',
                    opacity: (!newFAQ.question.trim() || !newFAQ.answer.trim()) ? 0.6 : 1
                  }}
                >
                  {editingFAQ ? 'Update FAQ' : 'Create FAQ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminApp







