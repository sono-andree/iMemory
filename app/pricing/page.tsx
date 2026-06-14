"use client";

import Link from "next/link";
import { useState } from "react";
import SidebarLogo from "@/components/SidebarLogo";
import { startProCheckout } from "@/lib/client/startCheckout";

const freeFeatures = [
  "Memorie personali",
  "Chat AI base",
  "Goals base",
  "Focus limitato",
  "Mappa mentale base",
];

const proFeatures = [
  "Chat AI senza limiti Free",
  "Strategie Goals AI avanzate",
  "Focus AI completo",
  "Più memorie e automazioni",
  "Priorità sulle funzioni future",
];

export default function PricingPage() {
  const [loading, setLoading] = useState(false);

  async function handleProCheckout() {
    if (loading) return;

    setLoading(true);

    try {
      await startProCheckout();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="safe-mobile-bottom relative min-h-screen overflow-x-hidden bg-black px-4 py-5 pb-24 text-white sm:px-6 lg:pb-8">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[-160px] top-[-160px] h-[430px] w-[430px] rounded-full bg-purple-600/25 blur-[140px] md:h-[650px] md:w-[650px] md:blur-[190px]" />
        <div className="absolute bottom-[-180px] right-[-160px] h-[430px] w-[430px] rounded-full bg-cyan-500/20 blur-[140px] md:h-[650px] md:w-[650px] md:blur-[190px]" />
        <div className="absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-500/10 blur-[130px] md:h-[520px] md:w-[520px] md:blur-[170px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1180px]">
        <header className="flex items-center justify-between gap-4">
          <SidebarLogo />

          <Link
            href="/brain"
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-zinc-300 transition hover:bg-white hover:text-black"
          >
            App
          </Link>
        </header>

        <section className="mt-10 text-center md:mt-16">
          <p className="text-[10px] font-black uppercase tracking-[0.34em] text-cyan-300 md:text-sm">
            iMemory Pricing
          </p>

          <h1 className="mx-auto mt-4 max-w-4xl bg-gradient-to-r from-purple-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-5xl font-black leading-[0.92] tracking-[-0.08em] text-transparent md:text-7xl">
            Sblocca il tuo cervello digitale.
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-zinc-400 md:text-lg md:leading-8">
            Parti gratis. Passa a Pro quando vuoi usare iMemory come sistema completo per memorie, goals, focus e AI.
          </p>
        </section>

        <section className="mt-9 grid gap-5 lg:mt-14 lg:grid-cols-2">
          <PlanCard
            name="Free"
            price="€0"
            suffix="/ sempre"
            description="Per iniziare a salvare memorie e testare il cervello digitale."
            features={freeFeatures}
            cta="Continua gratis"
            href="/register"
          />

          <div className="relative">
            <div className="pointer-events-none absolute inset-[-1px] rounded-[34px] bg-gradient-to-r from-purple-500/40 via-fuchsia-500/20 to-cyan-400/40 blur-xl" />

            <div className="relative overflow-hidden rounded-[34px] border border-cyan-400/30 bg-zinc-950/82 p-5 shadow-[0_0_90px_rgba(34,211,238,0.18)] backdrop-blur-2xl md:p-8">
              <div className="absolute right-5 top-5 rounded-full border border-cyan-400/30 bg-cyan-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">
                Consigliato
              </div>

              <p className="text-2xl font-black">Pro</p>

              <p className="mt-3 max-w-md text-sm leading-6 text-zinc-500">
                Per usare iMemory ogni giorno come AI Brain OS personale.
              </p>

              <div className="mt-6 flex items-end gap-2">
                <span className="text-6xl font-black tracking-[-0.09em] text-white">
                  €9
                </span>
                <span className="pb-3 text-sm font-bold text-zinc-500">
                  / mese
                </span>
              </div>

              <div className="mt-7 grid gap-3">
                {proFeatures.map((feature) => (
                  <Feature key={feature}>{feature}</Feature>
                ))}
              </div>

              <button
                onClick={handleProCheckout}
                disabled={loading}
                className="mt-8 flex h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-500 text-sm font-black uppercase tracking-[0.16em] text-white shadow-[0_0_45px_rgba(34,211,238,0.28)] transition hover:scale-[1.02] disabled:opacity-60 md:h-16"
              >
                {loading ? "Apertura checkout..." : "Attiva Pro"}
              </button>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.035] p-5 backdrop-blur-2xl md:p-7">
          <div className="grid gap-5 md:grid-cols-3">
            <MiniInfo
              title="Nessun blocco"
              text="Puoi partire gratis e passare a Pro solo quando ti serve davvero."
            />
            <MiniInfo
              title="Checkout sicuro"
              text="Il pagamento viene gestito tramite Stripe."
            />
            <MiniInfo
              title="Pensato per crescere"
              text="La versione Pro è fatta per utenti che vogliono usare iMemory ogni giorno."
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function PlanCard({
  name,
  price,
  suffix,
  description,
  features,
  cta,
  href,
}: {
  name: string;
  price: string;
  suffix: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
}) {
  return (
    <div className="rounded-[34px] border border-white/10 bg-zinc-950/72 p-5 shadow-[0_0_70px_rgba(168,85,247,0.10)] backdrop-blur-2xl md:p-8">
      <p className="text-2xl font-black">{name}</p>

      <p className="mt-3 max-w-md text-sm leading-6 text-zinc-500">
        {description}
      </p>

      <div className="mt-6 flex items-end gap-2">
        <span className="text-6xl font-black tracking-[-0.09em] text-white">
          {price}
        </span>
        <span className="pb-3 text-sm font-bold text-zinc-500">{suffix}</span>
      </div>

      <div className="mt-7 grid gap-3">
        {features.map((feature) => (
          <Feature key={feature}>{feature}</Feature>
        ))}
      </div>

      <Link
        href={href}
        className="mt-8 flex h-14 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-black uppercase tracking-[0.16em] text-white transition hover:bg-white hover:text-black md:h-16"
      >
        {cta}
      </Link>
    </div>
  );
}

function Feature({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-300">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-xs text-cyan-300">
        ✓
      </span>
      {children}
    </div>
  );
}

function MiniInfo({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/25 p-4">
      <p className="font-black text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-500">{text}</p>
    </div>
  );
}
