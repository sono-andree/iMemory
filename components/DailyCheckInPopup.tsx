"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ProfileData = {
  brain_score: number;
  current_streak: number;
  longest_streak: number;
  last_checkin_date: string | null;
};

const moods = [
  "Carico",
  "Motivato",
  "Tranquillo",
  "Stanco",
  "Stressato",
  "Confuso",
];

export default function DailyCheckInPopup() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [open, setOpen] = useState(false);
  const [today, setToday] = useState("");

  const [profile, setProfile] = useState<ProfileData>({
    brain_score: 0,
    current_streak: 0,
    longest_streak: 0,
    last_checkin_date: null,
  });

  const [mood, setMood] = useState("Motivato");
  const [energy, setEnergy] = useState(7);
  const [mainFocus, setMainFocus] = useState("");
  const [blocker, setBlocker] = useState("");
  const [note, setNote] = useState("");

  const [aiReflection, setAiReflection] = useState("");
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    loadCheckinStatus();
  }, []);

  async function getAccessToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  }

  async function loadCheckinStatus() {
    try {
      setLoading(true);

      const token = await getAccessToken();

      if (!token) {
        setLoading(false);
        return;
      }

      const res = await fetch("/api/daily-checkin", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("DAILY CHECKIN LOAD ERROR:", data);
        setLoading(false);
        return;
      }

      setToday(data.today);
      setProfile(data.profile);

      const alreadyCompletedToday = !!data.checkin;

      if (alreadyCompletedToday && data.today) {
  localStorage.setItem(
    `imemory_checkin_dismissed_${data.today}`,
    "true"
  );
}

      const dismissedToday =
        typeof window !== "undefined" &&
        localStorage.getItem(
          `imemory_checkin_dismissed_${data.today}`
        ) === "true";

      if (!alreadyCompletedToday && !dismissedToday) {
        setTimeout(() => {
          setOpen(true);
        }, 900);
      }
    } catch (error) {
      console.log("DAILY CHECKIN POPUP ERROR:", error);
    } finally {
      setLoading(false);
    }
  }

  function closePopup() {
    if (today) {
      localStorage.setItem(
        `imemory_checkin_dismissed_${today}`,
        "true"
      );
    }

    setOpen(false);
  }

  async function saveCheckin() {
    if (!mainFocus.trim()) {
      alert("Scrivi il focus principale di oggi.");
      return;
    }

    if (!blocker.trim()) {
      alert("Scrivi cosa potrebbe bloccarti oggi.");
      return;
    }

    try {
      setSaving(true);

      const token = await getAccessToken();

      if (!token) {
        setSaving(false);
        return;
      }

      const res = await fetch("/api/daily-checkin", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checkin_date: today,
          mood,
          energy,
          main_focus: mainFocus,
          blocker,
          note,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Errore salvataggio check-in");
        setSaving(false);
        return;
      }

      setProfile(data.profile);
      setAiReflection(data.checkin?.ai_reflection || "");
      setCompleted(true);

      if (today) {
        localStorage.setItem(
          `imemory_checkin_dismissed_${today}`,
          "true"
        );
      }
    } catch (error) {
      console.log("SAVE CHECKIN ERROR:", error);
      alert("Errore salvataggio check-in");
    }

    setSaving(false);
  }

  if (loading) return null;
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 px-4 py-4 backdrop-blur-2xl">
      <div className="relative max-h-[calc(100vh-32px)] w-full max-w-[560px] overflow-hidden rounded-[34px] border border-purple-500/30 bg-zinc-950 shadow-[0_0_120px_rgba(168,85,247,0.35)]">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-purple-600/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />

        <button
          onClick={closePopup}
          className="absolute right-4 top-4 z-30 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-black text-zinc-400 transition hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>

        <div className="relative z-10 max-h-[calc(100vh-32px)] overflow-y-auto px-6 py-7 glow-scrollbar">
          {!completed ? (
            <>
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-cyan-400/30 bg-cyan-400/10 text-3xl shadow-[0_0_40px_rgba(34,211,238,0.3)]">
                  🧠
                </div>

                <p className="mt-5 text-[11px] font-black uppercase tracking-[0.35em] text-cyan-300">
                  Daily Brain Check-in
                </p>

                <h2 className="mt-3 text-3xl font-black leading-tight text-white">
                  Allena il tuo cervello digitale
                </h2>

                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-400">
                  Rispondi al check-in giornaliero. iMemory salverà il tuo stato
                  mentale, aggiornerà XP e streak, e userà questi dati per
                  migliorare Focus, Chat AI e Goals.
                </p>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <MiniStat label="XP" value={profile.brain_score || 0} />
                <MiniStat
                  label="Streak"
                  value={`${profile.current_streak || 0}🔥`}
                />
                <MiniStat label="Best" value={profile.longest_streak || 0} />
              </div>

              <div className="mt-7">
                <p className="mb-3 text-sm font-black text-zinc-300">
                  Come ti senti oggi?
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {moods.map((item) => (
                    <button
                      key={item}
                      onClick={() => setMood(item)}
                      className={`rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                        mood === item
                          ? "border-cyan-400 bg-cyan-500/20 text-cyan-200"
                          : "border-zinc-800 bg-black/40 text-zinc-500 hover:text-white"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-7">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-zinc-300">
                    Energia mentale
                  </p>

                  <span className="text-xl font-black text-cyan-300">
                    {energy}/10
                  </span>
                </div>

                <input
                  type="range"
                  min="1"
                  max="10"
                  value={energy}
                  onChange={(e) => setEnergy(Number(e.target.value))}
                  className="mt-4 w-full"
                />
              </div>

              <div className="mt-7">
                <p className="mb-3 text-sm font-black text-zinc-300">
                  Qual è la cosa più importante da completare oggi?
                </p>

                <textarea
                  value={mainFocus}
                  onChange={(e) => setMainFocus(e.target.value)}
                  placeholder="Esempio: finire la landing page di iMemory..."
                  className="min-h-[115px] w-full resize-none rounded-3xl border border-zinc-800 bg-black/60 p-5 text-white outline-none placeholder:text-zinc-600 focus:border-purple-500"
                />
              </div>

              <div className="mt-5">
                <p className="mb-3 text-sm font-black text-zinc-300">
                  Cosa potrebbe bloccarti?
                </p>

                <textarea
                  value={blocker}
                  onChange={(e) => setBlocker(e.target.value)}
                  placeholder="Esempio: perdere tempo su dettagli inutili..."
                  className="min-h-[115px] w-full resize-none rounded-3xl border border-zinc-800 bg-black/60 p-5 text-white outline-none placeholder:text-zinc-600 focus:border-purple-500"
                />
              </div>

              <div className="mt-5">
                <p className="mb-3 text-sm font-black text-zinc-300">
                  Nota libera
                </p>

                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Scrivi qualsiasi cosa vuoi ricordare oggi..."
                  className="min-h-[90px] w-full resize-none rounded-3xl border border-zinc-800 bg-black/60 p-5 text-white outline-none placeholder:text-zinc-600 focus:border-purple-500"
                />
              </div>

              <div className="sticky bottom-0 -mx-6 mt-7 border-t border-white/10 bg-zinc-950/95 px-6 pt-4 backdrop-blur-xl">
                <div className="grid gap-3">
                  <button
                    onClick={saveCheckin}
                    disabled={saving}
                    className="h-14 rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-500 text-base font-black text-white shadow-[0_0_40px_rgba(34,211,238,0.25)] transition hover:scale-[1.02] disabled:opacity-60"
                  >
                    {saving ? "Salvataggio..." : "Completa Check-in +20 XP"}
                  </button>

                  <button
                    onClick={closePopup}
                    className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-bold text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    Più tardi
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="py-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-green-400/30 bg-green-400/10 text-3xl shadow-[0_0_40px_rgba(74,222,128,0.25)]">
                ✓
              </div>

              <p className="mt-6 text-xs font-black uppercase tracking-[0.35em] text-green-300">
                Check-in completato
              </p>

              <h2 className="mt-4 text-3xl font-black text-white">
                +20 XP aggiunti
              </h2>

              <p className="mt-3 text-sm text-zinc-400">
                Il tuo cervello digitale è stato aggiornato per oggi.
              </p>

              <div className="mx-auto mt-7 max-w-md rounded-3xl border border-cyan-500/20 bg-cyan-500/10 p-5 text-left">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
                  Riflessione AI
                </p>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-200">
                  {aiReflection}
                </p>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="mt-8 h-13 rounded-2xl bg-white px-8 text-sm font-black text-black transition hover:scale-[1.03]"
              >
                Continua in iMemory
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-black text-white">{value}</p>
    </div>
  );
}