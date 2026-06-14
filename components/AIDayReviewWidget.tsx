"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type AIDayReview = {
  id: number;
  review_date: string;
  title: string | null;
  summary: string | null;
  completion_score: number | null;
  focus_score: number | null;
  momentum_score: number | null;
  what_worked: string[] | null;
  blockers: string[] | null;
  lessons: string[] | null;
  suggested_next_actions: string[] | null;
  tomorrow_strategy: string | null;
  memory_note: string | null;
  user_reflection: string | null;
  closed: boolean | null;
};

function clamp(value: any) {
  const n = Number(value || 0);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export default function AIDayReviewWidget() {
  const initialized = useRef(false);

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [closing, setClosing] = useState(false);
  const [review, setReview] = useState<AIDayReview | null>(null);
  const [reflection, setReflection] = useState("");

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    setTimeout(() => {
      loadReview(false);
    }, 800);
  }, []);

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  }

  async function loadReview(force = false) {
    try {
      setLoading(true);

      const token = await getToken();

      if (!token) {
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/ai-day-review${force ? "?force=1" : ""}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("AI DAY REVIEW ERROR:", data);
        return;
      }

      setReview(data.review);
      setReflection(data.review?.user_reflection || "");
    } catch (error) {
      console.log("AI DAY REVIEW LOAD ERROR:", error);
    } finally {
      setLoading(false);
    }
  }

  async function regenerate() {
    try {
      setGenerating(true);
      await loadReview(true);
    } finally {
      setGenerating(false);
    }
  }

  async function closeDay() {
    if (!review) return;

    try {
      setClosing(true);

      const token = await getToken();

      if (!token) {
        setClosing(false);
        return;
      }

      const res = await fetch("/api/ai-day-review", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: review.review_date,
          userReflection: reflection,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("AI DAY REVIEW CLOSE ERROR:", data);
        return;
      }

      setReview(data.review);
    } catch (error) {
      console.log("AI DAY REVIEW CLOSE ERROR:", error);
    } finally {
      setClosing(false);
    }
  }

  const completionScore = clamp(review?.completion_score);
  const focusScore = clamp(review?.focus_score);
  const momentumScore = clamp(review?.momentum_score);

  return (
    <div className="relative overflow-hidden rounded-[34px] border border-purple-400/20 bg-[#080512]/95 text-white shadow-[0_0_90px_rgba(0,0,0,0.65)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(168,85,247,0.22),transparent_34%),radial-gradient(circle_at_100%_100%,rgba(34,211,238,0.13),transparent_34%)]" />

      <div className="relative z-10 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-purple-300">
                AI Daily Review
              </p>

              {review?.closed && (
                <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">
                  Closed
                </span>
              )}
            </div>

            <h2 className="mt-3 text-2xl font-black tracking-[-0.05em] text-white">
              {loading
                ? "Analisi giornata..."
                : review?.title || "Chiudi la giornata"}
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {review?.summary ||
                "iMemory analizza azioni, sessioni, piano e focus per migliorare il piano di domani."}
            </p>
          </div>

          <button
            onClick={regenerate}
            disabled={loading || generating || closing}
            className="rounded-2xl bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-black transition hover:scale-[1.02] disabled:opacity-50"
          >
            {generating ? "AI..." : "Rigenera"}
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <ScoreBox label="Completion" value={completionScore} />
          <ScoreBox label="Focus" value={focusScore} />
          <ScoreBox label="Momentum" value={momentumScore} />
        </div>

        {loading ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400">
            iMemory sta leggendo la giornata e creando una review intelligente...
          </div>
        ) : review ? (
          <>
            <div className="mt-5 grid gap-4">
              <ListPanel
                title="Cosa ha funzionato"
                items={review.what_worked || []}
                accent="emerald"
              />

              <ListPanel
                title="Blocchi rilevati"
                items={review.blockers || []}
                accent="red"
              />

              <ListPanel
                title="Lezioni operative"
                items={review.lessons || []}
                accent="cyan"
              />
            </div>

            {review.tomorrow_strategy && (
              <div className="mt-5 rounded-2xl border border-purple-400/15 bg-purple-500/[0.07] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-purple-300">
                  Strategia per domani
                </p>

                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  {review.tomorrow_strategy}
                </p>
              </div>
            )}

            {(review.suggested_next_actions || []).length > 0 && (
              <div className="mt-5 rounded-2xl border border-cyan-400/15 bg-cyan-500/[0.07] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
                  Next actions suggerite
                </p>

                <div className="mt-3 space-y-2">
                  {(review.suggested_next_actions || []).map((item, index) => (
                    <p
                      key={index}
                      className="rounded-xl border border-white/10 bg-black/25 p-3 text-xs leading-5 text-zinc-400"
                    >
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
                Riflessione personale
              </p>

              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                disabled={Boolean(review.closed)}
                placeholder="Scrivi cosa hai imparato oggi, cosa vuoi evitare domani e cosa vuoi fare meglio..."
                className="mt-3 min-h-[110px] w-full resize-none rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-purple-400/40 disabled:opacity-60"
              />

              <button
                onClick={closeDay}
                disabled={closing || Boolean(review.closed)}
                className="mt-4 h-11 w-full rounded-2xl bg-white text-xs font-black uppercase tracking-[0.16em] text-black transition hover:scale-[1.01] disabled:opacity-50"
              >
                {review.closed
                  ? "Giornata chiusa e salvata"
                  : closing
                  ? "Chiusura..."
                  : "Chiudi giornata +25 XP"}
              </button>

              <p className="mt-3 text-xs leading-5 text-zinc-600">
                La chiusura salva una memoria automatica e rende il piano di
                domani più intelligente.
              </p>
            </div>
          </>
        ) : (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-bold text-zinc-300">
              Nessuna review disponibile.
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              Genera azioni, completa sessioni e poi rigenera la review.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-white">
        {value}
      </p>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function ListPanel({
  title,
  items,
  accent,
}: {
  title: string;
  items: string[];
  accent: "emerald" | "red" | "cyan";
}) {
  const color =
    accent === "emerald"
      ? "border-emerald-400/15 bg-emerald-500/[0.06] text-emerald-300"
      : accent === "red"
      ? "border-red-400/15 bg-red-500/[0.06] text-red-300"
      : "border-cyan-400/15 bg-cyan-500/[0.06] text-cyan-300";

  return (
    <div className={`rounded-2xl border p-4 ${color}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.22em]">
        {title}
      </p>

      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <p className="text-xs leading-5 text-zinc-500">
            Nessun dato sufficiente.
          </p>
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