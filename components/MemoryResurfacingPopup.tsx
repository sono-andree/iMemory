"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Slot = "morning" | "afternoon" | "evening";

type ResurfaceEvent = {
  id: number;
  resurfaced_date: string;
  slot: Slot;
  source_type: "memory" | "goal" | "focus" | string;
  source_id: string | null;
  title: string | null;
  reason: string | null;
  suggested_action: string | null;
  preview: string | null;
  priority_score: number | null;
  link: string | null;
};

function getLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentSlot(): Slot {
  const hour = new Date().getHours();

  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function getSlotLabel(slot: Slot) {
  if (slot === "morning") return "Morning Signal";
  if (slot === "afternoon") return "Afternoon Recall";
  return "Evening Review";
}

function getTypeMeta(type?: string) {
  if (type === "memory") {
    return {
      label: "Memory",
      title: "Recovered Memory",
      letter: "M",
      gradient: "from-violet-500 via-fuchsia-500 to-cyan-400",
      border: "border-violet-400/20",
      soft: "bg-violet-500/10 text-violet-200 border-violet-400/20",
      glow: "rgba(168,85,247,0.35)",
    };
  }

  if (type === "goal") {
    return {
      label: "Goal",
      title: "Strategic Goal",
      letter: "G",
      gradient: "from-cyan-400 via-blue-500 to-violet-500",
      border: "border-cyan-400/20",
      soft: "bg-cyan-500/10 text-cyan-200 border-cyan-400/20",
      glow: "rgba(34,211,238,0.32)",
    };
  }

  if (type === "focus") {
    return {
      label: "Focus",
      title: "Focus Action",
      letter: "F",
      gradient: "from-emerald-400 via-cyan-400 to-blue-500",
      border: "border-cyan-400/20",
      soft: "bg-cyan-500/10 text-cyan-200 border-cyan-400/20",
      glow: "rgba(34,211,238,0.32)",
    };
  }

  return {
    label: "AI",
    title: "AI Insight",
    letter: "AI",
    gradient: "from-violet-500 via-purple-500 to-cyan-400",
    border: "border-white/10",
    soft: "bg-white/10 text-white border-white/10",
    glow: "rgba(168,85,247,0.3)",
  };
}

function getDismissKey(date: string, slot: Slot) {
  return `imemory_resurface_dismissed_${date}_${slot}`;
}

export default function MemoryResurfacingPopup() {
  const router = useRouter();

  const lastCheckedKey = useRef<string | null>(null);
  const loadingRef = useRef(false);

  const [open, setOpen] = useState(false);
  const [event, setEvent] = useState<ResurfaceEvent | null>(null);
  const [snoozing, setSnoozing] = useState(false);

  useEffect(() => {
    loadCurrentSlot();

    const interval = setInterval(() => {
      loadCurrentSlot();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  async function getAccessToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  }

  async function loadCurrentSlot(force = false) {
    if (loadingRef.current) return;

    const date = getLocalDate();
    const slot = getCurrentSlot();
    const slotKey = `${date}_${slot}`;

    if (!force && lastCheckedKey.current === slotKey) return;

    lastCheckedKey.current = slotKey;

    const dismissed =
      localStorage.getItem(getDismissKey(date, slot)) === "true";

    if (dismissed && !force) return;

    try {
      loadingRef.current = true;

      const token = await getAccessToken();
      if (!token) return;

      const params = new URLSearchParams({
        date,
        slot,
      });

      const res = await fetch(`/api/memory-resurfacing?${params.toString()}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("MEMORY RESURFACING API ERROR:", data);
        return;
      }

      if (!data?.hasItem || !data?.event) return;

      setEvent(data.event);

      setTimeout(() => {
        setOpen(true);
      }, 500);
    } catch (error) {
      console.log("MEMORY RESURFACING POPUP ERROR:", error);
    } finally {
      loadingRef.current = false;
    }
  }

  function dismissCurrent() {
    if (event?.resurfaced_date && event?.slot) {
      localStorage.setItem(
        getDismissKey(event.resurfaced_date, event.slot),
        "true"
      );
    }

    setOpen(false);
  }

  function openSource() {
    if (event?.resurfaced_date && event?.slot) {
      localStorage.setItem(
        getDismissKey(event.resurfaced_date, event.slot),
        "true"
      );
    }

    setOpen(false);

    if (event?.link) {
      router.push(event.link);
    }
  }

  async function remindTonight() {
    if (!event) return;

    try {
      setSnoozing(true);

      const token = await getAccessToken();

      if (!token) {
        setSnoozing(false);
        return;
      }

      const res = await fetch("/api/memory-resurfacing", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "snooze_tonight",
          eventId: event.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("SNOOZE ERROR:", data);
        setSnoozing(false);
        return;
      }

      localStorage.setItem(
        getDismissKey(event.resurfaced_date, event.slot),
        "true"
      );

      localStorage.removeItem(getDismissKey(event.resurfaced_date, "evening"));

      setOpen(false);
    } catch (error) {
      console.log("REMIND TONIGHT ERROR:", error);
    } finally {
      setSnoozing(false);
    }
  }

  

  if (!event || !open) return null;

  const meta = getTypeMeta(event.source_type);

  const priority = Math.max(
    1,
    Math.min(100, Number(event.priority_score || 70))
  );

  const priorityLabel =
    priority >= 85 ? "Critical" : priority >= 65 ? "High" : "Medium";

  const isEvening = event.slot === "evening";

  return (
    <>
      <style jsx global>{`
        @keyframes resurfacingOverlayIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes resurfacingPanelIn {
          0% {
            opacity: 0;
            transform: translateY(26px) scale(0.96);
            filter: blur(10px);
          }

          65% {
            opacity: 1;
            transform: translateY(-3px) scale(1.005);
            filter: blur(0);
          }

          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }

        @keyframes resurfacingLine {
          0% {
            transform: translateX(-110%);
            opacity: 0;
          }

          35% {
            opacity: 1;
          }

          100% {
            transform: translateX(110%);
            opacity: 0;
          }
        }

        @keyframes resurfacingGridMove {
          from {
            background-position: 0 0;
          }
          to {
            background-position: 42px 42px;
          }
        }

        .resurfacing-overlay {
          animation: resurfacingOverlayIn 260ms ease-out both;
        }

        .resurfacing-panel {
          animation: resurfacingPanelIn 620ms cubic-bezier(0.16, 1, 0.3, 1)
            both;
        }

        .resurfacing-line {
          animation: resurfacingLine 2.2s ease-in-out 500ms both;
        }

        .resurfacing-grid {
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
          background-size: 42px 42px;
          animation: resurfacingGridMove 18s linear infinite;
        }
      `}</style>

      <div className="resurfacing-overlay fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 px-4 py-5 text-white backdrop-blur-2xl">
        <div className="resurfacing-grid pointer-events-none absolute inset-0 opacity-40" />

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(139,92,246,0.18),transparent_35%),radial-gradient(circle_at_80%_85%,rgba(34,211,238,0.13),transparent_35%)]" />

        <div
          className={`resurfacing-panel relative w-full max-w-[760px] overflow-hidden rounded-[30px] border ${meta.border} bg-[#05050A]/95 shadow-[0_0_120px_rgba(0,0,0,0.9)]`}
        >
          <div className="pointer-events-none absolute inset-0">
            <div
              className="absolute -left-28 -top-28 h-72 w-72 rounded-full blur-[120px]"
              style={{ background: meta.glow }}
            />
            <div className="absolute -bottom-28 -right-28 h-72 w-72 rounded-full bg-cyan-400/15 blur-[120px]" />
            <div className="resurfacing-line absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent" />
          </div>

          <div className="relative z-10 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 md:px-7">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${meta.gradient} text-sm font-black text-white shadow-[0_0_35px_rgba(34,211,238,0.18)]`}
                >
                  {meta.letter}
                </div>

                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">
                    iMemory Neural Recall
                  </p>

                  <p className="mt-0.5 text-sm font-bold text-zinc-200">
                    {getSlotLabel(event.slot)}
                  </p>
                </div>
              </div>

              <button
                onClick={dismissCurrent}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-500 transition hover:bg-white/[0.08] hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="border-white/10 p-5 md:p-7 lg:border-r">
                <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">
                  {meta.title}
                </div>

                <h2 className="mt-5 text-3xl font-black leading-tight tracking-[-0.04em] text-white md:text-5xl">
                  {event.title || "Elemento importante"}
                </h2>

                <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-400">
                  iMemory ha recuperato automaticamente questo elemento perché
                  può avere impatto sui tuoi progressi attuali.
                </p>

                <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.035] p-5">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">
                    Mini preview
                  </p>

                  <p className="mt-3 text-[15px] leading-7 text-zinc-200">
                    {event.preview ||
                      "Questo contenuto contiene informazioni utili da rivedere e trasformare in una prossima azione."}
                  </p>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-3xl border border-purple-400/15 bg-purple-500/[0.08] p-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-purple-300">
                      AI reason
                    </p>

                    <p className="mt-3 text-sm leading-7 text-zinc-300">
                      {event.reason ||
                        "Questo elemento è collegato a qualcosa che hai iniziato e che può aiutarti a recuperare continuità."}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-cyan-400/15 bg-cyan-500/[0.08] p-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300">
                      Next action
                    </p>

                    <p className="mt-3 text-sm leading-7 text-zinc-300">
                      {event.suggested_action ||
                        "Aprilo e trasformalo in una micro-azione concreta da completare ora."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 md:p-7">
                <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">
                        AI priority
                      </p>

                      <p className="mt-1 text-2xl font-black text-white">
                        {priorityLabel}
                      </p>
                    </div>

                    <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-black/30">
                      <div
                        className={`absolute inset-2 rounded-full bg-gradient-to-br ${meta.gradient} opacity-20 blur-md`}
                      />
                      <span className="relative text-2xl font-black text-cyan-200">
                        {priority}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${meta.gradient}`}
                      style={{ width: `${priority}%` }}
                    />
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2">
                    <Metric label="Source" value={meta.label} />
                    <Metric label="Slot" value={getSlotLabel(event.slot)} />
                    <Metric label="Score" value={`${priority}%`} />
                  </div>
                </div>

                <div className="mt-4 rounded-3xl border border-white/10 bg-black/30 p-5">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">
                    System note
                  </p>

                  <p className="mt-3 text-sm leading-7 text-zinc-400">
                    Questo richiamo viene aggiornato automaticamente fino a tre
                    volte al giorno con elementi diversi tra memorie, focus e
                    obiettivi.
                  </p>
                </div>

                <div className="mt-5 grid gap-3">
                  <button
                    onClick={openSource}
                    className={`h-14 rounded-2xl bg-gradient-to-r ${meta.gradient} text-sm font-black text-white shadow-[0_0_45px_rgba(34,211,238,0.22)] transition hover:scale-[1.015]`}
                  >
                    Apri adesso
                  </button>

                  {!isEvening && (
                    <button
                      onClick={remindTonight}
                      disabled={snoozing}
                      className="h-13 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-bold text-zinc-300 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
                    >
                      {snoozing ? "Salvataggio..." : "Ricordamelo stasera"}
                    </button>
                  )}

                  <button
                    onClick={dismissCurrent}
                    className="h-12 rounded-2xl border border-white/10 bg-transparent text-sm font-bold text-zinc-500 transition hover:bg-white/[0.04] hover:text-zinc-200"
                  >
                    Ignora per ora
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-600">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-black text-zinc-200">{value}</p>
    </div>
  );
}