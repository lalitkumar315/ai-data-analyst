import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import api from "../api/api";

function titleCase(value) {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

export default function DataExplorer() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const onDatasetUpdated = () => setRefreshKey((prev) => prev + 1);
    window.addEventListener("dataset-updated", onDatasetUpdated);
    return () => window.removeEventListener("dataset-updated", onDatasetUpdated);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const response = await api.get("/dataset/preview", { params: { limit: 25 } });
        setRows(response.data?.rows ?? []);
      } catch {
        setError("Failed to load dataset preview from backend.");
      }
    }
    load();
  }, [refreshKey]);

  const columns = useMemo(() => {
    if (!rows.length) return [];
    return Object.keys(rows[0]);
  }, [rows]);

  return (
    <div className="flex h-screen overflow-hidden bg-background-light">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <Navbar title="Data Explorer" />

        <div className="space-y-6 p-8">
          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          ) : null}

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {["Preview: 25 rows", "Source: /api/dataset/preview"].map((f) => (
                <button key={f} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
                  {f}
                </button>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    {columns.map((h) => (
                      <th key={h} className="px-6 py-4">
                        {titleCase(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, index) => (
                    <tr key={`${index}-${JSON.stringify(row)}`} className="hover:bg-slate-50">
                      {columns.map((column) => (
                        <td key={`${index}-${column}`} className="px-6 py-4 text-slate-700">
                          {String(row[column] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!rows.length && !error ? <p className="p-6 text-sm text-slate-500">Loading preview...</p> : null}
          </section>
        </div>
      </main>
    </div>
  );
}
