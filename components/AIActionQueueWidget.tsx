"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type AIAction = {
  id: number;
  title: string;
  description: string | null;
  priority: string | null;
  effort: string | null;
  impact_score: number | null;
  source_type: string | null;
  source_id: string | null;
  ai_reason: string | null;
  status: string | null;
};

function getPriorityClass(priority?: string | null) {
  if (priority === "high") {
    return "border-red-400/20 bg-red-500/10 text-red-300";
  }

  if (priority === "low") {
    return "border-zinc-400/20 bg-zinc-500/10 text-zinc-300";
  }

  return "border-cyan-400/20 bg-cyan-500/10 text-cyan-300";
}

export default function AIActionQueueWidget() {
  const initialized = useRef(false);

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [actions, setActions] = useState<AIAction[]>([]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    setTimeout(() => {
      loadActions(false);
    }, 1000);
  }, []);

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  }

  async function loadActions(force = false) {
    try {
      setLoading(true);

      const token = await getToken();

      if (!token) {
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/ai-actions${force ? "?force=1" : ""}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("AI ACTIONS ERROR:", data);
        return;
      }

      setActions(data.actions || []);
    } catch (error) {
      console.log("AI ACTION QUEUE ERROR:", error);
    } finally {
      setLoading(false);
    }
  }

  async function regenerate() {
    try {
      setGenerating(true);
      setExpanded(true);
      await loadActions(true);
    } finally {
      setGenerating(false);
    }
  }

  async function toggleAction(action: AIAction) {
    const completed = action.status !== "completed";

    const oldActions = actions;

    setActions((prev) =>
      prev.map((item) =>
        item.id === action.id
          ? {
              ...item,
              status: completed ? "completed" : "todo",
            }
          : item
      )
    );

    try {
      const token = await getToken();

      if (!token) {
        setActions(oldActions);
        return;
      }

      const res = await fetch("/api/ai-actions", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          actionId: action.id,
          completed,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("AI ACTION PATCH ERROR:", data);
        setActions(oldActions);
      }
    } catch (error) {
      console.log("AI ACTION TOGGLE ERROR:", error);
      setActions(oldActions);
    }
  }

  const completedCount = actions.filter(
    (action) => action.status === "completed"
  ).length;

  const totalCount = actions.length;

  const topAction =
    actions.find((action) => action.status !== "completed") || actions[0];

  const progress =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return (
    <div className="relative overflow-hidden rounded-[22px] border border-emerald-400/20 bg-[#05050A]/90 text-white shadow-[0_0_40px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-500/[0.10] via-transparent to-cyan-500/[0.08]" />

      <div className="relative z-10">
        <div className="flex h-[72px] items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,1)]" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">
                AI Action Queue
              </p>

              <h2 className="mt-0.5 truncate text-sm font-black text-white">
                {loading
                  ? "Caricamento azioni..."
                  : topAction?.title || "Azioni AI pronte"}
              </h2>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-right md:block">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-600">
                Done
              </p>
              <p className="text-xs font-black text-emerald-300">
                {completedCount}/{totalCount}
              </p>
            </div>

            <button
              onClick={() => setExpanded(!expanded)}
              className="h-10 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-xs font-black text-zinc-300 transition hover:bg-white/[0.09] hover:text-white"
            >
              {expanded ? "Chiudi" : "Apri"}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="border-t border-white/10 bg-black/45 p-4">
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
                  Daily execution
                </p>

                <p className="text-xs font-black text-emerald-300">
                  {progress}%
                </p>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400">
                iMemory sta preparando le azioni AI...
              </div>
            ) : actions.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-bold text-zinc-300">
                  Nessuna azione ancora.
                </p>

                <p className="mt-1 text-sm text-zinc-500">
                  Genera azioni partendo da report, goals e connessioni.
                </p>

                <button
                  onClick={regenerate}
                  disabled={generating}
                  className="mt-4 h-10 rounded-2xl bg-white px-4 text-xs font-black text-black disabled:opacity-50"
                >
                  {generating ? "Generazione..." : "Genera AI"}
                </button>
              </div>
            ) : (
              <div className="max-h-[380px] overflow-y-auto pr-1">
                <div className="space-y-3">
                  {actions.map((action) => {
                    const completed = action.status === "completed";
                    const impact = Math.max(
                      1,
                      Math.min(100, Number(action.impact_score || 70))
                    );

                    return (
                      <div
                        key={action.id}
                        className={`rounded-2xl border p-4 transition ${
                          completed
                            ? "border-emerald-400/20 bg-emerald-500/[0.06]"
                            : "border-white/10 bg-white/[0.035]"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => toggleAction(action)}
                            className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-xs font-black transition ${
                              completed
                                ? "border-emerald-400 bg-emerald-400 text-black"
                                : "border-white/15 bg-black/30 text-transparent hover:border-emerald-400"
                            }`}
                          >
                            ✓
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${getPriorityClass(
                                  action.priority
                                )}`}
                              >
                                {action.priority || "medium"}
                              </span>

                              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">
                                {action.effort || "15min"}
                              </span>

                              <span className="rounded-full border border-cyan-400/15 bg-cyan-500/[0.07] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-300">
                                {impact}% impact
                              </span>
                            </div>

                            <h3
                              className={`mt-2 text-sm font-black ${
                                completed
                                  ? "text-zinc-500 line-through"
                                  : "text-white"
                              }`}
                            >
                              {action.title}
                            </h3>

                            {action.description && (
                              <p className="mt-2 text-sm leading-6 text-zinc-400">
                                {action.description}
                              </p>
                            )}

                            {action.ai_reason && (
                              <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
                                  AI reason
                                </p>

                                <p className="mt-1 text-xs leading-5 text-zinc-400">
                                  {action.ai_reason}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={regenerate}
                    disabled={generating || loading}
                    className="h-10 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 text-xs font-black text-emerald-200 disabled:opacity-50"
                  >
                    {generating ? "Generazione..." : "Rigenera AI"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}