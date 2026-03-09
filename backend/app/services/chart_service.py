from __future__ import annotations

import math
from typing import Any

import numpy as np
import pandas as pd

from app.services.data_service import data_service


def dashboard_overview() -> dict:
    summary = data_service.summary()
    summary["memory_usage_mb"] = 18.4
    return summary


def regional_sales_chart() -> list[dict]:
    return data_service.revenue_by_region()


def dashboard_eda_payload() -> dict[str, Any]:
    raw_df = data_service.dataframe()
    df = _clean_for_charting(raw_df)
    numeric_cols, categoric_cols = _split_columns(df)

    dataset_info = {
        "dataset_name": data_service.summary().get("dataset_name", ""),
        "shape": [int(raw_df.shape[0]), int(raw_df.shape[1])],
        "columns": raw_df.columns.tolist(),
        "types": [{"column": str(col), "dtype": str(dtype)} for col, dtype in raw_df.dtypes.items()],
        "missing_values": data_service.missing_values_by_column(),
        "total_missing": int(raw_df.isna().sum().sum()),
    }

    histograms: list[dict[str, Any]] = []
    boxplots: list[dict[str, Any]] = []
    for column in numeric_cols[:3]:
        series = pd.to_numeric(df[column], errors="coerce").dropna()
        if series.empty:
            continue
        bins = min(20, max(5, int(math.sqrt(len(series)))))
        counts, edges = np.histogram(series, bins=bins)
        histograms.append(
            {
                "column": column,
                "bins": [
                    {"label": f"{edges[idx]:.2f} - {edges[idx + 1]:.2f}", "value": int(count)}
                    for idx, count in enumerate(counts.tolist())
                ],
            }
        )
        boxplots.append(
            {
                "column": column,
                "min": float(series.min()),
                "q1": float(series.quantile(0.25)),
                "median": float(series.quantile(0.5)),
                "q3": float(series.quantile(0.75)),
                "max": float(series.max()),
            }
        )

    count_plots: list[dict[str, Any]] = []
    for column in categoric_cols[:3]:
        counts = df[column].fillna("NaN").astype(str).value_counts().head(12)
        count_plots.append(
            {
                "column": column,
                "counts": [{"label": label, "value": int(value)} for label, value in counts.items()],
            }
        )

    scatter_plots: list[dict[str, Any]] = []
    numeric_for_relationship = numeric_cols[:4]
    pairplot_pairs: list[dict[str, Any]] = []
    for idx, x_col in enumerate(numeric_for_relationship):
        for jdx in range(idx + 1, len(numeric_for_relationship)):
            y_col = numeric_for_relationship[jdx]
            points = (
                df[[x_col, y_col]]
                .apply(pd.to_numeric, errors="coerce")
                .dropna()
                .head(400)
                .rename(columns={x_col: "x", y_col: "y"})
                .to_dict(orient="records")
            )
            pair_data = {"x_col": x_col, "y_col": y_col, "points": points}
            pairplot_pairs.append(pair_data)
            if len(scatter_plots) < 2:
                scatter_plots.append(pair_data)

    corr_features = numeric_cols[:8]
    heatmap: list[dict[str, Any]] = []
    if corr_features:
        corr_df = df[corr_features].apply(pd.to_numeric, errors="coerce").corr().fillna(0.0)
        for row_col in corr_df.index:
            for col_col in corr_df.columns:
                heatmap.append(
                    {
                        "row": str(row_col),
                        "col": str(col_col),
                        "value": float(corr_df.loc[row_col, col_col]),
                    }
                )

    return {
        "dataset_info": dataset_info,
        "numeric_analysis": {"histograms": histograms, "boxplots": boxplots},
        "categorical_analysis": {"count_plots": count_plots},
        "relationship_analysis": {
            "scatter_plots": scatter_plots,
            "pairplot": {"features": numeric_for_relationship, "pairs": pairplot_pairs},
        },
        "correlation_analysis": {"features": corr_features, "heatmap": heatmap},
    }


