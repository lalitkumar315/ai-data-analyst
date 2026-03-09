from fastapi import APIRouter

from app.models.dataset_model import AnalyticsChartRequest
from app.services.chart_service import (
    dashboard_eda_payload,
    dashboard_overview,
    dataset_graph_config,
    dataset_graph_data,
    regional_sales_chart,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview")
def get_overview():
    return dashboard_overview()


@router.get("/regional-sales")
def get_regional_sales():
    return {"series": regional_sales_chart()}


@router.get("/dataset-graph/config")
def get_dataset_graph_config():
    return dataset_graph_config()


@router.post("/dataset-graph")
def get_dataset_graph(payload: AnalyticsChartRequest):
    return dataset_graph_data(payload.model_dump())


@router.get("/dashboard-eda")
def get_dashboard_eda():
    return dashboard_eda_payload()
