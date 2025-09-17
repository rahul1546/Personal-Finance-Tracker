import React, { useEffect, useMemo, useState } from "react";
import {
  addDoc, collection, deleteDoc, doc, updateDoc,
  onSnapshot, orderBy, query, serverTimestamp, setDoc, where, getDocs
} from "firebase/firestore";
import { db } from "../firebase";

/* =========================
   Constants / Utilities
========================= */
const TAGS = [
  "Groceries","Transport","Bills","Entertainment","Eating Out",
  "Shopping","Health","Rent","Savings","Other",
];

function currencyFmt(v, sym = "$") {
  const n = Number(v || 0);
  return (n < 0 ? `-${sym}` : sym) + Math.abs(n).toFixed(2);
}
function startOfMonth(date = new Date()) {
  const d = new Date(date);
  d.setDate(1); d.setHours(0,0,0,0);
  return d;
}
function endOfMonth(date = new Date()) {
  const d = new Date(date);
  d.setMonth(d.getMonth()+1, 0); d.setHours(23,59,59,999);
  return d;
}
const todayStr = () => new Date().toISOString().slice(0, 10);

/* =========================
   Dashboard
========================= */
export default function Dashboard({ user, goHome }) {
  const uid = user?.uid;

  // Core data
  const [txns, setTxns] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [goals, setGoals]   = useState([]); // savings goals
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  });

  // Quick add form state
  const [form, setForm] = useState({
    type: "expense",
    amount: "",
    tag: "Groceries",        // used for expense
    note: "",
    date: todayStr(),
    recurring: false,        // NEW
  });

  // Filters
  const [filter, setFilter] = useState({
    type: "all",      // all | expense | income
    tag: "all",
    q: "",
    from: "",
    to: "",
  });

  // UI modals
  const [confirmBudgetTag, setConfirmBudgetTag] = useState(null);
  const [editTxn, setEditTxn] = useState(null);
  const [editForm, setEditForm] = useState({ amount: "", tag: "", date: "", note: "" });

  // Settings (base currency & dark mode)
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  /* -----------------------------
   Live subscriptions (month-bound)
  ----------------------------- */
  useEffect(() => {
    if (!uid) return;

    const [y, m] = month.split("-").map(Number);
    const from = startOfMonth(new Date(y, m-1, 1));
    const to   = endOfMonth(new Date(y, m-1, 1));

    // transactions for the month
    const txRef = collection(db, "users", uid, "transactions");
    const qTx = query(
      txRef,
      where("date", ">=", from.toISOString().slice(0,10)),
      where("date", "<=", to.toISOString().slice(0,10)),
      orderBy("date", "desc")
    );
    const unsubTx = onSnapshot(qTx, (snap) => {
      const rows = [];
      snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
      rows.sort((a,b) => (a.date===b.date ? (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0) : 0));
      setTxns(rows);
    });

    // budgets (all)
    const budRef = collection(db, "users", uid, "budgets");
    const unsubBud = onSnapshot(budRef, (snap) => {
      const rows = [];
      snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
      setBudgets(rows);
    });

    // goals (all)
    const goalRef = collection(db, "users", uid, "goals");
    const unsubGoals = onSnapshot(goalRef, (snap) => {
      const rows = [];
      snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
      setGoals(rows);
    });

    return () => { unsubTx?.(); unsubBud?.(); unsubGoals?.(); };
  }, [uid, month]);

  /* ---------------------------------
   Seed recurring from previous month
  --------------------------------- */
  useEffect(() => {
    if (!uid) return;
    // When month changes, copy last month's recurring txns whose day exists
    (async () => {
      const [y, m] = month.split("-").map(Number);
      const prev = new Date(y, m-2, 1); // previous month
      const fromPrev = startOfMonth(prev).toISOString().slice(0,10);
      const toPrev   = endOfMonth(prev).toISOString().slice(0,10);
      const txRef = collection(db, "users", uid, "transactions");
      const qPrev = query(
        txRef,
        where("date", ">=", fromPrev),
        where("date", "<=", toPrev)
      );
      const prevSnap = await getDocs(qPrev);
      const rec = [];
      prevSnap.forEach(d => { const v = d.data(); if (v.recurring) rec.push({ id: d.id, ...v }); });

      if (rec.length === 0) return;

      // only create if not already present in current month (simple heuristic: same note+amount+type on same day)
      const dayCount = new Date(y, m, 0).getDate();
      for (const r of rec) {
        const day = Number(r.date.slice(-2));
        const targetDay = Math.min(day, dayCount);
        const newDate = `${y}-${String(m).padStart(2,"0")}-${String(targetDay).padStart(2,"0")}`;

        const exists = txns.some(t =>
          t.recurring && t.type===r.type && t.amount===r.amount && t.note===r.note && t.date===newDate
        );
        if (!exists) {
          await addDoc(collection(db, "users", uid, "transactions"), {
            type: r.type,
            amount: r.amount,
            tag: r.tag,
            note: r.note,
            date: newDate,
            recurring: true,
            createdAt: serverTimestamp(),
          });
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, uid]); // run when month changes

  /* --------------------------
   Derived stats + filtered set
  --------------------------- */
  const visibleTxns = useMemo(() => {
    return txns.filter(t => {
      if (filter.type !== "all" && t.type !== filter.type) return false;
      if (filter.tag !== "all" && t.tag !== filter.tag) return false;
      if (filter.from && t.date < filter.from) return false;
      if (filter.to && t.date > filter.to) return false;
      if (filter.q) {
        const q = filter.q.toLowerCase();
        if (!(`${t.note||""} ${t.tag||""}`.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [txns, filter]);

  const { income, expense, netByTag, totalExpense } = useMemo(() => {
    let income = 0, expense = 0;
    const netByTag = {};
    visibleTxns.forEach(t => {
      const amt = Number(t.amount || 0);
      if (t.type === "income") income += amt;
      else {
        expense += amt;
        netByTag[t.tag] = (netByTag[t.tag] || 0) + amt;
      }
    });
    return { income, expense, totalExpense: expense, netByTag };
  }, [visibleTxns]);

  const monthLabel = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    return new Date(y, m-1, 1).toLocaleString(undefined, { month: "long", year: "numeric" });
  }, [month]);

  /* ----------------
   Core Actions
  ---------------- */
  async function addTransaction(e) {
    e.preventDefault();
    if (!uid) return;

    const amt = Number(form.amount);
    if (!amt || amt <= 0) { alert("Enter a valid amount"); return; }

    const finalTag  = form.type === "income" ? "Income" : form.tag;
    const finalDate = form.date || todayStr();

    await addDoc(collection(db, "users", uid, "transactions"), {
      type: form.type,
      amount: amt,
      tag: finalTag,
      note: form.note,
      date: finalDate,
      recurring: !!form.recurring,
      createdAt: serverTimestamp(),
    });

    setForm((f) => ({
      ...f,
      amount: "",
      note: "",
      tag: f.type === "expense" ? f.tag : "Groceries",
      date: f.date || todayStr(),
      recurring: f.recurring, // keep choice
    }));
  }

  async function removeTransaction(id) {
    if (!uid || !id) return;
    await deleteDoc(doc(db, "users", uid, "transactions", id));
  }
  async function saveEditedTransaction() {
    if (!uid || !editTxn) return;
    const amt = Number(editForm.amount);
    if (!amt || amt <= 0) { alert("Enter a valid amount"); return; }

    const ref = doc(db, "users", uid, "transactions", editTxn.id);
    await updateDoc(ref, {
      amount: amt,
      note: editForm.note || "",
      date: editForm.date || todayStr(),
      tag: editTxn.type === "income" ? "Income" : (editForm.tag || editTxn.tag),
    });
    setEditTxn(null);
  }

  async function upsertBudget(tag, limit) {
    if (!uid) return;
    const ref = doc(db, "users", uid, "budgets", tag);
    await setDoc(ref, { tag, limit: Number(limit) || 0 }, { merge: true });
  }
  async function deleteBudget(tag) {
    if (!uid) return;
    await deleteDoc(doc(db, "users", uid, "budgets", tag));
  }

  // Goals
  async function addGoal(name, target) {
    if (!uid) return;
    await addDoc(collection(db, "users", uid, "goals"), {
      name, target: Number(target)||0, createdAt: serverTimestamp(),
    });
  }
  async function updateGoal(id, patch) {
    if (!uid) return;
    await updateDoc(doc(db, "users", uid, "goals", id), patch);
  }
  async function removeGoal(id) {
    if (!uid) return;
    await deleteDoc(doc(db, "users", uid, "goals", id));
  }

  /* ----------------
   Export / Import
  ---------------- */
  function exportCSV() {
    const headers = ["id","date","type","tag","note","amount","recurring"];
    const lines = [headers.join(",")];
    visibleTxns.forEach(t => {
      lines.push([t.id, t.date, t.type, t.tag, (t.note||"").replace(/,/g," "), t.amount, t.recurring?1:0].join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `transactions_${month}.csv`; a.click();
    URL.revokeObjectURL(url);
  }
  async function importCSV(file) {
    if (!uid || !file) return;
    const text = await file.text();
    const rows = text.trim().split(/\r?\n/);
    const [header, ...rest] = rows;
    // expecting: id,date,type,tag,note,amount,recurring
    for (const line of rest) {
      const [id,date,type,tag,note,amount,recurring] = line.split(",");
      if (!date || !type || !amount) continue;
      await addDoc(collection(db, "users", uid, "transactions"), {
        date, type, tag: tag || (type==="income" ? "Income" : "Other"),
        note: note || "", amount: Number(amount)||0,
        recurring: ["1","true","TRUE"].includes((recurring||"").trim()),
        createdAt: serverTimestamp(),
      });
    }
    alert("Import complete");
  }

  /* ----------------
   Dark mode
  ---------------- */
  function toggleDark() {
    const root = document.documentElement;
    root.classList.toggle("dark");
    setDark(root.classList.contains("dark"));
  }

  /* ----------------
   Goals helpers
  ---------------- */
  const savingsSpent = useMemo(() => {
    // Treat transactions with tag "Savings" (expense type) as negative progress,
    // and income with tag "Income" doesn't count here. Instead, we’ll assume
    // Savings is tracked via "Savings" tag in expenses (moving money into savings).
    // If you prefer Income->Savings, change logic accordingly.
    let total = 0;
    txns.forEach(t => {
      if (t.tag === "Savings" && t.type === "expense") total += Number(t.amount||0);
    });
    return total;
  }, [txns]);

  /* =========================
         R E N D E R
  ========================= */
  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        {/* Top row: greeting + controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Hello, {user?.name || user?.email?.split("@")[0]} <span className="align-middle">👋</span>
            </h2>
            <p className="text-slate-600 dark:text-slate-300 mt-1">
              Tracker dashboard for <span className="font-medium">{monthLabel}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleDark}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 shadow-sm hover:bg-slate-50"
              title="Toggle dark mode"
            >
              {dark ? "Light" : "Dark"} mode
            </button>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-white dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400"
            />
            <button
              onClick={goHome}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 shadow-sm hover:bg-slate-50"
            >
              Back to home
            </button>
          </div>
        </div>

        {/* KPI cards (3-up) */}
        <div className="grid lg:grid-cols-3 gap-4 mt-6">
          <StatCard label="Income"  value={currencyFmt(income)}  accent="from-emerald-50 to-transparent" valueClass="text-emerald-600" />
          <StatCard label="Expense" value={currencyFmt(totalExpense)} accent="from-rose-50 to-transparent" valueClass="text-rose-600" />
          <StatCard label="Net"     value={currencyFmt(income-totalExpense)} accent="from-indigo-50 to-transparent" valueClass={(income-totalExpense)>=0?"text-emerald-600":"text-rose-600"} />
        </div>

        {/* Main grid: 12 cols -> 3 + 3 + 6 */}
        <div className="grid xl:grid-cols-12 gap-4 mt-6 items-start">
          {/* Quick Add */}
          <Card className="xl:col-span-3">
            <SectionTitle>Quick add transaction</SectionTitle>
            <form className="mt-3 grid gap-3" onSubmit={addTransaction}>
              {/* Expense / Income toggle */}
              <div className="flex gap-2">
                <label className={`flex-1 px-3 py-2 rounded-xl border text-center cursor-pointer transition ${form.type==="expense" ? "bg-slate-100 border-slate-300 dark:bg-slate-700 dark:border-slate-600" : "border-slate-200 hover:bg-slate-50 dark:border-slate-700"}`}>
                  <input type="radio" className="hidden" name="type" value="expense"
                         checked={form.type==="expense"}
                         onChange={()=>setForm(f=>({ ...f, type:"expense", tag:(f.tag==="Income"?"Groceries":f.tag) }))}/>
                  Expense
                </label>
                <label className={`flex-1 px-3 py-2 rounded-xl border text-center cursor-pointer transition ${form.type==="income" ? "bg-slate-100 border-slate-300 dark:bg-slate-700 dark:border-slate-600" : "border-slate-200 hover:bg-slate-50 dark:border-slate-700"}`}>
                  <input type="radio" className="hidden" name="type" value="income"
                         checked={form.type==="income"}
                         onChange={()=>setForm(f=>({ ...f, type:"income", tag:"Income" }))}/>
                  Income
                </label>
              </div>

              <input type="number" inputMode="decimal" step="0.01" min="0" placeholder="Amount"
                className="px-3 py-2 rounded-xl border border-slate-300 bg-white dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 shadow-sm"
                value={form.amount} onChange={(e)=>setForm(f=>({...f,amount:e.target.value}))} required
              />

              {form.type === "expense" && (
                <select className="px-3 py-2 rounded-xl border border-slate-300 bg-white dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 shadow-sm"
                        value={form.tag} onChange={(e)=>setForm(f=>({...f,tag:e.target.value}))}>
                  {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              )}

              <input type="date"
                className="px-3 py-2 rounded-xl border border-slate-300 bg-white dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 shadow-sm"
                value={form.date} onChange={(e)=>setForm(f=>({...f,date:e.target.value}))} required
              />

              <input type="text" placeholder="Note (optional)"
                className="px-3 py-2 rounded-xl border border-slate-300 bg-white dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 shadow-sm"
                value={form.note} onChange={(e)=>setForm(f=>({...f,note:e.target.value}))}
              />

              {/* Recurring toggle */}
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.recurring}
                  onChange={(e)=>setForm(f=>({...f, recurring: e.target.checked}))}/>
                Repeat every month
              </label>

              <button type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold shadow-sm hover:bg-indigo-700">
                Add
              </button>
            </form>
          </Card>

          {/* Budgets */}
          <Card className="xl:col-span-3">
            <SectionTitle>Budgets</SectionTitle>
            <div className="mt-3 grid gap-3">
              {Object.entries(groupBudgets(budgets)).map(([tag, limit]) => {
                const spent = netByTag[tag] || 0;
                const pct = limit ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
                return (
                  <div key={tag} className="relative group p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70">
                    {/* hover x */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setConfirmBudgetTag(tag); }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full inline-flex items-center justify-center
                                 text-slate-400 hover:text-rose-600 hover:bg-rose-50
                                 opacity-0 group-hover:opacity-100 transition"
                      aria-label={`Delete ${tag} budget`}
                      title="Delete budget"
                    >
                      ×
                    </button>

                    <div className="flex items-center justify-between text-sm pr-6">
                      <span className="font-medium">{tag}</span>
                      <span className={`${pct>100?"text-rose-600":"text-slate-600 dark:text-slate-300"}`}>
                        {currencyFmt(spent)} / {currencyFmt(limit)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden mt-2">
                      <div className={`h-full transition-all duration-300 ${pct>100?"bg-rose-500":"bg-indigo-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
              {budgets.length === 0 && (
                <div className="text-sm text-slate-500 dark:text-slate-400">No budgets yet — add one below.</div>
              )}
            </div>
            <BudgetEditor onSave={upsertBudget} />
          </Card>

          {/* Transactions */}
          <Card className="xl:col-span-6">
            <SectionTitle>Transactions</SectionTitle>

            {/* Filters + Export/Import */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                value={filter.type} onChange={(e)=>setFilter(f=>({...f,type:e.target.value}))}>
                <option value="all">All types</option>
                <option value="expense">Expenses</option>
                <option value="income">Income</option>
              </select>
              <select className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                value={filter.tag} onChange={(e)=>setFilter(f=>({...f,tag:e.target.value}))}>
                <option value="all">All tags</option>
                {TAGS.concat("Income").map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input type="date" className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                value={filter.from} onChange={(e)=>setFilter(f=>({...f,from:e.target.value}))}/>
              <input type="date" className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                value={filter.to} onChange={(e)=>setFilter(f=>({...f,to:e.target.value}))}/>
              <input type="text" placeholder="Search note/tag"
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                value={filter.q} onChange={(e)=>setFilter(f=>({...f,q:e.target.value}))}/>
              <button onClick={exportCSV}
                className="ml-auto px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                Export CSV
              </button>
              <label className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer">
                Import CSV
                <input type="file" accept=".csv" className="hidden" onChange={(e)=>importCSV(e.target.files?.[0])}/>
              </label>
            </div>

            <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/40">
                  <tr className="text-left">
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Tag</th>
                    <th className="px-3 py-2">Note</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2 w-24 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-700">
                  {visibleTxns.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                      <td className="px-3 py-2 whitespace-nowrap">{t.date}{t.recurring ? <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">recurring</span> : null}</td>
                      <td className="px-3 py-2">{t.tag}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{t.note}</td>
                      <td className={`px-3 py-2 text-right tabular-nums ${t.type==="expense" ? "text-rose-600" : "text-emerald-600"}`}>
                        {t.type==="expense" ? "-" : "+"}{currencyFmt(t.amount)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => {
                            setEditTxn(t);
                            setEditForm({
                              amount: String(t.amount ?? ""),
                              note: t.note ?? "",
                              date: t.date ?? todayStr(),
                              tag: t.tag ?? (t.type === "income" ? "Income" : ""),
                            });
                          }}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900/50"
                          title="Edit"
                        >
                          ⋯
                        </button>
                      </td>
                    </tr>
                  ))}
                  {visibleTxns.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-slate-500 dark:text-slate-400">
                        No transactions match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Analytics + Goals row */}
        <div className="grid xl:grid-cols-12 gap-4 mt-6 items-start">
          {/* Simple bar chart (Expense by Category) */}
          <Card className="xl:col-span-6">
            <SectionTitle>Expenses by category</SectionTitle>
            <div className="mt-4 space-y-2">
              {Object.entries(netByTag)
                .sort((a,b)=>b[1]-a[1])
                .map(([tag, amt]) => (
                <div key={tag}>
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                    <span>{tag}</span><span>{currencyFmt(amt)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded">
                    <div className="h-2 bg-indigo-500 rounded" style={{width: `${Math.min(100, (amt/Math.max(1, totalExpense))*100)}%`}} />
                  </div>
                </div>
              ))}
              {totalExpense === 0 && <div className="text-sm text-slate-500 dark:text-slate-400">No expenses yet.</div>}
            </div>
          </Card>

          {/* Savings Goals */}
          <Card className="xl:col-span-6">
            <SectionTitle>Savings goals</SectionTitle>
            <GoalManager goals={goals} onAdd={addGoal} onUpdate={updateGoal} onDelete={removeGoal} savingsSpent={savingsSpent} />
          </Card>
        </div>

        {/* Modals */}
        {confirmBudgetTag && (
          <Modal onClose={() => setConfirmBudgetTag(null)}>
            <h4 className="text-lg font-semibold">Delete budget?</h4>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              This will remove the <span className="font-medium">{confirmBudgetTag}</span> budget.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmBudgetTag(null)}>Cancel</Button>
              <Button variant="danger" onClick={async () => { await deleteBudget(confirmBudgetTag); setConfirmBudgetTag(null); }}>Delete</Button>
            </div>
          </Modal>
        )}

        {editTxn && (
          <Modal onClose={() => setEditTxn(null)} maxWidth="max-w-lg">
            <h4 className="text-lg font-semibold">Edit transaction</h4>
            <div className="mt-4 grid gap-3">
              <input type="date" className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                value={editForm.date} onChange={(e)=>setEditForm(f=>({...f, date:e.target.value}))}/>
              {editTxn.type === "income" ? (
                <select className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        value={editForm.tag} onChange={(e)=>setEditForm(f=>({...f, tag:e.target.value}))}>
                  <option value="Income">Income</option>
                </select>
              ) : (
                <select className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        value={editForm.tag} onChange={(e)=>setEditForm(f=>({...f, tag:e.target.value}))}>
                  {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
              <input type="text" placeholder="Note (optional)"
                     className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                     value={editForm.note} onChange={(e)=>setEditForm(f=>({...f, note:e.target.value}))}/>
              <input type="number" step="0.01" min="0" inputMode="decimal"
                     className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                     value={editForm.amount} onChange={(e)=>setEditForm(f=>({...f, amount:e.target.value}))}/>
            </div>
            <div className="mt-5 flex justify-between gap-2">
              <Button variant="danger" onClick={async () => { await removeTransaction(editTxn.id); setEditTxn(null); }}>Delete</Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setEditTxn(null)}>Cancel</Button>
                <Button onClick={saveEditedTransaction}>Save changes</Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}

/* =========================
   Subcomponents / Helpers
========================= */

function groupBudgets(rows) {
  const out = {};
  rows.forEach(b => { out[b.tag] = Number(b.limit || 0); });
  return out;
}

function BudgetEditor({ onSave }) {
  const [tag, setTag] = useState("Groceries");
  const [limit, setLimit] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!limit) return;
    onSave(tag, limit);
    setLimit("");
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 grid gap-3">
      <div className="text-sm font-medium">Add / Update a budget</div>
      <select className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" value={tag} onChange={(e) => setTag(e.target.value)}>
        {TAGS.map((t) => (<option key={t} value={t}>{t}</option>))}
      </select>
      <input type="number" step="0.01" min="0" placeholder="Monthly limit"
             className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
             value={limit} onChange={(e) => setLimit(e.target.value)} required/>
      <button type="submit" className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900">
        Submit
      </button>
    </form>
  );
}

function GoalManager({ goals, onAdd, onUpdate, onDelete, savingsSpent }) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");

  return (
    <div>
      {/* Add new */}
      <form onSubmit={(e)=>{e.preventDefault(); if(!name || !target) return; onAdd(name, target); setName(""); setTarget("");}}
            className="grid md:grid-cols-3 gap-2">
        <input className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
               placeholder="Goal name (e.g., Vacation)" value={name} onChange={(e)=>setName(e.target.value)}/>
        <input type="number" step="0.01" min="0"
               className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
               placeholder="Target amount" value={target} onChange={(e)=>setTarget(e.target.value)}/>
        <button className="px-3 py-2 rounded-xl bg-indigo-600 text-white">Add goal</button>
      </form>

      <div className="mt-4 grid gap-3">
        {goals.map(g => {
          const progress = Math.min(100, Math.round((savingsSpent / (g.target || 1)) * 100));
          return (
            <div key={g.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{g.name}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-300">{currencyFmt(savingsSpent)} / {currencyFmt(g.target)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700"
                          onClick={()=>onUpdate(g.id, { target: Number(prompt("New target:", g.target)||g.target) })}>
                    Edit
                  </button>
                  <button className="px-2 py-1 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50"
                          onClick={()=>onDelete(g.id)}>
                    Delete
                  </button>
                </div>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden mt-2">
                <div className="h-full bg-emerald-500" style={{width: `${progress}%`}} />
              </div>
            </div>
          );
        })}
        {goals.length === 0 && <div className="text-sm text-slate-500 dark:text-slate-400">No goals yet — create your first goal above.</div>}
      </div>
    </div>
  );
}

/* ---------- small UI primitives ---------- */
function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 backdrop-blur p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
function SectionTitle({ children }) {
  return <h3 className="font-semibold tracking-tight dark:text-slate-100">{children}</h3>;
}
function StatCard({ label, value, accent = "from-slate-50 to-transparent", valueClass = "" }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent}`} />
      <div className="relative">
        <div className="text-slate-500 dark:text-slate-300 text-xs uppercase tracking-wide">{label}</div>
        <div className={`text-2xl md:text-3xl font-bold mt-1 ${valueClass}`}>{value}</div>
      </div>
    </div>
  );
}
function Modal({ children, onClose, maxWidth = "max-w-sm" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative bg-white dark:bg-slate-900 dark:text-slate-100 rounded-2xl shadow-xl p-6 w-[90%] ${maxWidth}`}>
        {children}
      </div>
    </div>
  );
}
function Button({ children, onClick, variant = "primary" }) {
  const base = "px-3 py-2 rounded-xl";
  const styles = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    ghost: "border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
  };
  return <button onClick={onClick} className={`${base} ${styles[variant]}`}>{children}</button>;
}
