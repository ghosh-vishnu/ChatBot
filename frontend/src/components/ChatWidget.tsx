import React, { useEffect, useRef, useState } from 'react'

type Suggestion = {
  text: string
  type: string
  category: string
  action: string
}

type Message = { 
  id: string
  role: 'user' | 'assistant'
  content: string
  suggestions?: Suggestion[]
  timestamp?: Date
}

const ChatWidget: React.FC = () => {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [showPopup, setShowPopup] = useState(false)
  const [popupMessage, setPopupMessage] = useState('')
  const [isAnimating, setIsAnimating] = useState(false)
  const [typingSuggestions, setTypingSuggestions] = useState<string[]>([])
  const [showTypingSuggestions, setShowTypingSuggestions] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const popupTimeoutRef = useRef<number | null>(null)
  const animationTimeoutRef = useRef<number | null>(null)

  const quickQuestions = [
    "What services do you offer?",
    "How can I get started?",
    "What are your pricing plans?",
    "Do you provide training?",
    "How can I contact support?"
  ]

  // Comprehensive suggestions for overall project
  const commonQuestions = [
    // Services & Solutions
    "What services do you offer?",
    "Do you provide web development?",
    "Do you develop mobile apps?",
    "Do you offer AI/ML solutions?",
    "Do you provide DevOps services?",
    "Do you offer data analytics?",
    "Do you create custom software?",
    "Do you provide cloud solutions?",
    "Do you offer digital transformation?",
    "Do you provide e-commerce development?",
    
    // Training & Internships
    "Do you offer internships?",
    "What training programs do you have?",
    "Do you provide placement assistance?",
    "What programming languages do you teach?",
    "Do you have web development courses?",
    "Is there Android app development training?",
    "Do you offer AI/ML training?",
    "What analytics tools do you teach?",
    "Do you provide DevOps training?",
    "Can I get certified after training?",
    
    // Products & Solutions
    "Do you provide HRMS software?",
    "Do you provide CRM systems?",
    "Do you provide LMS platforms?",
    "Do you provide hospital management software?",
    "Do you provide school management software?",
    "Do you provide inventory management?",
    "Do you provide ERP systems?",
    "Do you provide document management?",
    "Do you provide payment gateway integration?",
    "Do you provide API development?",
    
    // Company Information
    "What is your company location?",
    "Which cities do you have offices in?",
    "How long has your company been in business?",
    "What industries do you serve?",
    "Do you have multiple offices?",
    "Are you based in India?",
    
    // Support & Pricing
    "Do you provide 24/7 support?",
    "What are your pricing plans?",
    "Do you sign NDA?",
    "How long does development take?",
    "Do you provide free consultation?",
    "Do you charge hourly or fixed price?",
    "Do you provide ongoing support?",
    "Do you maintain software after delivery?",
    "Do you have AMC packages?",
    "Can you handle bug fixes?",
    
    // Technical Questions
    "What technologies do you use?",
    "Do you work with React?",
    "Do you work with Python?",
    "Do you work with AWS?",
    "Do you work with Azure?",
    "Do you work with GCP?",
    "Do you provide database solutions?",
    "Do you offer API integration?",
    "Do you provide security solutions?",
    "Do you offer performance optimization?",
    
    // General Queries
    "How can I get started?",
    "What is the development process?",
    "Do you provide project management?",
    "How do I contact you?",
    "Do you have a portfolio?",
    "Can you show me examples?",
    "Do you provide documentation?",
    "Do you offer maintenance?",
    "What is your success rate?",
    "Do you have testimonials?"
  ]

  // Auto popup message effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setPopupMessage("How May I help you?")
      setShowPopup(true)
      
      // Auto hide popup after 5 seconds
      popupTimeoutRef.current = setTimeout(() => {
        setShowPopup(false)
      }, 5000)
    }, 3000)

    return () => {
      clearTimeout(timer)
      if (popupTimeoutRef.current) {
        clearTimeout(popupTimeoutRef.current)
      }
    }
  }, [])

  // Animation effect for chatbot button
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true)
      animationTimeoutRef.current = setTimeout(() => {
        setIsAnimating(false)
      }, 2000)
    }, 10000) // Animate every 10 seconds

    return () => {
      clearInterval(interval)
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current)
      }
    }
  }, [])

  const scrollToBottom = () => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user', 
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setIsTyping(true)
    setShowSuggestions(false)
    
    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userMessage.content
        })
      })

      if (!response.ok) {
        throw new Error('Network response was not ok')
      }

      const data = await response.json()
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant', 
        content: data.answer,
        suggestions: data.suggestions || [],
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
          role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
      setIsTyping(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (showTypingSuggestions && typingSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedSuggestionIndex(prev => 
          prev < typingSuggestions.length - 1 ? prev + 1 : 0
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : typingSuggestions.length - 1
        )
      } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
        e.preventDefault()
        handleTypingSuggestionClick(typingSuggestions[selectedSuggestionIndex])
      } else if (e.key === 'Escape') {
        setShowTypingSuggestions(false)
        setSelectedSuggestionIndex(-1)
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleSuggestionClick = (suggestion: Suggestion) => {
    setInput(suggestion.text)
    setShowSuggestions(false)
    setTimeout(() => sendMessage(), 100)
  }

  // Handle typing suggestions with smart filtering
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInput(value)
    setSelectedSuggestionIndex(-1)
    
    if (value.length > 2) {
      const filtered = commonQuestions.filter(question => {
        const questionLower = question.toLowerCase()
        const valueLower = value.toLowerCase()
        
        // Check for exact word matches first
        const words = valueLower.split(' ')
        const hasWordMatch = words.some(word => 
          questionLower.includes(word) && word.length > 2
        )
        
        // Check for partial matches
        const hasPartialMatch = questionLower.includes(valueLower)
        
        return hasWordMatch || hasPartialMatch
      })
      
      // Sort by relevance (exact matches first, then partial matches)
      const sorted = filtered.sort((a, b) => {
        const aLower = a.toLowerCase()
        const bLower = b.toLowerCase()
        const valueLower = value.toLowerCase()
        
        if (aLower.startsWith(valueLower) && !bLower.startsWith(valueLower)) return -1
        if (!aLower.startsWith(valueLower) && bLower.startsWith(valueLower)) return 1
        return aLower.localeCompare(bLower)
      })
      
      setTypingSuggestions(sorted.slice(0, 5)) // Show top 5 suggestions
      setShowTypingSuggestions(sorted.length > 0)
    } else {
      setTypingSuggestions([])
      setShowTypingSuggestions(false)
    }
  }

  const handleTypingSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
    setShowTypingSuggestions(false)
    setTypingSuggestions([])
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!open && (
        <div className="relative">
          <div className={`absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 opacity-75 ${
            isAnimating ? 'animate-ping' : ''
          }`}></div>
          
          <div className={`${isAnimating ? 'floating-animation' : ''}`}>
        <button
          onClick={() => setOpen(true)}
              className="relative advanced-button pulse-glow text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 flex items-center space-x-2 group neon-glow"
        >
              <svg className={`w-6 h-6 ${isAnimating ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
              <span className="hidden group-hover:block text-sm font-medium animate-pulse">Chat with us</span>
            </button>
          </div>

          {showPopup && (
            <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 p-3 max-w-xs animate-fadeIn">
              <div className="flex items-start space-x-2">
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                  <img 
                    src="/chatbot-profile.svg" 
                    alt="Chatbot Profile" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-800 font-medium">{popupMessage}</p>
                  <div className="flex justify-end mt-1">
                    <button
                      onClick={() => setShowPopup(false)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      ✕
        </button>
                  </div>
                </div>
                <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
              </div>
            </div>
          )}
        </div>
      )}

      {open && (
        <div className="w-96 h-[600px] advanced-chat-window flex flex-col overflow-hidden animate-slideUp">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full overflow-hidden animate-pulse">
                <img 
                  src="/chatbot-profile.svg" 
                  alt="Chatbot Profile" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="font-semibold">Venturing Digitally</h3>
                <p className="text-xs text-blue-100">AI Assistant</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white transition-colors hover:scale-110 transform duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 custom-scrollbar">
            {messages.length === 0 && showSuggestions && (
              <div className="space-y-4 animate-fadeIn">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-3 animate-bounce">
                    <img 
                      src="/chatbot-profile.svg" 
                      alt="Chatbot Profile" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-2">Welcome to Venturing Digitally!</h4>
                  <p className="text-sm text-gray-600">I'm your AI assistant. How can I help you today?</p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 font-medium">Quick questions:</p>
                  <div className="grid grid-cols-1 gap-2">
                    {quickQuestions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setInput(question)
                          setShowSuggestions(false)
                          setTimeout(() => sendMessage(), 100)
                        }}
                        className="text-left p-3 text-sm bg-white hover:bg-blue-50 text-gray-700 rounded-lg border border-gray-200 hover:border-blue-300 transition-all duration-200 hover:shadow-sm hover:scale-105 transform"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((m, index) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`} style={{ animationDelay: `${index * 0.1}s` }}>
                <div className={`max-w-[80%] ${m.role === 'user' ? 'order-2' : 'order-1'}`}>
                  <div className={`flex items-end space-x-2 ${m.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    {m.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 animate-pulse">
                        <img 
                          src="/chatbot-profile.svg" 
                          alt="Chatbot Profile" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className={`px-4 py-3 transition-all duration-300 hover:scale-105 transform ${
                      m.role === 'user' 
                        ? 'message-bubble-user' 
                        : 'message-bubble-assistant'
                    }`}>
                      <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                      {m.timestamp && (
                        <div className={`text-xs mt-1 ${
                          m.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {formatTime(m.timestamp)}
                        </div>
                      )}
                    </div>
                    {m.role === 'user' && (
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  {m.role === 'assistant' && m.suggestions && m.suggestions.length > 0 && (
                    <div className="mt-3 ml-10 space-y-2 animate-fadeIn">
                      <p className="text-xs text-gray-500 font-medium">Suggested questions:</p>
                      <div className="grid grid-cols-1 gap-1">
                        {m.suggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="suggestion-card text-left text-xs"
                          >
                            {suggestion.text}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start animate-fadeIn">
                <div className="flex items-end space-x-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden animate-pulse">
                    <img 
                      src="/chatbot-profile.svg" 
                      alt="Chatbot Profile" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="bg-white px-4 py-3 rounded-2xl border border-gray-200">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <div className="relative">
                <input
                  ref={inputRef}
                  value={input}
                    onChange={handleInputChange}
                  onKeyDown={handleKey}
                  placeholder="Type your message..."
                    className="advanced-input w-full text-sm"
                  disabled={loading}
                />
                  
                  {/* Typing Suggestions Dropdown */}
                  {showTypingSuggestions && typingSuggestions.length > 0 && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-64 overflow-y-auto z-10">
                      <div className="px-4 py-2 text-xs text-gray-500 bg-blue-50 border-b border-gray-200 font-medium">
                        Smart Suggestions ({typingSuggestions.length} found)
                      </div>
                      {typingSuggestions.map((suggestion, index) => {
                        // Determine category icon based on suggestion content
                        const getCategoryIcon = (text: string) => {
                          if (text.includes('training') || text.includes('internship') || text.includes('course')) {
                            return ''
                          } else if (text.includes('development') || text.includes('software') || text.includes('app')) {
                            return ''
                          } else if (text.includes('support') || text.includes('help') || text.includes('contact')) {
                            return ''
                          } else if (text.includes('pricing') || text.includes('cost') || text.includes('price')) {
                            return ''
                          } else if (text.includes('location') || text.includes('office') || text.includes('company')) {
                            return ''
                          } else if (text.includes('technology') || text.includes('AWS') || text.includes('React')) {
                            return '' 
                          } else {
                            return ''
                          }
                        }
                        
                        return (
                          <button
                            key={index}
                            onClick={() => handleTypingSuggestionClick(suggestion)}
                            className={`w-full text-left px-4 py-3 text-sm text-gray-700 border-b border-gray-100 last:border-b-0 transition-colors ${
                              index === selectedSuggestionIndex 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'hover:bg-blue-50'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-lg">{getCategoryIcon(suggestion)}</span>
                              <span className="flex-1">{suggestion}</span>
                              {index === selectedSuggestionIndex && (
                                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              )}
                            </div>
                          </button>
                        )
                      })}
                      <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-t border-gray-200">
                        Use ↑↓ arrows to navigate, Enter to select, Esc to close
                      </div>
                    </div>
                  )}
                </div>
                {input && (
                  <button
                    onClick={() => setInput('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors hover:scale-110"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="advanced-button pulse-glow text-white p-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChatWidget