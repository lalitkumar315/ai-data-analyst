import io
from pathlib import Path
from typing import Any

import pandas as pd
import seaborn as sns


class DataService:
    BUILTIN_DATASETS = [
        "penguins",
        "planets",
        "tips",
        "titanic",
        "iris",
        "flights",
    ]

    def __init__(self) -> None:
        self._builtin_dir = Path(__file__).resolve().parents[2] / "datasets" / "builtin"
        self._builtin_dir.mkdir(parents=True, exist_ok=True)
        self._dataset_name = ""
        self._dataset_version = 1
        self._df = pd.DataFrame()
        self.load_builtin_dataset(self.BUILTIN_DATASETS[0])
        self._dataset_version = 1

    def load_uploaded_csv(self, raw_bytes: bytes, dataset_name: str | None = None) -> None:
        self._df = pd.read_csv(io.BytesIO(raw_bytes), sep=None, engine="python")
        self._dataset_name = (dataset_name or "Uploaded Dataset").strip() or "Uploaded Dataset"
        self._dataset_version += 1

    def list_builtin_datasets(self) -> list[str]:
        ordered = list(self.BUILTIN_DATASETS)
        extras = sorted(
            p.stem for p in self._builtin_dir.glob("*.csv") if p.stem not in self.BUILTIN_DATASETS
        )
        return ordered + extras

    def load_builtin_dataset(self, name: str) -> None:
        normalized = (name or "").strip().lower()
        available = set(self.list_builtin_datasets())
        if normalized not in available:
            raise ValueError(f"Unsupported built-in dataset: {name}")

        local_csv = self._builtin_dir / f"{normalized}.csv"
        if local_csv.exists():
            self._df = pd.read_csv(local_csv, sep=None, engine="python")
            self._dataset_name = normalized
            self._dataset_version += 1
            return

        try:
            dataset = sns.load_dataset(normalized)
            self._df = dataset.copy()
            self._dataset_name = normalized
            self._dataset_version += 1
            return
        except Exception as exc:
            raise ValueError(
                f"Dataset '{normalized}' could not be loaded from seaborn and no local fallback was found."
            ) from exc

    def summary(self) -> dict[str, Any]:
        return {
            "dataset_name": self._dataset_name,
            "rows": int(self._df.shape[0]),
            "columns": int(self._df.shape[1]),
            "missing_values": int(self._df.isna().sum().sum()),
            "column_names": self._df.columns.tolist(),
            "dataset_version": int(self._dataset_version),
        }

    def preview(self, limit: int = 10) -> list[dict[str, Any]]:
        head = self._df.head(limit)
        safe_df = head.astype(object).where(pd.notnull(head), None)
        return safe_df.to_dict(orient="records")

    def revenue_by_region(self) -> list[dict[str, Any]]:
        df = self.visualization_dataframe()
        if "region" not in df.columns or "revenue" not in df.columns:
            return []
        result = df.groupby("region", as_index=False)["revenue"].sum()
        return result.to_dict(orient="records")

    def columns(self) -> list[str]:
        return self._df.columns.tolist()

    def dataframe(self) -> pd.DataFrame:
        return self._df.copy()

    def visualization_dataframe(self) -> pd.DataFrame:
        df = self._df.copy()
        # Remove primary key-like columns only for visualization logic.
        drop_cols = [col for col in df.columns if df[col].nunique() == len(df)]
        if drop_cols:
            df = df.drop(columns=drop_cols, errors="ignore")
        return df

    def missing_values_by_column(self) -> list[dict[str, Any]]:
        missing = self._df.isna().sum()
        rows = []
        for column, count in missing.items():
            if int(count) > 0:
                rows.append({"column": str(column), "missing": int(count)})
        return rows


data_service = DataService()
