# Venturing Digitally - AI Chatbot Project Requirements

## Project Overview
This is a comprehensive AI-powered chatbot system for Venturing Digitally website, featuring advanced natural language processing, conversation memory, and intelligent response generation.

## System Requirements

### Backend Requirements (Python 3.8+)
```
beautifulsoup4==4.12.3
requests==2.32.3
urllib3==2.2.3
fastapi==0.115.0
uvicorn[standard]==0.30.6
python-dotenv==1.0.1
openai==1.51.0
pydantic==2.9.2
tenacity==9.0.0
schedule==1.2.2
orjson==3.10.7
numpy==2.1.3
httpx==0.27.2
fastembed==0.7.3
transformers==4.36.0
torch==2.1.0
```

### Frontend Requirements (Node.js 16+)
```
React 18+
TypeScript 4.9+
Tailwind CSS 3.0+
Vite 4.0+
```

## Key Features

### 🤖 AI-Powered Chatbot
- **Advanced NLP**: Intent classification, sentiment analysis, entity extraction
- **Conversation Memory**: Context-aware responses with conversation history
- **Local LLM Support**: Works without OpenAI API key using local models
- **Intelligent Suggestions**: Auto-suggestions based on user queries

### 🎯 Core Capabilities
- **Website Content Integration**: Scrapes and processes Venturing Digitally website
- **Service Information**: Detailed information about all company services
- **Pricing Queries**: Flexible pricing information and quotes
- **Contact Details**: Multiple contact channels and support options
- **Technology Stack**: Comprehensive tech stack information

### 🎨 Modern UI/UX
- **Responsive Design**: Works on all devices
- **Glass Morphism**: Modern, elegant interface
- **Animations**: Smooth transitions and interactions
- **Custom Scrollbars**: Enhanced user experience
- **Gradient Backgrounds**: Professional visual appeal

### 🔧 Technical Features
- **Vector Search**: Semantic similarity search for relevant content
- **Text Chunking**: Intelligent content segmentation
- **Admin Dashboard**: Complete conversation monitoring and analytics
- **Auto-Suggestions**: Context-aware query suggestions
- **Clean Formatting**: Professional, structured responses

### 📊 Admin Panel Features
- **Real-time Monitoring**: Live conversation tracking
- **Analytics Dashboard**: Session statistics and performance metrics
- **Conversation History**: Complete chat logs with timestamps
- **User Insights**: Intent analysis and query patterns
- **Performance Metrics**: Response times and usage statistics
- **Export Capabilities**: Data export for analysis

## Installation Instructions

### 1. Backend Setup
```bash
# Install Python dependencies
pip install -r requirements.txt

# Start the backend server
python -m uvicorn backend.app:app --reload --port 8000
```

### 2. Frontend Setup
```bash
# Install Node.js dependencies
cd frontend
npm install

# Start the development server
npm run dev
```

### 3. Data Processing
```bash
# Create knowledge base from Venturing Digitally website
python create_venturing_knowledge_base.py

# Process and ingest data
python process_venturing_data.py
```

## Project Structure
```
Vedu/
├── backend/                 # FastAPI backend
│   ├── app.py              # Main application
│   ├── router_chat.py      # Chat endpoints
│   ├── venturing_ai_model.py # AI model
│   ├── conversation_memory.py # Memory management
│   ├── suggestion_engine.py # Auto-suggestions
│   └── db.py               # Vector database
├── frontend/               # React frontend
│   ├── src/components/     # React components
│   └── ChatWidget.tsx      # Main chat widget
├── data/                   # Processed data
│   ├── chunks.jsonl        # Text chunks
│   ├── docs.jsonl          # Documents
│   └── index.npy           # Vector index
├── scraper/                # Web scraping utilities
└── requirements.txt        # Python dependencies
```

## API Endpoints
- `POST /chat` - Main chat endpoint
- `GET /admin` - Admin dashboard (HTML interface)
- `GET /admin/api/stats` - Admin dashboard API
- `GET /health` - Health check

## Configuration
- Environment variables for API keys
- Configurable chunk sizes and similarity thresholds
- Customizable response templates
- Flexible scraping parameters

## Performance Features
- **Fast Response Times**: Optimized vector search
- **Scalable Architecture**: Modular design
- **Memory Efficient**: Smart conversation management
- **Error Handling**: Robust error management
- **Caching**: Intelligent response caching

## Security Features
- **Input Validation**: Pydantic models for data validation
- **CORS Protection**: Configurable cross-origin policies
- **Error Sanitization**: Clean error responses
- **Rate Limiting**: Built-in request limiting

## Deployment Ready
- **Production Configuration**: Uvicorn with standard features
- **Environment Management**: Dotenv for configuration
- **Health Monitoring**: Built-in health checks
- **Logging**: Comprehensive logging system

## Admin Panel Access
- **URL**: `http://localhost:8000/admin`
- **Features**: Real-time conversation monitoring
- **Statistics**: Session counts, response times, user insights
- **Conversation Logs**: Complete chat history with timestamps
- **Performance Metrics**: Usage analytics and trends

## Support & Maintenance
- **24/7 Support**: Continuous monitoring
- **Regular Updates**: Scheduled content updates
- **Performance Monitoring**: Built-in analytics
- **Easy Maintenance**: Modular architecture
- **Admin Dashboard**: Complete system oversight

---

**Project Status**: ✅ Production Ready
**Last Updated**: September 2024
**Version**: 1.0.0
