import React, { useState } from "react";
import { LogIn } from "lucide-react";

export default function LoginPage({ onGoogle, onEmail }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const submit = (e) => {
    e.preventDefault();
    onEmail(email, password);
  };
  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-md text-center">
        <h2 className="text-3xl font-bold">Welcome back</h2>
        <p className="text-slate-600 mt-1">Sign in to access your dashboard.</p>
        <form className="mt-6 grid gap-3 text-left" onSubmit={submit}>
          <input type="email" required placeholder="Email" className="p-3 border rounded-xl" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" required placeholder="Password" className="p-3 border rounded-xl" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="submit" className="w-full px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700">Sign In</button>
        </form>
        <div className="my-4 flex items-center gap-3 text-slate-400">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs">or</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>
        <div className="mt-2">
          <button onClick={onGoogle} className="w-full px-4 py-2 rounded-xl border border-slate-300 inline-flex items-center justify-center gap-2 hover:bg-slate-50">
            <LogIn className="w-4 h-4" /> Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
}
