"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Activity = {
  id: number;
  type: string;
  title: string | null;
  xp: number;
  created_at: string;
};

type BrainXPData = {
  brainScore: number;
  currentStreak: number;
  longestStreak: number;
  brainLevel: {
    level: number;
    title: string;
    currentMin: number;
    nextMin: number;
  };
  levelProgress: number;
  activities: Activity[];
};

export default function BrainXPWidget() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BrainXPData | null>(null);

  useEffect(() => {
    loadBrainXP();
  }, []);

  async function loadBrainXP() {
    try {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setLoading(false);
        return;
      }

      const res = await fetch("/api/brain-xp", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await res.json();

      if (!res.ok) {
        console.log("BRAIN XP LOAD ERROR:", result);
        setLoading(false);
        return;
      }

      setData(result);
    } catch (error) {
      console.log("BRAIN XP WIDGET ERROR:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 text-zinc-400">
        Caricamento Brain XP...
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const scoreToNext =
    data.brainLevel.nextMin === data.brainLevel.currentMin
      ? 0
      : data.brainLevel.nextMin - data.brainScore;

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-purple-500/20 bg-zinc-950/70 p-6 shadow-[0_0_60px_rgba(168,85,247,0.16)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-purple-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-5">
          <div>
            <br></br>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300">
              Brain XP
            </p>

            <h2 className="mt-3 text-3xl font-black text-white">
              Level {data.brainLevel.level}
            </h2>

            <p className="mt-1 text-sm font-bold text-purple-300">
              {data.brainLevel.title}
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-5 py-4 text-center">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
              Score
            </p>

            <p className="mt-1 text-3xl font-black text-cyan-300">
              {data.brainScore}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-xs font-bold text-zinc-500">
            <span>Progress livello</span>
            <span>{data.levelProgress}%</span>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-cyan-400"
              style={{
                width: `${data.levelProgress}%`,
              }}
            />
          </div>

          {scoreToNext > 0 && (
            <p className="mt-2 text-xs text-zinc-500">
              Mancano {scoreToNext} XP al prossimo livello.
            </p>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <MiniBox label="Streak" value={`${data.currentStreak}🔥`} />
          <MiniBox label="Best" value={data.longestStreak} />
        </div>

        <div className="mt-6">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
            Ultime attività
          </p>

          <div className="mt-3 space-y-2">
            {data.activities.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-500">
                Nessuna attività ancora.
              </p>
            ) : (
              data.activities.slice(0, 5).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  <span className="text-sm font-bold text-zinc-300">
                    {activity.title || activity.type}
                  </span>

                  <span className="text-sm font-black text-cyan-300">
                    +{activity.xp}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function MiniBox({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
  );
}