from __future__ import annotations

import os
from typing import Optional

try:
    from transformers import pipeline, AutoTokenizer, AutoModelForCausalLM
    _TRANSFORMERS_AVAILABLE = True
except ImportError:
    _TRANSFORMERS_AVAILABLE = False

# Global variables for model caching
_local_model = None
_local_tokenizer = None

def get_local_llm():
    """Get or initialize local LLM model"""
    global _local_model, _local_tokenizer
    
    if not _TRANSFORMERS_AVAILABLE:
        return None, None
    
    if _local_model is None:
        try:
            # Use a smaller, faster model for local inference
            model_name = "microsoft/DialoGPT-small"  # Lightweight conversational model
            
            print("Loading local LLM model...")
            _local_tokenizer = AutoTokenizer.from_pretrained(model_name)
            _local_model = AutoModelForCausalLM.from_pretrained(model_name)
            
            # Add padding token if not present
            if _local_tokenizer.pad_token is None:
                _local_tokenizer.pad_token = _local_tokenizer.eos_token
                
            print("Local LLM model loaded successfully!")
            
        except Exception as e:
            print(f"Failed to load local LLM: {e}")
            return None, None
    
    return _local_model, _local_tokenizer

def generate_ai_response(query: str, context: str) -> str:
    """Generate AI response using local LLM"""
    
    model, tokenizer = get_local_llm()
    if model is None or tokenizer is None:
        return None
    
    try:
        # Create prompt for the model
        prompt = f"Context: {context}\n\nQuestion: {query}\nAnswer:"
        
        # Tokenize input
        inputs = tokenizer.encode(prompt, return_tensors="pt", max_length=512, truncation=True)
        
        # Generate response
        with tokenizer.pad_token:
            outputs = model.generate(
                inputs,
                max_length=inputs.shape[1] + 100,  # Generate up to 100 new tokens
                num_return_sequences=1,
                temperature=0.7,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id
            )
        
        # Decode response
        response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Extract only the answer part
        if "Answer:" in response:
            answer = response.split("Answer:")[-1].strip()
        else:
            answer = response[len(prompt):].strip()
        
        return answer if answer else None
        
    except Exception as e:
        print(f"Error generating AI response: {e}")
        return None

def analyze_sentiment(text: str) -> str:
    """Analyze sentiment of user query"""
    try:
        if not _TRANSFORMERS_AVAILABLE:
            return "neutral"
        
        # Use a simple sentiment analysis pipeline
        sentiment_pipeline = pipeline("sentiment-analysis", 
                                    model="cardiffnlp/twitter-roberta-base-sentiment-latest",
                                    return_all_scores=True)
        
        result = sentiment_pipeline(text)
        if result and len(result) > 0:
            scores = result[0]
            # Find the highest scoring sentiment
            best_sentiment = max(scores, key=lambda x: x['score'])
            return best_sentiment['label'].lower()
        
    except Exception as e:
        print(f"Sentiment analysis error: {e}")
    
    return "neutral"

def extract_key_entities(text: str) -> list:
    """Extract key entities from text using NER"""
    try:
        if not _TRANSFORMERS_AVAILABLE:
            return []
        
        # Use a lightweight NER model
        ner_pipeline = pipeline("ner", 
                              model="dbmdz/bert-large-cased-finetuned-conll03-english",
                              aggregation_strategy="simple")
        
        entities = ner_pipeline(text)
        return [entity['word'] for entity in entities if entity['score'] > 0.5]
        
    except Exception as e:
        print(f"Entity extraction error: {e}")
    
    return []

