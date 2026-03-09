# AI Data Analyst

A full-stack data analysis app with:
- `frontend`: React + Vite + Tailwind + Recharts
- `backend`: FastAPI + Pandas + Seaborn + Gemini (AI summary/chat)

## Features

- Upload CSV dataset
- Load built-in datasets (`planets`, `tips`, `titanic`, `penguins`, `iris`, `diamonds`, `flights`)
- Dashboard EDA sections:
  - Dataset Info (shape, columns, types, missing values)
  - Numeric Analysis (histograms, boxplots)
  - Categorical Analysis (count plots)
  - Relationship Analysis (scatter plots, pairplot-style mini plots)
  - Correlation Analysis (heatmap)
- Analytics tab with interactive chart controls
- AI Query tab:
  - AI Dataset Summary
  - Suggested questions
  - Dataset-aware chat
  - Voice input (browser speech recognition)
  - Text-to-speech playback of AI response

## Project Structure

```text
ai-data-analyst/
  backend/
    app/
      main.py
      routes/
      services/
      models/
    datasets/
      builtin/
    requirements.txt
    .env
  frontend/
    src/
    package.json
```

## Prerequisites

- Python 3.10+
- Node.js 20+

## Backend Setup

```powershell
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --app-dir .
```

Backend runs on `http://localhost:8000`.

### Environment Variables (`backend/.env`)

Required for Gemini features:

```env
GENAI_API_KEY=your_key_here
```

## Frontend Setup

```powershell
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

For local frontend development against the backend, set:

```powershell
$env:VITE_API_BASE_URL="http://localhost:8000/api"
```

## API Overview

- Dataset
  - `GET /api/dataset/summary`
  - `GET /api/dataset/preview`
  - `GET /api/dataset/builtin`
  - `POST /api/dataset/builtin/load`
- Upload
  - `POST /api/upload/dataset`
- Analytics
  - `GET /api/analytics/overview`
  - `GET /api/analytics/dataset-graph/config`
  - `POST /api/analytics/dataset-graph`
  - `GET /api/analytics/dashboard-eda`
- AI
  - `GET /api/ai/summary`
  - `GET /api/ai/suggestions`
  - `POST /api/ai/query`
  - `POST /api/ai/speak`

## Notes

- Built-in dataset loading supports local fallback files under `backend/datasets/builtin` (works offline).
- Primary-key-like unique columns are automatically removed for visualization so charts are not skewed by ID columns.

## Storage Notes

- The main local size cost is `frontend/node_modules` which is typically much larger than the app source.
- It should not be committed or deployed. This project now ignores `frontend/node_modules`, `frontend/dist`, and `frontend/.vite`.
- If you want to reclaim local disk space after stopping development, you can delete `frontend/node_modules` and reinstall later with `npm install`.

## Docker Deploy

This project can now be deployed as a single container:

```powershell
docker build -t ai-data-analyst .
docker run -p 8000:8000 --env GENAI_API_KEY=your_key_here ai-data-analyst
```

Then open `http://localhost:8000`.

Optional environment variables:

```env
GENAI_API_KEY=your_key_here
CORS_ORIGINS=http://localhost:5173,https://your-frontend-domain.com
PORT=8000
```

The Docker image builds the frontend, copies the static files into the final image, and serves the UI from FastAPI so production deployment only needs one service.

## Netlify Deploy

Netlify is a good fit for the `frontend` app. This project also has a FastAPI backend, so the easiest first deployment is:

- `Netlify` for frontend
- `Render` or `Railway` for backend

Why:

- Netlify handles Vite/React sites well.
- This backend is a normal FastAPI server, not a static site.
- The frontend already supports an external backend URL with `VITE_API_BASE_URL`.

### 1. Push this project to GitHub

Create a GitHub repository and push this project there.

### 2. Deploy the frontend on Netlify

In Netlify:

1. Sign in.
2. Select `Add new site` -> `Import an existing project`.
3. Connect GitHub and choose this repository.
4. Netlify will read `netlify.toml`.

This repo is now configured with:

- Base directory: `frontend`
- Build command: `npm run build`
- Publish directory: `dist`
- SPA redirect for React Router

### 3. Add the frontend environment variable in Netlify

After your backend is hosted, go to:

`Project configuration` -> `Environment variables`

Add:

```env
VITE_API_BASE_URL=https://your-backend-url/api
```

Then trigger a new deploy.

### 4. Host the backend separately

Good beginner options:

- Render
- Railway

For the backend, you need:

- Python runtime
- `pip install -r backend/requirements.txt`
- start command:

```powershell
uvicorn app.main:app --host 0.0.0.0 --port $PORT --app-dir backend
```

### 5. Add backend environment variables

If you want AI features to work, add this on your backend host:

```env
GENAI_API_KEY=your_key_here
```

### Useful links

- Netlify Vite guide: https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/
- Netlify deploy from repo: https://docs.netlify.com/welcome/quickstarts/deploy-from-your-repository/
- Netlify redirects and rewrites: https://docs.netlify.com/routing/redirects/
