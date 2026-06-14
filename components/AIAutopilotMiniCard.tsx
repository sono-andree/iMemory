"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type TimeBlock = {
  title: string;
  completed: boolean;
};

type AIDailyPlan = {
  id: number;
  title: string | null;
  main_objective: string | null;
  time_blocks: TimeBlock[] | null;
};

export default function AIAutopilotMiniCard() {
  const router = useRouter();
  const initialized = useRef(false);

  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<AIDailyPlan | null>(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    setTimeout(() => {
      loadPlan();
    }, 900);
  }, []);

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  }

  async function loadPlan() {
    try {
      setLoading(true);

      const token = await getToken();
      if (!token) return;

      const res = await fetch("/api/ai-autopilot-plan", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("AUTOPILOT MINI ERROR:", data);
        return;
      }

      setPlan(data.plan);
    } catch (error) {
      console.log("AUTOPILOT MINI LOAD ERROR:", error);
    } finally {
      setLoading(false);
    }
  }

  const blocks = Array.isArray(plan?.time_blocks) ? plan?.time_blocks || [] : [];
  const completed = blocks.filter((block) => block.completed).length;
  const total = blocks.length;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <button
      onClick={() => router.push("/ai-actions")}
      className="group relative h-[72px] overflow-hidden rounded-[22px] border border-amber-400/20 bg-[#080604]/90 text-left text-white shadow-[0_0_40px_rgba(0,0,0,0.55)] backdrop-blur-2xl transition hover:-translate-y-0.5 hover:border-amber-300/35"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-amber-500/[0.13] via-transparent to-cyan-500/[0.09]" />

      <div className="relative z-10 flex h-full items-center gap-3 px-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/10">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300 shadow-[0_0_18px_rgba(251,191,36,1)]" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-300">
            Autopilot
          </p>

          <p className="mt-0.5 truncate text-sm font-black text-white">
            {loading
              ? "Piano..."
              : plan?.main_objective || plan?.title || "Daily plan"}
          </p>

          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-cyan-400"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="hidden shrink-0 text-right xl:block">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-600">
            Done
          </p>

          <p className="text-xs font-black text-amber-300">
            {completed}/{total}
          </p>
        </div>
      </div>
    </button>
  );
}