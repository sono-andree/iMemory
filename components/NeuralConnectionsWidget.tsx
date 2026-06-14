"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type NeuralConnection = {
  id: number;
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
  title: string | null;
  reason: string | null;
  strength: number | null;
  suggested_action: string | null;
};

function getTypeLabel(type: string) {
  if (type === "memory") return "Memory";
  if (type === "goal") return "Goal";
  if (type === "focus") return "Focus";
  if (type === "checkin") return "Check-in";
  return "Node";
}

function getTypeRoute(type: string) {
  if (type === "memory") return "/memories";
  if (type === "goal") return "/goals";
  if (type === "focus") return "/focus";
  return "/";
}

export default function NeuralConnectionsWidget() {
  const router = useRouter();
  const initialized = useRef(false);

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [connections, setConnections] = useState<NeuralConnection[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    setTimeout(() => {
      loadConnections(false);
    }, 600);
  }, []);

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  }

  async function loadConnections(generate = false) {
    try {
      setLoading(true);

      const token = await getToken();

      if (!token) {
        setLoading(false);
        return;
      }

      const res = await fetch(
        `/api/neural-connections${generate ? "?generate=1" : ""}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.log("NEURAL CONNECTIONS ERROR:", data);
        return;
      }

      const list = data.connections || [];
      setConnections(list);

      if (list.length > 0) {
        setSelectedId(list[0].id);
      }
    } catch (error) {
      console.log("NEURAL CONNECTIONS WIDGET ERROR:", error);
    } finally {
      setLoading(false);
    }
  }

  async function regenerate() {
    try {
      setGenerating(true);
      setExpanded(true);
      await loadConnections(true);
    } finally {
      setGenerating(false);
    }
  }

  const selected =
    connections.find((connection) => connection.id === selectedId) ||
    connections[0] ||
    null;

  const strength = Math.max(1, Math.min(100, Number(selected?.strength || 0)));

  return (
    <div className="relative overflow-hidden rounded-[22px] border border-cyan-400/20 bg-[#05050A]/90 text-white shadow-[0_0_40px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cyan-500/[0.10] via-transparent to-purple-500/[0.08]" />

      <div className="relative z-10">
        <div className="flex h-[72px] items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,1)]" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
                Neural
              </p>

              <h2 className="mt-0.5 truncate text-sm font-black text-white">
                {loading
                  ? "Analisi..."
                  : selected?.title || "Connessioni AI"}
              </h2>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-right md:block">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-600">
                Power
              </p>
              <p className="text-xs font-black text-cyan-300">
                {selected ? `${strength}%` : "--"}
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
            {connections.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-bold text-zinc-300">
                  Nessuna connessione.
                </p>

                <p className="mt-1 text-sm text-zinc-500">
                  Aggiungi memorie, goals, focus o check-in.
                </p>

                <button
                  onClick={regenerate}
                  disabled={generating || loading}
                  className="mt-4 h-10 rounded-2xl bg-white px-4 text-xs font-black text-black disabled:opacity-50"
                >
                  {generating ? "Analisi..." : "Rigenera AI"}
                </button>
              </div>
            ) : (
              <div className="max-h-[380px] overflow-y-auto pr-1">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {connections.slice(0, 8).map((connection) => {
                    const active = connection.id === selected?.id;

                    return (
                      <button
                        key={connection.id}
                        onClick={() => setSelectedId(connection.id)}
                        className={`shrink-0 rounded-2xl border px-3 py-2 text-left transition ${
                          active
                            ? "border-cyan-400/30 bg-cyan-500/10"
                            : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                        }`}
                      >
                        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">
                          {getTypeLabel(connection.source_type)} -{" "}
                          {getTypeLabel(connection.target_type)}
                        </p>

                        <p className="mt-1 max-w-[180px] truncate text-xs font-black text-white">
                          {connection.title || "Connessione AI"}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {selected && (
                  <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-purple-400/20 bg-purple-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-purple-200">
                        {getTypeLabel(selected.source_type)}
                      </span>

                      <span className="text-xs text-zinc-600">-</span>

                      <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200">
                        {getTypeLabel(selected.target_type)}
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-zinc-400">
                      {selected.reason ||
                        "iMemory ha trovato un collegamento utile tra questi elementi."}
                    </p>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400"
                        style={{ width: `${strength}%` }}
                      />
                    </div>

                    <div className="mt-4 rounded-2xl border border-cyan-400/15 bg-cyan-500/[0.07] p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
                        Azione
                      </p>

                      <p className="mt-2 text-sm leading-6 text-zinc-300">
                        {selected.suggested_action ||
                          "Rileggi questi elementi insieme e scegli una micro-azione concreta."}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={regenerate}
                        disabled={generating || loading}
                        className="h-10 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 text-xs font-black text-cyan-200 disabled:opacity-50"
                      >
                        {generating ? "Analisi..." : "Rigenera AI"}
                      </button>

                      <button
                        onClick={() =>
                          router.push(getTypeRoute(selected.target_type))
                        }
                        className="h-10 rounded-2xl bg-white px-4 text-xs font-black text-black"
                      >
                        Apri sezione
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}