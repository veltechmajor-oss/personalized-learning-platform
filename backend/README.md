# Backend - Personalized Learning Platform

FastAPI backend providing RAG-powered tutoring, academic progress tracking, and integration with Qdrant, Google Gemini, and Firebase.

## Getting Started

### 1. Set Up Virtual Environment
```bash
python -m venv venv
# Windows:
venv\Scripts\activate
# Unix/macOS:
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Environment Variables
Copy `.env.example` to `.env` and fill in your keys:
```bash
cp .env.example .env
```

### 4. Run Development Server
```bash
uvicorn app.main:app --reload --port 8000
```
- API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health Check: [http://localhost:8000/api/health](http://localhost:8000/api/health)
