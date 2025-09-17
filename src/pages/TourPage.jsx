import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";

function DemoBudget() {
  const items = [
    { name: "Groceries", used: 320, total: 400 },
    { name: "Transport", used: 110, total: 200 },
    { name: "Entertainment", used: 90, total: 150 },
  ];
  return (
    <div className="grid gap-3">
      {items.map((b) => {
        const pct = Math.min(100, Math.round((b.used / b.total) * 100));
        return (
          <div key={b.name} className="p-3 rounded-xl border border-slate-200 bg-white">
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">{b.name}</span>
              <span className={pct > 90 ? "text-rose-600" : "text-slate-600"}>
                {b.used}/{b.total}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className={`h-full ${pct > 90 ? "bg-rose-500" : "bg-indigo-500"}`} style={{ width: pct + "%" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DemoTransactions() {
  const seed = [
    { id: 1, date: "Aug 21", name: "Starbucks", amount: -5.2, tag: "Coffee" },
    { id: 2, date: "Aug 21", name: "Uber", amount: -14.5, tag: "Transport" },
    { id: 3, date: "Aug 22", name: "Salary", amount: 1800, tag: "Income" },
    { id: 4, date: "Aug 22", name: "Trader Joe's", amount: -62.9, tag: "Groceries" },
  ];
  const [filter, setFilter] = useState("All");
  const tags = ["All", "Income", "Groceries", "Transport", "Coffee"];
  const rows = seed.filter((r) => filter === "All" || r.tag === filter);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-xl border text-sm ${
              filter === t ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-slate-200 hover:bg-slate-50"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left">
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Payee</th>
              <th className="px-3 py-2">Tag</th>
              <th className="px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.date}</td>
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2">
                  <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-xs">{r.tag}</span>
                </td>
                <td className={`px-3 py-2 text-right ${r.amount < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  {r.amount < 0 ? "-" : "+"}${Math.abs(r.amount).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DemoSparkline() {
  const points = useMemo(() => [12, 15, 14, 18, 22, 21, 26, 24, 29, 33, 31, 36], []);
  const max = Math.max(...points);
  const d = points.map((v, i) => `${(i / (points.length - 1)) * 100},${100 - (v / max) * 100}`).join(" ");
  return (
    <svg viewBox="0 0 100 100" className="w-full h-24">
      <polyline fill="none" stroke="currentColor" strokeWidth="3" points={d} className="text-indigo-600" />
    </svg>
  );
}

export default function TourPage({ goHome, goSignup, goLogin }) {
  const slides = [
    {
      key: "overview",
      title: "Everything in one place",
      desc: "Accounts, budgets, and transactions unified with realtime sync.",
      content: (
        <div className="grid md:grid-cols-2 gap-6">
          <DemoSparkline />
          <DemoBudget />
        </div>
      ),
    },
    {
      key: "budgets",
      title: "Smart monthly budgets",
      desc: "Visual progress bars warn you before you overspend.",
      content: <DemoBudget />,
    },
    {
      key: "txns",
      title: "Quick transaction filtering",
      desc: "Slice by tag instantly to see where money goes.",
      content: <DemoTransactions />,
    },
  ];

  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 4500);
    return () => clearInterval(t);
  }, [playing, slides.length]);

  const next = () => setIdx((i) => (i + 1) % slides.length);
  const prev = () => setIdx((i) => (i - 1 + slides.length) % slides.length);

  return (
    <div className="min-h-[calc(100vh-56px)]">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-300 text-slate-600 text-xs bg-white/70 backdrop-blur">
            <Sparkles className="w-4 h-4" /> Interactive Tour
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPlaying(!playing)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 inline-flex items-center gap-2"
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />} {playing ? "Pause" : "Play"}
            </button>
            <button onClick={prev} className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Prev
            </button>
            <button onClick={next} className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 inline-flex items-center gap-2">
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={slides[idx].key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-2xl font-bold">{slides[idx].title}</h2>
              <p className="text-slate-600 mt-1">{slides[idx].desc}</p>
              <div className="mt-6">{slides[idx].content}</div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-2">
            {slides.map((s, i) => (
              <button
                key={s.key}
                onClick={() => setIdx(i)}
                aria-label={`Go to ${s.title}`}
                className={`h-2 w-6 rounded-full ${i === idx ? "bg-indigo-600" : "bg-slate-300"}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={goSignup} className="px-4 py-2 rounded-xl bg-indigo-600 text-white">
              Create account
            </button>
            <button onClick={goLogin} className="px-4 py-2 rounded-xl border border-slate-200">
              I already have an account
            </button>
            <button onClick={goHome} className="px-4 py-2 rounded-xl border border-slate-200">
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
