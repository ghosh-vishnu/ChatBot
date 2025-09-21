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
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  const sendMessage = async () => {
    const q = input.trim()
    if (!q || loading) return
    
    const userMsg: Message = { 
      id: crypto.randomUUID(), 
      role: 'user', 
      content: q,
      timestamp: new Date()
    }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setLoading(true)
    setIsTyping(true)
    
    try {
      const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })
      if (!res.ok) throw new Error('Network error')
      const data = await res.json()
      const answer: string = data.answer ?? 'Sorry, I could not find this information on our website.'
      const suggestions: Suggestion[] = data.suggestions ?? []
      
      // Simulate typing effect
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setMessages((m) => [...m, { 
        id: crypto.randomUUID(), 
        role: 'assistant', 
        content: answer,
        suggestions: suggestions,
        timestamp: new Date()
      }])
    } catch (e) {
      setMessages((m) => [
        ...m,
        { 
          id: crypto.randomUUID(), 
          role: 'assistant', 
          content: 'Sorry, I could not find this information on our website.',
          timestamp: new Date()
        },
      ])
    } finally {
      setLoading(false)
      setIsTyping(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleSuggestionClick = (suggestion: Suggestion) => {
    setInput(suggestion.text)
    setShowSuggestions(false)
    setTimeout(() => {
      sendMessage()
    }, 100)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const quickQuestions = [
    "What services do you offer?",
    "How can I contact you?",
    "What technologies do you use?",
    "Do you provide support?",
    "What's your pricing?",
    "Tell me about your company"
  ]

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat Toggle Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 flex items-center space-x-2 group"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="hidden group-hover:block text-sm font-medium">Chat with us</span>
        </button>
      )}

      {/* Chat Window */}
      {open && (
        <div className="w-96 h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold">Venturing Digitally</h3>
                <p className="text-xs text-blue-100">AI Assistant</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 custom-scrollbar">
            {messages.length === 0 && showSuggestions && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
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
                        className="text-left p-3 text-sm bg-white hover:bg-blue-50 text-gray-700 rounded-lg border border-gray-200 hover:border-blue-300 transition-all duration-200 hover:shadow-sm"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${m.role === 'user' ? 'order-2' : 'order-1'}`}>
                  <div className={`flex items-end space-x-2 ${m.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    {m.role === 'assistant' && (
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                      </div>
                    )}
                    <div className={`px-4 py-3 rounded-2xl ${
                      m.role === 'user' 
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' 
                        : 'bg-white text-gray-800 border border-gray-200'
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
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  {/* Display suggestions for assistant messages */}
                  {m.role === 'assistant' && m.suggestions && m.suggestions.length > 0 && (
                    <div className="mt-3 ml-10 space-y-2">
                      <p className="text-xs text-gray-500 font-medium">Suggested questions:</p>
                      <div className="grid grid-cols-1 gap-1">
                        {m.suggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="text-left p-2 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 hover:border-blue-300 transition-all duration-200 hover:shadow-sm"
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

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-end space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
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

          {/* Input */}
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Type your message..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  disabled={loading}
                />
                {input && (
                  <button
                    onClick={() => setInput('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 rounded-full hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
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