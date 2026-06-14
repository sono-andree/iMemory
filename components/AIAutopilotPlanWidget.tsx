"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type TimeBlock = {
  label: string;
  title: string;
  description: string;
  minutes: number;
  action_id: number | null;
  priority: string;
  completed: boolean;
};

type AIDailyPlan = {
  id: number;
  plan_date: string;
  title: string | null;
  overview: string | null;
  energy_mode: string | null;
  main_objective: string | null;
  estimated_total_minutes: number | null;
  success_criteria: string[] | null;
  time_blocks: TimeBlock[] | null;
  anti_block_protocol: string[] | null;
  recovery_plan: string | null;
};

function getPriorityClass(priority?: string | null) {
  if (priority === "high") return "border-red-400/25 bg-red-500/10 text-red-300";
  if (priority === "low") return "border-zinc-400/20 bg-zinc-500/10 text-zinc-300";
  return "border-cyan-400/20 bg-cyan-500/10 text-cyan-300";
}

function getPriorityWeight(priority?: string | null) {
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}

function getStatusLabel(progress: number) {
  if (progress >= 100) return "Day completed";
  if (progress >= 70) return "Strong momentum";
  if (progress >= 35) return "Execution active";
  return "Start sequence";
}

function getTimeLabel(minutes: number) {
  if (minutes <= 0) return "0 min";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default function AIAutopilotPlanWidget() {
  const router = useRouter();
  const initialized = useRef(false);

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<AIDailyPlan | null>(null);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    setTimeout(() => {
      loadPlan(false);
    }, 600);
  }, []);

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  }

  async function loadPlan(force = false) {
    try {
      setLoading(true);

      const token = await getToken();

      if (!token) {
        setLoading(false);
        return;
      }

      const res = await fetch(
        `/api/ai-autopilot-plan${force ? "?force=1" : ""}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.log("AI AUTOPILOT ERROR:", data);
        return;
      }

      setPlan(data.plan);
    } catch (error) {
      console.log("AI AUTOPILOT LOAD ERROR:", error);
    } finally {
      setLoading(false);
    }
  }

  async function regenerate() {
    try {
      setGenerating(true);
      await loadPlan(true);
    } finally {
      setGenerating(false);
    }
  }

  async function toggleBlock(index: number, completed: boolean) {
    if (!plan) return;

    const oldPlan = plan;
    const blocks = Array.isArray(plan.time_blocks) ? [...plan.time_blocks] : [];

    blocks[index] = {
      ...blocks[index],
      completed,
    };

    setPlan({
      ...plan,
      time_blocks: blocks,
    });

    try {
      const token = await getToken();

      if (!token) {
        setPlan(oldPlan);
        return;
      }

      const res = await fetch("/api/ai-autopilot-plan", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: plan.plan_date,
          blockIndex: index,
          completed,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("AI AUTOPILOT PATCH ERROR:", data);
        setPlan(oldPlan);
        return;
      }

      setPlan(data.plan);
    } catch (error) {
      console.log("AI AUTOPILOT TOGGLE ERROR:", error);
      setPlan(oldPlan);
    }
  }

  const blocks = useMemo(() => {
    return Array.isArray(plan?.time_blocks) ? plan?.time_blocks || [] : [];
  }, [plan]);

  const completedBlocks = blocks.filter((block) => block.completed).length;

  const progress =
    blocks.length === 0 ? 0 : Math.round((completedBlocks / blocks.length) * 100);

  const remainingMinutes = blocks
    .filter((block) => !block.completed)
    .reduce((sum, block) => sum + Number(block.minutes || 0), 0);

  const totalMinutes = blocks.reduce(
    (sum, block) => sum + Number(block.minutes || 0),
    0
  );

  const nextBlockIndex = blocks.findIndex((block) => !block.completed);

  const nextBlock = nextBlockIndex >= 0 ? blocks[nextBlockIndex] : null;

  const highestImpactBlock = blocks
    .filter((block) => !block.completed)
    .sort((a, b) => getPriorityWeight(b.priority) - getPriorityWeight(a.priority))[0];

  const commandBlock = highestImpactBlock || nextBlock;

  const commandBlockIndex = commandBlock
    ? blocks.findIndex((block) => block === commandBlock)
    : -1;

  function openCoach(block?: TimeBlock | null) {
    if (block?.action_id) {
      router.push(`/ai-actions?actionId=${block.action_id}`);
      return;
    }

    
  }

  return (
    <div className="relative overflow-hidden rounded-[34px] border border-emerald-400/20 bg-[#030807]/95 text-white shadow-[0_0_100px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(16,185,129,0.24),transparent_34%),radial-gradient(circle_at_100%_15%,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_50%_100%,rgba(168,85,247,0.13),transparent_36%)]" />

      <div className="pointer-events-none absolute inset-0 opacity-[0.12]">
        <div className="absolute left-[-80px] top-[-80px] h-[220px] w-[220px] rounded-full border border-emerald-300/40" />
        <div className="absolute bottom-[-100px] right-[-90px] h-[260px] w-[260px] rounded-full border border-cyan-300/30" />
      </div>

      <div className="relative z-10 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-300">
                AI Autopilot
              </p>

              <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-200">
                {getStatusLabel(progress)}
              </span>
            </div>

            <h2 className="mt-3 text-2xl font-black tracking-[-0.05em] text-white">
              {loading
                ? "Building your command plan..."
                : plan?.title || "Daily command plan"}
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {plan?.overview ||
                "iMemory organizza la giornata in blocchi eseguibili e ti guida verso il prossimo passo migliore."}
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2">
            <button
              onClick={regenerate}
              disabled={loading || generating}
              className="rounded-2xl bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-black transition hover:scale-[1.02] disabled:opacity-50"
            >
              {generating ? "AI..." : "Rigenera"}
            </button>

            <button
              onClick={() => setExpanded(!expanded)}
              className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
            >
              {expanded ? "Riduci" : "Espandi"}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <MetricCard label="Progress" value={`${progress}%`} />
          <MetricCard label="Remaining" value={getTimeLabel(remainingMinutes)} />
          <MetricCard label="Total plan" value={getTimeLabel(totalMinutes)} />
        </div>

        <div className="mt-5 rounded-[28px] border border-emerald-400/20 bg-emerald-500/[0.07] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">
                Next best move
              </p>

              <h3 className="mt-2 text-lg font-black leading-tight text-white">
                {commandBlock?.title || "Apri l'AI Coach e scegli la prima azione"}
              </h3>

              <p className="mt-2 text-sm leading-6 text-zinc-400">
                {commandBlock?.description ||
                  plan?.main_objective ||
                  "Completa una singola azione concreta per creare momentum."}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">
                Focus
              </p>

              <p className="mt-1 text-2xl font-black text-emerald-300">
                {commandBlock?.minutes || 15}m
              </p>
            </div>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-400"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => openCoach(commandBlock)}
              className="h-10 rounded-2xl bg-white px-4 text-xs font-black text-black transition hover:scale-[1.02]"
            >
              Start with AI Coach
            </button>

            {commandBlockIndex >= 0 && (
              <button
                onClick={() => toggleBlock(commandBlockIndex, true)}
                className="h-10 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 text-xs font-black text-emerald-200 transition hover:bg-emerald-500/20"
              >
                Mark done
              </button>
            )}
          </div>
        </div>

        {expanded && (
          <>
            <div className="mt-5 rounded-[28px] border border-white/10 bg-white/[0.035] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">
                Main objective
              </p>

              <p className="mt-2 text-sm leading-6 text-zinc-300">
                {plan?.main_objective || "Completa una azione ad alto impatto oggi."}
              </p>
            </div>

            <div className="mt-5 space-y-3">
              {loading ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400">
                  L'AI sta costruendo il piano operativo intelligente...
                </div>
              ) : blocks.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm font-bold text-zinc-300">
                    Nessun blocco operativo.
                  </p>

                  <p className="mt-1 text-sm text-zinc-500">
                    Genera azioni AI e poi rigenera Autopilot.
                  </p>
                </div>
              ) : (
                blocks.map((block, index) => {
                  const isNext = index === nextBlockIndex;
                  const isCommand = index === commandBlockIndex;

                  return (
                    <div
                      key={index}
                      className={`rounded-2xl border p-4 transition ${
                        block.completed
                          ? "border-emerald-400/20 bg-emerald-500/[0.07]"
                          : isCommand
                          ? "border-cyan-400/25 bg-cyan-500/[0.075]"
                          : isNext
                          ? "border-purple-400/20 bg-purple-500/[0.06]"
                          : "border-white/10 bg-white/[0.035]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleBlock(index, !block.completed)}
                          className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border text-xs font-black transition ${
                            block.completed
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
                                block.priority
                              )}`}
                            >
                              {block.priority || "medium"}
                            </span>

                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">
                              {block.minutes} min
                            </span>

                            <span className="rounded-full border border-emerald-400/15 bg-emerald-500/[0.07] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-300">
                              {block.label}
                            </span>

                            {isCommand && !block.completed && (
                              <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-300">
                                Best move
                              </span>
                            )}
                          </div>

                          <h3
                            className={`mt-2 text-sm font-black ${
                              block.completed
                                ? "text-zinc-500 line-through"
                                : "text-white"
                            }`}
                          >
                            {block.title}
                          </h3>

                          <p className="mt-2 text-sm leading-6 text-zinc-400">
                            {block.description}
                          </p>

                          {!block.completed && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                onClick={() => openCoach(block)}
                                className="h-9 rounded-2xl bg-white px-4 text-xs font-black text-black transition hover:scale-[1.02]"
                              >
                                Esegui con AI Coach
                              </button>

                              <button
                                onClick={() => toggleBlock(index, true)}
                                className="h-9 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-xs font-black text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
                              >
                                Completa blocco
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {plan?.success_criteria && plan.success_criteria.length > 0 && (
              <div className="mt-5 rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.06] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">
                  Success criteria
                </p>

                <div className="mt-3 space-y-2">
                  {plan.success_criteria.map((item, index) => (
                    <p
                      key={index}
                      className="rounded-xl border border-white/10 bg-black/25 p-3 text-xs leading-5 text-zinc-400"
                    >
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {plan?.anti_block_protocol && plan.anti_block_protocol.length > 0 && (
              <div className="mt-5 rounded-2xl border border-purple-400/15 bg-purple-500/[0.07] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-purple-300">
                  Anti-block protocol
                </p>

                <div className="mt-3 space-y-2">
                  {plan.anti_block_protocol.map((item, index) => (
                    <p
                      key={index}
                      className="rounded-xl border border-white/10 bg-black/25 p-3 text-xs leading-5 text-zinc-400"
                    >
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {plan?.recovery_plan && (
              <div className="mt-5 rounded-2xl border border-cyan-400/15 bg-cyan-500/[0.07] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
                  Recovery protocol
                </p>

                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  {plan.recovery_plan}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600">
        {label}
      </p>

      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}