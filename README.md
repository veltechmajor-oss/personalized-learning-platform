# An Intelligent RAG-Based Personalized Learning and Academic Progress Management Platform

A full-stack, enterprise-grade educational web application combining document-grounded Retrieval-Augmented Generation (RAG), curriculum-aligned YouTube video lessons with automated playback gate thresholds, administrator-created objective assessments, and transparent academic progress tracking.

---

## 1. System Architecture

```text
personalized-learning-platform/
├── backend/                              # FastAPI REST Backend
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── auth.py              # Firebase auth token sync & admin provisioning
│   │   │   │   ├── users.py             # User management, role enforcement, status toggling
│   │   │   │   ├── documents.py         # PDF, DOCX, TXT upload & Qdrant vectorization
│   │   │   │   ├── learning.py          # Model 1: Grounded RAG Question Explainer
│   │   │   │   ├── videos.py            # Model 2: YouTube video management & watch gates
│   │   │   │   ├── assessments.py       # Model 2: Objective test authoring & auto-grading
│   │   │   │   ├── progress.py          # Topic mastery & transparent revision advice
│   │   │   │   └── health.py            # Service health probe
│   │   │   └── router.py                # Mounted v1 API Router
│   │   ├── core/
│   │   │   ├── config.py                # Pydantic Settings
│   │   │   ├── firebase.py              # Firebase Admin & Firestore with persistent fallback
│   │   │   └── security.py              # Bearer authentication & Role-Based Access Control
│   │   └── services/
│   │       ├── document_service.py      # Multi-format document text extraction & chunking
│   │       ├── embedding_service.py     # Gemini & deterministic vector embeddings
│   │       ├── qdrant_service.py        # Qdrant client with student tenant isolation
│   │       ├── gemini_service.py        # Grounded AI tutor explanation synthesizer
│   │       └── video_service.py         # YouTube video validation & ID parser
│   ├── tests/
│   │   └── test_platform.py             # Pytest automated test suite
│   ├── requirements.txt
│   └── .env.example
├── frontend/                             # Next.js 16 (App Router) + React 19 + Tailwind CSS
│   ├── src/
│   │   ├── app/
│   │   │   ├── login/                   # Student & Administrator Sign In
│   │   │   ├── register/                # Student Registration
│   │   │   ├── student/
│   │   │   │   ├── dashboard/           # Real-time metrics & model navigation
│   │   │   │   ├── documents/           # Document upload & vector status table
│   │   │   │   ├── important-questions/ # Model 1: Grounded RAG Question Explainer
│   │   │   │   ├── videos/              # Model 2: Embedded YouTube player & watch gate
│   │   │   │   ├── assessments/         # Model 2: Objective assessment interface
│   │   │   │   └── progress/            # Topic mastery breakdown & revision rules
│   │   │   └── admin/
│   │   │       ├── dashboard/           # Platform metrics & overview
│   │   │       ├── users/               # Student account status management
│   │   │       ├── videos/              # Video lesson CRUD & threshold setup
│   │   │       ├── assessments/         # Objective test authoring & answer keys
│   │   │       └── progress/            # Student academic dossiers & attempts
│   │   ├── components/                  # Navigation bars, route guards, and UI widgets
│   │   └── lib/
│   │       ├── firebase.ts              # Firebase client SDK initialization
│   │       ├── api.ts                   # Centralized API fetch wrapper with token injection
│   │       └── auth-context.tsx         # Global authentication state
│   └── package.json
└── render.yaml                          # Production Render blueprint deployment configuration
```

---

## 2. Core Functional Modules

### Model 1: RAG-Based Important Question Explainer
- **Document Ingestion**: Students upload `.pdf`, `.docx`, or `.txt` course materials.
- **Text Extraction**: Uses `pypdf` and `python-docx` with scanned PDF detection and character normalization.
- **Overlapping Chunking**: Divides text into 600-character chunks with 120-character overlap.
- **Vector Storage**: Stores dense embeddings and metadata in Qdrant collection `learning_materials` with student authorization filters.
- **Grounded Answering**: Evaluates queries against retrieved Qdrant vectors. Synthesizes explanations with Google Gemini. If context is insufficient, explicitly states: *"The uploaded study notes do not contain sufficient information to answer this question."*

### Model 2: Video Learning & Administrator Assessments
- **Video Lesson Management**: Instructors configure YouTube video URLs, topics, and completion thresholds (e.g., 80%).
- **Interactive Player**: Students stream lessons via YouTube IFrame. Monotonic playback progress is persistently recorded.
- **Assessment Gate**: Objective assessments remain locked until the student satisfies the configured watch requirement.
- **Instructor-Authored Tests**: Objective multiple-choice and true/false tests manually authored by instructors (no LLM generation from videos).
- **Anti-Cheat Protection**: Correct answer keys are never sent to client devices before submission.
- **Single-Attempt Enforcement**: Prevents duplicate test submissions server-side.
- **Automated Grading**:
  $$\text{Score Percentage} = \frac{\text{Marks Obtained}}{\text{Total Available Marks}} \times 100$$

### Shared Module: Academic Progress & Revision Advice
- **Topic-Level Analytics**: Aggregates graded attempts to calculate average scores per topic. When no data exists, displays *"Insufficient assessment data"*.
- **Transparent Revision Advice**: Highlights incomplete prerequisite lessons and prioritizes topics with averages below 75% mastery.
- **Audit History**: Complete chronological log of document uploads, RAG inquiries, video completions, and test attempts.

---

## 3. Environment Setup & Configuration

### Backend (`backend/.env`)
```dotenv
ENVIRONMENT=development
PORT=8000
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash

# Qdrant Vector DB
QDRANT_URL=https://your-cluster.qdrant.io
QDRANT_API_KEY=your_qdrant_key
QDRANT_COLLECTION=learning_materials

# Firebase
FIREBASE_PROJECT_ID=personalized-learning-a2477

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_URL=cloudinary://...
```

### Frontend (`frontend/.env.local`)
```dotenv
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

---

## 4. Running the Platform Locally

### 1. Start the FastAPI Backend
```bash
cd backend
# Activate virtual environment
.\.venv\Scripts\activate   # Windows
# Start server
uvicorn app.main:app --reload --port 8000
```
Swagger API documentation will be available at: `http://localhost:8000/docs`

### 2. Start the Next.js Frontend
```bash
cd frontend
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 5. Running Automated Tests
```bash
cd backend
.\.venv\Scripts\python.exe -m pytest tests/test_platform.py -v
```

---

## 6. Deployment to Render
The repository includes a ready-to-deploy [render.yaml](file:///c:/Users/Eswar/OneDrive/Desktop/Academic%20Project/personalized-learning-platform/render.yaml) blueprint:
1. Connect your repository to Render.
2. Select **New > Blueprint**.
3. Supply the secret environment variables (`GEMINI_API_KEY`, `QDRANT_API_KEY`, etc.) in the Render dashboard.
