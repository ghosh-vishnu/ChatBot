from __future__ import annotations

from typing import List

from fastapi import APIRouter
from openai import OpenAI

from .schemas import ChatRequest, ChatResponse
from .config import OPENAI_API_KEY, CHAT_MODEL, TOP_K, MAX_CONTEXT_CHARS
from .db import query_similar


router = APIRouter()


SYSTEM_PROMPT = (
    "You are a helpful support assistant for the company. Answer ONLY using the provided context. "
    "If the answer is not present in the context, reply exactly: 'Sorry, I couldn’t find this information on our website.'"
)


def build_context(query: str, top_k: int) -> tuple[str, list[str]]:
    hits = query_similar(query, top_k=top_k)
    sources: List[str] = []
    context_blocks: List[str] = []
    total_chars = 0
    for h in hits:
        text = h.get("text") or ""
        url = (h.get("metadata") or {}).get("url") or ""
        if not text:
            continue
        if total_chars + len(text) > MAX_CONTEXT_CHARS:
            break
        context_blocks.append(text)
        sources.append(url)
        total_chars += len(text)
    context = "\n\n".join(context_blocks)
    return context, sources


def analyze_query_intent(query: str) -> dict:
    """Analyze user query to understand intent and extract key information"""
    query_lower = query.lower()
    
    # Intent classification
    intent = "general"
    if any(word in query_lower for word in ["hi", "hello", "hey", "greetings"]):
        intent = "greeting"
    elif any(word in query_lower for word in ["company", "name", "what is", "your name"]):
        intent = "company_info"
    elif any(word in query_lower for word in ["services", "offer", "what do you", "whats your services"]):
        intent = "services"
    elif any(word in query_lower for word in ["pricing", "cost", "price", "affordable"]):
        intent = "pricing"
    elif any(word in query_lower for word in ["support", "help", "assistance"]):
        intent = "support"
    elif any(word in query_lower for word in ["team", "who", "people"]):
        intent = "team"
    elif any(word in query_lower for word in ["contact", "reach", "get in touch", "location", "where"]):
        intent = "contact"
    elif any(word in query_lower for word in ["faq", "questions", "answers"]):
        intent = "faq"
    
    # Extract key terms
    key_terms = []
    important_words = ["web", "development", "mobile", "app", "cloud", "devops", "ai", "machine", "learning", 
                      "cybersecurity", "ui", "ux", "design", "pricing", "support", "team", "contact"]
    
    for word in important_words:
        if word in query_lower:
            key_terms.append(word)
    
    return {
        "intent": intent,
        "key_terms": key_terms,
        "query_type": "specific" if intent != "general" else "general"
    }

def find_relevant_content(query: str, docs: list, intent_info: dict) -> list:
    """Find most relevant content chunks based on AI analysis"""
    query_lower = query.lower()
    scored_chunks = []
    
    for doc in docs:
        text = doc.get("text", "").lower()
        score = 0
        
        # Intent-based scoring
        if intent_info["intent"] == "company_info":
            if "venturing digitally" in text:
                score += 10
            elif "venturing" in text:
                score += 5
                
        elif intent_info["intent"] == "services":
            if "core services" in text and "development" in text:
                score += 10
            elif "services" in text:
                score += 5
                
        elif intent_info["intent"] == "pricing":
            if "pricing" in text or "affordable" in text:
                score += 10
                
        elif intent_info["intent"] == "support":
            if "support" in text or "24/7" in text:
                score += 10
                
        elif intent_info["intent"] == "team":
            if "team" in text or "experienced" in text:
                score += 10
                
        elif intent_info["intent"] == "contact":
            if "contact" in text or "get in touch" in text:
                score += 10
                
        elif intent_info["intent"] == "faq":
            if "faq" in text or "questions" in text:
                score += 10
        
        # Key terms matching
        for term in intent_info["key_terms"]:
            if term in text:
                score += 3
        
        # General keyword matching
        query_words = [w for w in query_lower.split() if len(w) > 2]
        for word in query_words:
            if word in text:
                score += 1
        
        if score > 0:
            scored_chunks.append({
                "doc": doc,
                "score": score,
                "text": doc.get("text", "")
            })
    
    # Sort by score and return top chunks
    scored_chunks.sort(key=lambda x: x["score"], reverse=True)
    return scored_chunks[:3]  # Return top 3 most relevant chunks

