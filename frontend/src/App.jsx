import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const DataExplorer = lazy(() => import("./pages/DataExplorer"));
const Analytics = lazy(() => import("./pages/Analytics"));
const AIQuery = lazy(() => import("./pages/AIQuery"));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="p-6 text-sm text-slate-600">Loading...</div>}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/explorer" element={<DataExplorer />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/ai-query" element={<AIQuery />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
