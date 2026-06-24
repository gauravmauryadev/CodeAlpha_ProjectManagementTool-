"use client";

import Link from "next/link";
import { AlertCircle, ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-fuchsia-50 flex items-center justify-center p-6 text-slate-800">
      <div className="w-full max-w-md bg-white/60 backdrop-blur-md p-10 rounded-[32px] shadow-2xl border border-white/80 text-center relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-indigo-500/20 blur-3xl rounded-full" />
        
        <div className="w-20 h-20 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm relative z-10">
          <AlertCircle className="w-10 h-10 text-indigo-500" />
        </div>
        
        <h1 className="text-4xl font-extrabold mb-3 text-slate-800 relative z-10">404</h1>
        <h2 className="text-xl font-bold mb-4 text-slate-700 relative z-10">Page Not Found</h2>
        
        <p className="text-slate-500 font-medium mb-8 leading-relaxed relative z-10">
          We couldn&apos;t find the page you&apos;re looking for. It might have been moved, deleted, or never existed in the first place.
        </p>

        <div className="flex flex-col gap-3 relative z-10">
          <Link
            href="/dashboard"
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <button
            onClick={() => window.history.back()}
            className="w-full py-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