def clean_response_text(text: str) -> str:
    """Clean HTML and formatting from response text"""
    import re
    
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    
    # Remove emoji and special characters
    text = re.sub(r'[🚀🎯💡🔧📱💻🌐🔒🎨]', '', text)
    
    # Remove navigation elements
    text = text.replace("Toggle theme", "").replace("Open navigation menu", "")
    text = text.replace("Get Started", "").replace("Get in Touch", "")
    text = text.replace("Learn More", "").replace("Read More", "")
    
    # Clean up extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    # Take first 200 characters and add ellipsis if longer
    if len(text) > 200:
        text = text[:200] + "..."
    
    return text

def generate_intelligent_response(query: str, relevant_chunks: list, intent_info: dict) -> str:
    """Generate intelligent response based on analysis"""
    
    # Try to use local LLM for advanced responses
    try:
        from .local_llm import generate_ai_response, analyze_sentiment, extract_key_entities
        
        # Analyze user sentiment
        sentiment = analyze_sentiment(query)
        
        # Extract key entities
        entities = extract_key_entities(query)
        
        # Prepare context from relevant chunks
        context = " ".join([chunk["text"][:200] for chunk in relevant_chunks[:2]])
        
        # Try to generate AI response
        ai_response = generate_ai_response(query, context)
        
        if ai_response and len(ai_response.strip()) > 10:
            # Add sentiment-aware response
            if sentiment == "positive":
                return f"Thank you for your positive question! {ai_response}"
            elif sentiment == "negative":
                return f"I understand your concern. {ai_response}"
            else:
                return ai_response
                
    except Exception as e:
        print(f"Local LLM error: {e}")
        # Fallback to rule-based response
    
    # Fallback: Rule-based intelligent responses
    if intent_info["intent"] == "greeting":
        return "Hello! Welcome to Venturing Digitally. I'm here to help you learn about our services and answer any questions you might have. How can I assist you today?"
    
    if not relevant_chunks:
        return "I apologize, but I couldn't find specific information about that topic on our website. Could you please rephrase your question or ask about our services, pricing, or team?"
    
    # Get the most relevant chunk
    best_chunk = relevant_chunks[0]["text"]
    
    # Generate contextual response based on intent
    if intent_info["intent"] == "company_info":
        # Extract company name and description
        if "venturing digitally" in best_chunk.lower():
            clean_text = clean_response_text(best_chunk)
            return f"Venturing Digitally is our company name. We build cutting-edge solutions that empower businesses to thrive in the digital age. {clean_text}"
        else:
            clean_text = clean_response_text(best_chunk)
            return f"Based on our website content: {clean_text}"
    
    elif intent_info["intent"] == "services":
        # Extract and format services
        services_text = best_chunk
        if "core services" in services_text.lower():
            # Extract services section and clean it
            services_section = services_text.split('Core Services')[1].split('Why Choose Us')[0] if 'Why Choose Us' in services_text else services_text
            clean_services = clean_response_text(services_section)
            return f"Our core services include:\n\n{clean_services}"
        else:
            clean_services = clean_response_text(services_text)
            return f"Here's information about our services: {clean_services}"
    
    elif intent_info["intent"] == "pricing":
        return "We offer competitive pricing without compromising on the quality of our services. Our pricing is flexible and customized based on your specific project requirements. For detailed pricing information, please contact us directly and we'll provide a personalized quote."
    
    elif intent_info["intent"] == "support":
        return "We provide 24/7 support to all our clients. Our dedicated support team is available around the clock to assist you with any issues or questions. You can reach out to us anytime for technical support, maintenance, or general inquiries."
    
    elif intent_info["intent"] == "team":
        return "Our team consists of seasoned professionals with years of experience in their respective fields. We have certified developers, UX/UI designers, DevOps engineers, and project managers. Our team has expertise in over 20 technologies and frameworks, and we have a proven track record of delivering successful projects."
    
    elif intent_info["intent"] == "contact":
        return "You can get in touch with us through our website. We have a 'Get Started' and 'Get in Touch' section available where you can schedule a meeting with us. You can also reach out to us directly for any inquiries or to discuss your project requirements."
    
    elif intent_info["intent"] == "faq":
        return "We have Frequently Asked Questions covering topics like:\n\n• What kind of technologies do you specialize in?\n• How long does a typical project take?\n• Do you offer support and maintenance after the project is launched?\n• How do you ensure the quality of your work?\n• Can you work with existing codebases?\n\nFeel free to ask me any specific questions you might have!"
    
    else:
        # General response - provide most relevant information
        clean_text = clean_response_text(best_chunk)
        return f"Based on your question, here's what I found: {clean_text}"

