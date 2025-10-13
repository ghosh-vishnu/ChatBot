from __future__ import annotations

import json
import os
from typing import List, Dict, Any, Tuple
from difflib import SequenceMatcher

class FAQHandler:
    def __init__(self):
        self.faq_data = self._load_faq_data()
        self.faq_questions = self._extract_all_questions()
    
    def _load_faq_data(self) -> Dict[str, Any]:
        """Load FAQ data from JSON file"""
        # Try multiple possible paths
        possible_paths = [
            os.path.join(os.getenv("DATA_DIR", "data"), "faq_data.json"),
            os.path.join("..", "data", "faq_data.json"),
            os.path.join("data", "faq_data.json"),
            "faq_data.json"
        ]
        
        for faq_path in possible_paths:
            try:
                with open(faq_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except FileNotFoundError:
                continue
        
        print(f"Warning: Could not find faq_data.json in any of these paths: {possible_paths}")
        return {"faq_categories": {}}
    
    def _extract_all_questions(self) -> List[Dict[str, str]]:
        """Extract all questions from FAQ data"""
        questions = []
        for category, data in self.faq_data.get("faq_categories", {}).items():
            for qa in data.get("questions", []):
                questions.append({
                    "question": qa["question"],
                    "answer": qa["answer"],
                    "category": category,
                    "title": data.get("title", "")
                })
        return questions
    
    def find_best_match(self, user_query: str, threshold: float = 0.6) -> Tuple[Dict[str, str], float]:
        """Find the best matching FAQ question with improved matching"""
        user_query_lower = user_query.lower().strip()
        best_match = None
        best_score = 0.0
        
        for faq in self.faq_questions:
            # Calculate similarity with question (much higher weight)
            question_similarity = self._calculate_similarity(user_query_lower, faq["question"].lower())
            
            # Calculate similarity with answer (very low weight)
            answer_similarity = self._calculate_similarity(user_query_lower, faq["answer"].lower())
            
            # Weighted combination - question similarity is much more important
            weighted_similarity = (question_similarity * 0.95) + (answer_similarity * 0.05)
            
            # Additional check for exact keyword matches
            if self._has_exact_keywords(user_query_lower, faq["question"].lower()):
                weighted_similarity += 0.2
            
            # Boost for exact question matches
            if user_query_lower == faq["question"].lower():
                weighted_similarity = 1.0
                best_score = weighted_similarity
                best_match = faq
                break  # Exact match found, no need to continue
            
            if weighted_similarity > best_score and weighted_similarity >= threshold:
                best_score = weighted_similarity
                best_match = faq
        
        return best_match, best_score
    
    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """Calculate similarity between two texts with keyword boost"""
        base_similarity = SequenceMatcher(None, text1, text2).ratio()
        
        # Boost similarity for keyword matches
        text1_words = set(text1.lower().split())
        text2_words = set(text2.lower().split())
        common_words = text1_words.intersection(text2_words)
        
        if common_words:
            keyword_boost = len(common_words) * 0.1
            return min(base_similarity + keyword_boost, 1.0)
        
        return base_similarity
    
    def _has_exact_keywords(self, user_query: str, faq_question: str) -> bool:
        """Check if user query has exact keywords from FAQ question"""
        user_words = set(user_query.split())
        faq_words = set(faq_question.split())
        
        # Check for important keyword matches
        important_keywords = ['web', 'development', 'training', 'internship', 'mobile', 'app', 'ai', 'ml', 'data', 'analytics', 'devops', 'cloud', 'software', 'hrms', 'crm', 'erp']
        
        user_important = user_words.intersection(set(important_keywords))
        faq_important = faq_words.intersection(set(important_keywords))
        
        # If both have same important keywords, it's a good match
        if user_important and faq_important:
            return len(user_important.intersection(faq_important)) > 0
        
        return False
    
    def _find_category_by_title(self, user_query: str) -> Dict[str, Any]:
        """Find category by title or keywords"""
        # Check for exact category title matches
        for cat_key, cat_data in self.faq_data.get("faq_categories", {}).items():
            title = cat_data.get("title", "").lower()
            
            # Exact title match
            if user_query == title:
                return {
                    "key": cat_key,
                    "title": cat_data.get("title", ""),
                    "questions": cat_data.get("questions", [])
                }
            
            # Partial title match
            if title in user_query or user_query in title:
                return {
                    "key": cat_key,
                    "title": cat_data.get("title", ""),
                    "questions": cat_data.get("questions", [])
                }
        
        # Check for keyword-based category matching
        category_keywords = {
            "internship_training": ["internship", "training", "internships", "trainings"],
            "web_development": ["web", "website", "development", "web development"],
            "mobile_development": ["mobile", "app", "android", "ios", "mobile app"],
            "ai_ml": ["ai", "ml", "machine learning", "artificial intelligence", "data science"],
            "devops": ["devops", "cloud", "aws", "azure", "deployment"],
            "company_info": ["company", "location", "office", "about", "contact"],
            "services": ["services", "what we do", "offer", "provide"],
            "software_products": ["software", "hrms", "crm", "erp", "products"],
            "pricing_support": ["pricing", "cost", "support", "maintenance", "price"]
        }
        
        for cat_key, keywords in category_keywords.items():
            if any(keyword in user_query for keyword in keywords):
                cat_data = self.faq_data.get("faq_categories", {}).get(cat_key, {})
                if cat_data:
                    return {
                        "key": cat_key,
                        "title": cat_data.get("title", ""),
                        "questions": cat_data.get("questions", [])
                    }
        
        return None
    
    def get_category_questions(self, category: str) -> List[Dict[str, str]]:
        """Get all questions from a specific category"""
        if category in self.faq_data.get("faq_categories", {}):
            return self.faq_data["faq_categories"][category].get("questions", [])
        return []
    
    def get_all_categories(self) -> List[Dict[str, str]]:
        """Get all FAQ categories"""
        categories = []
        for cat_key, cat_data in self.faq_data.get("faq_categories", {}).items():
            categories.append({
                "key": cat_key,
                "title": cat_data.get("title", ""),
                "question_count": len(cat_data.get("questions", []))
            })
        return categories
    
    def search_faqs(self, query: str, category: str = None) -> List[Dict[str, str]]:
        """Search FAQs by query and optionally filter by category"""
        query_lower = query.lower()
        results = []
        
        for faq in self.faq_questions:
            if category and faq["category"] != category:
                continue
                
            # Check if query matches question or answer
            question_match = self._calculate_similarity(query_lower, faq["question"].lower())
            answer_match = self._calculate_similarity(query_lower, faq["answer"].lower())
            
            if question_match > 0.3 or answer_match > 0.3:
                results.append({
                    **faq,
                    "relevance_score": max(question_match, answer_match)
                })
        
        # Sort by relevance score
        results.sort(key=lambda x: x["relevance_score"], reverse=True)
        return results[:5]  # Return top 5 results
    
    def get_suggested_questions(self, category: str = None, limit: int = 5) -> List[str]:
        """Get suggested questions for a category or random questions"""
        if category:
            questions = self.get_category_questions(category)
        else:
            questions = self.faq_questions
        
        # Return random sample of questions
        import random
        if len(questions) <= limit:
            return [q["question"] for q in questions]
        else:
            return [q["question"] for q in random.sample(questions, limit)]
    
    def handle_faq_query(self, user_query: str) -> Dict[str, Any]:
        """Handle FAQ query and return structured response"""
        user_query_lower = user_query.lower().strip()
        
        # Try to find exact match first
        best_match, score = self.find_best_match(user_query, threshold=0.7)
        
        if best_match:
            return {
                "type": "faq_answer",
                "answer": best_match["answer"],
                "question": best_match["question"],
                "category": best_match["category"],
                "title": best_match["title"],
                "confidence": score,
                "suggestions": self.get_suggested_questions(best_match["category"], 3)
            }
        
        # If no exact match, search for related FAQs
        search_results = self.search_faqs(user_query)
        
        if search_results:
            return {
                "type": "faq_suggestions",
                "message": "I found some related questions that might help:",
                "suggestions": [
                    {
                        "question": result["question"],
                        "answer": result["answer"][:100] + "..." if len(result["answer"]) > 100 else result["answer"],
                        "category": result["category"]
                    }
                    for result in search_results[:3]
                ],
                "suggested_questions": self.get_suggested_questions(limit=3)
            }
        
        # If no FAQ match, return general response
        return {
            "type": "no_faq_match",
            "message": "I couldn't find a specific FAQ for your question, but I can help you with general information about our services.",
            "suggested_questions": self.get_suggested_questions(limit=5)
        }

# Global FAQ handler instance
faq_handler = FAQHandler()
