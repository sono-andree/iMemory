"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type BrainPattern = {
  id: number;
  title: string | null;
  summary: string | null;
  strongest_pattern: string | null;
  recurring_blocker: string | null;
  best_work_mode: string | null;
  predicted_risk: string | null;
  next_best_strategy: string | null;
  confidence_score: number | null;
  signals: string[] | null;
  recommendations: string[] | null;
  warnings: string[] | null;
};

function score(value: any) {
  const n = Number(value || 0);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export default function PredictiveBrainWidget() {
  const initialized = useRef(false);

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pattern, setPattern] = useState<BrainPattern | null>(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    setTimeout(() => {
      loadPattern(false);
    }, 1000);
  }, []);

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  }

  async function loadPattern(force = false) {
    try {
      setLoading(true);

      const token = await getToken();
      if (!token) return;

      const res = await fetch(`/api/ai-brain-patterns${force ? "?force=1" : ""}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("PREDICTIVE BRAIN ERROR:", data);
        return;
      }

      setPattern(data.pattern);
    } catch (error) {
      console.log("PREDICTIVE BRAIN LOAD ERROR:", error);
    } finally {
      setLoading(false);
    }
  }

  async function regenerate() {
    try {
      setGenerating(true);
      await loadPattern(true);
    } finally {
      setGenerating(false);
    }
  }

  const confidence = score(pattern?.confidence_score);

  return (
  <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[34px] border border-cyan-400/20 bg-[#030712]/95 text-white shadow-[0_0_90px_rgba(0,0,0,0.65)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(34,211,238,0.20),transparent_34%),radial-gradient(circle_at_100%_100%,rgba(168,85,247,0.15),transparent_36%)]" />

      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto p-5 pr-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">
              Predictive Brain
            </p>

            <h2 className="mt-3 text-2xl font-black tracking-[-0.05em]">
              {loading ? "Analisi pattern..." : pattern?.title || "Pattern engine"}
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {pattern?.summary ||
                "iMemory analizza comportamento, blocchi e completamenti per prevedere la prossima strategia migliore."}
            </p>
          </div>

          <button
            onClick={regenerate}
            disabled={loading || generating}
            className="rounded-2xl bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-black transition hover:scale-[1.02] disabled:opacity-50"
          >
            {generating ? "AI..." : "Rigenera"}
          </button>
        </div>

        <div className="mt-5 rounded-[28px] border border-cyan-400/20 bg-cyan-500/[0.07] p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
                Confidence
              </p>

              <p className="mt-2 text-4xl font-black tracking-[-0.06em] text-white">
                {confidence}%
              </p>
            </div>

            <div className="h-16 w-16 rounded-full border border-cyan-300/30 bg-cyan-400/10 shadow-[0_0_35px_rgba(34,211,238,0.16)]" />
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-purple-400"
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>

        <PatternBox
          title="Strongest pattern"
          value={pattern?.strongest_pattern}
          accent="cyan"
        />

        <PatternBox
          title="Recurring blocker"
          value={pattern?.recurring_blocker}
          accent="red"
        />

        <PatternBox
          title="Best work mode"
          value={pattern?.best_work_mode}
          accent="emerald"
        />

        <PatternBox
          title="Predicted risk"
          value={pattern?.predicted_risk}
          accent="purple"
        />

        <PatternBox
          title="Next best strategy"
          value={pattern?.next_best_strategy}
          accent="white"
        />

        <ListBlock title="Signals" items={pattern?.signals || []} />
        <ListBlock title="Recommendations" items={pattern?.recommendations || []} />
        <ListBlock title="Warnings" items={pattern?.warnings || []} />
      </div>
    </div>
  );
}

function PatternBox({
  title,
  value,
  accent,
}: {
  title: string;
  value?: string | null;
  accent: "cyan" | "red" | "emerald" | "purple" | "white";
}) {
  const color =
    accent === "cyan"
      ? "border-cyan-400/15 bg-cyan-500/[0.06] text-cyan-300"
      : accent === "red"
      ? "border-red-400/15 bg-red-500/[0.06] text-red-300"
      : accent === "emerald"
      ? "border-emerald-400/15 bg-emerald-500/[0.06] text-emerald-300"
      : accent === "purple"
      ? "border-purple-400/15 bg-purple-500/[0.06] text-purple-300"
      : "border-white/10 bg-white/[0.04] text-white";

  return (
    <div className={`mt-4 rounded-2xl border p-4 ${color}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.22em]">
        {title}
      </p>

      <p className="mt-2 text-sm leading-6 text-zinc-300">
        {value || "Dati non ancora sufficienti."}
      </p>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
        {title}
      </p>

      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <p className="text-xs text-zinc-600">Nessun dato ancora.</p>
        ) : (
          items.map((item, index) => (
            <p
              key={index}
              className="rounded-xl border border-white/10 bg-black/25 p-3 text-xs leading-5 text-zinc-400"
            >
              {item}
            </p>
          ))
        )}
      </div>
    </div>
  );
}