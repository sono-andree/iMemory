"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type AIDayReview = {
  id: number;
  title: string | null;
  summary: string | null;
  completion_score: number | null;
  focus_score: number | null;
  momentum_score: number | null;
  closed: boolean | null;
};

function clamp(value: any) {
  const n = Number(value || 0);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export default function AIDayReviewMiniCard() {
  const router = useRouter();
  const initialized = useRef(false);

  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState<AIDayReview | null>(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    setTimeout(() => {
      loadReview();
    }, 1100);
  }, []);

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  }

  async function loadReview() {
    try {
      setLoading(true);

      const token = await getToken();
      if (!token) return;

      const res = await fetch("/api/ai-day-review", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("DAY REVIEW MINI ERROR:", data);
        return;
      }

      setReview(data.review);
    } catch (error) {
      console.log("DAY REVIEW MINI LOAD ERROR:", error);
    } finally {
      setLoading(false);
    }
  }

  const momentum = clamp(review?.momentum_score);

  return (
    <button
      onClick={() => router.push("/ai-actions")}
      className="group relative h-[72px] overflow-hidden rounded-[22px] border border-purple-400/20 bg-[#080512]/90 text-left text-white shadow-[0_0_40px_rgba(0,0,0,0.55)] backdrop-blur-2xl transition hover:-translate-y-0.5 hover:border-purple-300/35"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-purple-500/[0.13] via-transparent to-cyan-500/[0.09]" />

      <div className="relative z-10 flex h-full items-center gap-3 px-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-purple-400/20 bg-purple-500/10">
          <span className="text-xs font-black text-purple-200">
            {review ? momentum : "--"}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-purple-300">
              Day Review
            </p>

            {review?.closed && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,1)]" />
            )}
          </div>

          <p className="mt-0.5 truncate text-sm font-black text-white">
            {loading
              ? "Review..."
              : review?.summary || review?.title || "Close your day"}
          </p>

          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-400 to-cyan-400"
              style={{ width: `${momentum}%` }}
            />
          </div>
        </div>

        <div className="hidden shrink-0 text-right xl:block">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-600">
            Score
          </p>

          <p className="text-xs font-black text-purple-300">
            {review ? `${momentum}%` : "--"}
          </p>
        </div>
      </div>
    </button>
  );
}