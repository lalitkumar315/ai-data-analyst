import { useEffect, useMemo, useRef, useState } from "react";
import api from "../api/api";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

function renderInlineMarkdown(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
}

function MarkdownView({ content }) {
  if (!content) return null;
  const lines = content.split("\n");
  return (
    <div className="space-y-2 text-sm text-slate-700">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;
        if (trimmed.startsWith("### ")) return <h3 key={idx} className="text-sm font-bold">{trimmed.slice(4)}</h3>;
        if (trimmed.startsWith("## ")) return <h2 key={idx} className="text-base font-bold">{trimmed.slice(3)}</h2>;
        if (trimmed.startsWith("# ")) return <h1 key={idx} className="text-lg font-bold">{trimmed.slice(2)}</h1>;
        if (/^\d+\.\s+/.test(trimmed)) return <p key={idx} className="pl-2">{renderInlineMarkdown(trimmed)}</p>;
        if (trimmed.startsWith("* ")) return <p key={idx} className="pl-2">• {renderInlineMarkdown(trimmed.slice(2))}</p>;
        return <p key={idx}>{renderInlineMarkdown(trimmed)}</p>;
      })}
    </div>
  );
}

export default function AIQuery() {
  const [summary, setSummary] = useState(null);
  const [summaryText, setSummaryText] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I am ready to help you analyze your dataset.",
    },
  ]);

  const [prompt, setPrompt] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState("");
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [listening, setListening] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const messagesEndRef = useRef(null);

  const speechSupported = useMemo(
    () => Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
    []
  );

  useEffect(() => {
    const onDatasetUpdated = () => {
      setRefreshKey((prev) => prev + 1);
      setMessages([{ role: "assistant", content: "Dataset updated. Ask a new question for fresh insights." }]);
      setSummaryText("");
      setSummaryLoading(true);
      setSummaryError("");
      Object.keys(sessionStorage)
        .filter((key) => key.startsWith("ai_summary_cache_"))
        .forEach((key) => sessionStorage.removeItem(key));
    };
    window.addEventListener("dataset-updated", onDatasetUpdated);
    return () => window.removeEventListener("dataset-updated", onDatasetUpdated);
  }, []);

  useEffect(() => {
    async function loadDatasetContext() {
      try {
        const datasetRes = await api.get("/dataset/summary");
        setSummary(datasetRes.data);

        const version = datasetRes.data?.dataset_version ?? "default";
        const cacheKey = `ai_summary_cache_${version}`;
        const [suggestionsRes] = await Promise.all([api.get("/ai/suggestions")]);
        setSuggestions(suggestionsRes.data?.suggestions ?? []);
        setSuggestionsLoading(false);

        const cachedSummary = sessionStorage.getItem(cacheKey);
        if (cachedSummary) {
          setSummaryText(cachedSummary);
          setSummaryLoading(false);
        } else {
          try {
            const summaryRes = await api.get("/ai/summary");
            const text = summaryRes.data?.summary ?? "";
            setSummaryText(text);
            sessionStorage.setItem(cacheKey, text);
          } catch {
            setSummaryError("Failed to load AI summary.");
          } finally {
            setSummaryLoading(false);
          }
        }
      } catch {
        setError("Failed to load dataset reference.");
        setSuggestionsLoading(false);
        setSummaryLoading(false);
      }
    }
    loadDatasetContext();
  }, [refreshKey]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function handleSend(customPrompt) {
    const question = (customPrompt ?? prompt).trim();
    if (!question || sending) return;

    setPrompt("");
    setSending(true);
    setError("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);

    try {
      const response = await api.post("/ai/query", { question });
      const answer = response.data?.answer ?? "No response.";
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch {
      setError("AI query request failed.");
      setMessages((prev) => [...prev, { role: "assistant", content: "I could not process that request right now." }]);
    } finally {
      setSending(false);
    }
  }

  function listenVoice() {
    if (!speechSupported || listening) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setListening(true);
    recognition.onresult = (event) => {
      const text = event.results?.[0]?.[0]?.transcript ?? "";
      if (text) setPrompt(text);
    };
    recognition.onerror = () => {
      setError("Speech recognition failed. Please try again.");
    };
    recognition.onend = () => setListening(false);
    recognition.start();
  }

  async function speakLastResponse() {
    const lastAssistant = [...messages].reverse().find((item) => item.role === "assistant");
    if (!lastAssistant?.content) return;

    try {
      const response = await api.post(
        "/ai/speak",
        { text: lastAssistant.content },
        { responseType: "blob" }
      );
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const url = URL.createObjectURL(response.data);
      setAudioUrl(url);
    } catch {
      setError("Could not generate speech for the latest response.");
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background-light">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Navbar title="AI Query" />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-r border-slate-200 p-6">
            {error ? (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <article className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-2 text-sm font-bold">AI Dataset Summary</h3>
              <div className="max-h-56 overflow-y-auto">
                {summaryLoading ? <p className="text-sm text-slate-500">Loading summary...</p> : null}
                {summaryError ? <p className="text-sm text-rose-600">{summaryError}</p> : null}
                {!summaryLoading && !summaryError ? <MarkdownView content={summaryText} /> : null}
              </div>
            </article>

            <article className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-2 text-sm font-bold">Suggested Questions</h3>
              {suggestionsLoading ? <p className="text-xs text-slate-500">Loading suggestions...</p> : null}
              <div className="flex flex-wrap gap-2">
                {suggestions.map((item) => (
                  <button
                    key={item}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 hover:border-primary hover:text-primary"
                    onClick={() => handleSend(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </article>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`max-w-2xl rounded-xl p-4 text-sm ${
                    message.role === "user"
                      ? "ml-auto bg-primary text-white"
                      : "border border-slate-200 bg-white text-slate-800"
                  }`}
                >
                  {message.content}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {audioUrl ? <audio className="mt-3 w-full" controls src={audioUrl} /> : null}

            <div className="mt-4 flex items-end gap-2 rounded-xl border border-slate-200 bg-white p-2">
              <button
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                onClick={listenVoice}
                disabled={!speechSupported || listening}
                title={speechSupported ? "Voice input" : "Voice input not supported"}
              >
                <span className="material-symbols-outlined">{listening ? "mic" : "mic_none"}</span>
              </button>

              <textarea
                rows="1"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                className="flex-1 resize-none border-none p-2 text-sm outline-none"
                placeholder="Ask a question about the dataset..."
              />

              <button
                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                onClick={speakLastResponse}
                disabled={!messages.length}
                title="Speak last response"
              >
                <span className="material-symbols-outlined">volume_up</span>
              </button>

              <button
                className="rounded-lg bg-primary p-2 text-white disabled:opacity-50"
                onClick={() => handleSend()}
                disabled={sending}
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </section>

          <aside className="hidden w-72 shrink-0 bg-white p-5 lg:block">
            <h3 className="mb-3 text-sm font-bold">Dataset Reference</h3>
            <p className="mb-4 rounded bg-slate-100 p-2 text-xs font-mono">Current Active Dataset</p>
            <div className="space-y-2 text-sm text-slate-600">
              <p>Rows: {summary?.rows ?? "-"}</p>
              <p>Columns: {summary?.columns ?? "-"}</p>
              <div className="pt-2 text-xs text-slate-500">
                {(summary?.column_names ?? []).map((name) => (
                  <p key={name}>{name}</p>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
