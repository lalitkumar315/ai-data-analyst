import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../api/api";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

function colorForCorrelation(value) {
  const abs = Math.abs(value);
  if (abs > 0.8) return "bg-emerald-600 text-white";
  if (abs > 0.6) return "bg-emerald-400 text-slate-900";
  if (abs > 0.4) return "bg-amber-300 text-slate-900";
  if (abs > 0.2) return "bg-orange-300 text-slate-900";
  return "bg-slate-200 text-slate-700";
}

export default function Dashboard() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");
  const [eda, setEda] = useState(null);

  useEffect(() => {
    const onDatasetUpdated = () => setRefreshKey((prev) => prev + 1);
    window.addEventListener("dataset-updated", onDatasetUpdated);
    return () => window.removeEventListener("dataset-updated", onDatasetUpdated);
  }, []);

  useEffect(() => {
    async function loadEda() {
      try {
        const response = await api.get("/analytics/dashboard-eda");
        setEda(response.data);
        setError("");
      } catch {
        setError("Failed to load dashboard EDA data.");
      }
    }
    loadEda();
  }, [refreshKey]);

  const shape = eda?.dataset_info?.shape ?? [0, 0];
  const datasetName = eda?.dataset_info?.dataset_name ?? "";
  const types = eda?.dataset_info?.types ?? [];
  const missing = eda?.dataset_info?.missing_values ?? [];
  const histograms = eda?.numeric_analysis?.histograms ?? [];
  const boxplots = eda?.numeric_analysis?.boxplots ?? [];
  const countPlots = eda?.categorical_analysis?.count_plots ?? [];
  const scatterPlots = eda?.relationship_analysis?.scatter_plots ?? [];
  const pairplotPairs = eda?.relationship_analysis?.pairplot?.pairs ?? [];
  const heatmap = eda?.correlation_analysis?.heatmap ?? [];

  const heatmapRows = useMemo(() => {
    const rows = {};
    for (const item of heatmap) {
      if (!rows[item.row]) rows[item.row] = {};
      rows[item.row][item.col] = item.value;
    }
    return rows;
  }, [heatmap]);
  const heatmapFeatures = Object.keys(heatmapRows);

  return (
    <div className="flex h-screen overflow-hidden bg-background-light">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <Navbar title="Dashboard - EDA" />

        <div className="space-y-6 p-8">
          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          ) : null}

          <section>
            <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-bold">Dataset Info</h3>
              <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm">
                <strong>Dataset Name:</strong> {datasetName || "Enter the name of dataset here"}
              </div>
              <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-lg bg-slate-50 p-3 text-sm"><strong>Shape:</strong> {shape[0]} x {shape[1]}</div>
                <div className="rounded-lg bg-slate-50 p-3 text-sm"><strong>Columns:</strong> {shape[1]}</div>
                <div className="rounded-lg bg-slate-50 p-3 text-sm"><strong>Total Missing:</strong> {eda?.dataset_info?.total_missing ?? 0}</div>
                <div className="rounded-lg bg-slate-50 p-3 text-sm"><strong>Types:</strong> {types.length}</div>
              </div>

              <div className="mb-3">
                <p className="mb-2 text-sm font-semibold">Column Types</p>
                <div className="flex flex-wrap gap-2">
                  {types.map((item) => (
                    <span key={item.column} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs">
                      {item.column}: {item.dtype}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold">Missing Values</p>
                {missing.length ? (
                  <div className="flex flex-wrap gap-2">
                    {missing.map((item) => (
                      <span key={item.column} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-700">
                        {item.column}: {item.missing}
                      </span>
                    ))}
                  </div>
                ) : <p className="text-sm text-slate-500">No missing values found.</p>}
              </div>
            </article>
          </section>

          <section>
            <h3 className="mb-3 text-lg font-bold">Numeric Analysis</h3>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {histograms.map((hist) => (
                <article key={`hist-${hist.column}`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="mb-2 text-sm font-semibold">Histogram: {hist.column}</p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hist.bins}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" hide />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#2d4b58" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </article>
              ))}
              {boxplots.map((box) => {
                const range = Math.max(box.max - box.min, 1);
                const pct = (v) => ((v - box.min) / range) * 100;
                return (
                  <article key={`box-${box.column}`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="mb-4 text-sm font-semibold">Boxplot: {box.column}</p>
                    <div className="relative h-12">
                      <div className="absolute top-5 h-0.5 w-full bg-slate-300" />
                      <div className="absolute top-3 h-6 bg-primary/20" style={{ left: `${pct(box.q1)}%`, width: `${pct(box.q3) - pct(box.q1)}%` }} />
                      <div className="absolute top-2 h-8 w-0.5 bg-primary" style={{ left: `${pct(box.median)}%` }} />
                    </div>
                    <div className="mt-3 grid grid-cols-5 text-center text-xs text-slate-600">
                      <span>Min {box.min.toFixed(2)}</span>
                      <span>Q1 {box.q1.toFixed(2)}</span>
                      <span>Med {box.median.toFixed(2)}</span>
                      <span>Q3 {box.q3.toFixed(2)}</span>
                      <span>Max {box.max.toFixed(2)}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-lg font-bold">Categorical Analysis</h3>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {countPlots.map((plot) => (
                <article key={`count-${plot.column}`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="mb-2 text-sm font-semibold">Count Plot: {plot.column}</p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={plot.counts}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" hide />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#4f6b77" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-lg font-bold">Relationship Analysis</h3>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {scatterPlots.map((plot) => (
                <article key={`scatter-${plot.x_col}-${plot.y_col}`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="mb-2 text-sm font-semibold">Scatter Plot: {plot.x_col} vs {plot.y_col}</p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart>
                        <CartesianGrid />
                        <XAxis type="number" dataKey="x" />
                        <YAxis type="number" dataKey="y" />
                        <Tooltip />
                        <Scatter data={plot.points} fill="#2d4b58" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </article>
              ))}

              <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
                <p className="mb-3 text-sm font-semibold">Pairplot</p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {pairplotPairs.map((plot) => (
                    <div key={`pair-${plot.x_col}-${plot.y_col}`} className="rounded-lg border border-slate-200 p-3">
                      <p className="mb-2 text-xs font-semibold text-slate-600">{plot.x_col} vs {plot.y_col}</p>
                      <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <ScatterChart>
                            <XAxis type="number" dataKey="x" hide />
                            <YAxis type="number" dataKey="y" hide />
                            <Scatter data={plot.points} fill="#4f6b77" />
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-lg font-bold">Correlation Analysis</h3>
            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              {heatmapFeatures.length ? (
                <div className="overflow-x-auto">
                  <table className="text-xs">
                    <thead>
                      <tr>
                        <th className="px-2 py-1" />
                        {heatmapFeatures.map((feature) => (
                          <th key={`h-${feature}`} className="px-2 py-1 text-slate-600">{feature}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {heatmapFeatures.map((rowFeature) => (
                        <tr key={`r-${rowFeature}`}>
                          <th className="px-2 py-1 text-left text-slate-600">{rowFeature}</th>
                          {heatmapFeatures.map((colFeature) => {
                            const value = heatmapRows[rowFeature]?.[colFeature] ?? 0;
                            return (
                              <td key={`${rowFeature}-${colFeature}`} className="px-1 py-1">
                                <span className={`inline-block rounded px-2 py-1 ${colorForCorrelation(value)}`}>
                                  {value.toFixed(2)}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="text-sm text-slate-500">Not enough numeric columns for correlation heatmap.</p>}
            </article>
          </section>
        </div>
      </main>
    </div>
  );
}
