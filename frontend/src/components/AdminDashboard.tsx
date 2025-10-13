import React, { useState, useEffect } from 'react'
import AnalyticsDashboard from './AdminComponents/AnalyticsDashboard'
import AIModelManagement from './AdminComponents/AIModelManagement'
import UserManagement from './AdminComponents/UserManagement'
import ContentManagement from './AdminComponents/ContentManagement'
import SystemMonitoring from './AdminComponents/SystemMonitoring'

interface ChatSession {
  id: string
  user_id: string
  messages: number
  duration: number
  start_time: string
  end_time?: string
  satisfaction?: number
  location?: string
  device?: string
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
  avg_session_duration: number
  top_locations: Array<{location: string, count: number}>
  device_breakdown: Array<{device: string, percentage: number}>
}

interface SystemMetrics {
  server_health: 'healthy' | 'warning' | 'critical'
  response_time: number
  error_rate: number
  uptime: number
  memory_usage: number
  cpu_usage: number
}

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [faqItems, setFaqItems] = useState<FAQItem[]>([])
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null)
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null)
  const [isLive, setIsLive] = useState(true)

  // Mock data - in real app, this would come from API
  useEffect(() => {
    // Simulate real-time data updates
    const interval = setInterval(() => {
      if (isLive) {
        // Update mock data
        setUserAnalytics({
          total_users: Math.floor(Math.random() * 1000) + 500,
          active_users: Math.floor(Math.random() * 100) + 50,
          new_users_today: Math.floor(Math.random() * 50) + 10,
          avg_session_duration: Math.floor(Math.random() * 300) + 120,
          top_locations: [
            { location: 'Mumbai', count: 45 },
            { location: 'Delhi', count: 38 },
            { location: 'Bangalore', count: 32 },
            { location: 'Pune', count: 28 }
          ],
          device_breakdown: [
            { device: 'Mobile', percentage: 65 },
            { device: 'Desktop', percentage: 30 },
            { device: 'Tablet', percentage: 5 }
          ]
        })

        setSystemMetrics({
          server_health: 'healthy',
          response_time: Math.floor(Math.random() * 200) + 50,
          error_rate: Math.random() * 2,
          uptime: 99.9,
          memory_usage: Math.random() * 30 + 40,
          cpu_usage: Math.random() * 20 + 10
        })
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [isLive])

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'chats', label: 'Live Chats', icon: '💬' },
    { id: 'faq', label: 'FAQ Management', icon: '📝' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'ai', label: 'AI Model', icon: '🤖' },
    { id: 'content', label: 'Content', icon: '📚' },
    { id: 'integrations', label: 'Integrations', icon: '🔗' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'reports', label: 'Reports', icon: '📋' },
    { id: 'monitoring', label: 'Monitoring', icon: '⚙️' }
  ]

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <span className="text-2xl">👥</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{userAnalytics?.total_users || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <span className="text-2xl">💬</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Chats</p>
              <p className="text-2xl font-bold text-gray-900">{userAnalytics?.active_users || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <span className="text-2xl">⚡</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Response Time</p>
              <p className="text-2xl font-bold text-gray-900">{systemMetrics?.response_time || 0}ms</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <span className="text-2xl">📈</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">94.2%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Locations</h3>
          <div className="space-y-3">
            {userAnalytics?.top_locations.map((location, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{location.location}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${(location.count / 50) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{location.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Breakdown</h3>
          <div className="space-y-3">
            {userAnalytics?.device_breakdown.map((device, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{device.device}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${device.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{device.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              systemMetrics?.server_health === 'healthy' 
                ? 'bg-green-100 text-green-800' 
                : systemMetrics?.server_health === 'warning'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {systemMetrics?.server_health === 'healthy' ? 'Healthy' : 'Warning'} 
              {systemMetrics?.server_health?.toUpperCase()}
            </div>
            <p className="text-sm text-gray-600 mt-1">Server Status</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{systemMetrics?.uptime || 0}%</div>
            <p className="text-sm text-gray-600">Uptime</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{systemMetrics?.error_rate?.toFixed(2) || 0}%</div>
            <p className="text-sm text-gray-600">Error Rate</p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderLiveChats = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Live Chat Sessions</h2>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
          <span className="text-sm text-gray-600">{isLive ? 'Live' : 'Paused'}</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Messages</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {chatSessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {session.user_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {session.messages}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {Math.floor(session.duration / 60)}m {session.duration % 60}s
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {session.location || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {session.device || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      session.end_time ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {session.end_time ? 'Completed' : 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-3">View</button>
                    <button className="text-red-600 hover:text-red-900">End</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  const renderFAQManagement = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">FAQ Management</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          Add New FAQ
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Views</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {faqItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {item.question}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.views}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.success_rate}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(item.last_updated).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                    <button className="text-red-600 hover:text-red-900">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview()
      case 'chats':
        return renderLiveChats()
      case 'faq':
        return renderFAQManagement()
      case 'analytics':
        return <AnalyticsDashboard />
      case 'users':
        return <UserManagement />
      case 'ai':
        return <AIModelManagement />
      case 'content':
        return <ContentManagement />
      case 'monitoring':
        return <SystemMonitoring />
      default:
        return (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🚧</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Coming Soon</h3>
            <p className="text-gray-600">This feature is under development</p>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600">Venturing Digitally Chatbot Management</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className="text-sm text-gray-600">System Status</span>
              </div>
              <button 
                onClick={() => setIsLive(!isLive)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  isLive 
                    ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                }`}
              >
                {isLive ? 'Pause Updates' : 'Resume Updates'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-800'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {renderTabContent()}
      </div>
    </div>
  )
}

export default AdminDashboard
