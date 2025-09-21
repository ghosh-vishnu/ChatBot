"""
Advanced AI Model for Venturing Digitally Chatbot
Handles comprehensive queries about services, industries, and solutions
"""

from __future__ import annotations
import re
from typing import Dict, List, Optional, Tuple
import json

class VenturingDigitallyAI:
    """Advanced AI model for Venturing Digitally chatbot"""
    
    def __init__(self):
        self.service_keywords = {
            'website_development': ['website', 'web development', 'web app', 'website design', 'custom website', 'responsive website'],
            'mobile_development': ['mobile app', 'mobile application', 'iOS', 'Android', 'cross-platform', 'native app'],
            'ui_ux_design': ['UI design', 'UX design', 'user interface', 'user experience', 'design', 'wireframing', 'prototyping'],
            'enterprise_software': ['enterprise software', 'ERP', 'CRM', 'business software', 'enterprise solutions'],
            'custom_software': ['custom software', 'bespoke software', 'custom development', 'tailored solutions'],
            'ai_ml': ['AI', 'artificial intelligence', 'machine learning', 'ML', 'predictive analytics', 'chatbots', 'automation'],
            'cloud_services': ['cloud services', 'cloud computing', 'cloud migration', 'AWS', 'Azure', 'Google Cloud'],
            'digital_marketing': ['digital marketing', 'online marketing', 'social media marketing', 'content marketing', 'PPC'],
            'seo': ['SEO', 'search engine optimization', 'organic traffic', 'keyword research', 'technical SEO'],
            'cybersecurity': ['cybersecurity', 'security', 'penetration testing', 'vulnerability assessment', 'security audit'],
            'data_analytics': ['data analytics', 'business intelligence', 'data visualization', 'predictive analytics', 'data mining'],
            'qa_testing': ['QA testing', 'quality assurance', 'software testing', 'automation testing', 'performance testing'],
            'support_maintenance': ['support', 'maintenance', 'technical support', 'bug fixes', 'updates', '24/7 support']
        }
        
        self.industry_keywords = {
            'healthcare': ['healthcare', 'medical', 'hospital', 'EHR', 'patient management', 'telemedicine'],
            'ecommerce': ['e-commerce', 'online store', 'marketplace', 'payment integration', 'inventory management'],
            'manufacturing': ['manufacturing', 'production', 'factory', 'supply chain', 'quality control'],
            'finance': ['finance', 'banking', 'fintech', 'payment', 'financial software'],
            'education': ['education', 'school', 'university', 'learning management', 'e-learning'],
            'real_estate': ['real estate', 'property', 'construction', 'property management'],
            'logistics': ['logistics', 'transportation', 'shipping', 'warehouse management', 'supply chain'],
            'retail': ['retail', 'shopping', 'inventory', 'point of sale', 'POS']
        }
        
        self.intent_patterns = {
            'greeting': [r'\b(hi|hello|hey|greetings|good morning|good afternoon|good evening|namaste|namaskar)\b'],
            'services': [r'\b(services?|what do you do|what can you help|offer|provide|solutions?|capabilities)\b'],
            'pricing': [r'\b(price|cost|pricing|how much|budget|affordable|expensive|quotation|quote|estimate)\b'],
            'contact': [r'\b(contact|get in touch|reach|phone|email|address|location|meeting|consultation)\b'],
            'about': [r'\b(about|who are you|company|team|experience|background|story|mission|vision)\b'],
            'portfolio': [r'\b(portfolio|projects|work|examples|case studies|clients|showcase|gallery)\b'],
            'technology': [r'\b(technology|tech|programming|development|coding|framework|stack|tools|languages)\b'],
            'support': [r'\b(support|help|assistance|maintenance|bug|issue|problem|troubleshoot|fix)\b'],
            'careers': [r'\b(careers?|jobs?|hiring|employment|work|join|team)\b'],
            'training': [r'\b(training|internship|learning|education|course|skill)\b']
        }
        
        # Enhanced response templates with clean, structured formatting
        self.response_templates = {
            'greeting': [
                "Hello! Welcome to Venturing Digitally!\n\nI'm your AI assistant here to help you discover our cutting-edge digital solutions. How can I assist you today?",
                "Hi there! Welcome to Venturing Digitally - your partner in digital transformation.\n\nI'm here to guide you through our innovative services and solutions. What would you like to know?",
                "Greetings! Welcome to Venturing Digitally!\n\nI'm excited to help you explore our comprehensive digital services. How may I assist you today?"
            ],
            'services': [
                "We offer a comprehensive suite of digital solutions:\n\n— **Website Development** | Modern, responsive websites\n— **Mobile App Development** | iOS & Android apps\n— **AI/ML Solutions** | Intelligent automation\n— **Cloud Services** | Scalable infrastructure\n— **UI/UX Design** | User-centered design\n— **Cybersecurity** | Enterprise-grade security\n— **Data Analytics** | Business intelligence\n— **E-commerce Solutions** | Online stores\n— **Enterprise Software** | Custom business solutions\n\nEach service is tailored to help businesses grow smarter, faster, and more securely.",
                "Our expertise spans across multiple domains:\n\n— **Web & Mobile Development** | Custom applications and responsive websites\n— **AI & Machine Learning** | Intelligent automation and predictive analytics\n— **Cloud Computing** | Scalable infrastructure and migration services\n— **Digital Marketing** | SEO, social media, and content marketing\n— **Cybersecurity** | Enterprise-grade security solutions\n— **Data Analytics** | Business intelligence and insights\n— **UI/UX Design** | User-centered design principles\n— **Enterprise Solutions** | Custom business software\n\nEach service is designed to meet your specific business needs and drive growth.",
                "We provide end-to-end digital transformation services:\n\n— **Custom Website Development** | Modern, responsive web applications\n— **Mobile Applications** | Native and cross-platform solutions\n— **AI-Powered Solutions** | Machine learning and automation\n— **Cloud Infrastructure** | Scalable and secure hosting\n— **Modern Technologies** | React, Node.js, Python, AWS, Azure\n\nOur team specializes in cutting-edge technologies to deliver exceptional results."
            ],
            'pricing': [
                "Our pricing is competitive and flexible:\n\n— **Website Development** | Starting from $2,000\n— **Mobile Apps** | Starting from $5,000\n— **AI/ML Projects** | Starting from $8,000\n— **Cloud Solutions** | Starting from $1,500/month\n— **UI/UX Design** | Starting from $1,000\n\nWe offer **free consultations** and **custom quotes** to match your budget and requirements.",
                "Transparent, value-based pricing packages:\n\n— **Starter Package** | $2,000-$5,000 for small projects\n— **Professional Package** | $5,000-$15,000 for medium businesses\n— **Enterprise Package** | $15,000+ for large-scale solutions\n\nAll packages include **3 months free support** and **source code ownership**.",
                "Flexible pricing based on project complexity:\n\n— **Flexible Payment Plans** | Milestone-based billing\n— **Maintenance Packages** | Ongoing support options\n— **Custom Quotes** | Detailed breakdown in 24 hours\n— **No Hidden Costs** | Transparent pricing structure\n\nGet a **free quote** today to discuss your specific requirements."
            ],
            'contact': [
                "Get in touch with us through multiple channels:\n\n— **Email** | info@venturingdigitally.com\n— **Phone** | +1-555-VENTURE\n— **Live Chat** | Available 24/7\n— **Schedule Meeting** | Free consultation\n— **Office** | Multiple locations\n\nWe respond within **2 hours** during business hours!",
                "Connect with our team:\n\n— **Website** | venturingdigitally.com/contact\n— **WhatsApp** | +1-555-VENTURE\n— **Email** | hello@venturingdigitally.com\n— **LinkedIn** | /company/venturing-digitally\n— **Book Demo** | Free 30-minute consultation\n\nOur experts are ready to discuss your project requirements.",
                "Reach out to us:\n\n— **Call** | +1-555-VENTURE (Mon-Fri, 9 AM-6 PM)\n— **Email** | contact@venturingdigitally.com\n— **Chat** | Live support available\n— **Meeting** | Free consultation booking\n— **Visit** | Major cities worldwide\n\nWe're here to help 24/7 with your digital transformation needs."
            ],
            'technology': [
                "We use cutting-edge technologies in our development:\n\n— **Frontend** | React, Vue.js, Angular, Next.js\n— **Backend** | Node.js, Python, PHP, Java, .NET\n— **Mobile** | React Native, Flutter, Swift, Kotlin\n— **Cloud** | AWS, Azure, Google Cloud, Docker\n— **AI/ML** | TensorFlow, PyTorch, OpenAI\n— **Database** | MongoDB, PostgreSQL, MySQL, Redis\n— **Security** | OWASP standards, SSL, encryption\n\nOur team stays updated with the latest technology trends to deliver innovative solutions.",
                "Our comprehensive tech stack includes:\n\n— **Modern Frameworks** | React, Vue, Angular\n— **Robust Backends** | Node.js, Python, PHP\n— **Mobile Technologies** | React Native, Flutter\n— **Cloud Platforms** | AWS, Azure, GCP\n— **AI/ML Tools** | TensorFlow, PyTorch\n— **Databases** | MongoDB, PostgreSQL\n— **DevOps Tools** | Docker, Kubernetes, CI/CD\n\nWe leverage these technologies to build scalable, secure, and high-performance applications.",
                "Latest technologies we specialize in:\n\n— **Web Development** | React, Next.js, TypeScript\n— **Mobile Development** | React Native, Flutter\n— **Backend Services** | Node.js, Python, FastAPI\n— **Cloud Computing** | AWS, Azure, serverless\n— **Artificial Intelligence** | OpenAI, TensorFlow, custom models\n— **Data Management** | PostgreSQL, MongoDB, Redis\n— **Security** | OAuth, JWT, encryption\n\nOur expertise in these technologies ensures we deliver cutting-edge solutions for your business."
            ]
        }
    
    def analyze_query(self, query: str) -> Dict:
        """Analyze user query and extract intent, entities, and context"""
        query_lower = query.lower()
        
        # Intent detection
        intent = self.detect_intent(query_lower)
        
        # Entity extraction
        services = self.extract_services(query_lower)
        industries = self.extract_industries(query_lower)
        
        # Sentiment analysis
        sentiment = self.analyze_sentiment(query_lower)
        
        # Query complexity
        complexity = self.assess_complexity(query_lower)
        
        return {
            'intent': intent,
            'services': services,
            'industries': industries,
            'sentiment': sentiment,
            'complexity': complexity,
            'original_query': query
        }
    
    def detect_intent(self, query: str) -> str:
        """Detect user intent from query"""
        for intent, patterns in self.intent_patterns.items():
            for pattern in patterns:
                if re.search(pattern, query, re.IGNORECASE):
                    return intent
        return 'general'
    
    def extract_services(self, query: str) -> List[str]:
        """Extract mentioned services from query"""
        found_services = []
        for service, keywords in self.service_keywords.items():
            for keyword in keywords:
                if keyword.lower() in query:
                    found_services.append(service)
                    break
        return found_services
    
    def extract_industries(self, query: str) -> List[str]:
        """Extract mentioned industries from query"""
        found_industries = []
        for industry, keywords in self.industry_keywords.items():
            for keyword in keywords:
                if keyword.lower() in query:
                    found_industries.append(industry)
                    break
        return found_industries
    
    def analyze_sentiment(self, query: str) -> str:
        """Analyze sentiment of the query"""
        positive_words = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'impressed', 'love', 'like']
        negative_words = ['bad', 'terrible', 'awful', 'hate', 'disappointed', 'frustrated', 'angry', 'upset']
        
        positive_count = sum(1 for word in positive_words if word in query)
        negative_count = sum(1 for word in negative_words if word in query)
        
        if positive_count > negative_count:
            return 'positive'
        elif negative_count > positive_count:
            return 'negative'
        else:
            return 'neutral'
    
    def assess_complexity(self, query: str) -> str:
        """Assess query complexity"""
        word_count = len(query.split())
        if word_count <= 3:
            return 'simple'
        elif word_count <= 10:
            return 'medium'
        else:
            return 'complex'
    
    def generate_response(self, analysis: Dict, relevant_chunks: List[Dict]) -> str:
        """Generate intelligent response based on analysis"""
        intent = analysis['intent']
        services = analysis['services']
        industries = analysis['industries']
        sentiment = analysis['sentiment']
        complexity = analysis['complexity']
        
        # Handle different intents
        if intent == 'greeting':
            return self.generate_greeting_response(sentiment)
        elif intent == 'services':
            return self.generate_services_response(services, industries, relevant_chunks)
        elif intent == 'pricing':
            return self.generate_pricing_response(sentiment)
        elif intent == 'contact':
            return self.generate_contact_response()
        elif intent == 'about':
            return self.generate_about_response(relevant_chunks)
        elif intent == 'technology':
            return self.generate_technology_response(services, relevant_chunks)
        elif intent == 'support':
            return self.generate_support_response(sentiment)
        elif intent == 'careers':
            return self.generate_careers_response()
        elif intent == 'training':
            return self.generate_training_response()
        else:
            return self.generate_general_response(services, industries, relevant_chunks)
    
    def generate_greeting_response(self, sentiment: str) -> str:
        """Generate greeting response"""
        import random
        if sentiment == 'positive':
            return random.choice([
                "Hello! Thank you for your positive energy! I'm here to help you learn about Venturing Digitally's comprehensive digital solutions. How can I assist you today?",
                "Hi there! Your enthusiasm is contagious! I'm excited to show you all the amazing digital solutions we offer at Venturing Digitally. What would you like to explore?",
                "Greetings! Your positive vibes are wonderful! I'm here to guide you through our innovative digital transformation services. How can I help you today?"
            ])
        else:
            return random.choice(self.response_templates['greeting'])
    
    def generate_services_response(self, services: List[str], industries: List[str], chunks: List[Dict]) -> str:
        """Generate services response"""
        import random
        if services:
            service_descriptions = {
                'website_development': "— **Custom Website Development** | Modern, responsive websites with React, Angular, and cutting-edge technologies",
                'mobile_development': "— **Mobile App Development** | Native and cross-platform apps for iOS and Android with React Native and Flutter",
                'ui_ux_design': "— **UI/UX Design** | User-centered design with wireframing, prototyping, and modern design principles",
                'enterprise_software': "— **Enterprise Software** | ERP, CRM, and business management solutions tailored to your needs",
                'custom_software': "— **Custom Software** | Bespoke software development designed specifically for your business requirements",
                'ai_ml': "— **AI/ML Solutions** | Artificial Intelligence and Machine Learning for automation, insights, and intelligent systems",
                'cloud_services': "— **Cloud Services** | Cloud migration, infrastructure, and computing with AWS, Azure, and Google Cloud",
                'digital_marketing': "— **Digital Marketing** | Comprehensive online marketing including SEO, social media, and content marketing",
                'seo': "— **SEO Services** | Search Engine Optimization to improve your online visibility and organic traffic",
                'cybersecurity': "— **Cybersecurity** | Enterprise-grade security including auditing, penetration testing, and protection",
                'data_analytics': "— **Data Analytics** | Business intelligence and data-driven solutions for informed decision making",
                'qa_testing': "— **QA Testing** | Quality assurance and comprehensive software testing services",
                'support_maintenance': "— **Support & Maintenance** | 24/7 technical support and ongoing software optimization"
            }
            
            response = "Based on your interest, here are our relevant services:\n\n"
            for service in services[:3]:  # Limit to top 3 services
                if service in service_descriptions:
                    response += f"{service_descriptions[service]}\n"
            
            if industries:
                response += f"\nWe also have specialized solutions for the **{', '.join(industries)}** industry."
            
            response += "\n\nEach service is designed to help your business grow and succeed in the digital world."
            
            return response
        else:
            return random.choice(self.response_templates['services'])
    
    def generate_pricing_response(self, sentiment: str) -> str:
        """Generate pricing response"""
        import random
        if sentiment == 'negative':
            return "I understand budget is a concern. We offer competitive pricing and flexible packages to suit different budgets. We provide **free consultations** to discuss your requirements and offer customized pricing solutions that deliver value for your investment. Let's find a solution that works for you!"
        else:
            return random.choice(self.response_templates['pricing'])
    
    def generate_contact_response(self) -> str:
        """Generate contact response"""
        import random
        return random.choice(self.response_templates['contact'])
    
    def generate_about_response(self, chunks: List[Dict]) -> str:
        """Generate about response"""
        return "Venturing Digitally is a leading software company that specializes in digital transformation solutions. We offer comprehensive services including custom website development, mobile applications, ERP software, AI/ML solutions, cloud services, digital marketing, and more. Our team of experienced developers, designers, and digital experts is passionate about creating innovative solutions that help businesses grow and succeed in the digital world."
    
    def generate_technology_response(self, services: List[str], chunks: List[Dict]) -> str:
        """Generate technology response"""
        import random
        technologies = {
            'website_development': "— **Frontend** | React, Angular, Vue.js, Next.js\n— **Backend** | Node.js, Python, PHP",
            'mobile_development': "— **Cross-platform** | React Native, Flutter\n— **Native** | Swift, Kotlin",
            'ai_ml': "— **AI/ML** | Python, TensorFlow, PyTorch, OpenAI, Machine Learning",
            'cloud_services': "— **Cloud** | AWS, Azure, Google Cloud, Docker, Kubernetes",
            'data_analytics': "— **Analytics** | Python, R, Tableau, Power BI, SQL, Machine Learning"
        }
        
        if services:
            response = "We use cutting-edge technologies in our development:\n\n"
            for service in services[:3]:
                if service in technologies:
                    response += f"{technologies[service]}\n"
            response += "\nOur team stays updated with the latest technology trends to deliver innovative solutions."
            return response
        else:
            return random.choice(self.response_templates['technology'])
    
    def generate_support_response(self, sentiment: str) -> str:
        """Generate support response"""
        if sentiment == 'negative':
            return "I understand you're experiencing issues. We take support seriously and are here to help resolve any problems quickly. Our 24/7 support team can assist with technical issues, bug fixes, and maintenance. Please contact us immediately so we can address your concerns."
        else:
            return "We provide comprehensive support and maintenance services:\n\n• 24/7 Technical Support\n• Bug Fixes and Updates\n• Performance Optimization\n• Security Updates\n• Feature Enhancements\n• Regular Maintenance\n\nOur support team is dedicated to ensuring your software continues to perform optimally. Contact us for any support needs."
    
    def generate_careers_response(self) -> str:
        """Generate careers response"""
        return "Join our team of talented professionals at Venturing Digitally! We offer exciting career opportunities in:\n\n• Software Development\n• UI/UX Design\n• Digital Marketing\n• Project Management\n• Quality Assurance\n• Data Analytics\n\nWe provide a collaborative work environment, competitive benefits, and opportunities for professional growth. Visit our careers page to explore current openings and learn more about our company culture."
    
    def generate_training_response(self) -> str:
        """Generate training response"""
        return "We offer comprehensive training and internship programs:\n\n• Software Development Training\n• Digital Marketing Courses\n• UI/UX Design Programs\n• Data Analytics Training\n• Cloud Computing Courses\n• AI/ML Workshops\n\nOur programs provide hands-on experience with real projects and mentorship from industry experts. Perfect for students and professionals looking to enhance their skills in technology and digital solutions."
    
    def generate_general_response(self, services: List[str], industries: List[str], chunks: List[Dict]) -> str:
        """Generate general response"""
        if chunks:
            # Use the most relevant chunk
            best_chunk = chunks[0]['text']
            return f"Based on your question, here's what I found: {best_chunk[:300]}..."
        else:
            return "I'd be happy to help you learn more about Venturing Digitally's services and solutions. Could you please be more specific about what you'd like to know? For example, you can ask about our services, pricing, technology stack, or industry solutions."

# Global instance
venturing_ai = VenturingDigitallyAI()
