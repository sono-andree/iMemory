"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type AIIntervention = {
  id: number;
  intervention_date: string;
  title: string | null;
  severity: string | null;
  diagnosis: string | null;
  trigger_reason: string | null;
  micro_action: string | null;
  expected_result: string | null;
  protocol: string[] | null;
  related_action_id: number | null;
  related_goal_id: number | null;
  status: string | null;
};

function severityClass(severity?: string | null) {
  if (severity === "high") {
    return {
      border: "border-red-400/25",
      bg: "bg-red-500/[0.08]",
      text: "text-red-300",
      glow: "shadow-[0_0_45px_rgba(248,113,113,0.16)]",
      dot: "bg-red-300 shadow-[0_0_18px_rgba(252,165,165,1)]",
    };
  }

  if (severity === "low") {
    return {
      border: "border-cyan-400/20",
      bg: "bg-cyan-500/[0.07]",
      text: "text-cyan-300",
      glow: "shadow-[0_0_45px_rgba(34,211,238,0.12)]",
      dot: "bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,1)]",
    };
  }

  return {
    border: "border-amber-400/25",
    bg: "bg-amber-500/[0.08]",
    text: "text-amber-300",
    glow: "shadow-[0_0_45px_rgba(251,191,36,0.14)]",
    dot: "bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,1)]",
  };
}

export default function AIInterventionWidget() {
  const router = useRouter();
  const initialized = useRef(false);

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [intervention, setIntervention] = useState<AIIntervention | null>(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    setTimeout(() => {
      loadIntervention(false);
    }, 1200);
  }, []);

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  }

  async function loadIntervention(force = false) {
    try {
      setLoading(true);

      const token = await getToken();
      if (!token) return;

      const res = await fetch(`/api/ai-intervention${force ? "?force=1" : ""}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("AI INTERVENTION ERROR:", data);
        return;
      }

      setIntervention(data.intervention);
    } catch (error) {
      console.log("AI INTERVENTION LOAD ERROR:", error);
    } finally {
      setLoading(false);
    }
  }

  async function regenerate() {
    try {
      setGenerating(true);
      await loadIntervention(true);
    } finally {
      setGenerating(false);
    }
  }

  async function updateStatus(status: "resolved" | "dismissed" | "snoozed") {
    if (!intervention) return;

    try {
      setSaving(true);

      const token = await getToken();
      if (!token) return;

      const res = await fetch("/api/ai-intervention", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          interventionId: intervention.id,
          status,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("AI INTERVENTION PATCH ERROR:", data);
        return;
      }

      setIntervention(data.intervention);
    } catch (error) {
      console.log("AI INTERVENTION STATUS ERROR:", error);
    } finally {
      setSaving(false);
    }
  }

  function openRelatedAction() {
    if (intervention?.related_action_id) {
      router.push(`/ai-actions?actionId=${intervention.related_action_id}`);
      return;
    }

    router.push("/ai-actions?start=next");
  }

  const style = severityClass(intervention?.severity);
  const protocol = Array.isArray(intervention?.protocol)
    ? intervention?.protocol || []
    : [];

  return (
  <div
    className={`relative flex h-full min-h-0 flex-col overflow-hidden rounded-[34px] border ${style.border} bg-[#0A0703]/95 text-white ${style.glow} backdrop-blur-2xl`}
  >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(251,191,36,0.18),transparent_34%),radial-gradient(circle_at_100%_100%,rgba(239,68,68,0.13),transparent_34%)]" />

      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto p-5 pr-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-300">
                AI Intervention
              </p>

              <span
                className={`rounded-full border ${style.border} ${style.bg} px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${style.text}`}
              >
                {intervention?.severity || "medium"}
              </span>

              {intervention?.status === "resolved" && (
                <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">
                  resolved
                </span>
              )}
            </div>

            <h2 className="mt-3 text-2xl font-black tracking-[-0.05em]">
              {loading
                ? "Intervento AI..."
                : intervention?.title || "Rescue Mode"}
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {intervention?.diagnosis ||
                "iMemory rileva blocchi e propone una micro-azione immediata per recuperare focus."}
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

        <div className={`mt-5 rounded-[28px] border ${style.border} ${style.bg} p-4`}>
          <div className="flex items-start gap-3">
            <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${style.dot}`} />

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
                Trigger reason
              </p>

              <p className="mt-2 text-sm leading-6 text-zinc-300">
                {intervention?.trigger_reason ||
                  "Il sistema ha individuato un rischio operativo da correggere."}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-[28px] border border-white/10 bg-white/[0.04] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">
            Micro-action now
          </p>

          <h3 className="mt-2 text-lg font-black leading-tight text-white">
            {intervention?.micro_action ||
              "Esegui una micro-azione con AI Coach per 5 minuti."}
          </h3>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            {intervention?.expected_result ||
              "Ottenere un risultato minimo visibile e riprendere momentum."}
          </p>

          <button
            onClick={openRelatedAction}
            className="mt-4 h-11 w-full rounded-2xl bg-white text-xs font-black uppercase tracking-[0.16em] text-black transition hover:scale-[1.01]"
          >
            Start rescue action
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
            Rescue protocol
          </p>

          <div className="mt-3 space-y-2">
            {protocol.length === 0 ? (
              <p className="text-xs leading-5 text-zinc-600">
                Nessun protocollo ancora.
              </p>
            ) : (
              protocol.map((item, index) => (
                <div
                  key={index}
                  className="flex gap-3 rounded-xl border border-white/10 bg-black/25 p-3"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white text-[10px] font-black text-black">
                    {index + 1}
                  </span>

                  <p className="text-xs leading-5 text-zinc-400">{item}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            onClick={() => updateStatus("resolved")}
            disabled={saving || intervention?.status === "resolved"}
            className="h-11 rounded-2xl bg-emerald-400 text-xs font-black text-black transition hover:scale-[1.02] disabled:opacity-50"
          >
            Risolto
          </button>

          <button
            onClick={() => updateStatus("snoozed")}
            disabled={saving}
            className="h-11 rounded-2xl border border-white/10 bg-white/[0.05] text-xs font-black text-zinc-300 transition hover:bg-white/[0.08] disabled:opacity-50"
          >
            Dopo
          </button>
        </div>
      </div>
    </div>
  );
}