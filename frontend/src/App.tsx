import React from 'react'
import ChatWidget from './components/ChatWidget'
import './index.css'

export default function App() {
  return (
    <div>
      {/* Only Chat Widget for Website Visitors */}
      <div className="fixed bottom-6 right-6">
        <ChatWidget />
      </div>
    </div>
  )
}


