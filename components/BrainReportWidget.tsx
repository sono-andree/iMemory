"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type BrainReport = {
  id: number;
  report_date: string;
  report_type: string;
  title: string | null;
  summary: string | null;
  productivity_pattern: string | null;
  blocker_pattern: string | null;
  opportunity: string | null;
  score: number | null;
  next_actions: string[] | null;
  risks: string[] | null;
  highlights: string[] | null;
};

export default function BrainReportWidget() {
  const initialized = useRef(false);

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [report, setReport] = useState<BrainReport | null>(null);
  const [type, setType] = useState<"daily" | "weekly">("daily");

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    setTimeout(() => {
      loadReport("daily", false);
    }, 800);
  }, []);

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  }

  async function loadReport(reportType: "daily" | "weekly", force = false) {
    try {
      setLoading(true);

      const token = await getToken();

      if (!token) {
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({
        type: reportType,
      });

      if (force) params.set("force", "1");

      const res = await fetch(`/api/brain-report?${params.toString()}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("BRAIN REPORT ERROR:", data);
        return;
      }

      setReport(data.report);
      setType(reportType);
    } catch (error) {
      console.log("BRAIN REPORT WIDGET ERROR:", error);
    } finally {
      setLoading(false);
    }
  }

  async function regenerate() {
    try {
      setGenerating(true);
      setExpanded(true);
      await loadReport(type, true);
    } finally {
      setGenerating(false);
    }
  }

  const score = Math.max(1, Math.min(100, Number(report?.score || 0)));

  return (
    <div className="relative overflow-hidden rounded-[22px] border border-purple-400/20 bg-[#05050A]/90 text-white shadow-[0_0_40px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-purple-500/[0.10] via-transparent to-cyan-500/[0.08]" />

      <div className="relative z-10">
        <div className="flex h-[72px] items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-purple-400/20 bg-purple-500/10">
              <span className="text-sm font-black text-purple-200">
                {report ? score : "--"}
              </span>
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-purple-300">
                Brain Report
              </p>

              <h2 className="mt-0.5 truncate text-sm font-black text-white">
                {loading
                  ? "Generazione..."
                  : report?.title || "Report AI pronto"}
              </h2>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            

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
            <div className="max-h-[380px] overflow-y-auto pr-1">
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  onClick={() => loadReport("daily", false)}
                  className={`rounded-2xl border px-4 py-2 text-xs font-black uppercase tracking-[0.16em] transition ${
                    type === "daily"
                      ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-200"
                      : "border-white/10 bg-white/[0.04] text-zinc-500 hover:text-white"
                  }`}
                >
                  Daily
                </button>

                <button
                  onClick={() => loadReport("weekly", false)}
                  className={`rounded-2xl border px-4 py-2 text-xs font-black uppercase tracking-[0.16em] transition ${
                    type === "weekly"
                      ? "border-purple-400/30 bg-purple-500/10 text-purple-200"
                      : "border-white/10 bg-white/[0.04] text-zinc-500 hover:text-white"
                  }`}
                >
                  Weekly
                </button>

                <button
                  onClick={regenerate}
                  disabled={generating || loading}
                  className="rounded-2xl bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-black disabled:opacity-50"
                >
                  {generating ? "AI..." : "Rigenera"}
                </button>
              </div>

              {loading ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400">
                  iMemory sta generando il report...
                </div>
              ) : !report ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm font-bold text-zinc-300">
                    Nessun report.
                  </p>

                  <p className="mt-1 text-sm text-zinc-500">
                    Aggiungi dati e premi Rigenera.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
                      Sintesi
                    </p>

                    <p className="mt-2 text-sm leading-6 text-zinc-300">
                      {report.summary}
                    </p>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-cyan-400"
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>

                  <InsightBox
                    label="Pattern produttivo"
                    value={report.productivity_pattern}
                  />

                  <InsightBox
                    label="Blocco rilevato"
                    value={report.blocker_pattern}
                  />

                  <InsightBox label="Opportunità" value={report.opportunity} />

                  {(report.next_actions || []).length > 0 && (
                    <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/[0.07] p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
                        Prossime azioni
                      </p>

                      <div className="mt-3 space-y-2">
                        {(report.next_actions || []).map((item, index) => (
                          <p
                            key={index}
                            className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm leading-6 text-zinc-300"
                          >
                            {item}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InsightBox({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
        {label}
      </p>

      <p className="mt-2 text-sm leading-6 text-zinc-300">
        {value || "Nessun dato sufficiente."}
      </p>
    </div>
  );
}