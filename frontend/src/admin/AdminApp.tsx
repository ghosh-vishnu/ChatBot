import React, { useState, useEffect } from 'react'
import ProfileModal from '../components/ProfileModal'
import LiveChatQueue from '../components/LiveChatQueue'

// Extend Window interface for analytics EventSource
declare global {
  interface Window {
    analyticsEventSource?: EventSource
  }
}

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
  customCategory?: string
  views: number
  success_rate: number
  last_updated: string
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

interface Ticket {
  id: number
  token: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  user_query: string
  status: string
  created_at: string
  updated_at: string
  resolved_at?: string
  admin_notes?: string
}

interface User {
  id: number
  username: string
  email: string
  full_name: string
  role_id: number
  is_active: boolean
  created_at: string
  last_login?: string
  role_name?: string
  profile_image?: string
}

interface Role {
  id: number
  name: string
  description: string
  is_system_role: boolean
  created_at: string
}

interface Permission {
  id: number
  name: string
  module: string
  description: string
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

interface ChatCategory {
  id: number
  name: string
  description: string
  is_active: boolean
}

interface CategoryStats {
  total_categories: number
  active_categories: number
  inactive_categories: number
  usage_stats: { name: string; usage_count: number }[]
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
  const [newFAQ, setNewFAQ] = useState({ question: '', answer: '', category: 'General', customCategory: '' })
  const [faqSearchTerm, setFaqSearchTerm] = useState('')
  const [faqFilterCategory, setFaqFilterCategory] = useState('All')
  const [showExportModal, setShowExportModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [exportFormat, setExportFormat] = useState('json')
  
  // User Management state
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [showUserModal, setShowUserModal] = useState(false)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  const [rolePermissions, setRolePermissions] = useState({})
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role_id: 0
  })
  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
    permission_ids: [] as number[]
  })
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [userFilterRole, setUserFilterRole] = useState('All')
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [userPermissions, setUserPermissions] = useState<Permission[]>([])
  const [showProfileModal, setShowProfileModal] = useState(false)
  
  // Chat Management state
  const [chatCategories, setChatCategories] = useState<ChatCategory[]>([])
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ChatCategory | null>(null)
  const [newCategory, setNewCategory] = useState({ name: '', description: '' })
  const [categoryStats, setCategoryStats] = useState<CategoryStats | null>(null)
  
  // Subcategories state
  const [subcategories, setSubcategories] = useState<any[]>([])
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false)
  const [editingSubcategory, setEditingSubcategory] = useState<any>(null)
  const [newSubcategory, setNewSubcategory] = useState({ name: '', description: '', category_id: 0 })
  const [selectedCategoryForSubcategory, setSelectedCategoryForSubcategory] = useState<number | null>(null)
  
  // Role-based access control
  const hasAccess = (tabId: string) => {
    if (!currentUser) return false
    
    const userRole = currentUser.role_name || currentUser.user_type
    
    switch (tabId) {
      case 'users':
        // Only Super Admin can access User Management
        return userRole === 'Super Admin' || userRole === 'admin'
      case 'overview':
      case 'analytics':
      case 'reports':
        // Super Admin, Manager can access
        return ['Super Admin', 'Manager', 'admin'].includes(userRole)
      case 'faq':
      case 'tickets':
      case 'livechat':
        // Super Admin, Support can access
        return ['Super Admin', 'Support', 'admin'].includes(userRole)
      case 'chatmanagement':
        // Super Admin, Support can access
        return ['Super Admin', 'Support', 'admin'].includes(userRole)
      default:
        return true
    }
  }
  
  // Analytics state
  const [analyticsData, setAnalyticsData] = useState({
    liveUsers: 0,
    messagesToday: 0,
    avgResponseTime: 0,
    popularQuestions: [],
    systemUptime: '99.9%',
    errorRate: 0,
    conversionRate: 0,
    chatSessions: [],
    realTimeActivity: []
  })
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false)
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false)
  
  // Notification states
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false)
  const [notificationEventSource, setNotificationEventSource] = useState<EventSource | null>(null)
  
  // Ticket states
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isTicketsLoading, setIsTicketsLoading] = useState(false)
  

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    const userData = localStorage.getItem('admin_user_data')
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData)
        setCurrentUser(parsedUser)
        // Verify token with backend
        verifyToken(token)
      } catch (e) {
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_user_data')
        setIsLoading(false)
      }
    } else {
      setIsLoading(false)
    }
  }, [])

  // Load analytics data when component mounts
  useEffect(() => {
    if (isAuthenticated) {
      fetchAnalyticsData()
      setupRealTimeUpdates()
      fetchNotifications()
      fetchNotificationCount()
      fetchTickets()
      fetchUsers()
      fetchRoles()
      fetchPermissions()
      setupRealTimeNotifications()
    }
    
    // Cleanup on unmount
    return () => {
      if (window.analyticsEventSource) {
        window.analyticsEventSource.close()
      }
      cleanupNotifications()
    }
  }, [isAuthenticated])

  // Redirect to first available tab if current tab is not accessible
  useEffect(() => {
    if (isAuthenticated && currentUser && !hasAccess(activeTab)) {
      const availableTabs = ['overview', 'analytics', 'faq', 'tickets', 'livechat', 'chatmanagement', 'reports', 'users']
      const firstAvailableTab = availableTabs.find(tab => hasAccess(tab))
      if (firstAvailableTab) {
        setActiveTab(firstAvailableTab)
      }
    }
  }, [isAuthenticated, currentUser, activeTab])

  // Load user management data when users tab is active
  useEffect(() => {
    if (isAuthenticated && activeTab === 'users') {
      fetchUsers()
      fetchRoles()
      fetchPermissions()
    }
  }, [isAuthenticated, activeTab])

  // Load chat management data when chatmanagement tab is active
  useEffect(() => {
    if (isAuthenticated && activeTab === 'chatmanagement') {
      fetchChatCategories()
      fetchCategoryStats()
      fetchSubcategories()
    }
  }, [isAuthenticated, activeTab])

  // Setup real-time updates using Server-Sent Events
  const setupRealTimeUpdates = () => {
    // Close existing connection
    if (window.analyticsEventSource) {
      window.analyticsEventSource.close()
    }

    // Create new EventSource connection
    window.analyticsEventSource = new EventSource('http://localhost:8000/analytics/stream')
    
    window.analyticsEventSource.onopen = () => {
      console.log('Real-time analytics connected')
      setIsRealTimeConnected(true)
    }

    window.analyticsEventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        updateAnalyticsData(data)
      } catch (error) {
        console.error('Error parsing analytics data:', error)
      }
    }

    window.analyticsEventSource.onerror = (error) => {
      console.error('Analytics SSE error:', error)
      setIsRealTimeConnected(false)
      // Retry connection after 5 seconds
      setTimeout(() => {
        if (isAuthenticated) {
          setupRealTimeUpdates()
        }
      }, 5000)
    }
  }

  // Update analytics data with real-time updates
  const updateAnalyticsData = (newData: any) => {
    setAnalyticsData(prevData => ({
      ...prevData,
      ...newData,
      realTimeActivity: [
        ...newData.realTimeActivity || [],
        ...prevData.realTimeActivity
      ].slice(0, 20) // Keep only last 20 activities
    }))
  }

  // Fetch notifications
  const fetchNotifications = async () => {
    setIsNotificationsLoading(true)
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('http://localhost:8000/admin/notifications', {
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
      const token = localStorage.getItem('admin_token')
      const response = await fetch('http://localhost:8000/admin/notifications/count', {
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
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`http://localhost:8000/admin/notifications/${notificationId}/read`, {
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
      const token = localStorage.getItem('admin_token')
      const response = await fetch('http://localhost:8000/admin/notifications/clear', {
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
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`http://localhost:8000/admin/notifications/${notificationId}`, {
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
  const setupRealTimeNotifications = async () => {
    if (notificationEventSource) {
      notificationEventSource.close()
    }

    const token = localStorage.getItem('admin_token')
    if (!token) return

    // First verify the token is still valid
    try {
      const response = await fetch('http://localhost:8000/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        console.log('Token expired, logging out')
        handleLogout()
        return
      }
    } catch (error) {
      console.error('Token verification failed:', error)
      return
    }

    const eventSource = new EventSource(`http://localhost:8000/admin/notifications/stream?token=${token}`)
    
    eventSource.onopen = () => {
      console.log('Connected to notification stream')
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        switch (data.type) {
          case 'connected':
            console.log('Notification stream connected')
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
      console.error('Notification stream error:', error)
      // Check if it's a 401 error (unauthorized) - don't retry
      if (eventSource.readyState === EventSource.CLOSED) {
        console.log('Notification stream closed due to authentication error')
        return
      }
      // Attempt to reconnect after 5 seconds only for other errors
      setTimeout(() => {
        if (isAuthenticated) {
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

  // Fetch tickets
  const fetchTickets = async () => {
    setIsTicketsLoading(true)
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('http://localhost:8000/admin/tickets', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setTickets(data.tickets || [])
      }
    } catch (error) {
      console.error('Error fetching tickets:', error)
    } finally {
      setIsTicketsLoading(false)
    }
  }

  // Update ticket status
  const updateTicketStatus = async (token: string, status: string, adminNotes?: string) => {
    try {
      const authToken = localStorage.getItem('admin_token')
      const response = await fetch(`http://localhost:8000/tickets/${token}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, admin_notes: adminNotes })
      })
      
      if (response.ok) {
        // Refresh tickets list
        fetchTickets()
        return true
      } else {
        console.error('Failed to update ticket status')
        return false
      }
    } catch (error) {
      console.error('Error updating ticket status:', error)
      return false
    }
  }

  // Delete ticket
  const deleteTicket = async (token: string) => {
    if (!window.confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
      return false
    }
    
    try {
      const authToken = localStorage.getItem('admin_token')
      const response = await fetch(`http://localhost:8000/tickets/${token}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        // Refresh tickets list
        fetchTickets()
        return true
      } else {
        console.error('Failed to delete ticket')
        return false
      }
    } catch (error) {
      console.error('Error deleting ticket:', error)
      return false
    }
  }

  // View ticket details (modal or expand)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [showTicketModal, setShowTicketModal] = useState(false)

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch('http://localhost:8000/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        // Update user data from server response
        if (data.user) {
          setCurrentUser(data.user)
          localStorage.setItem('admin_user_data', JSON.stringify(data.user))
        } else {
          // Fallback to localStorage if server doesn't return user data
          const userData = localStorage.getItem('admin_user_data')
          if (userData) {
            try {
              const parsedUser = JSON.parse(userData)
              setCurrentUser(parsedUser)
            } catch (e) {
              console.error('Error parsing user data:', e)
            }
          }
        }
        setIsAuthenticated(true)
        fetchDashboardData()
      } else {
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_user_data')
        setCurrentUser(null)
        setIsAuthenticated(false)
      }
    } catch (error) {
      console.error('Token verification error:', error)
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user_data')
      setCurrentUser(null)
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

  // User Management API functions
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('http://localhost:8000/api/users/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('http://localhost:8000/api/users/roles', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setRoles(data.roles || [])
      }
    } catch (error) {
      console.error('Error fetching roles:', error)
    }
  }

  const fetchPermissions = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('http://localhost:8000/api/users/permissions', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setPermissions(data.permissions || [])
      }
    } catch (error) {
      console.error('Error fetching permissions:', error)
    }
  }

  const createUser = async (userData: any) => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('http://localhost:8000/api/users/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      })
      if (response.ok) {
        await fetchUsers()
        return { success: true }
      } else {
        const error = await response.json()
        return { success: false, error: error.detail }
      }
    } catch (error) {
      return { success: false, error: 'Network error' }
    }
  }

  const updateUser = async (userId: number, userData: any) => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`http://localhost:8000/api/users/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      })
      if (response.ok) {
        await fetchUsers()
        return { success: true }
      } else {
        const error = await response.json()
        return { success: false, error: error.detail }
      }
    } catch (error) {
      return { success: false, error: 'Network error' }
    }
  }

  const deleteUser = async (userId: number) => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`http://localhost:8000/api/users/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        await fetchUsers()
        return { success: true }
      } else {
        const error = await response.json()
        return { success: false, error: error.detail }
      }
    } catch (error) {
      return { success: false, error: 'Network error' }
    }
  }

  const createRole = async (roleData: any) => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('http://localhost:8000/api/users/roles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(roleData)
      })
      if (response.ok) {
        await fetchRoles()
        return { success: true }
      } else {
        const error = await response.json()
        return { success: false, error: error.detail }
      }
    } catch (error) {
      return { success: false, error: 'Network error' }
    }
  }

  const updateRolePermissions = async (roleId: number, permissionIds: number[]) => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`http://localhost:8000/api/users/roles/${roleId}/permissions`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(permissionIds)
      })
      if (response.ok) {
        await fetchRoles()
        return { success: true }
      } else {
        const error = await response.json()
        return { success: false, error: error.detail }
      }
    } catch (error) {
      return { success: false, error: 'Network error' }
    }
  }

  const handleManagePermissions = async (role: any) => {
    setEditingRole(role)
    
    // Load current role permissions
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`http://localhost:8000/api/users/roles/${role.id}/permissions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        const permissionsMap = {}
        data.forEach(permission => {
          permissionsMap[permission.id] = true
        })
        setRolePermissions(permissionsMap)
      }
    } catch (error) {
      console.error('Error loading role permissions:', error)
    }
    
    setShowPermissionModal(true)
  }

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
        localStorage.setItem('admin_user_data', JSON.stringify(data.user))
        setCurrentUser(data.user)
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
    localStorage.removeItem('admin_user_data')
    setCurrentUser(null)
    setIsAuthenticated(false)
    setCredentials({ username: '', password: '' })
  }

  // FAQ Management Functions
  const getFilteredFAQs = () => {
    let filtered = faqs

    // Filter by search term
    if (faqSearchTerm) {
      filtered = filtered.filter(faq => 
        faq.question.toLowerCase().includes(faqSearchTerm.toLowerCase()) ||
        faq.answer.toLowerCase().includes(faqSearchTerm.toLowerCase()) ||
        faq.category.toLowerCase().includes(faqSearchTerm.toLowerCase()) ||
        (faq.customCategory && faq.customCategory.toLowerCase().includes(faqSearchTerm.toLowerCase()))
      )
    }

    // Filter by category
    if (faqFilterCategory !== 'All') {
      filtered = filtered.filter(faq => 
        faq.category === faqFilterCategory || 
        (faq.category === 'Custom' && faq.customCategory === faqFilterCategory)
      )
    }

    return filtered
  }

  const getUniqueCategories = () => {
    const categories = new Set<string>()
    faqs.forEach(faq => {
      if (faq.category === 'Custom' && faq.customCategory) {
        categories.add(faq.customCategory)
      } else {
        categories.add(faq.category)
      }
    })
    return Array.from(categories).sort()
  }

  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm) return text
    
    const regex = new RegExp(`(${searchTerm})`, 'gi')
    return text.replace(regex, '<mark style="backgroundColor: #fef3c7, padding: 2px 4px, borderRadius: 3px">$1</mark>')
  }

  // Analytics Functions
  const fetchAnalyticsData = async () => {
    setIsAnalyticsLoading(true)
    try {
      // Simulate real-time analytics data
      const mockData = {
        liveUsers: Math.floor(Math.random() * 50) + 10,
        messagesToday: Math.floor(Math.random() * 500) + 100,
        avgResponseTime: Math.floor(Math.random() * 2000) + 500,
        popularQuestions: [
          { question: "What are your pricing plans?", count: 45 },
          { question: "Do you offer internships?", count: 38 },
          { question: "What is DevOps?", count: 32 },
          { question: "How do I start a project?", count: 28 },
          { question: "Do you provide training?", count: 25 }
        ],
        systemUptime: '99.9%',
        errorRate: Math.random() * 2,
        conversionRate: Math.random() * 15 + 5,
        chatSessions: generateMockChatSessions(),
        realTimeActivity: generateMockActivity()
      }
      setAnalyticsData(mockData)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setIsAnalyticsLoading(false)
    }
  }

  const generateMockChatSessions = () => {
    const sessions = []
    for (let i = 0; i < 10; i++) {
      sessions.push({
        id: `session_${i}`,
        user: `User ${i + 1}`,
        startTime: new Date(Date.now() - Math.random() * 3600000).toLocaleTimeString(),
        duration: Math.floor(Math.random() * 30) + 1,
        messages: Math.floor(Math.random() * 20) + 1,
        status: Math.random() > 0.3 ? 'active' : 'completed'
      })
    }
    return sessions
  }

  const generateMockActivity = () => {
    const activities = []
    const activityTypes = ['New user joined', 'FAQ viewed', 'Message sent', 'Error occurred', 'System update']
    for (let i = 0; i < 15; i++) {
      activities.push({
        id: `activity_${i}`,
        type: activityTypes[Math.floor(Math.random() * activityTypes.length)],
        timestamp: new Date(Date.now() - Math.random() * 300000).toLocaleTimeString(),
        user: `User ${Math.floor(Math.random() * 20) + 1}`,
        details: 'System activity detected'
      })
    }
    return activities
  }

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
        setNewFAQ({ question: '', answer: '', category: 'General', customCategory: '' })
        setShowAddFAQ(false)
      }
    } catch (error) {
      console.error('Error creating FAQ:', error)
    }
  }

  const editFAQ = (faq: FAQItem) => {
    setEditingFAQ(faq)
    setNewFAQ({ question: faq.question, answer: faq.answer, category: faq.category, customCategory: faq.customCategory || '' })
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
        setNewFAQ({ question: '', answer: '', category: 'General', customCategory: '' })
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

  // Chat Management functions
  const fetchChatCategories = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      
      const response = await fetch('http://localhost:8000/admin/chat/categories', {
        headers
      })
      
      if (response.ok) {
        const data = await response.json()
        setChatCategories(data)
      } else {
        console.error('Failed to fetch chat categories:', response.status)
      }
    } catch (error) {
      console.error('Error fetching chat categories:', error)
    }
  }

  const fetchCategoryStats = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      
      const response = await fetch('http://localhost:8000/admin/chat/categories/stats', {
        headers
      })
      
      if (response.ok) {
        const data = await response.json()
        setCategoryStats(data)
      } else {
        console.error('Failed to fetch category stats:', response.status)
      }
    } catch (error) {
      console.error('Error fetching category stats:', error)
    }
  }

  const fetchSubcategories = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      if (!token) {
        console.error('No admin token found')
        return
      }
      
      const headers = { 'Authorization': `Bearer ${token}` }
      
      const response = await fetch('http://localhost:8000/admin/chat/subcategories', {
        headers
      })
      
      if (response.ok) {
        const data = await response.json()
        setSubcategories(data)
      } else {
        console.error('Failed to fetch subcategories:', response.status)
      }
    } catch (error) {
      console.error('Error fetching subcategories:', error)
    }
  }

  const createSubcategory = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      if (!token) {
        alert('Please login again')
        return
      }
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
      
      const subcategoryData = {
        name: newSubcategory.name.trim(),
        description: newSubcategory.description.trim(),
        category_id: selectedCategoryForSubcategory
      }
      
      const response = await fetch('http://localhost:8000/admin/chat/subcategories', {
        method: 'POST',
        headers,
        body: JSON.stringify(subcategoryData)
      })
      
      if (response.ok) {
        alert('Subcategory created successfully!')
        setNewSubcategory({ name: '', description: '', category_id: 0 })
        await fetchSubcategories()
      } else {
        const errorData = await response.json()
        console.error('Error response:', errorData)
        alert(`Error creating subcategory: ${errorData.detail || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error creating subcategory:', error)
      alert('Error creating subcategory. Please try again.')
    }
  }

  const updateSubcategory = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
      
      const response = await fetch(`http://localhost:8000/admin/chat/subcategories/${editingSubcategory.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          name: newSubcategory.name,
          description: newSubcategory.description,
          is_active: true
        })
      })
      
      if (response.ok) {
        alert('Subcategory updated successfully!')
        setEditingSubcategory(null)
        setNewSubcategory({ name: '', description: '', category_id: 0 })
        fetchSubcategories()
      } else {
        const errorData = await response.json()
        alert(`Error updating subcategory: ${errorData.detail || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error updating subcategory:', error)
      alert('Error updating subcategory. Please try again.')
    }
  }

  const deleteSubcategory = async (subcategoryId: number) => {
    if (!confirm('Are you sure you want to delete this subcategory?')) return
    
    try {
      const token = localStorage.getItem('admin_token')
      if (!token) {
        alert('Please login again')
        return
      }
      
      const headers = { 'Authorization': `Bearer ${token}` }
      
      const response = await fetch(`http://localhost:8000/admin/chat/subcategories/${subcategoryId}`, {
        method: 'DELETE',
        headers
      })
      
      if (response.ok) {
        const result = await response.json()
        alert('Subcategory deleted successfully!')
        await fetchSubcategories()
      } else {
        const errorData = await response.json()
        console.error('Delete error response:', errorData)
        alert(`Error deleting subcategory: ${errorData.detail || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error deleting subcategory:', error)
      alert('Error deleting subcategory. Please try again.')
    }
  }

  const createCategory = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      
      const response = await fetch('http://localhost:8000/admin/chat/categories', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newCategory)
      })
      
      if (response.ok) {
        await fetchChatCategories()
        await fetchCategoryStats()
        setShowCategoryModal(false)
        setNewCategory({ name: '', description: '' })
        alert('Category created successfully!')
      } else {
        const errorData = await response.json()
        alert(`Failed to create category: ${errorData.detail || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error creating category:', error)
      alert('Error creating category. Please try again.')
    }
  }

  const updateCategory = async () => {
    if (!editingCategory) return
    
    try {
      const token = localStorage.getItem('admin_token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      
      const response = await fetch(`http://localhost:8000/admin/chat/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newCategory)
      })
      
      if (response.ok) {
        await fetchChatCategories()
        await fetchCategoryStats()
        setShowCategoryModal(false)
        setEditingCategory(null)
        setNewCategory({ name: '', description: '' })
        alert('Category updated successfully!')
      } else {
        const errorData = await response.json()
        alert(`Failed to update category: ${errorData.detail || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error updating category:', error)
      alert('Error updating category. Please try again.')
    }
  }

  const deleteCategory = async (categoryId: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return
    
    try {
      const token = localStorage.getItem('admin_token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      
      const response = await fetch(`http://localhost:8000/admin/chat/categories/${categoryId}`, {
        method: 'DELETE',
        headers
      })
      
      if (response.ok) {
        await fetchChatCategories()
        await fetchCategoryStats()
        alert('Category deleted successfully!')
      } else {
        const errorData = await response.json()
        alert(`Failed to delete category: ${errorData.detail || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      alert(`Error deleting category: ${error.message}`)
    }
  }

  const toggleCategoryStatus = async (category: ChatCategory) => {
    try {
      const token = localStorage.getItem('admin_token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      
      const response = await fetch(`http://localhost:8000/admin/chat/categories/${category.id}`, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: category.name,
          description: category.description,
          is_active: !category.is_active
        })
      })
      
      if (response.ok) {
        await fetchChatCategories()
        await fetchCategoryStats()
        alert(`Category ${!category.is_active ? 'activated' : 'deactivated'} successfully!`)
      } else {
        const errorData = await response.json()
        alert(`Failed to update category: ${errorData.detail || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error updating category status:', error)
      alert(`Error updating category status: ${error.message}`)
    }
  }

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab()
      case 'analytics':
        return renderAnalyticsTab()
      case 'faq':
        return renderFAQManagementTab()
      case 'tickets':
        return renderTicketsTab()
      case 'livechat':
        return renderLiveChatTab()
      case 'chatmanagement':
        return renderChatManagementTab()
      case 'reports':
        return renderReportsTab()
      case 'users':
        return renderUserManagementTab()
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

  // Import FAQs from CSV file
  const handleImportFAQs = async (file?: File) => {
    const fileToImport = file || importFile
    if (!fileToImport) {
      alert('Please select a CSV file to import')
      return
    }

    try {
      console.log('Starting import process...')
      const text = await fileToImport.text()
      console.log('File content:', text.substring(0, 200) + '...')
      
      const faqData = parseCSV(text)
      console.log('Parsed data:', faqData)

      if (!Array.isArray(faqData)) {
        alert('Invalid CSV file format. Please check the file structure.')
        return
      }

      // Validate FAQ data - must have Category, Question, Answer
      const validFAQs = faqData.filter(faq => 
        faq.category && faq.question && faq.answer && 
        typeof faq.category === 'string' && 
        typeof faq.question === 'string' && 
        typeof faq.answer === 'string' &&
        faq.category.trim() !== '' &&
        faq.question.trim() !== '' &&
        faq.answer.trim() !== ''
      )

      console.log('Valid FAQs:', validFAQs)

      if (validFAQs.length === 0) {
        alert('No valid FAQs found in the file. Please ensure the CSV has Category, Question, and Answer columns with data.')
        return
      }

      // Import FAQs one by one
      let successCount = 0
      let errorCount = 0
      
      for (const faq of validFAQs) {
        try {
          console.log('Importing FAQ:', faq)
          const response = await fetch('http://localhost:8000/admin/faqs', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              question: faq.question.trim(),
              answer: faq.answer.trim(),
              category: faq.category.trim(),
              customCategory: '',
              tags: [],
              priority: 1,
              isActive: true
            })
          })

          if (response.ok) {
            successCount++
            console.log('FAQ imported successfully')
          } else {
            const errorText = await response.text()
            console.error('Import failed:', response.status, errorText)
            errorCount++
          }
        } catch (error) {
          console.error('Error importing FAQ:', error)
          errorCount++
        }
      }

      console.log(`Import complete: ${successCount} success, ${errorCount} errors`)

      if (successCount > 0) {
        alert(`Successfully imported ${successCount} FAQs!${errorCount > 0 ? ` ${errorCount} FAQs failed to import.` : ''}`)
        fetchDashboardData() // Refresh the list
      } else {
        alert('Failed to import any FAQs. Please check the file format and try again.')
      }
      
      setImportFile(null)
    } catch (error: any) {
      console.error('Error importing FAQs:', error)
      alert(`Error importing FAQs: ${error.message || 'Unknown error occurred'}`)
    }
  }

  // Export FAQs to file
  const handleExportFAQs = async () => {
    try {
      const response = await fetch('http://localhost:8000/admin/faqs', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      })
      
      if (!response.ok) {
        alert('Failed to fetch FAQs for export')
        return
      }

      const data = await response.json()
      const faqs = data.faqs || data || []
      
      let exportData: string
      let filename: string
      let mimeType: string

      if (exportFormat === 'json') {
        exportData = JSON.stringify({ faqs }, null, 2)
        filename = `faqs_export_${new Date().toISOString().split('T')[0]}.json`
        mimeType = 'application/json'
      } else {
        exportData = convertToCSV(faqs)
        filename = `faqs_export_${new Date().toISOString().split('T')[0]}.csv`
        mimeType = 'text/csv'
      }

      // Download file
      const blob = new Blob([exportData], { type: mimeType })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setShowExportModal(false)
    } catch (error: any) {
      console.error('Error exporting FAQs:', error)
      alert(`Error exporting FAQs: ${error.message || 'Unknown error occurred'}`)
    }
  }

  // Parse CSV data - expects Category, Question, Answer columns
  const parseCSV = (csvText: string) => {
    try {
      const lines = csvText.split('\n').filter(line => line.trim() !== '')
      
      if (lines.length < 2) {
        throw new Error('CSV file must have at least a header row and one data row')
      }

      // Better CSV parsing that handles commas within quotes
      const parseCSVLine = (line: string) => {
        const result = []
        let current = ''
        let inQuotes = false
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i]
          
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        
        result.push(current.trim())
        return result
      }

      const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, '').toLowerCase())
      const faqs = []

      // Check if required columns exist
      const requiredColumns = ['category', 'question', 'answer']
      const missingColumns = requiredColumns.filter(col => !headers.includes(col))
      
      if (missingColumns.length > 0) {
        throw new Error(`Missing required columns: ${missingColumns.join(', ')}. CSV must have Category, Question, and Answer columns.`)
      }

      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = parseCSVLine(lines[i]).map(v => v.replace(/"/g, ''))
          const faq: any = {}
          
          headers.forEach((header, index) => {
            if (values[index] !== undefined) {
              faq[header] = values[index]
            }
          })
          
          // Only add if all required fields have values
          if (faq.category && faq.question && faq.answer) {
            faqs.push(faq)
          }
        }
      }

      console.log('Parsed FAQs:', faqs) // Debug log
      return faqs
    } catch (error) {
      console.error('CSV parsing error:', error)
      throw new Error(`CSV parsing failed: ${error.message}`)
    }
  }

  // Convert FAQs to CSV
  const convertToCSV = (faqs: any[]) => {
    const headers = ['question', 'answer', 'category', 'customCategory', 'tags', 'priority', 'isActive']
    const csvRows = [headers.join(',')]

    faqs.forEach(faq => {
      const row = headers.map(header => {
        let value = faq[header] || ''
        if (header === 'tags' && Array.isArray(value)) {
          value = value.join(';')
        }
        return `"${value}"`
      })
      csvRows.push(row.join(','))
    })

    return csvRows.join('\n')
  }

  // Generate comprehensive report data
  const generateReportData = () => {
    const totalFAQs = faqs.length
    const totalConversations = conversations.length
    const avgSuccessRate = totalFAQs > 0 ? Math.round(faqs.reduce((sum, faq) => sum + faq.success_rate, 0) / totalFAQs) : 0
    const totalViews = faqs.reduce((sum, faq) => sum + faq.views, 0)
    
    const categoryStats = getUniqueCategories().map(category => {
      const categoryFAQs = faqs.filter(faq => faq.category === category)
      const avgSuccessRate = categoryFAQs.length > 0 
        ? Math.round(categoryFAQs.reduce((sum, faq) => sum + faq.success_rate, 0) / categoryFAQs.length)
        : 0
      const totalViews = categoryFAQs.reduce((sum, faq) => sum + faq.views, 0)
      
      return {
        category,
        faqCount: categoryFAQs.length,
        avgSuccessRate,
        totalViews
      }
    })

    const topPerformingFAQs = faqs
      .sort((a, b) => b.success_rate - a.success_rate)
      .slice(0, 10)
      .map(faq => ({
        question: faq.question,
        category: faq.category,
        successRate: faq.success_rate,
        views: faq.views
      }))

    const mostViewedFAQs = faqs
      .sort((a, b) => b.views - a.views)
      .slice(0, 10)
      .map(faq => ({
        question: faq.question,
        category: faq.category,
        successRate: faq.success_rate,
        views: faq.views
      }))

    return {
      summary: {
        totalFAQs,
        totalConversations,
        avgSuccessRate,
        totalViews,
        reportDate: new Date().toISOString()
      },
      categoryStats,
      topPerformingFAQs,
      mostViewedFAQs,
      recentConversations: conversations.slice(0, 20).map(conv => ({
        userMessage: conv.user_message,
        botResponse: conv.bot_response,
        timestamp: conv.timestamp
      }))
    }
  }

  // Download report as JSON
  const downloadReport = (reportData: any, filename: string) => {
    const jsonData = JSON.stringify(reportData, null, 2)
    const blob = new Blob([jsonData], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  // Placeholder functions for other tabs

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
        <div style={{ display: 'flex', gap: '12px' }}>
          <label style={{ 
            backgroundColor: '#3b82f6', 
            color: 'white', 
            padding: '12px 24px', 
            borderRadius: '8px', 
            border: 'none', 
            fontSize: '14px', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📥 Import FAQs
            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  setImportFile(file)
                  handleImportFAQs(file)
                }
              }}
              style={{ display: 'none' }}
            />
          </label>
          <button
            onClick={() => setShowExportModal(true)}
            style={{ 
              backgroundColor: '#8b5cf6', 
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
            📤 Export FAQs
          </button>
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
            ➕ Add New FAQ
        </button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div style={{ 
        display: 'flex', 
        gap: '16px', 
        marginBottom: '24px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        {/* Search Input */}
        <div style={{ flex: '1', minWidth: '300px' }}>
          <input
            type="text"
            placeholder="Search FAQs by question, answer, or category..."
            value={faqSearchTerm}
            onChange={(e) => setFaqSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>
        
        {/* Category Filter */}
        <div style={{ minWidth: '200px' }}>
          <select
            value={faqFilterCategory}
            onChange={(e) => setFaqFilterCategory(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: 'white'
            }}
          >
            <option value="All">All Categories</option>
            {getUniqueCategories().map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        {/* Clear Filters */}
        {(faqSearchTerm || faqFilterCategory !== 'All') && (
          <button
            onClick={() => {
              setFaqSearchTerm('')
              setFaqFilterCategory('All')
            }}
            style={{
              backgroundColor: '#6b7280',
              color: 'white',
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Search Results Info */}
      {faqSearchTerm || faqFilterCategory !== 'All' ? (
        <div style={{ 
          marginBottom: '16px', 
          padding: '12px 16px', 
          backgroundColor: '#f3f4f6', 
          borderRadius: '8px',
          fontSize: '14px',
          color: '#374151'
        }}>
          Showing {getFilteredFAQs().length} of {faqs.length} FAQs
          {faqSearchTerm && ` matching "${faqSearchTerm}"`}
          {faqFilterCategory !== 'All' && ` in "${faqFilterCategory}"`}
        </div>
      ) : null}

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
        ) : getFilteredFAQs().length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {getFilteredFAQs().map((faq) => (
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
                      {faq.category === 'Custom' && faq.customCategory ? faq.customCategory : faq.category}
                    </div>
                    <div 
                      style={{ fontWeight: '600', color: '#111827', marginBottom: '8px', fontSize: '16px' }}
                      dangerouslySetInnerHTML={{ 
                        __html: highlightSearchTerm(faq.question, faqSearchTerm) 
                      }}
                    />
                    <div 
                      style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.5' }}
                      dangerouslySetInnerHTML={{ 
                        __html: highlightSearchTerm(faq.answer, faqSearchTerm) 
                      }}
                    />
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
            {faqSearchTerm || faqFilterCategory !== 'All' ? (
              <div>
                <div style={{ fontSize: '18px', marginBottom: '8px' }}>No FAQs found</div>
                <div style={{ fontSize: '14px', marginBottom: '16px' }}>
                  {faqSearchTerm && `No FAQs match "${faqSearchTerm}"`}
                  {faqFilterCategory !== 'All' && ` in "${faqFilterCategory}"`}
                </div>
                <button
                  onClick={() => {
                    setFaqSearchTerm('')
                    setFaqFilterCategory('All')
                  }}
                  style={{
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '18px', marginBottom: '8px' }}>No FAQs found</div>
                <div style={{ fontSize: '14px' }}>Click "Add New FAQ" to get started.</div>
          </div>
        )}
          </div>
        )}
      </div>
    </div>
  )

  const renderAnalyticsTab = () => (
    <div style={{ padding: '24px 16px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px' 
      }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: '0' }}>
            Real-time Analytics
      </h2>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            marginTop: '4px',
            fontSize: '14px'
          }}>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%',
              backgroundColor: isRealTimeConnected ? '#10b981' : '#dc2626'
            }}></div>
            <span style={{ color: isRealTimeConnected ? '#10b981' : '#dc2626' }}>
              {isRealTimeConnected ? 'Live Data Connected' : 'Connecting...'}
            </span>
          </div>
        </div>
        <button
          onClick={fetchAnalyticsData}
          disabled={isAnalyticsLoading}
          style={{ 
            backgroundColor: '#3b82f6', 
            color: 'white', 
            padding: '12px 24px', 
            borderRadius: '8px', 
            border: 'none', 
            fontSize: '14px', 
            cursor: isAnalyticsLoading ? 'not-allowed' : 'pointer',
            opacity: isAnalyticsLoading ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {isAnalyticsLoading ? '⏳' : '🔄'} Refresh Data
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '20px',
        marginBottom: '32px'
      }}>
      <div style={{ 
        backgroundColor: 'white', 
          borderRadius: '12px', 
          padding: '24px', 
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ 
              backgroundColor: '#10b981', 
        borderRadius: '8px', 
              padding: '12px',
              marginRight: '12px'
            }}>
              👥
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Live Users</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>
                {analyticsData.liveUsers}
              </div>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#10b981' }}>+12% from yesterday</div>
        </div>

        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '12px', 
        padding: '24px', 
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ 
              backgroundColor: '#3b82f6', 
              borderRadius: '8px', 
              padding: '12px',
              marginRight: '12px'
            }}>
              💬
      </div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Messages Today</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>
                {analyticsData.messagesToday}
    </div>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#3b82f6' }}>+8% from yesterday</div>
        </div>

      <div style={{ 
        backgroundColor: 'white', 
          borderRadius: '12px', 
          padding: '24px', 
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ 
              backgroundColor: '#f59e0b', 
        borderRadius: '8px', 
              padding: '12px',
              marginRight: '12px'
            }}>
              ⏱️
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Avg Response Time</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>
                {analyticsData.avgResponseTime}ms
              </div>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#f59e0b' }}>-15% from yesterday</div>
        </div>

        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '12px', 
        padding: '24px', 
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ 
              backgroundColor: '#8b5cf6', 
              borderRadius: '8px', 
              padding: '12px',
              marginRight: '12px'
            }}>
              📈
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Conversion Rate</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>
                {analyticsData.conversionRate.toFixed(1)}%
              </div>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#8b5cf6' }}>+3% from yesterday</div>
        </div>
      </div>

      {/* Charts and Data */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '24px',
        marginBottom: '32px'
      }}>
        {/* Popular Questions */}
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          padding: '24px', 
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', margin: '0 0 20px' }}>
            Popular Questions
        </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {analyticsData.popularQuestions.map((item, index) => (
              <div key={index} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '12px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px'
              }}>
                <div style={{ flex: 1, fontSize: '14px', color: '#374151' }}>
                  {item.question}
                </div>
                <div style={{ 
                  backgroundColor: '#3b82f6', 
                  color: 'white', 
                  padding: '4px 8px', 
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {item.count}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Health */}
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          padding: '24px', 
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', margin: '0 0 20px' }}>
            System Health
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>Uptime</span>
              <span style={{ fontSize: '16px', fontWeight: '600', color: '#10b981' }}>
                {analyticsData.systemUptime}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>Error Rate</span>
              <span style={{ fontSize: '16px', fontWeight: '600', color: analyticsData.errorRate > 1 ? '#dc2626' : '#10b981' }}>
                {analyticsData.errorRate.toFixed(2)}%
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>Active Sessions</span>
              <span style={{ fontSize: '16px', fontWeight: '600', color: '#3b82f6' }}>
                {analyticsData.chatSessions.filter(s => s.status === 'active').length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Activity Feed */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        padding: '24px', 
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', margin: '0 0 20px' }}>
          Live Activity Feed
        </h3>
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {analyticsData.realTimeActivity.map((activity, index) => (
            <div key={activity.id} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: '12px 0',
              borderBottom: index < analyticsData.realTimeActivity.length - 1 ? '1px solid #f3f4f6' : 'none'
            }}>
              <div style={{ 
                width: '8px', 
                height: '8px', 
                backgroundColor: '#10b981', 
                borderRadius: '50%',
                marginRight: '12px'
              }}></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>
                  {activity.type}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {activity.user} • {activity.timestamp}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderTicketsTab = () => (
    <div style={{ padding: '24px 16px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px' 
      }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: '0' }}>
            Support Tickets
      </h2>
          <p style={{ color: '#6b7280', margin: '8px 0 0' }}>
            Manage and respond to user support tickets
          </p>
        </div>
        <button
          onClick={fetchTickets}
          disabled={isTicketsLoading}
          style={{ 
            backgroundColor: '#3b82f6', 
            color: 'white', 
            padding: '12px 24px', 
            borderRadius: '8px', 
            border: 'none', 
            fontSize: '14px', 
            cursor: isTicketsLoading ? 'not-allowed' : 'pointer',
            opacity: isTicketsLoading ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {isTicketsLoading ? '⏳' : '🔄'} Refresh
        </button>
      </div>

      {/* Tickets Stats */}
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
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎫</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
            {tickets.length}
      </div>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>Total Tickets</div>
    </div>

      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
          padding: '20px', 
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏳</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
            {tickets.filter(t => t.status === 'pending').length}
      </div>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>Pending</div>
    </div>

      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
          padding: '20px', 
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
            {tickets.filter(t => t.status === 'resolved').length}
          </div>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>Resolved</div>
        </div>
      </div>

      {/* Tickets List */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        <div style={{ 
          padding: '20px', 
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>All Tickets</h3>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            {tickets.length} tickets
          </div>
        </div>
        
        {isTicketsLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            Loading tickets...
          </div>
        ) : tickets.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎫</div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px' }}>
              No tickets yet
        </h3>
            <p style={{ margin: 0 }}>
              Support tickets will appear here when users create them.
        </p>
      </div>
        ) : (
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                style={{
                  padding: '20px',
                  borderBottom: '1px solid #f3f4f6',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <span style={{ 
                        fontSize: '14px', 
                        fontWeight: '600', 
                        color: '#111827',
                        backgroundColor: '#f3f4f6',
                        padding: '4px 8px',
                        borderRadius: '4px'
                      }}>
                        {ticket.token}
                      </span>
                      <span style={{ 
                        fontSize: '12px', 
                        padding: '4px 8px',
                        borderRadius: '12px',
                        backgroundColor: ticket.status === 'pending' ? '#fef3c7' : 
                                        ticket.status === 'resolved' ? '#d1fae5' : '#e5e7eb',
                        color: ticket.status === 'pending' ? '#92400e' : 
                               ticket.status === 'resolved' ? '#065f46' : '#374151'
                      }}>
                        {ticket.status.toUpperCase()}
                      </span>
                    </div>
                    
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                        {ticket.first_name} {ticket.last_name}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                        {ticket.email} {ticket.phone && `• ${ticket.phone}`}
                      </div>
                    </div>
                    
                    <div style={{ 
                      fontSize: '14px', 
                      color: '#374151',
                      backgroundColor: '#f9fafb',
                      padding: '12px',
                      borderRadius: '6px',
                      marginBottom: '8px'
                    }}>
                      <strong>Query:</strong> {ticket.user_query}
                    </div>
                    
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                      Created: {new Date(ticket.created_at).toLocaleString()}
                      {ticket.resolved_at && (
                        <span> • Resolved: {new Date(ticket.resolved_at).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                    <button
                      onClick={() => {
                        console.log('Selected ticket:', ticket)
                        setSelectedTicket(ticket)
                        setShowTicketModal(true)
                      }}
                      style={{
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      View Details
                    </button>
                    {ticket.status === 'pending' && (
                      <button
                        onClick={async () => {
                          const success = await updateTicketStatus(ticket.token, 'resolved', 'Resolved by admin')
                          if (success) {
                            alert('Ticket resolved successfully!')
                          } else {
                            alert('Failed to resolve ticket. Please try again.')
                          }
                        }}
                        style={{
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Resolve
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        const success = await deleteTicket(ticket.token)
                        if (success) {
                          alert('Ticket deleted successfully!')
                        } else {
                          alert('Failed to delete ticket. Please try again.')
                        }
                      }}
                      style={{
                        backgroundColor: '#dc2626',
                        color: 'white',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ticket Details Modal */}
      {showTicketModal && selectedTicket && (
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
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                Ticket Details - {selectedTicket.token}
              </h2>
              <button
                onClick={() => setShowTicketModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '6px',
                  fontSize: '18px'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              {/* Status */}
              <div>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '4px', display: 'block' }}>
                  Status
                </label>
                <span style={{ 
                  fontSize: '14px', 
                  padding: '6px 12px',
                  borderRadius: '20px',
                  backgroundColor: selectedTicket.status === 'pending' ? '#fef3c7' : 
                                  selectedTicket.status === 'resolved' ? '#d1fae5' : '#e5e7eb',
                  color: selectedTicket.status === 'pending' ? '#92400e' : 
                         selectedTicket.status === 'resolved' ? '#065f46' : '#374151'
                }}>
                  {selectedTicket.status.toUpperCase()}
                </span>
              </div>

              {/* User Information */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '4px', display: 'block' }}>
                    First Name
                  </label>
                  <div style={{ padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: '6px', fontSize: '14px' }}>
                    {selectedTicket.first_name}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '4px', display: 'block' }}>
                    Last Name
                  </label>
                  <div style={{ padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: '6px', fontSize: '14px' }}>
                    {selectedTicket.last_name}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '4px', display: 'block' }}>
                  Email
                </label>
                <div style={{ padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: '6px', fontSize: '14px' }}>
                  {selectedTicket.email}
                </div>
              </div>

              {selectedTicket.phone && (
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '4px', display: 'block' }}>
                    Phone
                  </label>
                  <div style={{ padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: '6px', fontSize: '14px' }}>
                    {selectedTicket.phone}
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '4px', display: 'block' }}>
                  User Query
                </label>
                <div style={{ 
                  padding: '12px', 
                  backgroundColor: '#f9fafb', 
                  borderRadius: '6px', 
                  fontSize: '14px',
                  minHeight: '80px',
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedTicket.user_query || 'No query provided'}
                </div>
              </div>

              {/* Timestamps */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '4px', display: 'block' }}>
                    Created At
                  </label>
                  <div style={{ padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: '6px', fontSize: '14px' }}>
                    {new Date(selectedTicket.created_at).toLocaleString()}
                  </div>
                </div>
                {selectedTicket.resolved_at && (
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '4px', display: 'block' }}>
                      Resolved At
                    </label>
                    <div style={{ padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: '6px', fontSize: '14px' }}>
                      {new Date(selectedTicket.resolved_at).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>

              {/* Admin Notes */}
              {selectedTicket.admin_notes && (
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '4px', display: 'block' }}>
                    Admin Notes
                  </label>
                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#fef3c7', 
                    borderRadius: '6px', 
                    fontSize: '14px',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {selectedTicket.admin_notes}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              marginTop: '24px', 
              paddingTop: '20px', 
              borderTop: '1px solid #e5e7eb',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowTicketModal(false)}
                style={{
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
              {selectedTicket.status === 'pending' && (
                <button
                  onClick={async () => {
                    const success = await updateTicketStatus(selectedTicket.token, 'resolved', 'Resolved by admin')
                    if (success) {
                      alert('Ticket resolved successfully!')
                      setShowTicketModal(false)
                    } else {
                      alert('Failed to resolve ticket. Please try again.')
                    }
                  }}
                  style={{
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Mark as Resolved
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderLiveChatTab = () => (
    <LiveChatQueue />
  )

  const renderReportsTab = () => (
    <div style={{ padding: '24px 16px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px' 
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: '0' }}>
          📊 Reports & Analytics
      </h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => {
              const reportData = generateReportData()
              downloadReport(reportData, 'comprehensive_report')
            }}
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
            📥 Download Report
          </button>
          <button
            onClick={() => {
              const reportData = generateReportData()
              downloadReport(reportData, 'faq_performance_report')
            }}
            style={{ 
              backgroundColor: '#3b82f6', 
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
            📈 FAQ Performance
          </button>
        </div>
      </div>

      {/* Report Summary Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '20px',
        marginBottom: '32px'
      }}>
      <div style={{ 
        backgroundColor: 'white', 
          borderRadius: '12px', 
          padding: '24px', 
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ 
              backgroundColor: '#10b981', 
        borderRadius: '8px', 
              padding: '12px',
              marginRight: '12px'
            }}>
              📊
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Total FAQs</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>
                {faqs.length}
              </div>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#10b981' }}>+12% from last month</div>
        </div>

        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '12px', 
        padding: '24px', 
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ 
              backgroundColor: '#3b82f6', 
              borderRadius: '8px', 
              padding: '12px',
              marginRight: '12px'
            }}>
              💬
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Total Conversations</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>
                {conversations.length}
              </div>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#3b82f6' }}>+8% from last month</div>
        </div>

        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          padding: '24px', 
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ 
              backgroundColor: '#f59e0b', 
              borderRadius: '8px', 
              padding: '12px',
              marginRight: '12px'
            }}>
              🎯
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Success Rate</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>
                {faqs.length > 0 ? Math.round(faqs.reduce((sum, faq) => sum + faq.success_rate, 0) / faqs.length) : 0}%
              </div>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#f59e0b' }}>+5% from last month</div>
        </div>

        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          padding: '24px', 
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ 
              backgroundColor: '#8b5cf6', 
              borderRadius: '8px', 
              padding: '12px',
              marginRight: '12px'
            }}>
              📈
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Total Views</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>
                {faqs.length > 0 ? faqs.reduce((sum, faq) => sum + faq.views, 0) : 0}
              </div>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#8b5cf6' }}>+15% from last month</div>
        </div>
      </div>

      {/* FAQ Performance Report */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        padding: '24px', 
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 20px' }}>
          📊 FAQ Performance Report
        </h3>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '20px',
          marginBottom: '24px'
        }}>
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', margin: '0 0 12px' }}>
              Top Performing FAQs
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {faqs
                .sort((a, b) => b.success_rate - a.success_rate)
                .slice(0, 5)
                .map((faq, index) => (
                  <div key={faq.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '8px 12px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '6px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>
                        #{index + 1} {faq.category}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>
                        {faq.question.length > 50 ? faq.question.substring(0, 50) + '...' : faq.question}
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: '12px', 
                      fontWeight: '600', 
                      color: faq.success_rate > 80 ? '#10b981' : faq.success_rate > 60 ? '#f59e0b' : '#dc2626'
                    }}>
                      {faq.success_rate}%
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', margin: '0 0 12px' }}>
              Most Viewed FAQs
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {faqs
                .sort((a, b) => b.views - a.views)
                .slice(0, 5)
                .map((faq, index) => (
                  <div key={faq.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '8px 12px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '6px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>
                        #{index + 1} {faq.category}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>
                        {faq.question.length > 50 ? faq.question.substring(0, 50) + '...' : faq.question}
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: '12px', 
                      fontWeight: '600', 
                      color: '#3b82f6'
                    }}>
                      {faq.views} views
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Category Performance */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        padding: '24px', 
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 20px' }}>
          📈 Category Performance
        </h3>
        
              {/* Enhanced Professional Vertical Bar Chart for Success Rates */}
              <div style={{ marginBottom: '32px' }}>
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 4px' }}>
                    Success Rate by Category
                  </h4>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: '0' }}>
                    Performance metrics across different FAQ categories
                  </p>
                </div>
                
                {/* Chart Container */}
                <div style={{ 
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  overflow: 'hidden'
                }}>
                  {/* Chart Header with Y-Axis Label */}
                  <div style={{
                    padding: '24px 24px 0 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#374151',
                      writingMode: 'vertical-rl',
                      textOrientation: 'mixed',
                      transform: 'rotate(180deg)',
                      whiteSpace: 'nowrap'
                    }}>
                      Success Rate (%)
                    </div>
                    
                    {/* Y-Axis Tick Labels */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      height: '300px',
                      fontSize: '12px',
                      color: '#6b7280',
                      minWidth: '30px'
                    }}>
                      <div style={{ textAlign: 'right' }}>100%</div>
                      <div style={{ textAlign: 'right' }}>80%</div>
                      <div style={{ textAlign: 'right' }}>60%</div>
                      <div style={{ textAlign: 'right' }}>40%</div>
                      <div style={{ textAlign: 'right' }}>20%</div>
                      <div style={{ textAlign: 'right' }}>0%</div>
                    </div>

                    {/* Y-Axis Line */}
                    <div style={{
                      width: '2px',
                      height: '300px',
                      backgroundColor: '#d1d5db',
                      marginRight: '16px'
                    }}></div>

                    {/* Chart Area with Horizontal Scroll */}
                    <div style={{
                      flex: 1,
                      overflowX: 'auto',
                      overflowY: 'hidden',
                      paddingBottom: '40px'
                    }}>
                      <div style={{
                        minWidth: 'max-content',
                        height: '320px',
                        display: 'flex',
                        alignItems: 'end',
                        gap: '20px',
                        paddingRight: '24px',
                        position: 'relative'
                      }}>
                        {/* Subtle Gridlines */}
                        {[0, 20, 40, 60, 80, 100].map((value, index) => (
                          <div key={value} style={{
                            position: 'absolute',
                            left: '0',
                            right: '24px',
                            top: `${index * 20}px`,
                            height: '1px',
                            backgroundColor: '#f8fafc',
                            zIndex: 1
                          }}></div>
                        ))}

                        {/* Bars */}
                        {getUniqueCategories().map(category => {
                          const categoryFAQs = faqs.filter(faq => faq.category === category)
                          const avgSuccessRate = categoryFAQs.length > 0 
                            ? Math.round(categoryFAQs.reduce((sum, faq) => sum + faq.success_rate, 0) / categoryFAQs.length)
                            : 0
                          
                          return (
                            <div key={category} style={{ 
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              width: '90px',
                              height: '100%',
                              justifyContent: 'flex-end',
                              position: 'relative',
                              zIndex: 2
                            }}>
                              {/* Enhanced Percentage Label */}
                              <div style={{
                                position: 'absolute',
                                top: '-35px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                fontSize: '12px',
                                fontWeight: '700',
                                color: '#1f2937',
                                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                whiteSpace: 'nowrap',
                                border: '1px solid #e5e7eb',
                                backdropFilter: 'blur(8px)',
                                minWidth: '40px',
                                textAlign: 'center'
                              }}>
                                {avgSuccessRate}%
                              </div>

                              {/* Enhanced Bar with Gradient */}
                              <div style={{ 
                                width: '60px',
                                height: `${Math.max(avgSuccessRate, 2)}%`,
                                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                borderRadius: '8px 8px 0 0',
                                marginBottom: '30px',
                                position: 'relative',
                                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                minHeight: '6px',
                                boxShadow: '0 6px 16px rgba(59, 130, 246, 0.4), 0 2px 4px rgba(59, 130, 246, 0.2)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                cursor: 'pointer'
                              }}>
                                {/* Bar Hover Effect */}
                                <div style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 100%)',
                                  borderRadius: '8px 8px 0 0',
                                  opacity: 0,
                                  transition: 'opacity 0.3s ease'
                                }}></div>
                              </div>
                              
                              {/* Enhanced X-Axis Label with 30° rotation */}
                              <div style={{ 
                                fontSize: '11px', 
                                color: '#374151', 
                                fontWeight: '600',
                                textAlign: 'center',
                                transform: 'rotate(-30deg)',
                                transformOrigin: 'center',
                                whiteSpace: 'nowrap',
                                maxWidth: '140px',
                                marginTop: '12px',
                                height: '50px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: 'center',
                                letterSpacing: '0.025em'
                              }}>
                                {category}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Enhanced X-Axis Line */}
                  <div style={{
                    marginLeft: '90px',
                    marginRight: '24px',
                    height: '2px',
                    backgroundColor: '#d1d5db',
                    borderRadius: '1px'
                  }}></div>

                  {/* Enhanced X-Axis Label */}
                  <div style={{
                    padding: '20px 24px 28px 24px',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      letterSpacing: '0.025em'
                    }}>
                      Category
                    </div>
                  </div>
                </div>
              </div>

        {/* Bar Graph for FAQ Counts */}
        <div style={{ marginBottom: '32px' }}>
          <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', margin: '0 0 16px' }}>
            FAQ Count by Category
          </h4>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px',
            height: '300px',
            overflowY: 'auto'
          }}>
            {getUniqueCategories().map(category => {
              const categoryFAQs = faqs.filter(faq => faq.category === category)
              const faqCount = categoryFAQs.length
              const maxCount = Math.max(...getUniqueCategories().map(cat => 
                faqs.filter(faq => faq.category === cat).length
              ))
              const percentage = maxCount > 0 ? (faqCount / maxCount) * 100 : 0
              
              return (
                <div key={category} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  padding: '8px 0'
                }}>
                  <div style={{ 
                    minWidth: '120px', 
                    fontSize: '12px', 
                    fontWeight: '500', 
                    color: '#374151'
                  }}>
                    {category.length > 20 ? category.substring(0, 20) + '...' : category}
                  </div>
                  <div style={{ 
                    flex: 1, 
                    height: '20px', 
                    backgroundColor: '#e5e7eb', 
                    borderRadius: '10px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${percentage}%`,
                      backgroundColor: '#3b82f6',
                      borderRadius: '10px',
                      transition: 'width 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      paddingRight: '8px'
                    }}>
                      <span style={{ 
                        fontSize: '10px', 
                        fontWeight: '600', 
                        color: 'white',
                        textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                      }}>
                        {faqCount}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bar Graph for Total Views */}
        <div>
          <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', margin: '0 0 16px' }}>
            Total Views by Category
          </h4>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px',
            height: '300px',
            overflowY: 'auto'
          }}>
            {getUniqueCategories().map(category => {
              const categoryFAQs = faqs.filter(faq => faq.category === category)
              const totalViews = categoryFAQs.reduce((sum, faq) => sum + faq.views, 0)
              const maxViews = Math.max(...getUniqueCategories().map(cat => 
                faqs.filter(faq => faq.category === cat).reduce((sum, faq) => sum + faq.views, 0)
              ))
              const percentage = maxViews > 0 ? (totalViews / maxViews) * 100 : 0
              
              return (
                <div key={category} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  padding: '8px 0'
                }}>
                  <div style={{ 
                    minWidth: '120px', 
                    fontSize: '12px', 
                    fontWeight: '500', 
                    color: '#374151'
                  }}>
                    {category.length > 20 ? category.substring(0, 20) + '...' : category}
                  </div>
                  <div style={{ 
                    flex: 1, 
                    height: '20px', 
                    backgroundColor: '#e5e7eb', 
                    borderRadius: '10px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${percentage}%`,
                      backgroundColor: '#8b5cf6',
                      borderRadius: '10px',
                      transition: 'width 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      paddingRight: '8px'
                    }}>
                      <span style={{ 
                        fontSize: '10px', 
                        fontWeight: '600', 
                        color: 'white',
                        textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                      }}>
                        {totalViews}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Performance Trends Line Graph */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        padding: '24px', 
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 20px' }}>
          📈 Performance Trends (Last 7 Days)
        </h3>
        
        <div style={{ 
          height: '200px', 
          display: 'flex', 
          alignItems: 'end', 
          justifyContent: 'space-between',
          padding: '20px',
          backgroundColor: '#f9fafb',
        borderRadius: '8px', 
          border: '1px solid #e5e7eb'
        }}>
          {Array.from({ length: 7 }, (_, i) => {
            const date = new Date()
            date.setDate(date.getDate() - (6 - i))
            const dayName = date.toLocaleDateString('en', { weekday: 'short' })
            
            // Generate mock data for demonstration
            const mockConversations = Math.floor(Math.random() * 20) + 5
            const mockSuccessRate = Math.floor(Math.random() * 40) + 60
            const height = (mockConversations / 25) * 100
            
            return (
              <div key={i} style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                flex: 1,
                margin: '0 4px'
              }}>
                <div style={{ 
                  width: '100%',
                  height: `${height}px`,
                  backgroundColor: '#3b82f6',
                  borderRadius: '4px 4px 0 0',
                  marginBottom: '8px',
                  position: 'relative',
                  transition: 'height 0.3s ease'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '10px',
                    fontWeight: '600',
                    color: '#374151',
                    backgroundColor: 'white',
                    padding: '2px 4px',
                    borderRadius: '4px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}>
                    {mockConversations}
                  </div>
                </div>
                <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: '500' }}>
                  {dayName}
                </div>
                <div style={{ fontSize: '8px', color: '#9ca3af', marginTop: '2px' }}>
                  {mockSuccessRate}%
                </div>
              </div>
            )
          })}
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '24px', 
          marginTop: '16px',
          fontSize: '12px',
          color: '#6b7280'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#3b82f6', borderRadius: '2px' }}></div>
            <span>Daily Conversations</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '2px' }}></div>
            <span>Success Rate %</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        padding: '24px', 
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 20px' }}>
          🕒 Recent Activity
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {conversations.slice(0, 10).map((conversation, index) => (
            <div key={conversation.id} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '12px 16px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827', marginBottom: '4px' }}>
                  {conversation.user_message}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {conversation.bot_response}
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '16px' }}>
                {new Date(conversation.timestamp).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // Chat Management Tab
  const renderChatManagementTab = () => (
    <div style={{ padding: '24px 16px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px' 
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: '0' }}>
          ⚙️ Chat Management
        </h2>
        <button
          onClick={() => {
            setEditingCategory(null)
            setNewCategory({ name: '', description: '' })
            setShowCategoryModal(true)
          }}
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
          ➕ Add Category
        </button>
      </div>

      {/* Stats Cards */}
      {categoryStats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px', 
          marginBottom: '24px' 
        }}>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '20px', 
            borderRadius: '12px', 
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '8px' }}>
              {categoryStats.total_categories}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Categories</div>
          </div>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '20px', 
            borderRadius: '12px', 
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981', marginBottom: '8px' }}>
              {categoryStats.active_categories}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>Active Categories</div>
          </div>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '20px', 
            borderRadius: '12px', 
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '8px' }}>
              {categoryStats.inactive_categories}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>Inactive Categories</div>
          </div>
        </div>
      )}

      {/* Categories Table */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                  ID
                </th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                  Name
                </th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                  Subcategories
                </th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                  Description
                </th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                  Status
                </th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                  Usage
                </th>
                <th style={{ padding: '16px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {chatCategories.map((category) => {
                const usage = categoryStats?.usage_stats.find(stat => stat.name === category.name)?.usage_count || 0
                const categorySubcategories = subcategories.filter(sub => sub.category_id === category.id)
                return (
                  <tr key={category.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#374151' }}>
                      {category.id}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#374151', fontWeight: '500' }}>
                      {category.name}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {categorySubcategories.length > 0 ? (
                          categorySubcategories.slice(0, 3).map((sub) => (
                            <span
                              key={sub.id}
                              style={{
                                padding: '2px 8px',
                                backgroundColor: '#e5e7eb',
                                borderRadius: '12px',
                                fontSize: '12px',
                                color: '#374151'
                              }}
                            >
                              {sub.name}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: '#9ca3af', fontSize: '12px' }}>No subcategories</span>
                        )}
                        {categorySubcategories.length > 3 && (
                          <span style={{ color: '#6b7280', fontSize: '12px' }}>
                            +{categorySubcategories.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                      {category.description}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: category.is_active ? '#dcfce7' : '#fef2f2',
                        color: category.is_active ? '#166534' : '#dc2626'
                      }}>
                        {category.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#374151' }}>
                      {usage} requests
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => {
                            setEditingCategory(category)
                            setNewCategory({ name: category.name, description: category.description })
                            setShowCategoryModal(true)
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCategoryForSubcategory(category.id)
                            setShowSubcategoryModal(true)
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#8b5cf6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          📋 Subcategories
                        </button>
                        <button
                          onClick={() => toggleCategoryStatus(category)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: category.is_active ? '#f59e0b' : '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          {category.is_active ? '⏸️ Deactivate' : '▶️ Activate'}
                        </button>
                        <button
                          onClick={() => deleteCategory(category.id)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
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
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0' }}>
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <button
                onClick={() => {
                  setShowCategoryModal(false)
                  setEditingCategory(null)
                  setNewCategory({ name: '', description: '' })
                }}
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Category Name *
                </label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  placeholder="Enter category name"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Description *
                </label>
                <textarea
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  placeholder="Enter category description"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical',
                    transition: 'border-color 0.2s'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  onClick={() => {
                    setShowCategoryModal(false)
                    setEditingCategory(null)
                    setNewCategory({ name: '', description: '' })
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={editingCategory ? updateCategory : createCategory}
                  disabled={!newCategory.name.trim() || !newCategory.description.trim()}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: editingCategory ? '#3b82f6' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    opacity: (!newCategory.name.trim() || !newCategory.description.trim()) ? 0.5 : 1
                  }}
                >
                  {editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subcategory Management Modal */}
      {showSubcategoryModal && selectedCategoryForSubcategory && (
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
            maxWidth: '800px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '20px' 
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0' }}>
                📋 Manage Subcategories - {chatCategories.find(cat => cat.id === selectedCategoryForSubcategory)?.name}
              </h3>
              <button
                onClick={() => {
                  setShowSubcategoryModal(false)
                  setSelectedCategoryForSubcategory(null)
                  setEditingSubcategory(null)
                  setNewSubcategory({ name: '', description: '', category_id: 0 })
                }}
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

            {/* Add New Subcategory Form */}
            <div style={{ 
              backgroundColor: '#f9fafb', 
              padding: '16px', 
              borderRadius: '8px', 
              marginBottom: '20px' 
            }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
                Add New Subcategory
              </h4>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                    Name *
                  </label>
                  <input
                    type="text"
                    value={newSubcategory.name}
                    onChange={(e) => setNewSubcategory({ ...newSubcategory, name: e.target.value })}
                    placeholder="Enter subcategory name"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                    Description *
                  </label>
                  <input
                    type="text"
                    value={newSubcategory.description}
                    onChange={(e) => setNewSubcategory({ ...newSubcategory, description: e.target.value })}
                    placeholder="Enter subcategory description"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
                <button
                  onClick={async () => {
                    if (newSubcategory.name.trim() && newSubcategory.description.trim()) {
                      try {
                        await createSubcategory()
                      } catch (error) {
                        console.error('Error creating subcategory:', error)
                      }
                    } else {
                      alert('Please fill in all fields')
                    }
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Add Subcategory
                </button>
              </div>
            </div>

            {/* Subcategories List */}
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
                Existing Subcategories
              </h4>
              {subcategories
                .filter(sub => sub.category_id === selectedCategoryForSubcategory)
                .map((subcategory) => (
                  <div
                    key={subcategory.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      marginBottom: '8px'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                        {subcategory.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {subcategory.description}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          setEditingSubcategory(subcategory)
                          setNewSubcategory({ 
                            name: subcategory.name, 
                            description: subcategory.description, 
                            category_id: subcategory.category_id 
                          })
                        }}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await deleteSubcategory(subcategory.id)
                          } catch (error) {
                            console.error('Error deleting subcategory:', error)
                          }
                        }}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              {subcategories.filter(sub => sub.category_id === selectedCategoryForSubcategory).length === 0 && (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px', 
                  color: '#6b7280',
                  fontSize: '14px'
                }}>
                  No subcategories found. Add one above to get started.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                onClick={() => {
                  setShowSubcategoryModal(false)
                  setSelectedCategoryForSubcategory(null)
                  setEditingSubcategory(null)
                  setNewSubcategory({ name: '', description: '', category_id: 0 })
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // User Management Tab
  const renderUserManagementTab = () => (
    <div style={{ padding: '24px 16px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px' 
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: '0' }}>
          👥 User Management
        </h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={async () => {
              await fetchRoles()
              setShowUserModal(true)
            }}
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
            ➕ Add User
          </button>
          <button
            onClick={() => setShowRoleModal(true)}
            style={{ 
              backgroundColor: '#3b82f6', 
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
            🎭 Manage Roles
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div style={{ 
        display: 'flex', 
        gap: '16px', 
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <input
            type="text"
            placeholder="Search users..."
            value={userSearchTerm}
            onChange={(e) => setUserSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px'
            }}
          />
        </div>
        <div style={{ minWidth: '150px' }}>
          <select
            value={userFilterRole}
            onChange={(e) => setUserFilterRole(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: 'white'
            }}
          >
            <option value="All">All Roles</option>
            {roles.map(role => (
              <option key={role.id} value={role.name}>{role.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr 1fr 1fr 120px 100px',
          gap: '16px',
          padding: '16px 24px',
          backgroundColor: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
          fontWeight: '600',
          fontSize: '14px',
          color: '#374151'
        }}>
          <div>Name</div>
          <div>Email</div>
          <div>Role</div>
          <div>Last Login</div>
          <div>Status</div>
          <div>Actions</div>
        </div>
        
        {users
          .filter(user => 
            (userSearchTerm === '' || 
             user.full_name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
             user.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
             user.username.toLowerCase().includes(userSearchTerm.toLowerCase())) &&
            (userFilterRole === 'All' || user.role_name === userFilterRole)
          )
          .map(user => (
            <div key={user.id} style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr 1fr 1fr 120px 100px',
              gap: '16px',
              padding: '16px 24px',
              borderBottom: '1px solid #f3f4f6',
              alignItems: 'center',
              fontSize: '14px'
            }}>
              <div>
                <div style={{ fontWeight: '500', color: '#111827' }}>
                  {user.full_name}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  @{user.username}
                </div>
              </div>
              <div style={{ color: '#374151' }}>{user.email}</div>
              <div>
                <span style={{ 
                  backgroundColor: '#dbeafe', 
                  color: '#1e40af', 
                  padding: '4px 8px', 
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  {user.role_name || 'No Role'}
                </span>
              </div>
              <div style={{ color: '#6b7280', fontSize: '12px' }}>
                {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
              </div>
              <div>
                <span style={{ 
                  backgroundColor: user.is_active ? '#dcfce7' : '#fee2e2', 
                  color: user.is_active ? '#166534' : '#dc2626', 
                  padding: '4px 8px', 
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={async () => {
                    await fetchRoles()
                    setEditingUser(user)
                    setNewUser({
                      username: user.username,
                      email: user.email,
                      password: '',
                      full_name: user.full_name,
                      role_id: user.role_id
                    })
                    setShowUserModal(true)
                  }}
                  style={{ 
                    backgroundColor: '#3b82f6', 
                    color: 'white', 
                    padding: '6px 12px', 
                    borderRadius: '6px', 
                    border: 'none', 
                    fontSize: '12px', 
                    cursor: 'pointer'
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to delete this user?')) {
                      const result = await deleteUser(user.id)
                      if (!result.success) {
                        alert(`Error: ${result.error}`)
                      }
                    }
                  }}
                  style={{ 
                    backgroundColor: '#dc2626', 
                    color: 'white', 
                    padding: '6px 12px', 
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
          ))}
      </div>

      {/* User Modal */}
      {showUserModal && (
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
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
              {editingUser ? 'Edit User' : 'Add New User'}
            </h3>
            
            <form onSubmit={async (e) => {
              e.preventDefault()
              const result = editingUser 
                ? await updateUser(editingUser.id, newUser)
                : await createUser(newUser)
              
              if (result.success) {
                setShowUserModal(false)
                setEditingUser(null)
                setNewUser({ username: '', email: '', password: '', full_name: '', role_id: 0 })
              } else {
                alert(result.error)
              }
            }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Username
                </label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Password {editingUser && '(leave empty to keep current)'}
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  required={!editingUser}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Role
                </label>
                <select
                  value={newUser.role_id}
                  onChange={(e) => setNewUser({...newUser, role_id: parseInt(e.target.value)})}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: 'white'
                  }}
                >
                  <option value={0}>Select Role</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowUserModal(false)
                    setEditingUser(null)
                    setNewUser({ username: '', email: '', password: '', full_name: '', role_id: 0 })
                  }}
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
                  style={{
                    padding: '12px 24px',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Management Modal */}
      {showRoleModal && (
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
            maxWidth: '800px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
              Role & Permission Management
            </h3>
            
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                Available Roles
              </h4>
              <div style={{ display: 'grid', gap: '12px' }}>
                {roles.map(role => (
                  <div key={role.id} style={{
                    padding: '16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    backgroundColor: '#f9fafb'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{role.name}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{role.description}</div>
                      </div>
                      <button
                        onClick={() => handleManagePermissions(role)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Manage Permissions
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowRoleModal(false)}
                style={{
                  padding: '12px 24px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permission Management Modal */}
      {showPermissionModal && editingRole && (
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
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
              Manage Permissions - {editingRole.name}
            </h3>
            
            <div style={{
              padding: '12px',
              backgroundColor: '#f0f9ff',
              border: '1px solid #0ea5e9',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#0c4a6e', marginBottom: '4px' }}>
                Role Description
              </div>
              <div style={{ fontSize: '12px', color: '#0c4a6e' }}>
                {editingRole.description}
              </div>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                Select the permissions for the <strong>{editingRole.name}</strong> role:
              </p>
              
              {/* Permission Categories */}
              <div style={{ marginBottom: '16px' }}>
                <button
                  onClick={() => {
                    const allPermissionIds = permissions.map(p => p.id)
                    const allChecked = allPermissionIds.every(id => rolePermissions[id])
                    const newPermissions = {}
                    allPermissionIds.forEach(id => {
                      newPermissions[id] = !allChecked
                    })
                    setRolePermissions(newPermissions)
                  }}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    color: '#374151',
                    cursor: 'pointer',
                    fontSize: '12px',
                    marginRight: '8px'
                  }}
                >
                  {permissions.every(p => rolePermissions[p.id]) ? 'Unselect All' : 'Select All'}
                </button>
                
                <button
                  onClick={() => {
                    const modulePermissions = {}
                    permissions.forEach(permission => {
                      modulePermissions[permission.id] = false
                    })
                    setRolePermissions(modulePermissions)
                  }}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    color: '#374151',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Clear All
                </button>
              </div>
              
              <div style={{ display: 'grid', gap: '12px' }}>
                {permissions.map((permission) => (
                  <div key={permission.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    backgroundColor: '#f9fafb'
                  }}>
                    <input
                      type="checkbox"
                      id={`permission-${permission.id}`}
                      checked={rolePermissions[permission.id] || false}
                      onChange={(e) => {
                        setRolePermissions(prev => ({
                          ...prev,
                          [permission.id]: e.target.checked
                        }))
                      }}
                      style={{ marginRight: '12px' }}
                    />
                    <label htmlFor={`permission-${permission.id}`} style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      flex: 1
                    }}>
                      {permission.name}
                    </label>
                    <span style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      backgroundColor: '#e5e7eb',
                      padding: '4px 8px',
                      borderRadius: '4px'
                    }}>
                      {permission.module}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Summary */}
              <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#f0f9ff',
                border: '1px solid #0ea5e9',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#0c4a6e', marginBottom: '4px' }}>
                  Permission Summary
                </div>
                <div style={{ fontSize: '12px', color: '#0c4a6e' }}>
                  {Object.values(rolePermissions).filter(Boolean).length} of {permissions.length} permissions selected
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowPermissionModal(false)
                  setEditingRole(null)
                  setRolePermissions({})
                }}
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
                onClick={async () => {
                  const selectedPermissions = Object.keys(rolePermissions)
                    .filter(key => rolePermissions[key])
                    .map(key => parseInt(key))
                  
                  const result = await updateRolePermissions(editingRole.id, selectedPermissions)
                  if (result.success) {
                    setShowPermissionModal(false)
                    setEditingRole(null)
                    setRolePermissions({})
                  }
                }}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Save Permissions
              </button>
            </div>
          </div>
        </div>
      )}
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
              
              {/* User Role Info */}
              {currentUser && (
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
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    {currentUser.full_name || currentUser.username}
                  </span>
                  <span style={{ 
                    fontSize: '11px', 
                    color: '#3b82f6',
                    fontWeight: '500',
                    textTransform: 'uppercase'
                  }}>
                    {currentUser.role_name || currentUser.user_type || 'User'}
                  </span>
                  <span style={{ fontSize: '10px', color: '#6b7280' }}>⚙️</span>
                </div>
              )}
              
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
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
              { id: 'faq', label: '📄 FAQ Management', icon: '📄' },
              { id: 'tickets', label: '🎫 Tickets', icon: '🎫' },
              { id: 'livechat', label: '💬 Live Chat', icon: '💬' },
              { id: 'chatmanagement', label: '⚙️ Chat Management', icon: '⚙️' },
              { id: 'reports', label: '📋 Reports', icon: '📋' },
              { id: 'users', label: '👥 User Management', icon: '👥' }
            ].filter(tab => hasAccess(tab.id)).map((tab) => (
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
                  setNewFAQ({ question: '', answer: '', category: 'General', customCategory: '' })
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
                  <option value="Custom">Custom</option>
                </select>
              </div>

              {newFAQ.category === 'Custom' && (
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                    Custom Category Name
                  </label>
                  <input
                    type="text"
                    value={newFAQ.customCategory}
                    onChange={(e) => setNewFAQ({ ...newFAQ, customCategory: e.target.value })}
                    placeholder="Enter custom category name..."
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }}
                    required={newFAQ.category === 'Custom'}
                  />
                </div>
              )}

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
                    setNewFAQ({ question: '', answer: '', category: 'General', customCategory: '' })
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
                  disabled={!newFAQ.question.trim() || !newFAQ.answer.trim() || (newFAQ.category === 'Custom' && !newFAQ.customCategory.trim())}
                  style={{
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '14px',
                    cursor: (!newFAQ.question.trim() || !newFAQ.answer.trim() || (newFAQ.category === 'Custom' && !newFAQ.customCategory.trim())) ? 'not-allowed' : 'pointer',
                    opacity: (!newFAQ.question.trim() || !newFAQ.answer.trim() || (newFAQ.category === 'Custom' && !newFAQ.customCategory.trim())) ? 0.6 : 1
                  }}
                >
                  {editingFAQ ? 'Update FAQ' : 'Create FAQ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Export Modal */}
      {showExportModal && (
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
            padding: '32px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', margin: '0 0 24px' }}>
              📤 Export FAQs
            </h3>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px', display: 'block' }}>
                Export Format
              </label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="json">JSON (.json)</option>
                <option value="csv">CSV (.csv)</option>
              </select>
            </div>

            <div style={{ 
              backgroundColor: '#f0f9ff', 
              padding: '16px', 
              borderRadius: '8px', 
              marginBottom: '20px' 
            }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: '0 0 8px' }}>
                Export Information:
              </h4>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '0' }}>
                All FAQs will be exported in {exportFormat.toUpperCase()} format. 
                The file will be automatically downloaded to your device.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowExportModal(false)}
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
                onClick={handleExportFAQs}
                style={{
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Export FAQs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {currentUser && (
        <ProfileModal
          user={currentUser}
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          onUpdate={(updatedUser) => {
            setCurrentUser(updatedUser)
            localStorage.setItem('admin_user_data', JSON.stringify(updatedUser))
          }}
        />
      )}
    </div>
  )

}

export default AdminApp







