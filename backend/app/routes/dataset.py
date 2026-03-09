from fastapi import APIRouter, HTTPException, Query

from app.models.dataset_model import BuiltinDatasetRequest, UploadResponse
from app.services.data_service import data_service

router = APIRouter(prefix="/dataset", tags=["dataset"])


@router.get("/summary")
def get_summary():
    return data_service.summary()


@router.get("/preview")
def get_preview(limit: int = Query(default=10, ge=1, le=100)):
    return {"rows": data_service.preview(limit)}


@router.get("/builtin")
def list_builtin_datasets():
    return {"datasets": data_service.list_builtin_datasets()}


@router.post("/builtin/load", response_model=UploadResponse)
def load_builtin_dataset(payload: BuiltinDatasetRequest):
    try:
        data_service.load_builtin_dataset(payload.name)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to load built-in dataset: {exc}") from exc
    summary = data_service.summary()
    return UploadResponse(
        message=f"Built-in dataset '{payload.name}' loaded successfully.",
        rows=summary["rows"],
        columns=summary["columns"],
    )
