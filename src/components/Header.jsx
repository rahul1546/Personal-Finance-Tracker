import React from "react";
import { LogOut } from "lucide-react";

export default function Header({ user, goHome, goLogin, goSignup, onSignOut }) {
  return (
    <header className="sticky top-0 z-40 bg-white/70 backdrop-blur border-b border-slate-200 h-16">
        <div className="w-full px-6 h-full flex items-center justify-between">
            <div className="font-semibold text-lg cursor-pointer" onClick={goHome}>
                Personal Finance Tracker
            </div>
        <div className="flex items-center gap-2">
          {user ? (
            <button
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50"
              onClick={onSignOut}
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          ) : (
            <>
              <button
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50"
                onClick={goLogin}
              >
                Login
              </button>
              <button
                className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white"
                onClick={goSignup}
              >
                Sign up
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
