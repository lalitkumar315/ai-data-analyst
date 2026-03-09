from fastapi import APIRouter
from fastapi.responses import Response

from app.models.dataset_model import (
    AIQueryRequest,
    AIQueryResponse,
    AISuggestionsResponse,
    AISummaryResponse,
    TextToSpeechRequest,
)
from app.services.ai_service import answer_query, speak_text, suggested_questions, summarize_dataset

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/query", response_model=AIQueryResponse)
def query_data(payload: AIQueryRequest):
    return AIQueryResponse(answer=answer_query(payload.question))


@router.get("/summary", response_model=AISummaryResponse)
def ai_summary():
    return AISummaryResponse(summary=summarize_dataset())


@router.get("/suggestions", response_model=AISuggestionsResponse)
def ai_suggestions():
    return AISuggestionsResponse(suggestions=suggested_questions())


@router.post("/speak")
def ai_speak(payload: TextToSpeechRequest):
    audio_bytes = speak_text(payload.text)
    return Response(content=audio_bytes, media_type="audio/mpeg")
