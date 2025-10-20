from __future__ import annotations

from typing import List
from fastapi import APIRouter
from schemas import ChatRequest, ChatResponse
import json
import os

router = APIRouter()

# Configuration constants
OPENAI_API_KEY = "sk-proj-your-key-here"
CHAT_MODEL = "gpt-3.5-turbo"
TOP_K = 5
MAX_CONTEXT_CHARS = 2000

def load_faqs():
    """Load FAQs from JSON file (same as admin dashboard)"""
    try:
        faqs_file = "data/faqs.json"
        if os.path.exists(faqs_file):
            with open(faqs_file, 'r') as f:
                return json.load(f)
        return []
    except Exception as e:
        print(f"Error loading FAQs: {e}")
        return []

def save_faqs(faqs: list):
    """Save FAQs to JSON file"""
    try:
        os.makedirs("data", exist_ok=True)
        faqs_file = "data/faqs.json"
        with open(faqs_file, 'w') as f:
            json.dump(faqs, f, indent=2)
    except Exception as e:
        print(f"Error saving FAQs: {e}")

def find_matching_faq(query: str, faqs: list) -> dict:
    """Find matching FAQ using simple keyword matching"""
    query_lower = query.lower()
    
    # Simple keyword matching
    for faq in faqs:
        question_lower = faq.get('question', '').lower()
        answer_lower = faq.get('answer', '').lower()
        
        # Check if query keywords match FAQ question or answer
        query_words = query_lower.split()
        question_words = question_lower.split()
        
        # Count matching words
        matches = sum(1 for word in query_words if word in question_words)
        
        # If more than 50% of query words match, consider it a match
        if matches > 0 and matches / len(query_words) >= 0.3:
            return faq
    
    return None

def _generate_unknown_question_response(query: str, analysis: dict) -> str:
    """Generate response for unknown questions"""
    return f"""I understand you're asking about "{query}". While I don't have specific information about this topic in my knowledge base, I'd be happy to help you in other ways:

• **Create a Support Ticket**: Our team can provide detailed assistance
• **Contact Us Directly**: Get personalized help from our experts  
• **Explore Our Services**: Learn about what we offer

Would you like me to help you with any of these options?"""

@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Main chat endpoint"""
    print(f"Chat request: '{req.query}'")
    
    # Generate user ID for conversation tracking
    user_id = "anonymous_user"
    
    # Load FAQs
    faqs = load_faqs()
    
    # Step 0: Check for greetings first (before FAQ check)
    greeting_words = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "namaste", "namaskar"]
    query_lower = req.query.lower().strip()
    
    if any(greeting in query_lower for greeting in greeting_words):
        print(f"Detected greeting: '{req.query}'")
        # Get conversation context
        from conversation_memory import conversation_memory
        context = conversation_memory.get_conversation_context(user_id)
        conversation_summary = conversation_memory.get_conversation_summary(user_id)
        
        # Generate greeting response
        from venturing_ai_model import venturing_ai
        analysis = venturing_ai.analyze_query(req.query)
        answer = venturing_ai.generate_greeting_response(analysis['sentiment'], req.query)
        
        # Generate suggestions
        from suggestion_engine import suggestion_engine
        conversation_history = context.get('conversation', [])
        suggestions = suggestion_engine.generate_suggestions(
            req.query, 
            analysis['intent'], 
            analysis['services'], 
            analysis['industries'],
            conversation_history
        )
        
        # Store conversation in memory
        conversation_memory.add_to_conversation(
            user_id, req.query, answer, analysis['intent']
        )
        
        return ChatResponse(
            answer=answer,
            sources=["Venturing Digitally"],
            suggestions=suggestions
        )
    
    # Step 1: Check FAQs for non-greeting queries
    faq_response = None
    try:
        print(f"Checking FAQs for: '{req.query}'")
        matching_faq = find_matching_faq(req.query, faqs)
        
        if matching_faq:
            print(f"Found matching FAQ: {matching_faq['question']}")
            # Update views count in JSON file
            matching_faq["views"] = matching_faq.get("views", 0) + 1
            save_faqs(faqs)
            
            # Return the FAQ answer
            category_name = matching_faq.get("customCategory") if matching_faq.get("category") == "Custom" else matching_faq.get("category", "General")
            
            return ChatResponse(
                answer=matching_faq['answer'],
                sources=[f"FAQ - {category_name}"],
                suggestions=[]
            )
    except Exception as e:
        print(f"FAQ check error: {e}")
    
    # Step 2: Generate AI response for non-FAQ queries
    try:
        from conversation_memory import conversation_memory
        from venturing_ai_model import venturing_ai
        from suggestion_engine import suggestion_engine
        
        # Get conversation context
        context = conversation_memory.get_conversation_context(user_id)
        conversation_summary = conversation_memory.get_conversation_summary(user_id)
        
        # Generate AI response
        analysis = venturing_ai.analyze_query(req.query)
        answer = venturing_ai.generate_response(
            req.query, 
            analysis['intent'], 
            analysis['services'], 
            analysis['industries'],
            context.get('conversation', []),
            conversation_summary
        )
        
        # Generate suggestions
        suggestions = suggestion_engine.generate_suggestions(
            req.query, 
            analysis['intent'], 
            analysis['services'], 
            analysis['industries'],
            context.get('conversation', [])
        )
        
        # Store conversation in memory
        conversation_memory.add_to_conversation(
            user_id, req.query, answer, analysis['intent']
        )
        
        return ChatResponse(
            answer=answer,
            sources=["Venturing Digitally AI"],
            suggestions=suggestions
        )
        
    except Exception as e:
        print(f"AI response error: {e}")
        return ChatResponse(
            answer="Sorry, I encountered an error. Please try again.",
            sources=[],
            suggestions=[]
        )
