"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type OperatingRules = {
  id: number;
  title: string | null;
  summary: string | null;
  primary_rule: string | null;
  focus_rule: string | null;
  planning_rule: string | null;
  priority_rule: string | null;
  rescue_rule: string | null;
  anti_failure_rule: string | null;
  confidence_score: number | null;
  rules: string[] | null;
  triggers: string[] | null;
  evidence: string[] | null;
  active: boolean | null;
};

function clamp(value: any) {
  const n = Number(value || 0);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export default function AIOperatingRulesWidget() {
  const initialized = useRef(false);

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [operatingRules, setOperatingRules] = useState<OperatingRules | null>(
    null
  );

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    setTimeout(() => {
      loadRules(false);
    }, 1500);
  }, []);

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  }

  async function loadRules(force = false) {
    try {
      setLoading(true);

      const token = await getToken();
      if (!token) return;

      const res = await fetch(
        `/api/ai-operating-rules${force ? "?force=1" : ""}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.log("AI OPERATING RULES ERROR:", data);
        return;
      }

      setOperatingRules(data.operatingRules);
    } catch (error) {
      console.log("AI OPERATING RULES LOAD ERROR:", error);
    } finally {
      setLoading(false);
    }
  }

  async function regenerate() {
    try {
      setGenerating(true);
      await loadRules(true);
    } finally {
      setGenerating(false);
    }
  }

  async function toggleActive() {
    if (!operatingRules) return;

    try {
      setSaving(true);

      const token = await getToken();
      if (!token) return;

      const res = await fetch("/api/ai-operating-rules", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ruleId: operatingRules.id,
          active: !operatingRules.active,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("AI OPERATING RULES PATCH ERROR:", data);
        return;
      }

      setOperatingRules(data.operatingRules);
    } catch (error) {
      console.log("AI OPERATING RULES TOGGLE ERROR:", error);
    } finally {
      setSaving(false);
    }
  }

  const confidence = clamp(operatingRules?.confidence_score);

  const rules = Array.isArray(operatingRules?.rules)
    ? operatingRules?.rules || []
    : [];

  const triggers = Array.isArray(operatingRules?.triggers)
    ? operatingRules?.triggers || []
    : [];

  const evidence = Array.isArray(operatingRules?.evidence)
    ? operatingRules?.evidence || []
    : [];

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[34px] border border-lime-400/20 bg-[#071003]/95 text-white shadow-[0_0_90px_rgba(0,0,0,0.65)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(132,204,22,0.20),transparent_34%),radial-gradient(circle_at_100%_100%,rgba(34,211,238,0.12),transparent_36%)]" />

      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto p-5 pr-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-lime-300">
                Operating Rules
              </p>

              <span
                className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${
                  operatingRules?.active
                    ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                    : "border-zinc-400/20 bg-zinc-500/10 text-zinc-400"
                }`}
              >
                {operatingRules?.active ? "active" : "paused"}
              </span>
            </div>

            <h2 className="mt-3 text-2xl font-black tracking-[-0.05em]">
              {loading
                ? "Creazione regole..."
                : operatingRules?.title || "Personal OS rules"}
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {operatingRules?.summary ||
                "iMemory trasforma i tuoi pattern in regole operative personali."}
            </p>
          </div>

          <button
            onClick={regenerate}
            disabled={loading || generating || saving}
            className="rounded-2xl bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-black transition hover:scale-[1.02] disabled:opacity-50"
          >
            {generating ? "AI..." : "Rigenera"}
          </button>
        </div>

        <div className="mt-5 rounded-[28px] border border-lime-400/20 bg-lime-500/[0.07] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-lime-300">
            Primary rule
          </p>

          <h3 className="mt-2 text-lg font-black leading-tight text-white">
            {operatingRules?.primary_rule ||
              "Completa una sola azione visibile prima di cambiare task."}
          </h3>

          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-600">
              Confidence
            </p>

            <p className="text-2xl font-black text-lime-300">{confidence}%</p>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-lime-400 to-cyan-400"
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>

        <RuleBox title="Focus rule" value={operatingRules?.focus_rule} />
        <RuleBox title="Planning rule" value={operatingRules?.planning_rule} />
        <RuleBox title="Priority rule" value={operatingRules?.priority_rule} />
        <RuleBox title="Rescue rule" value={operatingRules?.rescue_rule} />
        <RuleBox
          title="Anti-failure rule"
          value={operatingRules?.anti_failure_rule}
        />

        <ListBlock title="System rules" items={rules} />
        <ListBlock title="Triggers" items={triggers} />
        <ListBlock title="Evidence" items={evidence} />

        <button
          onClick={toggleActive}
          disabled={saving || !operatingRules}
          className="mt-5 h-11 w-full rounded-2xl border border-lime-400/20 bg-lime-500/10 text-xs font-black uppercase tracking-[0.16em] text-lime-200 transition hover:bg-lime-500/20 disabled:opacity-50"
        >
          {operatingRules?.active ? "Pause rules" : "Activate rules"}
        </button>
      </div>
    </div>
  );
}

function RuleBox({ title, value }: { title: string; value?: string | null }) {
  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
        {title}
      </p>

      <p className="mt-2 text-sm leading-6 text-zinc-300">
        {value || "Regola non ancora disponibile."}
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