from __future__ import annotations

from typing import List

from fastapi import APIRouter
from openai import OpenAI

from schemas import ChatRequest, ChatResponse
from config import OPENAI_API_KEY, CHAT_MODEL, TOP_K, MAX_CONTEXT_CHARS
from db import query_similar
import json
import os


router = APIRouter()


def load_faqs():
    """Load FAQs from database"""
    try:
        faqs_file = "data/faqs.json"
        if os.path.exists(faqs_file):
            with open(faqs_file, 'r') as f:
                return json.load(f)
        return []
    except Exception as e:
        print(f"Error loading FAQs: {e}")
        return []


def find_matching_faq(query: str, faqs: list) -> dict:
    """Find the most relevant FAQ based on user query"""
    query_lower = query.lower().strip()
    best_match = None
    best_score = 0
    
    # Skip FAQ matching for greetings and very short queries
    greeting_words = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "namaste", "namaskar"]
    if any(greeting in query_lower for greeting in greeting_words) or len(query_lower) < 3:
        print(f"Skipping FAQ search for greeting/short query: '{query_lower}'")
        return None
    
    print(f"Searching for: '{query_lower}' in {len(faqs)} FAQs")
    
    for faq in faqs:
        score = 0
        question = faq.get("question", "").lower().strip()
        answer = faq.get("answer", "").lower().strip()
        
        print(f"Checking FAQ: '{question}'")
        
        # Check for exact question match (highest priority)
        if query_lower == question:
            score += 100
            print(f"Exact match found: {question}")
        
        # Check if query contains the question
        elif query_lower in question:
            score += 50
            print(f"Query contains question: {question}")
        
        # Check if question contains the query
        elif question in query_lower:
            score += 40
            print(f"Question contains query: {question}")
        
        # Check for keyword matches in question (exclude common words)
        common_words = ["what", "are", "is", "the", "your", "you", "do", "can", "will", "how", "when", "where", "why", "who", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by"]
        query_words = [word for word in query_lower.split() if len(word) > 2 and word not in common_words]
        question_words = [word for word in question.split() if len(word) > 2 and word not in common_words]
        
        # Count matching words
        matching_words = 0
        for word in query_words:
            if word in question_words:
                matching_words += 1
                score += 5
                print(f"Word match: '{word}' in '{question}'")
        
        # If more than 50% words match, boost score
        if len(query_words) > 0 and matching_words / len(query_words) > 0.5:
            score += 20
            print(f"High word match ratio: {matching_words}/{len(query_words)}")
        
        # Check for keyword matches in answer
        for word in query_words:
            if word in answer:
                score += 2
        
        # Check for category relevance
        category = faq.get("category", "").lower()
        custom_category = faq.get("customCategory", "").lower()
        
        for word in query_words:
            if word in category or word in custom_category:
                score += 3
        
        # Check for partial word matches
        for word in query_words:
            for q_word in question_words:
                if word in q_word or q_word in word:
                    score += 1
        
        # Special handling for "what is" type questions
        if query_lower.startswith("what is") and "what is" in question:
            score += 15
            print(f"What is question match: {question}")
        
        # Special handling for time-related questions
        if any(word in query_lower for word in ["today", "tomorrow", "yesterday"]) and any(word in question for word in ["today", "tomorrow", "yesterday"]):
            score += 10
            print(f"Time-related question match: {question}")
        
        print(f"FAQ '{question}' score: {score}")
        
        if score > best_score:
            best_score = score
            best_match = faq
    
    print(f"Best match: {best_match['question'] if best_match else 'None'} with score: {best_score}")
    
    # Only return match if score is high enough (increased threshold for better accuracy)
    return best_match if best_score >= 10 else None


def _generate_unknown_question_response(query: str, analysis: dict) -> str:
    """Generate smart response for unknown questions"""
    
    # Extract key terms from query
    query_lower = query.lower()
    
    # Check for technology-related questions
    tech_keywords = ["blockchain", "ai", "machine learning", "python", "react", "angular", "node", "database", "cloud", "devops"]
    is_tech_question = any(keyword in query_lower for keyword in tech_keywords)
    
    # Check for service-related questions
    service_keywords = ["development", "app", "website", "software", "solution", "service", "training", "internship"]
    is_service_question = any(keyword in query_lower for keyword in service_keywords)
    
    # Check for business-related questions
    business_keywords = ["pricing", "cost", "price", "quote", "contact", "location", "office", "company"]
    is_business_question = any(keyword in query_lower for keyword in business_keywords)
    
    # Generate contextual response
    if is_tech_question:
        response = f"""I don't currently have specific information about "{query}" in my knowledge base, but I can help you get this information!

Our technical team specializes in various technologies and can provide detailed information about:
• Modern web technologies (React, Angular, Node.js)
• AI/ML and data analytics solutions
• Cloud platforms and DevOps practices
• Mobile app development technologies
• Database design and optimization

Would you like me to create a support ticket so our technical experts can provide you with detailed information about this topic?"""

    elif is_service_question:
        response = f"""I don't have specific details about "{query}" in my current knowledge base, but I can help you get comprehensive information!

We offer a wide range of services including:
• Custom software development
• Web and mobile app development
• AI/ML solutions and data analytics
• Cloud services and DevOps
• Training and internship programs

Our team can provide detailed information about how we can help with your specific requirements. Would you like me to create a support ticket to connect you with our specialists?"""

    elif is_business_question:
        response = f"""I don't have specific information about "{query}" readily available, but I can help you get the details you need!

For business-related inquiries, our team can provide information about:
• Pricing and project costs
• Company locations and contact details
• Service packages and solutions
• Consultation and support options

Would you like me to create a support ticket so our business team can provide you with detailed information?"""

    else:
        response = f"""I don't currently have specific information about "{query}" in my knowledge base, but I'm here to help you get the answers you need!

Our team at Venturing Digitally can provide information about:
• Technical solutions and development services
• Training programs and internships
• Business services and pricing
• Company information and support

Would you like me to create a support ticket so our experts can provide you with detailed information about this topic?"""

    return response


def save_faqs(faqs: list):
    """Save FAQs to database"""
    try:
        os.makedirs("data", exist_ok=True)
        faqs_file = "data/faqs.json"
        with open(faqs_file, 'w') as f:
            json.dump(faqs, f, indent=2)
    except Exception as e:
        print(f"Error saving FAQs: {e}")


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
    
    print(f"Analyzing query: '{query}' -> '{query_lower}'")
    
    # Intent classification
    intent = "general"
    if any(word in query_lower for word in ["hi", "hello", "hey", "greetings", "hii", "good morning", "good afternoon", "good evening", "good night", "namaste", "namaskar", "bye", "goodbye", "see you", "take care", "farewell"]):
        intent = "greeting"
    elif any(word in query_lower for word in ["company", "name", "what is", "your name","compny"]):
        intent = "company_info"
    elif any(word in query_lower for word in ["service","services", "offer", "what do you", "whats your services"]):
        intent = "services"
    elif any(word in query_lower for word in ["pricing", "cost", "price", "affordable","amount","budget","quote","estimate","how much","how much is","how much does","how much do","how much the","how much the project","how much the project will cost","how much the project will cost"]):
        intent = "pricing"
    elif any(word in query_lower for word in ["support", "help", "assistance"]):
        intent = "support"
    elif any(word in query_lower for word in ["team", "who", "people"]):
        intent = "team"
    elif any(word in query_lower for word in ["contact", "reach", "get in touch", "location", "where"]):
        intent = "contact"
    elif any(word in query_lower for word in ["faq", "questions", "answers","query", "kaise", "ho", "thik", "hu"]) or (query_lower.startswith("what is") and any(word in query_lower for word in ["today", "tomorrow", "yesterday"])):
        intent = "faq"
        print(f"FAQ intent detected for: '{query}'")
    
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
        from local_llm import generate_ai_response, analyze_sentiment, extract_key_entities
        
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
        query_lower = query.lower()
        
        # Check for specific greeting types
        if any(word in query_lower for word in ["good morning", "morning"]):
            return "Good morning! Welcome to Venturing Digitally. I hope you're having a wonderful day! I'm here to help you discover our innovative digital solutions. How can I assist you today?"
        elif any(word in query_lower for word in ["good afternoon", "afternoon"]):
            return "Good afternoon! Welcome to Venturing Digitally. I'm excited to help you explore our comprehensive digital services. What would you like to know about our solutions?"
        elif any(word in query_lower for word in ["good evening", "evening"]):
            return "Good evening! Welcome to Venturing Digitally. I'm here to guide you through our cutting-edge digital transformation services. How may I help you today?"
        elif any(word in query_lower for word in ["good night", "night"]):
            return "Good night! Thank you for visiting Venturing Digitally. I'm here to help you with our digital solutions whenever you need assistance. Have a great night!"
        elif any(word in query_lower for word in ["by","bye", "goodbye", "see you", "take care", "farewell"]):
            return "Goodbye! Thank you for visiting Venturing Digitally. I hope I was able to help you today. Feel free to come back anytime for more information about our digital solutions. Take care!"
        elif any(word in query_lower for word in ["namaste", "namaskar"]):
            return "Namaste! Welcome to Venturing Digitally. I'm delighted to assist you with our comprehensive digital solutions. How can I help you today?"
        else:
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
        # Load FAQs from database
        try:
            faqs = load_faqs()
            print(f"Loaded {len(faqs)} FAQs")
            
            if not faqs:
                return "We have Frequently Asked Questions covering various topics. However, no FAQs are currently available in our database. Please feel free to ask me any specific questions you might have!"
            
            # Try to find matching FAQ
            matching_faq = find_matching_faq(query, faqs)
            
            if matching_faq:
                print(f"Found matching FAQ: {matching_faq['question']}")
                # Update views count
                matching_faq["views"] = matching_faq.get("views", 0) + 1
                save_faqs(faqs)
                
                # Return the FAQ answer
                category_name = matching_faq.get("customCategory") if matching_faq.get("category") == "Custom" else matching_faq.get("category", "General")
                return f"**{matching_faq['question']}**\n\n{matching_faq['answer']}\n\n*Category: {category_name}*"
            else:
                print("No matching FAQ found")
                # Show available FAQ categories and questions
                categories = {}
                for faq in faqs:
                    cat = faq.get("customCategory") if faq.get("category") == "Custom" else faq.get("category", "General")
                    if cat not in categories:
                        categories[cat] = []
                    categories[cat].append(faq["question"])
                
                response = "Here are our Frequently Asked Questions:\n\n"
                for category, questions in categories.items():
                    response += f"**{category}:**\n"
                    for question in questions[:3]:  # Show max 3 questions per category
                        response += f"• {question}\n"
                    response += "\n"
                
                response += "Feel free to ask me any of these questions or ask something else!"
                return response
        except Exception as e:
            print(f"Error in FAQ handling: {e}")
            return "I apologize, but I'm having trouble accessing our FAQ database right now. Please try again later or contact our support team."
    
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
        from local_llm import generate_ai_response, analyze_sentiment, extract_key_entities
        
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
    print(f"Chat request: '{req.query}'")
    if not OPENAI_API_KEY:
        print("Using local AI model path")
        # Advanced AI-powered analysis for Venturing Digitally
        from venturing_ai_model import venturing_ai
        from conversation_memory import conversation_memory
        from faq_handler import faq_handler
        
        # Step 0: Check for greetings first (before FAQ check)
        greeting_words = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "namaste", "namaskar"]
        query_lower = req.query.lower().strip()
        
        if any(greeting in query_lower for greeting in greeting_words):
            print(f"Detected greeting: '{req.query}'")
            # Get conversation context
            context = conversation_memory.get_conversation_context(user_id)
            conversation_summary = conversation_memory.get_conversation_summary(user_id)
            
            # Generate greeting response
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
            
            # First check database FAQs
            faqs = load_faqs()
            print(f"Loaded {len(faqs)} database FAQs")
            
            if faqs:
                # Try to find matching FAQ in database
                matching_faq = find_matching_faq(req.query, faqs)
                
                if matching_faq:
                    print(f"Found matching database FAQ: {matching_faq['question']}")
                    # Update views count
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
                    print("No matching FAQ found in database")
            else:
                print("No FAQs found in database")
            
            # If no database FAQ match, try local FAQs
            print(f"Checking local FAQs for: '{req.query}'")
            faq_response = faq_handler.handle_faq_query(req.query)
            
            if faq_response["type"] == "faq_answer":
                print(f"Found matching local FAQ: {faq_response.get('title', 'Unknown')}")
                return ChatResponse(
                    answer=faq_response["answer"],
                    sources=[f"FAQ - {faq_response.get('title', 'General')}"],
                    suggestions=[]
                )
            else:
                print("No matching local FAQ found")
            
        except Exception as e:
            print(f"FAQ error: {e}")
            # Continue with normal processing if FAQ fails
        
        # Get conversation context
        context = conversation_memory.get_conversation_context(user_id)
        conversation_summary = conversation_memory.get_conversation_summary(user_id)
        
        # Load all chunks directly
        from db import _load_index
        _, docs = _load_index()
        
        if not docs:
            # If no website data, try FAQ suggestions
            if faq_response and faq_response.get("type") == "faq_suggestions":
                # Convert string suggestions to proper format
                suggestions = []
                for suggestion in faq_response.get("suggested_questions", []):
                    if isinstance(suggestion, str):
                        suggestions.append({
                            "text": suggestion,
                            "type": "faq",
                            "category": "general"
                        })
                    else:
                        suggestions.append(suggestion)
                
                return ChatResponse(
                    answer=faq_response["message"],
                    sources=["FAQ Database"],
                    suggestions=suggestions
                )
            
            # For greetings, provide appropriate response even without docs
            analysis = venturing_ai.analyze_query(req.query)
            if analysis['intent'] == 'greeting':
                answer = venturing_ai.generate_greeting_response(analysis['sentiment'], req.query)
                return ChatResponse(
                    answer=answer,
                    sources=["Venturing Digitally"],
                    suggestions=[]
                )
            
            # Check if this is an unknown question and offer ticket creation
            analysis = venturing_ai.analyze_query(req.query)
            if analysis['intent'] != 'greeting':
                print(f"🔍 No website docs found for: '{req.query}' - Offering ticket creation")
                
                # Generate smart response for unknown questions
                smart_response = _generate_unknown_question_response(req.query, analysis)
                
                # Generate suggestions for ticket creation
                ticket_suggestions = [
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
                
                return ChatResponse(
                    answer=smart_response,
                    sources=["Venturing Digitally Support"],
                    suggestions=ticket_suggestions
                )
            
            return ChatResponse(
                answer="Sorry, I couldn't find this information on our website.",
                sources=[],
            )
        
        # Step 2: Advanced AI analysis of the query
        analysis = venturing_ai.analyze_query(req.query)
        
        # Add conversation context to analysis
        if conversation_summary:
            analysis['conversation_context'] = conversation_summary
        
        # Step 3: Find relevant content using advanced search
        relevant_chunks = find_relevant_content_advanced(req.query, docs, analysis)
        
        # Step 4: Generate intelligent response using advanced AI model
        answer = venturing_ai.generate_response(analysis, relevant_chunks)
        
        # Step 5: If no good answer from website content, try FAQ (but not for greetings)
        if analysis['intent'] != 'greeting' and ("Sorry, I couldn't find" in answer or len(answer.strip()) < 50):
            try:
                if faq_response and faq_response.get("type") == "faq_suggestions":
                    faq_suggestions = [{"text": s["question"], "type": "faq", "category": s.get("category", "")} for s in faq_response["suggestions"]]
                    
                    return ChatResponse(
                        answer=f"I found some related questions that might help:\n\n" + 
                               "\n".join([f"• {s['question']}" for s in faq_response["suggestions"]]),
                        sources=["FAQ Database"],
                        suggestions=faq_suggestions
                    )
            except Exception as e:
                print(f"FAQ fallback error: {e}")
                # Continue with normal response
        
        # Step 5.5: Smart Unknown Question Handler
        if analysis['intent'] != 'greeting' and ("Sorry, I couldn't find" in answer or len(answer.strip()) < 50):
            print(f" No good answer found for: '{req.query}' - Offering ticket creation")
            
            # Generate smart response for unknown questions
            smart_response = _generate_unknown_question_response(req.query, analysis)
            
            # Generate suggestions for ticket creation
            ticket_suggestions = [
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
            
            return ChatResponse(
                answer=smart_response,
                sources=["Venturing Digitally Support"],
                suggestions=ticket_suggestions
            )
        
        # Step 6: Generate suggestions
        from suggestion_engine import suggestion_engine
        conversation_history = context.get('conversation', [])
        suggestions = suggestion_engine.generate_suggestions(
            req.query, 
            analysis['intent'], 
            analysis['services'], 
            analysis['industries'],
            conversation_history
        )
        
        # Add FAQ suggestions if available
        try:
            if faq_response and faq_response.get("type") == "faq_suggestions":
                faq_suggestions = [{"text": s["question"], "type": "faq", "category": s.get("category", "")} for s in faq_response["suggestions"]]
                suggestions.extend(faq_suggestions[:2])  # Add top 2 FAQ suggestions
        except Exception as e:
            print(f"FAQ suggestions error: {e}")
            # Continue without FAQ suggestions
        
        # Step 7: Store conversation in memory
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


@router.get("/faq/categories")
def get_faq_categories():
    """Get all FAQ categories"""
    from .faq_handler import faq_handler
    return {"categories": faq_handler.get_all_categories()}


@router.get("/faq/category/{category}")
def get_faq_by_category(category: str):
    """Get FAQs by category"""
    from .faq_handler import faq_handler
    questions = faq_handler.get_category_questions(category)
    return {"category": category, "questions": questions}


@router.post("/faq/search")
def search_faqs(query: str, category: str = None):
    """Search FAQs by query"""
    from .faq_handler import faq_handler
    results = faq_handler.search_faqs(query, category)
    return {"query": query, "results": results}


@router.get("/faq-suggestions")
def get_faq_suggestions(limit: int = 6):
    """Get FAQ suggestions for the chatbot"""
    try:
        from .faq_handler import faq_handler
        suggestions = faq_handler.get_suggestions(limit)
        return {"suggestions": suggestions}
    except Exception as e:
        print(f"Error getting FAQ suggestions: {e}")
        return {"suggestions": []}


