from pydantic import BaseModel


class AIQueryRequest(BaseModel):
    question: str


class AIQueryResponse(BaseModel):
    answer: str


class AISummaryResponse(BaseModel):
    summary: str


class AISuggestionsResponse(BaseModel):
    suggestions: list[str]


class TextToSpeechRequest(BaseModel):
    text: str


class UploadResponse(BaseModel):
    message: str
    rows: int
    columns: int


class BuiltinDatasetRequest(BaseModel):
    name: str


class AnalyticsChartRequest(BaseModel):
    chart_type: str
    data_type: str = "Population Data"
    sample_size: int | None = None
    column: str | None = None
    x_col: str | None = None
    y_col: str | None = None
    color_col: str | None = None