def _clean_for_charting(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df.copy()
    # Keep rule aligned with Streamlit logic:
    # df_clean = df.drop(columns=[col for col in df.columns if df[col].nunique() == len(df)])
    return data_service.visualization_dataframe()


def _split_columns(df: pd.DataFrame) -> tuple[list[str], list[str]]:
    numeric_cols = df.select_dtypes(include=["int64", "float64"]).columns.tolist()
    categoric_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()
    return numeric_cols, categoric_cols


def dataset_graph_config() -> dict[str, Any]:
    raw_df = data_service.dataframe()
    df = _clean_for_charting(raw_df)
    numeric_cols, categoric_cols = _split_columns(df)

    chart_options: list[str] = []
    if categoric_cols:
        chart_options.extend(["Bar Chart", "Pie Chart"])
    if numeric_cols:
        chart_options.extend(["Histogram", "Scatter Plot", "Box Plot"])

    return {
        "rows": int(raw_df.shape[0]),
        "columns": int(raw_df.shape[1]),
        "missing_values": int(raw_df.isna().sum().sum()),
        "missing_by_column": data_service.missing_values_by_column(),
        "numeric_cols": numeric_cols,
        "categoric_cols": categoric_cols,
        "chart_options": chart_options,
        "preview": data_service.preview(10),
    }


def _slice_data(df: pd.DataFrame, data_type: str, sample_size: int | None) -> pd.DataFrame:
    if data_type != "Sample Data":
        return df
    if df.empty:
        return df
    size = sample_size or min(100, len(df))
    size = max(1, min(size, len(df)))
    return df.sample(size, random_state=42)


def dataset_graph_data(payload: dict[str, Any]) -> dict[str, Any]:
    raw_df = data_service.dataframe()
    df = _clean_for_charting(raw_df)
    numeric_cols, categoric_cols = _split_columns(df)

    chart_type = payload.get("chart_type", "")
    data_type = payload.get("data_type", "Population Data")
    sample_size = payload.get("sample_size")
    working_df = _slice_data(df, data_type, sample_size)

    result: dict[str, Any] = {
        "chart_type": chart_type,
        "chart_data": [],
        "meta": {},
        "warnings": [],
    }

    if working_df.empty:
        result["warnings"].append("No data available for visualization.")
        return result

    if chart_type == "Bar Chart":
        column = payload.get("column")
        if column not in categoric_cols:
            result["warnings"].append("Select a valid categorical column for Bar Chart.")
            return result
        counts = working_df[column].fillna("NaN").astype(str).value_counts().head(20)
        result["chart_data"] = [{"label": k, "value": int(v)} for k, v in counts.items()]
        result["meta"] = {"x_label": column, "y_label": "Frequency", "title": f"Bar Chart of {column}"}
        return result

    if chart_type == "Pie Chart":
        column = payload.get("column")
        if column not in categoric_cols:
            result["warnings"].append("Select a valid categorical column for Pie Chart.")
            return result
        counts = working_df[column].fillna("NaN").astype(str).value_counts().head(10)
        total = int(counts.sum()) or 1
        result["chart_data"] = [
            {"label": k, "value": int(v), "percent": round((int(v) / total) * 100, 2)}
            for k, v in counts.items()
        ]
        result["meta"] = {"title": f"Pie Chart of {column}"}
        return result

    if chart_type == "Histogram":
        column = payload.get("column")
        if column not in numeric_cols:
            result["warnings"].append("Select a valid numeric column for Histogram.")
            return result
        series = pd.to_numeric(working_df[column], errors="coerce").dropna()
        if series.empty:
            result["warnings"].append("No numeric values found for selected column.")
            return result
        bins = min(20, max(5, int(math.sqrt(len(series)))))
        counts, edges = np.histogram(series, bins=bins)
        chart_data = []
        for idx, count in enumerate(counts.tolist()):
            chart_data.append(
                {
                    "label": f"{edges[idx]:.2f} - {edges[idx + 1]:.2f}",
                    "value": int(count),
                }
            )
        result["chart_data"] = chart_data
        result["meta"] = {"x_label": column, "y_label": "Frequency", "title": f"Histogram of {column}"}
        return result

    if chart_type == "Scatter Plot":
        x_col = payload.get("x_col")
        y_col = payload.get("y_col")
        color_col = payload.get("color_col")
        if x_col not in numeric_cols or y_col not in numeric_cols:
            result["warnings"].append("Select valid numeric columns for X and Y axes.")
            return result
        if x_col == y_col:
            result["warnings"].append("X and Y axes must be different for a scatter plot.")
            return result

        base = working_df[[x_col, y_col] + ([color_col] if color_col and color_col in working_df.columns else [])].copy()
        base[x_col] = pd.to_numeric(base[x_col], errors="coerce")
        base[y_col] = pd.to_numeric(base[y_col], errors="coerce")
        base = base.dropna(subset=[x_col, y_col])

        if color_col and color_col in categoric_cols:
            grouped: list[dict[str, Any]] = []
            for group_name, group_df in base.groupby(color_col):
                grouped.append(
                    {
                        "name": str(group_name),
                        "points": group_df[[x_col, y_col]].rename(columns={x_col: "x", y_col: "y"}).to_dict(orient="records"),
                    }
                )
            result["chart_data"] = grouped
        else:
            result["chart_data"] = base[[x_col, y_col]].rename(columns={x_col: "x", y_col: "y"}).to_dict(orient="records")

        result["meta"] = {
            "x_label": x_col,
            "y_label": y_col,
            "title": f"{x_col} vs {y_col}",
            "color_col": color_col if color_col in categoric_cols else None,
        }
        return result

    if chart_type == "Box Plot":
        column = payload.get("column")
        if column not in numeric_cols:
            result["warnings"].append("Select a valid numeric column for Box Plot.")
            return result
        series = pd.to_numeric(working_df[column], errors="coerce").dropna()
        if series.empty:
            result["warnings"].append("No numeric values found for selected column.")
            return result
        q1 = float(series.quantile(0.25))
        median = float(series.quantile(0.5))
        q3 = float(series.quantile(0.75))
        min_v = float(series.min())
        max_v = float(series.max())
        result["chart_data"] = [
            {
                "label": column,
                "min": min_v,
                "q1": q1,
                "median": median,
                "q3": q3,
                "max": max_v,
            }
        ]
        result["meta"] = {"title": f"Box Plot of {column}", "y_label": column}
        return result

    result["warnings"].append("Unsupported chart type for current dataset.")
    return result
