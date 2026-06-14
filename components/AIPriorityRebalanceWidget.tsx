"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type RecommendedAction = {
  action_id: number;
  title: string;
  priority: string;
  impact_score: number;
  mode: string;
  reason: string;
};

type DeferAction = {
  action_id: number;
  title: string;
  reason: string;
};

type PriorityRebalance = {
  id: number;
  title: string | null;
  summary: string | null;
  top_action_id: number | null;
  quick_win_action_id: number | null;
  confidence_score: number | null;
  warning: string | null;
  recommended_order: RecommendedAction[] | null;
  defer_actions: DeferAction[] | null;
  reasoning_signals: string[] | null;
  applied: boolean | null;
};

function clamp(value: any) {
  const n = Number(value || 0);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function priorityClass(priority?: string | null) {
  if (priority === "high") {
    return "border-red-400/20 bg-red-500/10 text-red-300";
  }

  if (priority === "low") {
    return "border-zinc-400/20 bg-zinc-500/10 text-zinc-300";
  }

  return "border-cyan-400/20 bg-cyan-500/10 text-cyan-300";
}

export default function AIPriorityRebalanceWidget() {
  const router = useRouter();
  const initialized = useRef(false);

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [rebalance, setRebalance] = useState<PriorityRebalance | null>(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    setTimeout(() => {
      loadRebalance(false);
    }, 1400);
  }, []);

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  }

  async function loadRebalance(force = false) {
    try {
      setLoading(true);

      const token = await getToken();
      if (!token) return;

      const res = await fetch(
        `/api/ai-priority-rebalance${force ? "?force=1" : ""}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.log("AI PRIORITY REBALANCE ERROR:", data);
        return;
      }

      setRebalance(data.rebalance);
    } catch (error) {
      console.log("AI PRIORITY REBALANCE LOAD ERROR:", error);
    } finally {
      setLoading(false);
    }
  }

  async function regenerate() {
    try {
      setGenerating(true);
      await loadRebalance(true);
    } finally {
      setGenerating(false);
    }
  }

  async function applyRebalance() {
    if (!rebalance) return;

    try {
      setApplying(true);

      const token = await getToken();
      if (!token) return;

      const res = await fetch("/api/ai-priority-rebalance", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rebalanceId: rebalance.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("AI PRIORITY REBALANCE APPLY ERROR:", data);
        return;
      }

      setRebalance(data.rebalance);
    } catch (error) {
      console.log("AI PRIORITY REBALANCE APPLY ERROR:", error);
    } finally {
      setApplying(false);
    }
  }

  function openAction(actionId?: number | null) {
    if (actionId) {
      router.push(`/ai-actions?actionId=${actionId}`);
      return;
    }

    router.push("/ai-actions?start=next");
  }

  const confidence = clamp(rebalance?.confidence_score);

  const recommended = Array.isArray(rebalance?.recommended_order)
    ? rebalance?.recommended_order || []
    : [];

  const deferred = Array.isArray(rebalance?.defer_actions)
    ? rebalance?.defer_actions || []
    : [];

  const signals = Array.isArray(rebalance?.reasoning_signals)
    ? rebalance?.reasoning_signals || []
    : [];

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[34px] border border-fuchsia-400/20 bg-[#100516]/95 text-white shadow-[0_0_90px_rgba(0,0,0,0.65)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(217,70,239,0.22),transparent_34%),radial-gradient(circle_at_100%_100%,rgba(34,211,238,0.12),transparent_36%)]" />

      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto p-5 pr-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-fuchsia-300">
                Priority Rebalance
              </p>

              {rebalance?.applied && (
                <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">
                  applied
                </span>
              )}
            </div>

            <h2 className="mt-3 text-2xl font-black tracking-[-0.05em]">
              {loading
                ? "Ricalcolo priorità..."
                : rebalance?.title || "AI Priority Engine"}
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {rebalance?.summary ||
                "iMemory ricalcola ordine, impatto e priorità delle azioni usando tutta l'intelligence disponibile."}
            </p>
          </div>

          <button
            onClick={regenerate}
            disabled={loading || generating || applying}
            className="rounded-2xl bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-black transition hover:scale-[1.02] disabled:opacity-50"
          >
            {generating ? "AI..." : "Rigenera"}
          </button>
        </div>

        <div className="mt-5 rounded-[28px] border border-fuchsia-400/20 bg-fuchsia-500/[0.07] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-300">
            Confidence
          </p>

          <p className="mt-2 text-4xl font-black tracking-[-0.06em] text-white">
            {confidence}%
          </p>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 to-cyan-400"
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>

        {rebalance?.warning && (
          <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-500/[0.08] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">
              Warning
            </p>

            <p className="mt-2 text-sm leading-6 text-zinc-300">
              {rebalance.warning}
            </p>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            onClick={() => openAction(rebalance?.top_action_id)}
            className="h-11 rounded-2xl bg-white text-xs font-black uppercase tracking-[0.14em] text-black transition hover:scale-[1.02]"
          >
            Start top action
          </button>

          <button
            onClick={applyRebalance}
            disabled={applying || Boolean(rebalance?.applied)}
            className="h-11 rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 text-xs font-black uppercase tracking-[0.14em] text-fuchsia-200 transition hover:bg-fuchsia-500/20 disabled:opacity-50"
          >
            {rebalance?.applied ? "Applied" : applying ? "Apply..." : "Apply"}
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
            Recommended order
          </p>

          <div className="mt-3 space-y-3">
            {recommended.length === 0 ? (
              <p className="text-xs text-zinc-600">Nessun ordine ancora.</p>
            ) : (
              recommended.map((item, index) => (
                <button
                  key={index}
                  onClick={() => openAction(item.action_id)}
                  className="w-full rounded-2xl border border-white/10 bg-black/25 p-4 text-left transition hover:border-fuchsia-400/30 hover:bg-fuchsia-500/[0.07]"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-black text-black">
                      {index + 1}
                    </span>

                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${priorityClass(
                            item.priority
                          )}`}
                        >
                          {item.priority}
                        </span>

                        <span className="rounded-full border border-cyan-400/15 bg-cyan-500/[0.07] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-300">
                          {item.impact_score}% impact
                        </span>

                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">
                          {item.mode}
                        </span>
                      </div>

                      <h4 className="mt-3 text-sm font-black text-white">
                        {item.title}
                      </h4>

                      <p className="mt-2 text-xs leading-5 text-zinc-500">
                        {item.reason}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {deferred.length > 0 && (
          <div className="mt-5 rounded-2xl border border-zinc-400/15 bg-zinc-500/[0.06] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">
              Defer actions
            </p>

            <div className="mt-3 space-y-2">
              {deferred.map((item, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-white/10 bg-black/25 p-3"
                >
                  <p className="text-sm font-black text-zinc-300">
                    {item.title}
                  </p>

                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    {item.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <ListBlock title="Reasoning signals" items={signals} />
      </div>
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