import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import api from "../api/api";

const links = [
  { to: "/", label: "Dashboard", icon: "dashboard" },
  { to: "/explorer", label: "Data Explorer", icon: "database" },
  { to: "/analytics", label: "Analytics", icon: "monitoring" },
  { to: "/ai-query", label: "AI Query", icon: "chat_bubble" },
];

const supportLinks = [
  {
    href: "https://github.com/lalitkumar315/ai-data-analyst",
    label: "GitHub Repo",
    icon: "code",
  },
  {
    href: "https://www.linkedin.com/in/lalit-kumar-mahanta/",
    label: "Contact Developer",
    icon: "support_agent",
  },
  {
    href: "mailto:lalit.kumar.31524@gmail.com",
    label: "Email Support",
    icon: "mail",
  },
];

export default function Sidebar() {
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    async function loadDatasetOptions() {
      try {
        const response = await api.get("/dataset/builtin");
        const items = response.data?.datasets ?? [];
        setDatasets(items);
        if (items.length) setSelectedDataset(items[0]);
      } catch {
        setStatus("Failed to load built-in dataset list.");
      }
    }
    loadDatasetOptions();
  }, []);

  async function handleBuiltinLoad() {
    if (!selectedDataset || busy) return;
    setBusy(true);
    setStatus("");
    try {
      const response = await api.post("/dataset/builtin/load", { name: selectedDataset });
      setStatus(response.data?.message ?? "Built-in dataset loaded.");
      window.dispatchEvent(new CustomEvent("dataset-updated"));
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setStatus(detail || "Failed to load built-in dataset.");
    } finally {
      setBusy(false);
    }
  }

  async function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file || busy) return;

    setBusy(true);
    setStatus("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await api.post("/upload/dataset", formData);
      setStatus(response.data?.message ?? "Dataset uploaded.");
      window.dispatchEvent(new CustomEvent("dataset-updated"));
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setStatus(detail || "Failed to upload dataset.");
    } finally {
      event.target.value = "";
      setBusy(false);
    }
  }

  return (
    <aside className="sticky top-0 flex h-screen w-72 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white">
      <div className="p-6">
        <div className="mb-8 flex items-center gap-3 text-primary">
          <span className="material-symbols-outlined text-3xl">query_stats</span>
          <h1 className="text-xl font-bold">AI Data Analyst</h1>
        </div>

        <nav className="space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              <span className="material-symbols-outlined">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-auto border-t border-slate-200 p-6">
        <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
        <div className="mb-3 rounded-lg border border-slate-200 p-3">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Built-in dataset</label>
          <select
            value={selectedDataset}
            onChange={(event) => setSelectedDataset(event.target.value)}
            className="mb-2 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-700 outline-none focus:border-primary"
            disabled={busy || !datasets.length}
          >
            {datasets.map((dataset) => (
              <option key={dataset} value={dataset}>
                {dataset}
              </option>
            ))}
          </select>
          <button
            className="w-full rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary disabled:opacity-60"
            onClick={handleBuiltinLoad}
            disabled={busy || !selectedDataset}
          >
            Load Built-in
          </button>
        </div>

        <button
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-white disabled:opacity-60"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
        >
          <span className="material-symbols-outlined text-lg">upload_file</span>
          Upload Dataset
        </button>

        {status ? <p className="mb-3 text-xs text-slate-600">{status}</p> : null}

        <div className="rounded-lg border border-slate-200 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Support</p>
          <div className="space-y-1">
            {supportLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
