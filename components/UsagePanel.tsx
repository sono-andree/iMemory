"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type UsageData = {
  plan: string;
  subscriptionStatus: string;
  isPro: boolean;
  limits: {
    memories: number;
    goals: number;
    focusPerMonth: number;
    chatMessagesPerMonth: number;
    goalStrategiesPerMonth: number;
  };
  usage: {
    chat: number;
    focus: number;
    goalsAI: number;
    memories: number;
    goals: number;
  };
};

function ProgressBar({
  value,
  limit,
  isPro,
}: {
  value: number;
  limit: number;
  isPro: boolean;
}) {
  const percentage = isPro
    ? 100
    : Math.min(Math.round((value / limit) * 100), 100);

  return (
    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          percentage >= 100 && !isPro
            ? "bg-red-500"
            : "bg-gradient-to-r from-purple-500 via-fuchsia-500 to-cyan-400"
        }`}
        style={{
          width: `${percentage}%`,
        }}
      />
    </div>
  );
}

function UsageCard({
  title,
  description,
  value,
  limit,
  isPro,
}: {
  title: string;
  description: string;
  value: number;
  limit: number;
  isPro: boolean;
}) {
  const reachedLimit = !isPro && value >= limit;

  return (
    <div
      className={`rounded-3xl border p-5 backdrop-blur-xl ${
        reachedLimit
          ? "border-red-500/40 bg-red-500/10"
          : "border-white/10 bg-white/[0.04]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-black text-white">
            {title}
          </h3>

          <p className="mt-1 text-xs text-zinc-500">
            {description}
          </p>
        </div>

        <div
          className={`rounded-2xl border px-3 py-1 text-xs font-black ${
            reachedLimit
              ? "border-red-500/40 bg-red-500/10 text-red-300"
              : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
          }`}
        >
          {isPro ? `${value} / ∞` : `${value} / ${limit}`}
        </div>
      </div>

      <ProgressBar
        value={value}
        limit={limit}
        isPro={isPro}
      />

      {reachedLimit && (
        <p className="mt-3 text-xs font-bold text-red-300">
          Limite Free raggiunto.
        </p>
      )}
    </div>
  );
}

export default function UsagePanel() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadUsage() {
    try {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setLoading(false);
        return;
      }

      const res = await fetch("/api/usage", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await res.json();

      if (!res.ok) {
        console.log("USAGE ERROR:", result);
        setLoading(false);
        return;
      }

      setData(result);
    } catch (error) {
      console.log("USAGE PANEL ERROR:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsage();
  }, []);

  if (loading) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 text-zinc-400">
        Caricamento utilizzo piano...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 text-zinc-400">
        Impossibile caricare l'utilizzo del piano.
      </div>
    );
  }

  const isPro = data.isPro;

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 p-6 shadow-[0_0_60px_rgba(168,85,247,0.12)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-purple-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.4em] text-cyan-300">
            Utilizzo piano
          </p>

          <h2 className="mt-3 text-3xl font-black text-white">
            Il tuo piano iMemory
          </h2>

          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Controlla quanto hai usato questo mese. Con Pro rimuovi tutti i limiti.
          </p>
        </div>

        <div
          className={`rounded-2xl border px-5 py-3 text-center ${
            isPro
              ? "border-cyan-400/40 bg-cyan-400/10"
              : "border-purple-400/30 bg-purple-500/10"
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">
            Piano attuale
          </p>

          <p
            className={`mt-1 text-2xl font-black ${
              isPro ? "text-cyan-300" : "text-purple-300"
            }`}
          >
            {isPro ? "PRO" : "FREE"}
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            {data.subscriptionStatus}
          </p>
        </div>
      </div>

      <div className="relative z-10 mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <UsageCard
          title="Chat AI"
          description="Messaggi AI usati questo mese."
          value={data.usage.chat}
          limit={data.limits.chatMessagesPerMonth}
          isPro={isPro}
        />

        <UsageCard
          title="Focus AI"
          description="Generazioni focus usate questo mese."
          value={data.usage.focus}
          limit={data.limits.focusPerMonth}
          isPro={isPro}
        />

        <UsageCard
          title="Goals AI"
          description="Strategie AI generate questo mese."
          value={data.usage.goalsAI}
          limit={data.limits.goalStrategiesPerMonth}
          isPro={isPro}
        />

        <UsageCard
          title="Memorie"
          description="Memorie salvate nel tuo cervello digitale."
          value={data.usage.memories}
          limit={data.limits.memories}
          isPro={isPro}
        />

        <UsageCard
          title="Goals"
          description="Obiettivi personali creati."
          value={data.usage.goals}
          limit={data.limits.goals}
          isPro={isPro}
        />
      </div>

      {!isPro && (
        <div className="relative z-10 mt-8 rounded-3xl border border-cyan-400/20 bg-gradient-to-r from-purple-500/10 via-fuchsia-500/10 to-cyan-500/10 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-black text-white">
                Vuoi continuare senza limiti?
              </h3>

              <p className="mt-1 text-sm text-zinc-400">
                Passa a Pro e sblocca memorie, goals, focus e chat AI illimitati.
              </p>
            </div>

            <Link
              href="/pricing"
              className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-black transition hover:scale-[1.03]"
            >
              Upgrade a Pro
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}