"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type BrainOrchestration = {
  id: number;
  title: string | null;
  summary: string | null;
  brain_health_score: number | null;
  system_status: string | null;
  executive_decision: string | null;
  next_best_action_id: number | null;
  next_best_move: string | null;
  missing_modules: string[] | null;
  stale_modules: string[] | null;
  active_modules: string[] | null;
  recommended_refresh_order: string[] | null;
  risks: string[] | null;
  opportunities: string[] | null;
};

function clamp(value: any) {
  const n = Number(value || 0);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function statusClass(status?: string | null) {
  if (status === "critical") {
    return "border-red-400/25 bg-red-500/10 text-red-300";
  }

  if (status === "needs_setup") {
    return "border-amber-400/25 bg-amber-500/10 text-amber-300";
  }

  if (status === "needs_refresh") {
    return "border-cyan-400/25 bg-cyan-500/10 text-cyan-300";
  }

  return "border-emerald-400/25 bg-emerald-500/10 text-emerald-300";
}

export default function AIBrainOrchestratorWidget() {
  const router = useRouter();
  const initialized = useRef(false);

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [orchestration, setOrchestration] =
    useState<BrainOrchestration | null>(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    setTimeout(() => {
      loadOrchestration(false);
    }, 1600);
  }, []);

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  }

  async function loadOrchestration(force = false) {
    try {
      setLoading(true);

      const token = await getToken();
      if (!token) return;

      const res = await fetch(
        `/api/ai-brain-orchestrator${force ? "?force=1" : ""}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.log("AI BRAIN ORCHESTRATOR ERROR:", data);
        return;
      }

      setOrchestration(data.orchestration);
    } catch (error) {
      console.log("AI BRAIN ORCHESTRATOR LOAD ERROR:", error);
    } finally {
      setLoading(false);
    }
  }

  async function regenerate() {
    try {
      setGenerating(true);
      await loadOrchestration(true);
    } finally {
      setGenerating(false);
    }
  }

  function openNextAction() {
    if (orchestration?.next_best_action_id) {
      router.push(`/ai-actions?actionId=${orchestration.next_best_action_id}`);
      return;
    }

    router.push("/ai-actions?start=next");
  }

  const health = clamp(orchestration?.brain_health_score);

  const missing = Array.isArray(orchestration?.missing_modules)
    ? orchestration?.missing_modules || []
    : [];

  const stale = Array.isArray(orchestration?.stale_modules)
    ? orchestration?.stale_modules || []
    : [];

  const active = Array.isArray(orchestration?.active_modules)
    ? orchestration?.active_modules || []
    : [];

  const refreshOrder = Array.isArray(orchestration?.recommended_refresh_order)
    ? orchestration?.recommended_refresh_order || []
    : [];

  const risks = Array.isArray(orchestration?.risks)
    ? orchestration?.risks || []
    : [];

  const opportunities = Array.isArray(orchestration?.opportunities)
    ? orchestration?.opportunities || []
    : [];

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[34px] border border-sky-400/20 bg-[#030A14]/95 text-white shadow-[0_0_90px_rgba(0,0,0,0.65)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(14,165,233,0.22),transparent_34%),radial-gradient(circle_at_100%_100%,rgba(168,85,247,0.13),transparent_36%)]" />

      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto p-5 pr-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-sky-300">
                Brain Orchestrator
              </p>

              <span
                className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${statusClass(
                  orchestration?.system_status
                )}`}
              >
                {orchestration?.system_status || "stable"}
              </span>
            </div>

            <h2 className="mt-3 text-2xl font-black tracking-[-0.05em]">
              {loading
                ? "Coordinamento AI..."
                : orchestration?.title || "AI Brain Control"}
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {orchestration?.summary ||
                "iMemory coordina tutti i moduli AI e decide la prossima mossa migliore."}
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

        <div className="mt-5 rounded-[28px] border border-sky-400/20 bg-sky-500/[0.07] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">
            Brain health
          </p>

          <p className="mt-2 text-4xl font-black tracking-[-0.06em] text-white">
            {health}%
          </p>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-purple-400"
              style={{ width: `${health}%` }}
            />
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
            Executive decision
          </p>

          <h3 className="mt-2 text-lg font-black leading-tight text-white">
            {orchestration?.executive_decision ||
              "Esegui una sola azione ad alto impatto."}
          </h3>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            {orchestration?.next_best_move ||
              "Apri AI Coach e completa il prossimo blocco operativo."}
          </p>

          <button
            onClick={openNextAction}
            className="mt-4 h-11 w-full rounded-2xl bg-white text-xs font-black uppercase tracking-[0.16em] text-black transition hover:scale-[1.01]"
          >
            Start next best move
          </button>
        </div>

        <ListBlock title="Active modules" items={active} accent="emerald" />
        <ListBlock title="Missing modules" items={missing} accent="amber" />
        <ListBlock title="Stale modules" items={stale} accent="cyan" />
        <ListBlock
          title="Refresh order"
          items={refreshOrder}
          accent="purple"
        />
        <ListBlock title="Risks" items={risks} accent="red" />
        <ListBlock
          title="Opportunities"
          items={opportunities}
          accent="sky"
        />
      </div>
    </div>
  );
}

function ListBlock({
  title,
  items,
  accent,
}: {
  title: string;
  items: string[];
  accent: "emerald" | "amber" | "cyan" | "purple" | "red" | "sky";
}) {
  const color =
    accent === "emerald"
      ? "border-emerald-400/15 bg-emerald-500/[0.06] text-emerald-300"
      : accent === "amber"
      ? "border-amber-400/15 bg-amber-500/[0.06] text-amber-300"
      : accent === "cyan"
      ? "border-cyan-400/15 bg-cyan-500/[0.06] text-cyan-300"
      : accent === "red"
      ? "border-red-400/15 bg-red-500/[0.06] text-red-300"
      : accent === "sky"
      ? "border-sky-400/15 bg-sky-500/[0.06] text-sky-300"
      : "border-purple-400/15 bg-purple-500/[0.06] text-purple-300";

  return (
    <div className={`mt-4 rounded-2xl border p-4 ${color}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.22em]">
        {title}
      </p>

      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <p className="text-xs leading-5 text-zinc-500">
            Nessun elemento rilevato.
          </p>
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