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
    """Find matching FAQ using improved keyword matching"""
    query_lower = query.lower().strip()
    
    # Remove common words that don't add meaning
    stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'do', 'does', 'did', 'are', 'is', 'was', 'were', 'have', 'has', 'had', 'will', 'would', 'could', 'should', 'can', 'may', 'might', 'must', 'shall'}
    
    # Extract meaningful keywords from query
    query_words = [word for word in query_lower.split() if word not in stop_words and len(word) > 2]
    
    best_match = None
    best_score = 0
    
    for faq in faqs:
        question_lower = faq.get('question', '').lower()
        answer_lower = faq.get('answer', '').lower()
        
        # Extract meaningful keywords from FAQ question
        question_words = [word for word in question_lower.split() if word not in stop_words and len(word) > 2]
        
        # Calculate match score
        score = 0
        
        # Exact phrase match (highest priority)
        if query_lower in question_lower:
            score += 100
        
        # Word-by-word matching
        for query_word in query_words:
            if query_word in question_words:
                score += 10
            elif query_word in answer_lower:
                score += 5
        
        # Partial word matching for technical terms
        for query_word in query_words:
            for question_word in question_words:
                if query_word in question_word or question_word in query_word:
                    score += 3
        
        # Check for semantic matches
        semantic_matches = {
            'services': ['service', 'offer', 'provide', 'deliver', 'solution'],
            'support': ['help', 'assist', 'maintenance', 'support', 'service'],
            'pricing': ['price', 'cost', 'rate', 'fee', 'budget'],
            'contact': ['reach', 'call', 'email', 'connect', 'get in touch'],
            'technology': ['tech', 'stack', 'framework', 'platform', 'tool']
        }
        
        for category, synonyms in semantic_matches.items():
            if any(word in query_words for word in [category] + synonyms):
                if any(word in question_words for word in [category] + synonyms):
                    score += 15
        
        # Update best match
        if score > best_score:
            best_score = score
            best_match = faq
    
    # Only return match if score is above threshold
    if best_score >= 5:
        print(f"FAQ Match: '{best_match['question']}' (Score: {best_score})")
        return best_match
    
    return None

def _generate_unknown_question_response(query: str, analysis: dict) -> str:
    """Generate response for unknown questions"""
    return f"""I understand you're asking about "{query}". While I don't have specific information about this topic in my knowledge base, I'd be happy to help you in other ways:

• **Create a Support Ticket**: Our team can provide detailed assistance
• **Contact Us Directly**: Get personalized help from our experts  
• **Explore Our Services**: Learn about what we offer

Would you like me to help you with any of these options?"""

@router.get("/faq-suggestions")
async def get_faq_suggestions(limit: int = 6):
    """Get FAQ suggestions for the chat widget"""
    try:
        faqs = load_faqs()
        
        # Get random FAQs up to the limit
        import random
        suggestions = []
        
        if faqs:
            # Shuffle and take up to limit
            random.shuffle(faqs)
            for faq in faqs[:limit]:
                suggestions.append({
                    "text": faq.get("question", ""),
                    "id": faq.get("id", 0)
                })
        
        return {"suggestions": suggestions}
    except Exception as e:
        print(f"Error getting FAQ suggestions: {e}")
        return {"suggestions": []}

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
        else:
            print(f"No FAQ match found for: '{req.query}'")
            # If no FAQ match, offer both ticket creation and live chat
            return ChatResponse(
                answer=f"""I couldn't find specific information about "{req.query}" in my knowledge base.

I can help you in two ways:

1. **Create a Support Ticket** - Our team will respond within 24 hours
2. **Chat Now** - Get immediate help from our support team (if available)

Which option would you prefer?""",
                sources=["Support System"],
                suggestions=[
                    {
                        "text": "Chat Now",
                        "type": "action",
                        "category": "live_chat",
                        "action": "start_live_chat"
                    },
                    {
                        "text": "Create Support Ticket",
                        "type": "action",
                        "category": "ticket",
                        "action": "create_ticket"
                    },
                    {
                        "text": "Contact Our Team",
                        "type": "action", 
                        "category": "contact",
                        "action": "contact"
                    }
                ]
            )
    except Exception as e:
        print(f"FAQ check error: {e}")
        # If FAQ check fails, offer ticket creation
        return ChatResponse(
            answer=f"""I encountered an issue while searching for information about "{req.query}".

I'd be happy to help you by creating a support ticket so our team can provide detailed assistance.

Would you like me to help you create a support ticket?""",
            sources=["Support System"],
            suggestions=[
                {
                    "text": "Create Support Ticket",
                    "type": "action",
                    "category": "ticket",
                    "action": "create_ticket"
                },
                {
                    "text": "Contact Our Team",
                    "type": "action", 
                    "category": "contact",
                    "action": "contact"
                },
                {
                    "text": "View Our Services",
                    "type": "action",
                    "category": "services",
                    "action": "services"
                }
            ]
        )