def generate_intelligent_response_with_memory(query: str, relevant_chunks: list, intent_info: dict, context: dict) -> str:
    """Generate intelligent response with conversation memory"""
    
    # Check if this is a follow-up question
    conversation = context.get('conversation', [])
    if conversation:
        last_intent = conversation[-1].get('intent', '')
        last_query = conversation[-1].get('query', '').lower()
        
        # Handle follow-up questions
        if any(word in query.lower() for word in ['more', 'details', 'tell me more', 'what else']):
            if last_intent == 'services':
                return "Let me provide more details about our services. We also offer specialized consulting, custom integrations, and ongoing maintenance support for all our projects."
            elif last_intent == 'pricing':
                return "For detailed pricing information, we offer flexible packages including basic, professional, and enterprise tiers. Each package is customized based on your specific requirements."
            elif last_intent == 'team':
                return "Our team includes certified developers, UX/UI designers, DevOps engineers, and project managers. We have expertise in over 20 technologies and frameworks."
    
    # Try to use local LLM for advanced responses
    try:
        from .local_llm import generate_ai_response, analyze_sentiment, extract_key_entities
        
        # Analyze user sentiment
        sentiment = analyze_sentiment(query)
        
        # Extract key entities
        entities = extract_key_entities(query)
        
        # Prepare context from relevant chunks and conversation
        context_text = " ".join([chunk["text"][:200] for chunk in relevant_chunks[:2]])
        if conversation:
            context_text += f" Previous conversation: {conversation[-1].get('query', '')}"
        
        # Try to generate AI response
        ai_response = generate_ai_response(query, context_text)
        
        if ai_response and len(ai_response.strip()) > 10:
            # Add sentiment-aware response
            if sentiment == "positive":
                return f"Thank you for your positive question! {ai_response}"
            elif sentiment == "negative":
                return f"I understand your concern. {ai_response}"
            else:
                return ai_response
                
    except Exception as e:
        print(f"Local LLM error: {e}")
        # Fallback to rule-based response
    
    # Fallback: Use the original intelligent response
    return generate_intelligent_response(query, relevant_chunks, intent_info)

