import React, { useState } from "react";
import { LogIn } from "lucide-react";

export default function SignupPage({ onGoogle, onEmail }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (password !== confirm) {
      alert("Passwords do not match");
      return;
    }
    onEmail(email, password, fullName);
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-md text-center">
        <h2 className="text-3xl font-bold">Create your account</h2>
        <p className="text-slate-600 mt-1">Use email/password or continue with Google.</p>
        <form className="mt-6 grid gap-3 text-left" onSubmit={submit}>
          <input type="text" placeholder="Full Name" className="p-3 border rounded-xl" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <input type="email" required placeholder="Email" className="p-3 border rounded-xl" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" required placeholder="Password" className="p-3 border rounded-xl" value={password} onChange={(e) => setPassword(e.target.value)} />
          <input type="password" required placeholder="Confirm password" className="p-3 border rounded-xl" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <button type="submit" className="w-full px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700">Sign Up</button>
        </form>
        <div className="my-4 flex items-center gap-3 text-slate-400">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs">or</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>
        <div className="mt-2">
          <button onClick={onGoogle} className="w-full px-4 py-2 rounded-xl border border-slate-300 inline-flex items-center justify-center gap-2 hover:bg-slate-50">
            <LogIn className="w-4 h-4" /> Sign up with Google
          </button>
        </div>
      </div>
    </div>
  );
}
