from __future__ import annotations

import os
import random
from io import BytesIO
from pathlib import Path

from dotenv import load_dotenv
from gtts import gTTS

from app.services.data_service import data_service

try:
    import google.generativeai as genai
except Exception:  # pragma: no cover - fallback when package is unavailable
    genai = None


_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=_ENV_PATH)
_API_KEY = os.getenv("GENAI_API_KEY", "").strip()
_MODEL = None

if genai and _API_KEY:
    genai.configure(api_key=_API_KEY)
    _MODEL = genai.GenerativeModel("gemini-2.5-flash")


def _dataset_context() -> str:
    df = data_service.dataframe()
    sample = df.head(10).to_string()
    description = df.describe(include="all").fillna("").to_string()
    return (
        f"Dataset columns:\n{df.columns.tolist()}\n\n"
        f"Sample rows:\n{sample}\n\n"
        f"Statistics:\n{description}\n"
    )


def _fallback_answer(question: str) -> str:
    summary = data_service.summary()
    lowered = question.lower()
    if "row" in lowered:
        return f"Current dataset has {summary['rows']} rows."
    if "column" in lowered:
        return f"Current dataset has {summary['columns']} columns: {', '.join(summary['column_names'])}."
    return "AI model is unavailable. Check GENAI_API_KEY in backend/.env."


def _generate(prompt: str, fallback: str) -> str:
    if not _MODEL:
        return fallback
    try:
        response = _MODEL.generate_content(prompt)
        text = getattr(response, "text", "") or fallback
        return text.strip()
    except Exception:
        return fallback


def summarize_dataset() -> str:
    prompt = (
        "You are a professional data analyst.\n\n"
        "Don't write code. Just explain like a human with possible creativity based on the dataset.\n\n"
        f"{_dataset_context()}\n\n"
        "Provide:\n1. Dataset overview\n2. Key patterns"
    )
    return _generate(prompt, "Could not generate AI dataset summary right now.")


def suggested_questions() -> list[str]:
    df = data_service.dataframe()
    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    categorical_cols = df.select_dtypes(exclude="number").columns.tolist()

    suggestions: list[str] = []
    if numeric_cols:
        suggestions.append(f"What is the average of {random.choice(numeric_cols)}?")
        suggestions.append(f"Which row has the highest {random.choice(numeric_cols)}?")
    if categorical_cols:
        suggestions.append(f"What are the most common values in {random.choice(categorical_cols)}?")
        suggestions.append(f"How many unique values exist in {random.choice(categorical_cols)}?")
    suggestions.append("Give a quick insight about this dataset.")
    return suggestions


def answer_query(question: str) -> str:
    prompt = (
        "You are a professional data analyst.\n"
        "Don't write code. Explain clearly with practical insights.\n\n"
        f"{_dataset_context()}\n\n"
        f"User question:\n{question}\n"
    )
    return _generate(prompt, _fallback_answer(question))


def speak_text(text: str) -> bytes:
    tts = gTTS(text=text, lang="en")
    buffer = BytesIO()
    tts.write_to_fp(buffer)
    return buffer.getvalue()
