import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../api/api";
import ChartErrorBoundary from "../components/ChartErrorBoundary";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

const PIE_COLORS = ["#2d4b58", "#4f6b77", "#7d939c", "#a8b7bd", "#d0d9dd", "#889ea8"];
const SCATTER_COLORS = ["#2d4b58", "#14b8a6", "#f97316", "#3b82f6", "#8b5cf6", "#ef4444"];

function titleCase(value) {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

export default function Analytics() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  const [config, setConfig] = useState(null);
  const [chartResponse, setChartResponse] = useState({ chart_data: [], meta: {} });

  const [chartType, setChartType] = useState("");
  const [dataType, setDataType] = useState("Population Data");
  const [sampleSize, setSampleSize] = useState(100);
  const [column, setColumn] = useState("");
  const [xCol, setXCol] = useState("");
  const [yCol, setYCol] = useState("");
  const [colorCol, setColorCol] = useState("None");

  const numericCols = config?.numeric_cols ?? [];
  const categoricCols = config?.categoric_cols ?? [];
  const chartOptions = config?.chart_options ?? [];
  const previewRows = config?.preview ?? [];
  const totalRows = config?.rows ?? 0;

  useEffect(() => {
    const onDatasetUpdated = () => setRefreshKey((prev) => prev + 1);
    window.addEventListener("dataset-updated", onDatasetUpdated);
    return () => window.removeEventListener("dataset-updated", onDatasetUpdated);
  }, []);

  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await api.get("/analytics/dataset-graph/config");
        const data = response.data;
        setConfig(data);

        const defaultChart = data.chart_options?.[0] ?? "";
        const defaultCategoric = data.categoric_cols?.[0] ?? "";
        const defaultNumeric = data.numeric_cols?.[0] ?? "";

        setChartType(defaultChart);
        setColumn(defaultCategoric || defaultNumeric);
        setXCol(defaultNumeric);
        setYCol(data.numeric_cols?.[1] ?? defaultNumeric);
        setColorCol("None");
        setSampleSize(Math.min(100, Math.max(data.rows ?? 1, 1)));
        setError("");
      } catch {
        setError("Failed to load analytics configuration from backend.");
      }
    }
    loadConfig();
  }, [refreshKey]);

  useEffect(() => {
    async function loadChartData() {
      if (!chartType) return;
      if (chartType === "Scatter Plot" && xCol === yCol) {
        setWarning("X and Y axes must be different for a scatter plot.");
        setChartResponse({ chart_data: [], meta: {} });
        return;
      }
      try {
        const payload = {
          chart_type: chartType,
          data_type: dataType,
          sample_size: sampleSize,
          column: column || null,
          x_col: xCol || null,
          y_col: yCol || null,
          color_col: colorCol === "None" ? null : colorCol,
        };
        const response = await api.post("/analytics/dataset-graph", payload);
        setChartResponse(response.data);
        setWarning(response.data?.warnings?.[0] ?? "");
        setError("");
      } catch {
        setError("Failed to generate chart from backend.");
      }
    }
    loadChartData();
  }, [chartType, dataType, sampleSize, column, xCol, yCol, colorCol]);

  useEffect(() => {
    if (!chartType) return;
    if ((chartType === "Histogram" || chartType === "Box Plot") && numericCols.length) {
      setColumn((prev) => (numericCols.includes(prev) ? prev : numericCols[0]));
    }
    if ((chartType === "Bar Chart" || chartType === "Pie Chart") && categoricCols.length) {
      setColumn((prev) => (categoricCols.includes(prev) ? prev : categoricCols[0]));
    }
    if (chartType === "Scatter Plot" && numericCols.length) {
      setXCol((prev) => (numericCols.includes(prev) ? prev : numericCols[0]));
      setYCol((prev) => {
        const availableY = numericCols.filter((item) => item !== xCol);
        if (availableY.includes(prev)) return prev;
        return availableY[0] ?? numericCols[0];
      });
    }
  }, [chartType, numericCols, categoricCols]);

  useEffect(() => {
    if (chartType !== "Scatter Plot") return;
    const availableY = numericCols.filter((item) => item !== xCol);
    if (!availableY.length) {
      setWarning("At least two numeric columns are required for a scatter plot.");
      return;
    }
    if (xCol === yCol || !availableY.includes(yCol)) {
      setYCol(availableY[0]);
    }
  }, [chartType, numericCols, xCol, yCol]);

  const tableColumns = useMemo(() => {
    if (!previewRows.length) return [];
    return Object.keys(previewRows[0]);
  }, [previewRows]);

  const cards = [
    { label: "Rows", value: config?.rows ?? "-" },
    { label: "Columns", value: config?.columns ?? "-" },
    { label: "Missing Values", value: config?.missing_values ?? 0 },
    { label: "Numeric Columns", value: numericCols.length },
    { label: "Categorical Columns", value: categoricCols.length },
  ];

  const isCategoricChart = chartType === "Bar Chart" || chartType === "Pie Chart";
  const isNumericSingleColumnChart = chartType === "Histogram" || chartType === "Box Plot";
  const isScatterChart = chartType === "Scatter Plot";
  const yAxisOptions = numericCols.filter((item) => item !== xCol);

  return (
    <div className="flex h-screen overflow-hidden bg-background-light">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <Navbar title="Analytics - Dataset & Graph Analysis" />

        <div className="space-y-6 p-8">
          {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
          {warning ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{warning}</div>
          ) : null}

          <section className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {cards.map((card) => (
              <article key={card.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{card.label}</p>
                <h4 className="mt-2 text-2xl font-black text-slate-900">{card.value}</h4>
              </article>
            ))}
          </section>

          <section>
            <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-bold">Missing Values</h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  Total: {config?.missing_values ?? 0}
                </span>
              </div>
              {config?.missing_by_column?.length ? (
                <div className="flex flex-wrap gap-2">
                  {config.missing_by_column.map((item) => (
                    <span key={item.column} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                      {item.column}: {item.missing}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No missing values in current dataset.</p>
              )}
            </article>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold">Data Visualization Controls</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Chart Type</label>
                <select
                  value={chartType}
                  onChange={(event) => setChartType(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {chartOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Data Type</label>
                <select
                  value={dataType}
                  onChange={(event) => setDataType(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option>Population Data</option>
                  <option>Sample Data</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Sample Size ({sampleSize})
                </label>
                <input
                  type="range"
                  min={1}
                  max={Math.max(totalRows, 1)}
                  value={Math.min(sampleSize, Math.max(totalRows, 1))}
                  onChange={(event) => setSampleSize(Number(event.target.value))}
                  disabled={dataType !== "Sample Data"}
                  className="w-full"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              {(isCategoricChart || isNumericSingleColumnChart) && (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Column</label>
                  <select
                    value={column}
                    onChange={(event) => setColumn(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {(isCategoricChart ? categoricCols : numericCols).map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {isScatterChart && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">X Axis</label>
                    <select value={xCol} onChange={(event) => setXCol(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                      {numericCols.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Y Axis</label>
                    <select value={yCol} onChange={(event) => setYCol(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                      {yAxisOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Color By</label>
                    <select
                      value={colorCol}
                      onChange={(event) => setColorCol(event.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option>None</option>
                      {categoricCols.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
          </section>

          <ChartErrorBoundary>
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-bold">{chartResponse?.meta?.title || chartType || "Chart"}</h3>
              <div className="h-96">
                {(chartType === "Bar Chart" || chartType === "Histogram") && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartResponse?.chart_data ?? []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" interval={0} angle={-20} textAnchor="end" height={70} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#2d4b58" />
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {chartType === "Pie Chart" && (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartResponse?.chart_data ?? []} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={130} label>
                        {(chartResponse?.chart_data ?? []).map((entry, index) => (
                          <Cell key={`${entry.label}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}

                {chartType === "Scatter Plot" && (
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid />
                      <XAxis type="number" dataKey="x" name={chartResponse?.meta?.x_label || "x"} />
                      <YAxis type="number" dataKey="y" name={chartResponse?.meta?.y_label || "y"} />
                      <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                      {chartResponse?.meta?.color_col
                        ? (chartResponse?.chart_data ?? []).map((group, index) => (
                            <Scatter key={group.name} name={group.name} data={group.points} fill={SCATTER_COLORS[index % SCATTER_COLORS.length]} />
                          ))
                        : <Scatter name="Points" data={chartResponse?.chart_data ?? []} fill="#2d4b58" />}
                      <Legend />
                    </ScatterChart>
                  </ResponsiveContainer>
                )}

                {chartType === "Box Plot" && (() => {
                  const stats = chartResponse?.chart_data?.[0];
                  const required = ["min", "q1", "median", "q3", "max"];
                  const hasValidStats =
                    stats &&
                    required.every((key) => typeof stats[key] === "number" && Number.isFinite(stats[key]));
                  if (!hasValidStats) {
                    return <p className="text-sm text-slate-500">Generating box plot...</p>;
                  }
                  const range = Math.max(stats.max - stats.min, 1);
                  const pct = (value) => ((value - stats.min) / range) * 100;
                  return (
                    <div className="space-y-6 pt-12">
                      <div className="relative h-10">
                        <div className="absolute top-4 h-0.5 w-full bg-slate-300" />
                        <div className="absolute top-2 h-6 bg-primary/20" style={{ left: `${pct(stats.q1)}%`, width: `${pct(stats.q3) - pct(stats.q1)}%` }} />
                        <div className="absolute top-1 h-8 w-0.5 bg-primary" style={{ left: `${pct(stats.median)}%` }} />
                        <div className="absolute top-2 h-6 w-0.5 bg-slate-500" style={{ left: `${pct(stats.min)}%` }} />
                        <div className="absolute top-2 h-6 w-0.5 bg-slate-500" style={{ left: `${pct(stats.max)}%` }} />
                      </div>
                      <div className="grid grid-cols-5 gap-2 text-center text-xs text-slate-600">
                        <div>Min: {stats.min.toFixed(2)}</div>
                        <div>Q1: {stats.q1.toFixed(2)}</div>
                        <div>Median: {stats.median.toFixed(2)}</div>
                        <div>Q3: {stats.q3.toFixed(2)}</div>
                        <div>Max: {stats.max.toFixed(2)}</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </section>
          </ChartErrorBoundary>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold">Dataset Preview</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    {tableColumns.map((header) => (
                      <th key={header} className="px-4 py-3">
                        {titleCase(header)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewRows.map((row, idx) => (
                    <tr key={idx}>
                      {tableColumns.map((col) => (
                        <td key={`${idx}-${col}`} className="px-4 py-3 text-slate-700">
                          {String(row[col] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
