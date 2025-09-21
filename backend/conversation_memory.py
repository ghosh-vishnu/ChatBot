from __future__ import annotations

import json
import os
from typing import Dict, List, Optional
from datetime import datetime, timedelta

class ConversationMemory:
    """Advanced conversation memory system"""
    
    def __init__(self, max_sessions: int = 100, session_timeout: int = 3600):
        self.max_sessions = max_sessions
        self.session_timeout = session_timeout
        self.sessions: Dict[str, Dict] = {}
        self.memory_file = "conversation_memory.json"
        self.load_memory()
    
    def load_memory(self):
        """Load conversation memory from file"""
        try:
            if os.path.exists(self.memory_file):
                with open(self.memory_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.sessions = data.get('sessions', {})
        except Exception as e:
            print(f"Error loading memory: {e}")
            self.sessions = {}
    
    def save_memory(self):
        """Save conversation memory to file"""
        try:
            data = {
                'sessions': self.sessions,
                'last_updated': datetime.now().isoformat()
            }
            with open(self.memory_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving memory: {e}")
    
    def get_session_id(self, user_id: str = "default") -> str:
        """Get or create session ID for user"""
        return f"session_{user_id}"
    
    def add_to_conversation(self, user_id: str, query: str, response: str, intent: str = "general"):
        """Add conversation turn to memory"""
        session_id = self.get_session_id(user_id)
        current_time = datetime.now()
        
        if session_id not in self.sessions:
            self.sessions[session_id] = {
                'user_id': user_id,
                'created_at': current_time.isoformat(),
                'last_activity': current_time.isoformat(),
                'conversation': [],
                'user_preferences': {},
                'context': {}
            }
        
        # Add conversation turn
        turn = {
            'timestamp': current_time.isoformat(),
            'query': query,
            'response': response,
            'intent': intent
        }
        
        self.sessions[session_id]['conversation'].append(turn)
        self.sessions[session_id]['last_activity'] = current_time.isoformat()
        
        # Keep only last 10 conversation turns
        if len(self.sessions[session_id]['conversation']) > 10:
            self.sessions[session_id]['conversation'] = self.sessions[session_id]['conversation'][-10:]
        
        # Clean up old sessions
        self.cleanup_old_sessions()
        
        # Save memory
        self.save_memory()
    
    def get_conversation_context(self, user_id: str) -> Dict:
        """Get conversation context for user"""
        session_id = self.get_session_id(user_id)
        
        if session_id not in self.sessions:
            return {'conversation': [], 'context': {}, 'preferences': {}}
        
        session = self.sessions[session_id]
        
        # Check if session is still valid
        last_activity = datetime.fromisoformat(session['last_activity'])
        if datetime.now() - last_activity > timedelta(seconds=self.session_timeout):
            return {'conversation': [], 'context': {}, 'preferences': {}}
        
        return {
            'conversation': session['conversation'][-5:],  # Last 5 turns
            'context': session.get('context', {}),
            'preferences': session.get('user_preferences', {})
        }
    
    def update_user_preference(self, user_id: str, key: str, value: str):
        """Update user preferences"""
        session_id = self.get_session_id(user_id)
        
        if session_id not in self.sessions:
            self.sessions[session_id] = {
                'user_id': user_id,
                'created_at': datetime.now().isoformat(),
                'last_activity': datetime.now().isoformat(),
                'conversation': [],
                'user_preferences': {},
                'context': {}
            }
        
        self.sessions[session_id]['user_preferences'][key] = value
        self.sessions[session_id]['last_activity'] = datetime.now().isoformat()
        self.save_memory()
    
    def update_context(self, user_id: str, key: str, value: str):
        """Update conversation context"""
        session_id = self.get_session_id(user_id)
        
        if session_id not in self.sessions:
            self.sessions[session_id] = {
                'user_id': user_id,
                'created_at': datetime.now().isoformat(),
                'last_activity': datetime.now().isoformat(),
                'conversation': [],
                'user_preferences': {},
                'context': {}
            }
        
        self.sessions[session_id]['context'][key] = value
        self.sessions[session_id]['last_activity'] = datetime.now().isoformat()
        self.save_memory()
    
    def cleanup_old_sessions(self):
        """Remove old sessions"""
        current_time = datetime.now()
        sessions_to_remove = []
        
        for session_id, session in self.sessions.items():
            last_activity = datetime.fromisoformat(session['last_activity'])
            if current_time - last_activity > timedelta(seconds=self.session_timeout):
                sessions_to_remove.append(session_id)
        
        for session_id in sessions_to_remove:
            del self.sessions[session_id]
        
        # Limit number of sessions
        if len(self.sessions) > self.max_sessions:
            # Remove oldest sessions
            sorted_sessions = sorted(
                self.sessions.items(),
                key=lambda x: x[1]['last_activity']
            )
            for session_id, _ in sorted_sessions[:len(self.sessions) - self.max_sessions]:
                del self.sessions[session_id]
    
    def get_conversation_summary(self, user_id: str) -> str:
        """Get conversation summary for context"""
        context = self.get_conversation_context(user_id)
        conversation = context['conversation']
        
        if not conversation:
            return ""
        
        summary_parts = []
        for turn in conversation[-3:]:  # Last 3 turns
            summary_parts.append(f"User: {turn['query'][:50]}...")
            summary_parts.append(f"Bot: {turn['response'][:50]}...")
        
        return " | ".join(summary_parts)

# Global conversation memory instance
conversation_memory = ConversationMemory()
