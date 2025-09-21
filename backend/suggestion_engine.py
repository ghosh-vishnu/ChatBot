"""
Intelligent Auto-Suggestion Engine for Venturing Digitally Chatbot
Generates relevant suggestions based on user queries and context
"""

from __future__ import annotations
from typing import List, Dict, Optional
import re

class SuggestionEngine:
    """Generates intelligent suggestions based on user queries"""
    
    def __init__(self):
        # Define suggestion categories and their options
        self.suggestion_categories = {
            'greeting': [
                "What services do you offer?",
                "Tell me about your company",
                "How can I contact you?",
                "What technologies do you use?",
                "Do you provide support?"
            ],
            'services': [
                "Website Development",
                "Mobile App Development", 
                "AI/ML Solutions",
                "Cloud Services",
                "Digital Marketing",
                "UI/UX Design",
                "Enterprise Software",
                "Custom Software Development",
                "Cybersecurity Services",
                "Data Analytics",
                "QA Testing",
                "Support & Maintenance"
            ],
            'industries': [
                "Healthcare Solutions",
                "E-commerce Development",
                "Manufacturing Software",
                "Financial Services",
                "Education Technology",
                "Real Estate Solutions",
                "Logistics & Transportation",
                "Retail Solutions"
            ],
            'technologies': [
                "React & Node.js Development",
                "Python & AI/ML",
                "Mobile App Technologies",
                "Cloud Technologies (AWS/Azure)",
                "Database Solutions",
                "DevOps & Deployment"
            ],
            'business': [
                "Get a Quote",
                "Schedule a Consultation",
                "View Our Portfolio",
                "Learn About Our Process",
                "Contact Sales Team",
                "Request a Demo"
            ],
            'support': [
                "Technical Support",
                "Bug Fixes",
                "Performance Optimization",
                "Security Updates",
                "Feature Requests",
                "Training & Documentation"
            ],
            'pricing': [
                "Website Development Pricing",
                "Mobile App Development Cost",
                "Enterprise Software Pricing",
                "Custom Development Rates",
                "Support & Maintenance Plans",
                "Get Custom Quote"
            ],
            'about': [
                "Our Team",
                "Company History",
                "Our Mission & Vision",
                "Why Choose Us",
                "Our Clients",
                "Awards & Recognition"
            ]
        }
        
        # Context-based suggestions
        self.context_suggestions = {
            'after_services': [
                "Tell me more about this service",
                "What's the pricing for this?",
                "Do you have examples of this work?",
                "How long does this take?",
                "What technologies do you use?",
                "Can I see your portfolio?"
            ],
            'after_pricing': [
                "Get a detailed quote",
                "Schedule a consultation",
                "What's included in the price?",
                "Do you offer payment plans?",
                "Are there any hidden costs?",
                "Can you customize the pricing?"
            ],
            'after_contact': [
                "Schedule a meeting",
                "Send me more information",
                "What's your response time?",
                "Do you offer free consultations?",
                "Can I speak to a specialist?",
                "What documents do I need?"
            ],
            'after_technology': [
                "Show me examples of this technology",
                "What are the benefits?",
                "How do you implement this?",
                "Do you provide training?",
                "What's the learning curve?",
                "Can you migrate from other technologies?"
            ]
        }
        
        # Industry-specific suggestions
        self.industry_suggestions = {
            'healthcare': [
                "EHR System Development",
                "Telemedicine Platform",
                "Patient Management System",
                "Healthcare Analytics",
                "HIPAA Compliance Solutions"
            ],
            'ecommerce': [
                "Online Store Development",
                "Payment Gateway Integration",
                "Inventory Management",
                "Multi-vendor Marketplace",
                "E-commerce Analytics"
            ],
            'manufacturing': [
                "Production Planning Software",
                "Quality Control Systems",
                "Supply Chain Management",
                "Manufacturing Execution System",
                "IoT Integration"
            ],
            'finance': [
                "Banking Software Solutions",
                "Payment Processing Systems",
                "Financial Analytics",
                "Risk Management Tools",
                "Compliance Solutions"
            ]
        }
    
    def generate_suggestions(self, query: str, intent: str, services: List[str], 
                           industries: List[str], conversation_context: List[Dict] = None) -> List[Dict]:
        """Generate intelligent suggestions based on query analysis"""
        
        suggestions = []
        
        # Primary suggestions based on intent
        primary_suggestions = self._get_primary_suggestions(intent, services, industries)
        suggestions.extend(primary_suggestions)
        
        # Context-based suggestions
        context_suggestions = self._get_context_suggestions(conversation_context)
        suggestions.extend(context_suggestions)
        
        # Industry-specific suggestions
        industry_suggestions = self._get_industry_suggestions(industries)
        suggestions.extend(industry_suggestions)
        
        # Service-specific suggestions
        service_suggestions = self._get_service_suggestions(services)
        suggestions.extend(service_suggestions)
        
        # Remove duplicates and limit to 6 suggestions
        unique_suggestions = []
        seen = set()
        for suggestion in suggestions:
            if suggestion['text'] not in seen:
                unique_suggestions.append(suggestion)
                seen.add(suggestion['text'])
                if len(unique_suggestions) >= 6:
                    break
        
        return unique_suggestions
    
    def _get_primary_suggestions(self, intent: str, services: List[str], industries: List[str]) -> List[Dict]:
        """Get primary suggestions based on intent"""
        suggestions = []
        
        if intent == 'greeting':
            for suggestion in self.suggestion_categories['greeting']:
                suggestions.append({
                    'text': suggestion,
                    'type': 'question',
                    'category': 'greeting',
                    'action': 'query'
                })
        
        elif intent == 'services':
            for suggestion in self.suggestion_categories['services'][:4]:  # Top 4 services
                suggestions.append({
                    'text': suggestion,
                    'type': 'service',
                    'category': 'services',
                    'action': 'query'
                })
        
        elif intent == 'pricing':
            for suggestion in self.suggestion_categories['pricing'][:4]:
                suggestions.append({
                    'text': suggestion,
                    'type': 'pricing',
                    'category': 'pricing',
                    'action': 'query'
                })
        
        elif intent == 'contact':
            for suggestion in self.suggestion_categories['business'][:4]:
                suggestions.append({
                    'text': suggestion,
                    'type': 'business',
                    'category': 'contact',
                    'action': 'query'
                })
        
        elif intent == 'technology':
            for suggestion in self.suggestion_categories['technologies'][:4]:
                suggestions.append({
                    'text': suggestion,
                    'type': 'technology',
                    'category': 'technology',
                    'action': 'query'
                })
        
        elif intent == 'about':
            for suggestion in self.suggestion_categories['about'][:4]:
                suggestions.append({
                    'text': suggestion,
                    'type': 'about',
                    'category': 'about',
                    'action': 'query'
                })
        
        return suggestions
    
    def _get_context_suggestions(self, conversation_context: List[Dict] = None) -> List[Dict]:
        """Get suggestions based on conversation context"""
        if not conversation_context:
            return []
        
        suggestions = []
        last_intent = conversation_context[-1].get('intent', '') if conversation_context else ''
        
        if last_intent == 'services':
            for suggestion in self.context_suggestions['after_services'][:3]:
                suggestions.append({
                    'text': suggestion,
                    'type': 'follow_up',
                    'category': 'context',
                    'action': 'query'
                })
        
        elif last_intent == 'pricing':
            for suggestion in self.context_suggestions['after_pricing'][:3]:
                suggestions.append({
                    'text': suggestion,
                    'type': 'follow_up',
                    'category': 'context',
                    'action': 'query'
                })
        
        elif last_intent == 'contact':
            for suggestion in self.context_suggestions['after_contact'][:3]:
                suggestions.append({
                    'text': suggestion,
                    'type': 'follow_up',
                    'category': 'context',
                    'action': 'query'
                })
        
        elif last_intent == 'technology':
            for suggestion in self.context_suggestions['after_technology'][:3]:
                suggestions.append({
                    'text': suggestion,
                    'type': 'follow_up',
                    'category': 'context',
                    'action': 'query'
                })
        
        return suggestions
    
    def _get_industry_suggestions(self, industries: List[str]) -> List[Dict]:
        """Get industry-specific suggestions"""
        suggestions = []
        
        for industry in industries[:2]:  # Limit to top 2 industries
            if industry in self.industry_suggestions:
                for suggestion in self.industry_suggestions[industry][:2]:
                    suggestions.append({
                        'text': suggestion,
                        'type': 'industry',
                        'category': industry,
                        'action': 'query'
                    })
        
        return suggestions
    
    def _get_service_suggestions(self, services: List[str]) -> List[Dict]:
        """Get service-specific suggestions"""
        suggestions = []
        
        service_follow_ups = {
            'website_development': [
                "What's the cost for website development?",
                "How long does website development take?",
                "Do you provide website maintenance?"
            ],
            'mobile_development': [
                "What's the cost for mobile app development?",
                "Do you develop for iOS and Android?",
                "How long does mobile app development take?"
            ],
            'ai_ml': [
                "What AI/ML technologies do you use?",
                "Can you help with AI strategy?",
                "Do you provide AI training?"
            ],
            'cloud_services': [
                "Which cloud platforms do you support?",
                "What's the cost for cloud migration?",
                "Do you provide cloud security?"
            ]
        }
        
        for service in services[:2]:  # Limit to top 2 services
            if service in service_follow_ups:
                for suggestion in service_follow_ups[service][:2]:
                    suggestions.append({
                        'text': suggestion,
                        'type': 'service_followup',
                        'category': service,
                        'action': 'query'
                    })
        
        return suggestions
    
    def get_quick_actions(self) -> List[Dict]:
        """Get quick action suggestions"""
        return [
            {
                'text': "Get Free Quote",
                'type': 'action',
                'category': 'business',
                'action': 'contact'
            },
            {
                'text': "Schedule Consultation",
                'type': 'action',
                'category': 'business',
                'action': 'contact'
            },
            {
                'text': "View Portfolio",
                'type': 'action',
                'category': 'portfolio',
                'action': 'portfolio'
            },
            {
                'text': "Download Brochure",
                'type': 'action',
                'category': 'business',
                'action': 'download'
            }
        ]

# Global instance
suggestion_engine = SuggestionEngine()
