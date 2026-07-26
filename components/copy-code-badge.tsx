"use client";

import { useState } from "react";

export function CopyCodeBadge({ code }: { code: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!code) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5">
      <span className="text-xs font-medium text-stone-400 dark:text-stone-500">Code de rattachement</span>
      <div className="flex items-center gap-1.5 rounded-full border-2 border-brand-600 bg-brand-50 py-1 pl-3 pr-1.5 shadow-sm shadow-brand-600/10 dark:bg-brand-950/40">
        <span className="font-mono text-sm font-semibold tracking-wide text-brand-700 dark:text-brand-300">{code}</span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copier le code de rattachement"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-brand-600 transition hover:bg-brand-100 dark:text-brand-400 dark:hover:bg-brand-900"
        >
          {copied ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <rect x="9" y="9" width="11" height="11" rx="2" strokeLinecap="round" strokeLinejoin="round" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15V5a2 2 0 0 1 2-2h10" />
            </svg>
          )}
        </button>
      </div>
      {copied && <span className="text-xs font-medium text-emerald-600">Copié !</span>}
    </div>
  );
}
