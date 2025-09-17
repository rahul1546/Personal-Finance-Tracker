import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

export default function HomePage({ goLogin, goSignup, goTour }) {
  return (
    <div className="relative overflow-hidden min-h-[calc(100vh-56px)] flex items-center justify-center">
      <motion.div
        className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 blur-3xl opacity-40"
        animate={{ x: [0, 20, -10, 0], y: [0, 10, -10, 0] }}
        transition={{ duration: 12, repeat: Infinity }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-br from-fuchsia-500 to-rose-400 blur-3xl opacity-30"
        animate={{ x: [0, -10, 20, 0], y: [0, -10, 10, 0] }}
        transition={{ duration: 14, repeat: Infinity }}
      />

      <div className="max-w-6xl mx-auto px-4 text-center flex flex-col items-center justify-center">
        {/* removed the “Explore our interactive tour” pill */}
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.12] pb-1 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-pink-500">
            Take control of your money
        </h1>
        <p className="mt-4 text-slate-700 max-w-2xl mx-auto">
            Track spending, set monthly budgets, and visualize your cashflow in real-time.
        </p>

        {/* single centered CTA */}
        <div className="mt-8 flex items-center justify-center">
            <button
            onClick={goTour}  // ← route to features page
            className="px-8 py-4 rounded-2xl bg-indigo-600 text-white font-semibold inline-flex items-center gap-2 shadow-md hover:bg-indigo-700"
            >
            Get started
            </button>
        </div>
        </div>
    </div>
  );
}
