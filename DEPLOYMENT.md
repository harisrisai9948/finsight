# Finsight Deployment Guide (Render)

## Prerequisites

1. Push your code to GitHub: https://github.com/harisrisai9948/finsight
2. Create a [Render](https://render.com) account

## Deploy via Blueprint

1. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
2. Connect your GitHub repo `harisrisai9948/finsight`
3. Render will detect `render.yaml` and create:
   - **finsight-db** – PostgreSQL database
   - **finsight-backend** – FastAPI backend
   - **finsight-frontend** – React static site

## Environment Variables to Set Manually

After the first deploy, set these in the Render Dashboard:

### Backend (finsight-backend)

| Key | Description |
|-----|-------------|
| `GEMINI_API_KEY` | Google AI API key for Gemini (get from [ai.google.dev](https://ai.google.dev)) |
| `SECRET_KEY` | Random string for JWT signing (e.g. `openssl rand -hex 32`) |
| `CORS_ORIGINS` | Your frontend URL, e.g. `https://finsight-frontend.onrender.com` |

`DATABASE_URL` is set automatically by the Blueprint.

### Frontend (finsight-frontend)

`VITE_API_URL` is set automatically from the backend URL via Blueprint.

## Local Development

```bash
# Backend
cd backend
pip install -r requirements.txt
# Create .env with DATABASE_URL=sqlite:///./finsight.db (or postgres URL)
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```
