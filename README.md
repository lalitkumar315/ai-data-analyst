# AI Data Analyst

**Developed by:** LALIT KUMAR  
**LinkedIn:** [Lalit Kumar Mahanta](https://www.linkedin.com/in/lalit-kumar-mahanta/)  
**Mentor:** Nallagoni Omkar  
**Mentor LinkedIn:** [Nallagoni Omkar](https://www.linkedin.com/in/nallagoni-omkar-783271188/)

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
