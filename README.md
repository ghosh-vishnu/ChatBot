# 🚀 Venturing Digitally - AI Chatbot Project

<div align="center">

![Project Logo](https://img.shields.io/badge/Venturing-Digitally-blue?style=for-the-badge&logo=react)
![React](https://img.shields.io/badge/React-18.3.1-blue?style=for-the-badge&logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-green?style=for-the-badge&logo=fastapi)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6.2-blue?style=for-the-badge&logo=typescript)
![Python](https://img.shields.io/badge/Python-3.8+-yellow?style=for-the-badge&logo=python)

**A comprehensive AI-powered chatbot system with advanced admin dashboard**

[🚀 Quick Start](#-quick-start) • [📖 Documentation](#-documentation) • [🎯 Features](#-features) • [🔧 Setup](#-setup)

</div>

---

## 🎯 Project Overview

**Venturing Digitally** is a complete AI chatbot solution designed for modern web applications. It features an intelligent chatbot with local LLM integration, comprehensive admin dashboard, and real-time analytics.

### ✨ Key Highlights
- 🤖 **AI-Powered Chatbot** with local LLM
- 📊 **Advanced Admin Dashboard** with real-time analytics
- 🔐 **Secure Authentication** system
- 📱 **Responsive Design** for all devices
- ⚡ **Real-time Updates** and monitoring
- 🛡️ **Production Ready** with security features

---

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   AI/ML Stack   │
│   (React)       │◄──►│   (FastAPI)     │◄──►│   (Local LLM)   │
│                 │    │                 │    │                 │
│ • ChatWidget    │    │ • Chat API      │    │ • RAG System    │
│ • Admin Panel   │    │ • Admin API     │    │ • Vector DB     │
│ • Analytics     │    │ • FAQ Handler   │    │ • Embeddings    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 16+ and npm
- **Python** 3.8+
- **Git**

### 1. Clone Repository
```bash
git clone <repository-url>
cd Venturing-Digitally-Project
```

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app:app --host 0.0.0.0 --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 4. Access Applications
- **🌐 Main Website:** http://localhost:5173/
- **🔐 Admin Panel:** http://localhost:5173/admin.html
- **⚙️ Backend API:** http://localhost:8000

---

## 🎯 Features

### 🤖 AI Chatbot System
- **Intelligent Responses** with local LLM
- **FAQ Integration** with smart matching
- **Typing Suggestions** for better UX
- **Conversation Memory** for context
- **Multi-language Support**

### 📊 Admin Dashboard
- **Real-time Analytics** and metrics
- **Live Chat Monitoring** 
- **User Management** system
- **FAQ Management** interface
- **AI Model Management**
- **Content Management** system
- **System Monitoring** and health checks

### 🔐 Security Features
- **Separate URLs** for public and admin
- **Authentication** required for admin
- **Session Management** with auto-logout
- **Secure API** endpoints
- **Input Validation** and sanitization

---

## 📁 Project Structure

```
Venturing-Digitally-Project/
├── frontend/                    # React Frontend
│   ├── src/
│   │   ├── components/          # React Components
│   │   │   ├── ChatWidget.tsx   # Main chatbot
│   │   │   ├── AdminDashboard.tsx # Admin dashboard
│   │   │   └── AdminComponents/ # Admin sub-components
│   │   ├── admin/               # Admin panel
│   │   └── App.tsx              # Main app
│   ├── index.html               # Main website
│   ├── admin.html               # Admin panel
│   └── package.json
├── backend/                     # Python Backend
│   ├── app.py                   # FastAPI main app
│   ├── router_chat.py           # Chat API
│   ├── admin_dashboard.py       # Admin API
│   ├── faq_handler.py           # FAQ management
│   └── requirements.txt
├── data/                        # Data Storage
│   ├── faq_data.json            # FAQ database
│   └── venturing_digitally_data.json
└── README.md                    # This file
```

---

## 🔧 Setup Guide

### Backend Configuration
```python
# backend/config.py
OPENAI_API_KEY = "your_openai_key"
CHAT_MODEL = "your_model_name"
DATA_DIR = "./data"
TOP_K = 5
MAX_CONTEXT_CHARS = 4000
```

### Frontend Configuration
```typescript
// frontend/src/config.ts
export const API_URL = 'http://localhost:8000'
export const ADMIN_URL = '/admin.html'
```

### Admin Credentials
- **Username:** `admin`
- **Password:** `admin123`

---

## 📊 API Documentation

### Chat API
```http
POST /chat
Content-Type: application/json

{
  "message": "What services do you offer?",
  "user_id": "user123"
}
```

### Response
```json
{
  "response": "We offer web development, mobile app development, AI/ML solutions, and more.",
  "suggestions": [
    {
      "text": "Do you provide training?",
      "type": "question",
      "category": "Training"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 🎨 UI Components

### ChatWidget Features
- **Animated Interface** with smooth transitions
- **Typing Indicators** and loading states
- **Message History** with timestamps
- **Quick Suggestions** for common questions
- **Responsive Design** for all devices

### Admin Dashboard Features
- **Real-time Metrics** with live updates
- **Interactive Charts** and visualizations
- **Bulk Operations** for efficient management
- **Search and Filter** capabilities
- **Modal Dialogs** for detailed views

---

## 🚀 Deployment

### Production Build
```bash
# Build frontend
cd frontend
npm run build

# Build admin panel
npm run build:admin

# Start backend
cd backend
python -m uvicorn app:app --host 0.0.0.0 --port 8000
```

### Docker Deployment
```dockerfile
# Frontend
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 🧪 Testing

### Frontend Testing
```bash
npm test
npm run test:coverage
```

### Backend Testing
```bash
python -m pytest
python -m pytest --cov
```

---

## 📈 Performance

### Optimizations
- **Lazy Loading** for components
- **Virtual Scrolling** for large lists
- **Debounced Search** inputs
- **Efficient Re-renders** with React hooks
- **API Caching** strategies

### Monitoring
- **Real-time Metrics** tracking
- **Performance Monitoring** dashboard
- **Error Tracking** and logging
- **Resource Usage** monitoring

---

## 🔒 Security

### Authentication
- **Secure Login** system
- **Session Management** with tokens
- **Password Hashing** and validation
- **Role-based Access** control

### API Security
- **CORS Configuration** for cross-origin requests
- **Rate Limiting** to prevent abuse
- **Input Validation** and sanitization
- **SQL Injection** prevention

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create** feature branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** changes (`git commit -m 'Add some AmazingFeature'`)
4. **Push** to branch (`git push origin feature/AmazingFeature`)
5. **Open** Pull Request

---

## 📞 Support

- **📧 Email:** support@venturingdigitally.com
- **🐛 Issues:** [GitHub Issues](link)
- **📖 Docs:** [Project Documentation](PROJECT_DOCUMENTATION.md)
- **💬 Discussions:** [GitHub Discussions](link)

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🎉 Acknowledgments

- **React Team** for the amazing framework
- **FastAPI Team** for the excellent backend
- **Tailwind CSS** for utility-first styling
- **OpenAI** for AI inspiration
- **ChromaDB** for vector database

---

<div align="center">

**Built with ❤️ by Venturing Digitally Team**

![Made with Love](https://img.shields.io/badge/Made%20with-❤️-red?style=for-the-badge)

[⬆ Back to Top](#-venturing-digitally---ai-chatbot-project)

</div>