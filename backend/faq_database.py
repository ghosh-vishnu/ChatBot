#!/usr/bin/env python3
"""
Database-based FAQ System
This allows any company to use the chatbot by just updating their database
"""

import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Any, Optional

class FAQDatabase:
    """Database-based FAQ management system"""
    
    def __init__(self, db_path: str = "venturing.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize FAQ tables in database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create FAQ categories table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS faq_categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create FAQs table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS faqs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                category_id INTEGER,
                custom_category TEXT,
                views INTEGER DEFAULT 0,
                success_rate INTEGER DEFAULT 85,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES faq_categories (id)
            )
        ''')
        
        # Create index for better performance
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_faqs_question 
            ON faqs(question)
        ''')
        
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_faqs_active 
            ON faqs(is_active)
        ''')
        
        conn.commit()
        conn.close()
        
        # Insert default categories if they don't exist
        self._insert_default_categories()
    
    def _insert_default_categories(self):
        """Insert default FAQ categories"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        default_categories = [
            ("General", "General questions and information"),
            ("Pricing", "Pricing and billing related questions"),
            ("Support", "Technical support and help"),
            ("Services", "Information about our services"),
            ("Company", "Company information and policies"),
            ("Custom", "Custom category for specific needs")
        ]
        
        for name, description in default_categories:
            cursor.execute('''
                INSERT OR IGNORE INTO faq_categories (name, description)
                VALUES (?, ?)
            ''', (name, description))
        
        conn.commit()
        conn.close()
    
    def create_faq(self, question: str, answer: str, category_name: str = "General", custom_category: str = "") -> Dict[str, Any]:
        """Create a new FAQ in database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Get category ID
            cursor.execute('SELECT id FROM faq_categories WHERE name = ?', (category_name,))
            category_result = cursor.fetchone()
            category_id = category_result[0] if category_result else 1
            
            # Insert FAQ
            cursor.execute('''
                INSERT INTO faqs (question, answer, category_id, custom_category)
                VALUES (?, ?, ?, ?)
            ''', (question, answer, category_id, custom_category))
            
            faq_id = cursor.lastrowid
            
            conn.commit()
            
            return {
                "id": faq_id,
                "question": question,
                "answer": answer,
                "category": category_name,
                "customCategory": custom_category,
                "views": 0,
                "success_rate": 85,
                "is_active": True,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
    
    def get_all_faqs(self, active_only: bool = True) -> List[Dict[str, Any]]:
        """Get all FAQs from database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        query = '''
            SELECT f.id, f.question, f.answer, c.name as category, f.custom_category,
                   f.views, f.success_rate, f.is_active, f.created_at, f.updated_at
            FROM faqs f
            LEFT JOIN faq_categories c ON f.category_id = c.id
        '''
        
        if active_only:
            query += ' WHERE f.is_active = 1'
        
        query += ' ORDER BY f.created_at DESC'
        
        cursor.execute(query)
        rows = cursor.fetchall()
        
        faqs = []
        for row in rows:
            faqs.append({
                "id": f"faq_{row[0]}",
                "question": row[1],
                "answer": row[2],
                "category": row[3] or "General",
                "customCategory": row[4] or "",
                "views": row[5],
                "success_rate": row[6],
                "is_active": bool(row[7]),
                "created_at": row[8],
                "updated_at": row[9]
            })
        
        conn.close()
        return faqs
    
    def find_matching_faq(self, query: str) -> Optional[Dict[str, Any]]:
        """Find matching FAQ using improved keyword matching"""
        query_lower = query.lower().strip()
        
        # Remove common words that don't add meaning
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'do', 'does', 'did', 'are', 'is', 'was', 'were', 'have', 'has', 'had', 'will', 'would', 'could', 'should', 'can', 'may', 'might', 'must', 'shall'}
        
        # Extract meaningful keywords from query
        query_words = [word for word in query_lower.split() if word not in stop_words and len(word) > 2]
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get all active FAQs
        cursor.execute('''
            SELECT f.id, f.question, f.answer, c.name as category, f.custom_category,
                   f.views, f.success_rate
            FROM faqs f
            LEFT JOIN faq_categories c ON f.category_id = c.id
            WHERE f.is_active = 1
        ''')
        
        rows = cursor.fetchall()
        conn.close()
        
        best_match = None
        best_score = 0
        
        for row in rows:
            faq = {
                "id": f"faq_{row[0]}",
                "question": row[1],
                "answer": row[2],
                "category": row[3] or "General",
                "customCategory": row[4] or "",
                "views": row[5],
                "success_rate": row[6]
            }
            
            score = self._calculate_match_score(query_lower, query_words, faq)
            
            if score > best_score:
                best_score = score
                best_match = faq
        
        # Only return matches with score >= 10 (balanced threshold for accuracy)
        return best_match if best_score >= 10 else None
    
    def _calculate_match_score(self, query_lower: str, query_words: list, faq: dict) -> int:
        """Calculate match score for FAQ with improved matching logic"""
        score = 0
        question_lower = faq["question"].lower()
        answer_lower = faq["answer"].lower()
        question_words = question_lower.split()
        
        # Remove common words that cause false matches
        common_words = {'you', 'your', 'we', 'our', 'us', 'i', 'me', 'my', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'what', 'are', 'is', 'do', 'does', 'did', 'can', 'will', 'would', 'could', 'should', 'how', 'when', 'where', 'why'}
        
        # Filter out common words from query_words
        meaningful_query_words = [word for word in query_words if word not in common_words and len(word) > 2]
        
        # If no meaningful words, return 0
        if not meaningful_query_words:
            return 0
        
        # Exact phrase match (highest priority)
        if query_lower in question_lower:
            score += 100
        
        # Word-by-word matching with meaningful words only
        for query_word in meaningful_query_words:
            # Remove question marks and punctuation for better matching
            clean_query_word = query_word.rstrip('?.,!')
            clean_question_words = [word.rstrip('?.,!') for word in question_words]
            
            if clean_query_word in clean_question_words:
                score += 20  # Higher weight for exact word matches in question
            elif clean_query_word in answer_lower:
                score += 5   # Lower weight for answer matches
        
        # Partial word matching for technical terms (only for meaningful words)
        for query_word in meaningful_query_words:
            for question_word in question_words:
                if len(query_word) > 3 and len(question_word) > 3:  # Only for longer words
                    if query_word in question_word or question_word in query_word:
                        score += 5
        
        # Check for semantic matches
        semantic_matches = {
            'services': ['service', 'offer', 'provide', 'deliver', 'solution'],
            'support': ['help', 'assist', 'maintenance', 'support', 'service'],
            'pricing': ['price', 'pricing', 'cost', 'rate', 'fee', 'budget', 'charge', 'plans'],
            'contact': ['reach', 'call', 'email', 'connect', 'get in touch'],
            'hiring': ['job', 'career', 'employment', 'work', 'position', 'hiring', 'recruitment', 'talented', 'developer', 'programmer'],
            'internship': ['intern', 'training', 'learn', 'study', 'course'],
            'development': ['develop', 'build', 'create', 'make', 'design'],
            'technology': ['tech', 'software', 'app', 'website', 'system']
        }
        
        for category, keywords in semantic_matches.items():
            if any(keyword in query_lower for keyword in keywords):
                if any(keyword in question_lower or keyword in answer_lower for keyword in keywords):
                    score += 3
        
        # Minimum threshold for meaningful matches
        if score > 0 and len(meaningful_query_words) == 0:
            score = 0
            
        return score
    
    def increment_views(self, faq_id: str) -> bool:
        """Increment view count for an FAQ"""
        try:
            # Extract numeric ID from faq_id (e.g., "faq_123" -> 123)
            numeric_id = int(faq_id.replace("faq_", ""))
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE faqs SET views = views + 1, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (numeric_id,))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error incrementing views: {e}")
            return False
    
    def update_faq(self, faq_id: str, **updates) -> Optional[Dict[str, Any]]:
        """Update an existing FAQ"""
        try:
            numeric_id = int(faq_id.replace("faq_", ""))
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Build update query dynamically
            set_clauses = []
            values = []
            
            for key, value in updates.items():
                if key in ['question', 'answer', 'custom_category']:
                    set_clauses.append(f"{key} = ?")
                    values.append(value)
                elif key == 'category':
                    # Get category ID
                    cursor.execute('SELECT id FROM faq_categories WHERE name = ?', (value,))
                    category_result = cursor.fetchone()
                    if category_result:
                        set_clauses.append("category_id = ?")
                        values.append(category_result[0])
            
            if set_clauses:
                set_clauses.append("updated_at = CURRENT_TIMESTAMP")
                values.append(numeric_id)
                
                query = f"UPDATE faqs SET {', '.join(set_clauses)} WHERE id = ?"
                cursor.execute(query, values)
                
                conn.commit()
            
            conn.close()
            return self.get_faq_by_id(faq_id)
        except Exception as e:
            print(f"Error updating FAQ: {e}")
            return None
    
    def delete_faq(self, faq_id: str) -> bool:
        """Delete an FAQ (soft delete by setting is_active = 0)"""
        try:
            numeric_id = int(faq_id.replace("faq_", ""))
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE faqs SET is_active = 0, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (numeric_id,))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error deleting FAQ: {e}")
            return False
    
    def hard_delete_faq(self, faq_id: str) -> bool:
        """Permanently delete an FAQ from database"""
        try:
            numeric_id = int(faq_id.replace("faq_", ""))
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # First check if FAQ exists
            cursor.execute('SELECT id FROM faqs WHERE id = ?', (numeric_id,))
            if not cursor.fetchone():
                conn.close()
                return False
            
            # Permanently delete the FAQ
            cursor.execute('DELETE FROM faqs WHERE id = ?', (numeric_id,))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error hard deleting FAQ: {e}")
            return False
    
    def get_faq_by_id(self, faq_id: str) -> Optional[Dict[str, Any]]:
        """Get FAQ by ID"""
        try:
            numeric_id = int(faq_id.replace("faq_", ""))
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT f.id, f.question, f.answer, c.name as category, f.custom_category,
                       f.views, f.success_rate, f.is_active, f.created_at, f.updated_at
                FROM faqs f
                LEFT JOIN faq_categories c ON f.category_id = c.id
                WHERE f.id = ?
            ''', (numeric_id,))
            
            row = cursor.fetchone()
            conn.close()
            
            if row:
                return {
                    "id": f"faq_{row[0]}",
                    "question": row[1],
                    "answer": row[2],
                    "category": row[3] or "General",
                    "customCategory": row[4] or "",
                    "views": row[5],
                    "success_rate": row[6],
                    "is_active": bool(row[7]),
                    "created_at": row[8],
                    "updated_at": row[9]
                }
            return None
        except Exception as e:
            print(f"Error getting FAQ by ID: {e}")
            return None
    
    def migrate_from_json(self, json_file_path: str) -> int:
        """Migrate FAQs from JSON file to database"""
        try:
            with open(json_file_path, 'r', encoding='utf-8') as f:
                faqs = json.load(f)
            
            migrated_count = 0
            for faq in faqs:
                try:
                    self.create_faq(
                        question=faq.get("question", ""),
                        answer=faq.get("answer", ""),
                        category_name=faq.get("category", "General"),
                        custom_category=faq.get("customCategory", "")
                    )
                    migrated_count += 1
                except Exception as e:
                    print(f"Error migrating FAQ: {e}")
                    continue
            
            return migrated_count
        except Exception as e:
            print(f"Error migrating from JSON: {e}")
            return 0

# Global instance
faq_db = FAQDatabase()
