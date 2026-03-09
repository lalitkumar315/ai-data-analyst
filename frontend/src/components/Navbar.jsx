export default function Navbar({ title }) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-6 backdrop-blur">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <div className="flex items-center gap-3">
        <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
          <span className="material-symbols-outlined">search</span>
        </button>
        <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
          <span className="material-symbols-outlined">notifications</span>
        </button>
      </div>
    </header>
  );
}
