import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.routes.ai_query import router as ai_router
from app.routes.analytics import router as analytics_router
from app.routes.dataset import router as dataset_router
from app.routes.upload import router as upload_router

app = FastAPI(title="AI Data Analyst API", version="1.0.0")

project_root = Path(__file__).resolve().parents[2]
frontend_dist = project_root / "frontend" / "dist"
cors_origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dataset_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(ai_router, prefix="/api")
app.include_router(upload_router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}


if frontend_dist.exists():
    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    def serve_frontend():
        return FileResponse(frontend_dist / "index.html")


    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        if full_path.startswith(("api/", "health")):
            raise HTTPException(status_code=404, detail="Not Found")
        candidate = frontend_dist / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(frontend_dist / "index.html")
