from __future__ import annotations

from typing import List
from fastapi import APIRouter
from schemas import ChatRequest, ChatResponse
from faq_database import faq_db

router = APIRouter()

# Configuration constants
OPENAI_API_KEY = "sk-proj-your-key-here"
CHAT_MODEL = "gpt-3.5-turbo"
TOP_K = 5
MAX_CONTEXT_CHARS = 2000


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
        faqs = faq_db.get_all_faqs()
        
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
    
    # Load FAQs from database
    faqs = faq_db.get_all_faqs()
    
    # Step 0: Check for greetings first (before FAQ check)
    greeting_words = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "namaste", "namaskar"]
    query_lower = req.query.lower().strip()
    
    # Check for exact greeting words (not substrings)
    is_greeting = False
    for greeting in greeting_words:
        if query_lower == greeting or query_lower.startswith(greeting + " ") or query_lower.endswith(" " + greeting):
            is_greeting = True
            break
    
    if is_greeting:
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
        matching_faq = faq_db.find_matching_faq(req.query)
        
        if matching_faq:
            print(f"Found matching FAQ: {matching_faq['question']}")
            # Update views count in database
            faq_db.increment_views(matching_faq['id'])
            
            # Return the FAQ answer
            category_name = matching_faq.get("customCategory") if matching_faq.get("category") == "Custom" else matching_faq.get("category", "General")
            
            # Get database-based suggestions
            from suggestion_engine import suggestion_engine
            db_suggestions = suggestion_engine.get_database_faq_suggestions(limit=4)
            
            return ChatResponse(
                answer=matching_faq['answer'],
                sources=[f"FAQ - {category_name}"],
                suggestions=db_suggestions
            )
        else:
            print(f"No FAQ match found for: '{req.query}'")
            # Get database-based suggestions for no match case
            from suggestion_engine import suggestion_engine
            db_suggestions = suggestion_engine.get_database_faq_suggestions(limit=3)
            
            # Add action suggestions
            action_suggestions = [
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
            
            # Combine database FAQs with action suggestions
            all_suggestions = db_suggestions + action_suggestions
            
            # If no FAQ match, offer both ticket creation and live chat
            return ChatResponse(
                answer=f"""I couldn't find specific information about "{req.query}" in my knowledge base.

I can help you in two ways:

1. Create a Support Ticket - Our team will respond within 24 hours
2. Chat Now - Get immediate help from our support team (if available)

Which option would you prefer?""",
                sources=["Support System"],
                suggestions=all_suggestions
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
