from fastapi import APIRouter, File, HTTPException, UploadFile

from app.models.dataset_model import UploadResponse
from app.services.data_service import data_service

router = APIRouter(prefix="/upload", tags=["upload"])


@router.post("/dataset", response_model=UploadResponse)
async def upload_dataset(file: UploadFile = File(...)):
    filename = file.filename or ""
    if not filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    raw = await file.read()
    try:
        data_service.load_uploaded_csv(raw, dataset_name=filename)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid CSV file: {exc}") from exc

    summary = data_service.summary()
    return UploadResponse(
        message="Dataset uploaded successfully.",
        rows=summary["rows"],
        columns=summary["columns"],
    )
