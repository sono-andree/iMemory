"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type WeeklyPlanItem = {
  day: string;
  focus: string;
  output: string;
};

type KeyAction = {
  id: number | null;
  title: string;
  reason: string;
};

type WeeklyStrategy = {
  id: number;
  week_start: string;
  week_end: string;
  title: string | null;
  summary: string | null;
  weekly_goal: string | null;
  priority_focus: string | null;
  operating_rule: string | null;
  risk_to_avoid: string | null;
  success_definition: string | null;
  confidence_score: number | null;
  success_metrics: string[] | null;
  weekly_plan: WeeklyPlanItem[] | null;
  key_actions: KeyAction[] | null;
  anti_failure_rules: string[] | null;
};

function clamp(value: any) {
  const n = Number(value || 0);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export default function AIWeeklyStrategyWidget() {
  const router = useRouter();
  const initialized = useRef(false);

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [strategy, setStrategy] = useState<WeeklyStrategy | null>(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    setTimeout(() => {
      loadStrategy(false);
    }, 1300);
  }, []);

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  }

  async function loadStrategy(force = false) {
    try {
      setLoading(true);

      const token = await getToken();
      if (!token) return;

      const res = await fetch(
        `/api/ai-weekly-strategy${force ? "?force=1" : ""}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.log("AI WEEKLY STRATEGY ERROR:", data);
        return;
      }

      setStrategy(data.strategy);
    } catch (error) {
      console.log("AI WEEKLY STRATEGY LOAD ERROR:", error);
    } finally {
      setLoading(false);
    }
  }

  async function regenerate() {
    try {
      setGenerating(true);
      await loadStrategy(true);
    } finally {
      setGenerating(false);
    }
  }

  function openAction(actionId?: number | null) {
    if (actionId) {
      router.push(`/ai-actions?actionId=${actionId}`);
      return;
    }

    router.push("/ai-actions?start=next");
  }

  const confidence = clamp(strategy?.confidence_score);
  const weeklyPlan = Array.isArray(strategy?.weekly_plan)
    ? strategy?.weekly_plan || []
    : [];

  const keyActions = Array.isArray(strategy?.key_actions)
    ? strategy?.key_actions || []
    : [];

  const successMetrics = Array.isArray(strategy?.success_metrics)
    ? strategy?.success_metrics || []
    : [];

  const antiRules = Array.isArray(strategy?.anti_failure_rules)
    ? strategy?.anti_failure_rules || []
    : [];

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[34px] border border-indigo-400/20 bg-[#060817]/95 text-white shadow-[0_0_90px_rgba(0,0,0,0.65)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(99,102,241,0.22),transparent_34%),radial-gradient(circle_at_100%_100%,rgba(34,211,238,0.13),transparent_36%)]" />

      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto p-5 pr-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-indigo-300">
              Weekly Strategy
            </p>

            <h2 className="mt-3 text-2xl font-black tracking-[-0.05em]">
              {loading
                ? "Strategia settimanale..."
                : strategy?.title || "AI Weekly Plan"}
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {strategy?.summary ||
                "iMemory trasforma i pattern giornalieri in una strategia settimanale concreta."}
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

        <div className="mt-5 rounded-[28px] border border-indigo-400/20 bg-indigo-500/[0.07] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-300">
            Weekly goal
          </p>

          <h3 className="mt-2 text-lg font-black leading-tight text-white">
            {strategy?.weekly_goal ||
              "Completa le azioni più importanti della settimana."}
          </h3>

          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-600">
              Confidence
            </p>

            <p className="text-2xl font-black text-indigo-300">
              {confidence}%
            </p>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-cyan-400"
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>

        <StrategyBox title="Priority focus" value={strategy?.priority_focus} />
        <StrategyBox title="Operating rule" value={strategy?.operating_rule} />
        <StrategyBox title="Risk to avoid" value={strategy?.risk_to_avoid} />
        <StrategyBox
          title="Success definition"
          value={strategy?.success_definition}
        />

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
            Weekly plan
          </p>

          <div className="mt-3 space-y-3">
            {weeklyPlan.length === 0 ? (
              <p className="text-xs text-zinc-600">Nessun piano ancora.</p>
            ) : (
              weeklyPlan.map((item, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-white/10 bg-black/25 p-4"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-300">
                    {item.day}
                  </p>

                  <h4 className="mt-2 text-sm font-black text-white">
                    {item.focus}
                  </h4>

                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    Output: {item.output}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {keyActions.length > 0 && (
          <div className="mt-5 rounded-2xl border border-cyan-400/15 bg-cyan-500/[0.07] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
              Key actions
            </p>

            <div className="mt-3 space-y-3">
              {keyActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => openAction(action.id)}
                  className="w-full rounded-2xl border border-white/10 bg-black/25 p-4 text-left transition hover:border-cyan-400/30 hover:bg-cyan-500/[0.08]"
                >
                  <h4 className="text-sm font-black text-white">
                    {action.title || "Azione importante"}
                  </h4>

                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    {action.reason || "Azione selezionata dalla strategia AI."}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        <ListBlock title="Success metrics" items={successMetrics} />
        <ListBlock title="Anti-failure rules" items={antiRules} />
      </div>
    </div>
  );
}

function StrategyBox({
  title,
  value,
}: {
  title: string;
  value?: string | null;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
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