def find_relevant_content_advanced(query: str, docs: list, analysis: dict) -> list:
    """Advanced content search using AI analysis"""
    query_lower = query.lower()
    scored_chunks = []
    
    for doc in docs:
        text = doc.get("text", "").lower()
        score = 0
        
        # Intent-based scoring
        intent = analysis.get('intent', 'general')
        if intent == 'services':
            if any(service in text for service in ['service', 'development', 'solution', 'technology']):
                score += 10
        elif intent == 'pricing':
            if any(word in text for word in ['price', 'cost', 'pricing', 'budget', 'affordable']):
                score += 10
        elif intent == 'contact':
            if any(word in text for word in ['contact', 'get in touch', 'reach', 'phone', 'email']):
                score += 10
        elif intent == 'about':
            if any(word in text for word in ['about', 'company', 'team', 'experience', 'background']):
                score += 10
        elif intent == 'technology':
            if any(word in text for word in ['technology', 'tech', 'framework', 'programming', 'development']):
                score += 10
        elif intent == 'support':
            if any(word in text for word in ['support', 'help', 'maintenance', 'assistance']):
                score += 10
        
        # Service-based scoring
        services = analysis.get('services', [])
        for service in services:
            service_keywords = {
                'website_development': ['website', 'web development', 'web app'],
                'mobile_development': ['mobile app', 'mobile application', 'iOS', 'Android'],
                'ui_ux_design': ['UI design', 'UX design', 'user interface', 'design'],
                'enterprise_software': ['enterprise', 'ERP', 'CRM', 'business software'],
                'custom_software': ['custom software', 'bespoke', 'tailored'],
                'ai_ml': ['AI', 'artificial intelligence', 'machine learning', 'ML'],
                'cloud_services': ['cloud', 'AWS', 'Azure', 'Google Cloud'],
                'digital_marketing': ['digital marketing', 'SEO', 'social media'],
                'cybersecurity': ['cybersecurity', 'security', 'penetration testing'],
                'data_analytics': ['data analytics', 'business intelligence', 'data visualization'],
                'qa_testing': ['QA testing', 'quality assurance', 'testing'],
                'support_maintenance': ['support', 'maintenance', '24/7']
            }
            
            if service in service_keywords:
                for keyword in service_keywords[service]:
                    if keyword in text:
                        score += 5
        
        # Industry-based scoring
        industries = analysis.get('industries', [])
        for industry in industries:
            industry_keywords = {
                'healthcare': ['healthcare', 'medical', 'hospital', 'EHR'],
                'ecommerce': ['e-commerce', 'online store', 'marketplace'],
                'manufacturing': ['manufacturing', 'production', 'factory'],
                'finance': ['finance', 'banking', 'fintech'],
                'education': ['education', 'school', 'university'],
                'logistics': ['logistics', 'transportation', 'shipping']
            }
            
            if industry in industry_keywords:
                for keyword in industry_keywords[industry]:
                    if keyword in text:
                        score += 3
        
        # General keyword matching
        query_words = [w for w in query_lower.split() if len(w) > 2]
        for word in query_words:
            if word in text:
                score += 1
        
        # Category-based scoring
        category = doc.get('category', '')
        if category == 'service_detail' and intent == 'services':
            score += 3
        elif category == 'industry_solution' and industries:
            score += 3
        elif category == 'about' and intent == 'about':
            score += 3
        elif category == 'contact' and intent == 'contact':
            score += 3
        
        if score > 0:
            scored_chunks.append({
                "doc": doc,
                "score": score,
                "text": doc.get("text", "")
            })
    
    # Sort by score and return top chunks
    scored_chunks.sort(key=lambda x: x["score"], reverse=True)
    return scored_chunks[:3]  # Return top 3 most relevant chunks

@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest, user_id: str = "default"):
    if not OPENAI_API_KEY:
        # Advanced AI-powered analysis for Venturing Digitally
        from .venturing_ai_model import venturing_ai
        from .conversation_memory import conversation_memory
        
        # Get conversation context
        context = conversation_memory.get_conversation_context(user_id)
        conversation_summary = conversation_memory.get_conversation_summary(user_id)
        
        # Load all chunks directly
        from .db import _load_index
        _, docs = _load_index()
        
        if not docs:
            return ChatResponse(
                answer="Sorry, I couldn't find this information on our website.",
                sources=[],
            )
        
        # Step 1: Advanced AI analysis of the query
        analysis = venturing_ai.analyze_query(req.query)
        
        # Add conversation context to analysis
        if conversation_summary:
            analysis['conversation_context'] = conversation_summary
        
        # Step 2: Find relevant content using advanced search
        relevant_chunks = find_relevant_content_advanced(req.query, docs, analysis)
        
        # Step 3: Generate intelligent response using advanced AI model
        answer = venturing_ai.generate_response(analysis, relevant_chunks)
        
        # Step 4: Generate suggestions
        from .suggestion_engine import suggestion_engine
        conversation_history = context.get('conversation', [])
        suggestions = suggestion_engine.generate_suggestions(
            req.query, 
            analysis['intent'], 
            analysis['services'], 
            analysis['industries'],
            conversation_history
        )
        
        # Step 5: Store conversation in memory
        conversation_memory.add_to_conversation(
            user_id, req.query, answer, analysis['intent']
        )
        
        return ChatResponse(
            answer=answer,
            sources=["https://venturingdigitally.com/"],
            suggestions=suggestions
        )

    client = OpenAI(api_key=OPENAI_API_KEY)
    user_prompt = (
        "Use only the following context to answer the user's question.\n\n"
        f"Context:\n{context}\n\nQuestion: {req.query}"
    )
    completion = client.chat.completions.create(
        model=CHAT_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.1,
    )
    answer = completion.choices[0].message.content or ""
    if "Sorry, I couldn't find this information" in answer:
        sources = []
    
    # Generate suggestions for OpenAI responses too
    from .suggestion_engine import suggestion_engine
    suggestions = suggestion_engine.get_quick_actions()
    
    return ChatResponse(answer=answer.strip(), sources=sources, suggestions=suggestions)


