import ProCheckoutButton from "@/components/ProCheckoutButton";
import Link from "next/link";

const memoryNodes = [
  {
    title: "PDF",
    value: "234 file",
    icon: "▤",
    position: "left-[6%] top-[14%]",
    line: "from-pink-400",
    color: "border-pink-400/30 bg-pink-500/10 text-pink-200",
  },
  {
    title: "Documenti",
    value: "421 file",
    icon: "▧",
    position: "left-[0%] top-[36%]",
    line: "from-blue-400",
    color: "border-blue-400/30 bg-blue-500/10 text-blue-200",
  },
  {
    title: "Note",
    value: "1.248 note",
    icon: "≡",
    position: "left-[5%] top-[58%]",
    line: "from-amber-300",
    color: "border-amber-400/30 bg-amber-500/10 text-amber-200",
  },
  {
    title: "Ricordi",
    value: "2.431 ricordi",
    icon: "✦",
    position: "left-[11%] bottom-[8%]",
    line: "from-purple-400",
    color: "border-purple-400/30 bg-purple-500/10 text-purple-200",
  },
  {
    title: "Foto",
    value: "1.305 foto",
    icon: "▣",
    position: "right-[8%] top-[13%]",
    line: "from-emerald-300",
    color: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  },
  {
    title: "Audio",
    value: "156 audio",
    icon: "≋",
    position: "right-[0%] top-[32%]",
    line: "from-violet-400",
    color: "border-violet-400/30 bg-violet-500/10 text-violet-200",
  },
  {
    title: "Video",
    value: "98 video",
    icon: "▷",
    position: "right-[4%] top-[53%]",
    line: "from-sky-400",
    color: "border-sky-400/30 bg-sky-500/10 text-sky-200",
  },
  {
    title: "Link",
    value: "2.312 link",
    icon: "∞",
    position: "right-[12%] bottom-[10%]",
    line: "from-cyan-300",
    color: "border-cyan-400/30 bg-cyan-500/10 text-cyan-200",
  },
];

const featureCards = [
  {
    title: "Memory Engine",
    text: "Indicizza tutto, comprende il contesto e rende ogni informazione trovabile.",
    icon: "▦",
  },
  {
    title: "Neural Connections",
    text: "Collega idee e concetti automaticamente per scoprire nuove prospettive.",
    icon: "✣",
  },
  {
    title: "Daily Autopilot",
    text: "Riassunti intelligenti, promemoria e azioni suggerite ogni giorno.",
    icon: "◎",
  },
];

const logos = ["startupItalia", "millionaire", "Il Sole 24 Ore", "WIRED", "techprincess", "DDAY.it"];

const navLinks = [
  { label: "Funzionalità", href: "#features" },
  { label: "Workflow", href: "#workflow" },
  { label: "Prezzi", href: "#pricing" },
  { label: "Sicurezza", href: "#security" },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#03040A] text-white">
      <style>{`
        @keyframes floatBrain {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-14px) scale(1.015); }
        }

        @keyframes orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes reverseOrbit {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        @keyframes pulseCore {
          0%, 100% { opacity: .55; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }

        @keyframes scanLine {
          0% { transform: translateY(-120%); opacity: 0; }
          15% { opacity: .5; }
          100% { transform: translateY(140%); opacity: 0; }
        }

        @keyframes moveGrid {
          from { background-position: 0 0; }
          to { background-position: 90px 90px; }
        }

        @keyframes glowText {
          0%, 100% { filter: drop-shadow(0 0 12px rgba(34,211,238,.25)); }
          50% { filter: drop-shadow(0 0 28px rgba(168,85,247,.55)); }
        }

        @keyframes nodeFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        .im-grid {
          background-image:
            linear-gradient(rgba(168,85,247,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,211,238,0.07) 1px, transparent 1px);
          background-size: 90px 90px;
          animation: moveGrid 18s linear infinite;
          mask-image: radial-gradient(circle at center, black 0%, transparent 76%);
        }

        .brain-float {
          animation: floatBrain 6s ease-in-out infinite;
        }

        .orbit-slow {
          animation: orbit 18s linear infinite;
        }

        .orbit-fast {
          animation: reverseOrbit 13s linear infinite;
        }

        .pulse-core {
          animation: pulseCore 3.2s ease-in-out infinite;
        }

        .node-float {
          animation: nodeFloat 4.5s ease-in-out infinite;
        }

        .scan-panel::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, transparent, rgba(34,211,238,.13), transparent);
          animation: scanLine 5.5s ease-in-out infinite;
          pointer-events: none;
        }

        .gradient-text {
          background: linear-gradient(90deg, #a855f7, #60a5fa, #22d3ee, #a855f7);
          background-size: 220% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: shimmer 5s linear infinite;
        }

        .logo-glow {
          animation: glowText 4s ease-in-out infinite;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(168,85,247,.22),transparent_30%),radial-gradient(circle_at_85%_15%,rgba(34,211,238,.18),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(14,165,233,.12),transparent_32%)]" />
      <div className="im-grid pointer-events-none fixed inset-0 opacity-70" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_bottom,rgba(3,4,10,.25),rgba(3,4,10,.92))]" />

      <div className="relative z-10 mx-auto w-full max-w-[1720px] px-5 py-5">
        <nav className="sticky top-5 z-50 mx-auto flex max-w-[1580px] items-center justify-between rounded-[30px] border border-white/10 bg-[#050612]/75 px-5 py-4 shadow-[0_0_70px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
  <Link href="/landing" className="group flex items-center gap-3">

    <span className="text-3xl font-black tracking-[-0.06em]">
      <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
        iMemory
      </span>
    </span>
  </Link>

  <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-black/25 p-1 lg:flex">
    {navLinks.map((link) => (
      <a
        key={link.href}
        href={link.href}
        className="rounded-full px-5 py-2.5 text-sm font-bold text-zinc-400 transition hover:bg-white/10 hover:text-white"
      >
        {link.label}
      </a>
    ))}
  </div>

  <div className="flex items-center gap-3">
    <Link
      href="/login"
      className="hidden rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-zinc-300 transition hover:bg-white hover:text-black sm:block"
    >
      Accedi
    </Link>

    <Link
      href="/register"
      className="rounded-[22px] bg-gradient-to-r from-purple-500 to-cyan-400 px-7 py-3 text-sm font-black text-white shadow-[0_0_35px_rgba(34,211,238,.25)] transition hover:scale-[1.03]"
    >
      Inizia gratis
    </Link>
  </div>
</nav>

        <section className="relative grid min-h-[820px] items-center gap-8 py-12 lg:grid-cols-[0.72fr_1.28fr]">
          <div className="relative z-20">
            <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-purple-400/40 bg-purple-500/10 px-5 py-3 text-sm font-black text-purple-200 shadow-[0_0_35px_rgba(168,85,247,.18)]">
              <span className="text-lg">✦</span>
              AI Brain OS
            </div>

            <h1 className="max-w-[690px] text-6xl font-black leading-[0.92] tracking-[-0.08em] text-white md:text-7xl xl:text-[92px]">
              Il tuo secondo cervello,{" "}
              <span className="gradient-text">guidato dall’AI.</span>
            </h1>

            <p className="mt-7 max-w-xl text-xl leading-8 text-zinc-300">
              Salva memorie, collega idee, ritrova informazioni e ricevi azioni
              intelligenti ogni giorno.
            </p>

            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/register"
                className="group flex h-16 items-center justify-center rounded-[22px] bg-gradient-to-r from-purple-500 to-cyan-400 px-9 text-lg font-black text-white shadow-[0_0_40px_rgba(34,211,238,.25)] transition hover:scale-[1.03]"
              >
                Inizia gratis
                <span className="lg:ml-4 transition group-hover:translate-x-1">›</span>
              </Link>

              <a
                href="#features"
                className="flex h-16 items-center justify-center gap-3 rounded-[22px] border border-white/15 bg-white/[0.035] px-9 text-lg font-bold text-white backdrop-blur-xl transition hover:bg-white hover:text-black"
              >
                <span className="text-cyan-300">▶</span>
                Guarda demo
              </a>
            </div>

            <div className="mt-7 flex flex-wrap gap-5 text-sm text-zinc-400">
              <TrustItem text="Sicuro e privato" />
              <TrustItem text="No carta di credito" />
              <TrustItem text="10.000+ utenti" />
            </div>
          </div>

          <div className="relative min-h-[690px]">
            <HeroBrain />

            {memoryNodes.map((node, index) => (
              <MemoryNode key={node.title} node={node} delay={index * 0.2} />
            ))}
          </div>
        </section>

        <section id="features" className="relative -mt-8 grid gap-5 px-0 pb-8 lg:grid-cols-3 lg:px-32">
          {featureCards.map((feature) => (
            <div
              key={feature.title}
              className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_0_60px_rgba(0,0,0,.35)] backdrop-blur-2xl transition hover:-translate-y-1 hover:border-cyan-400/30"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(34,211,238,.14),transparent_35%)] opacity-0 transition group-hover:opacity-100" />

              <div className="relative z-10 flex items-center gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-blue-400/30 bg-blue-500/10 text-2xl text-blue-200 shadow-[0_0_28px_rgba(59,130,246,.18)]">
                  {feature.icon}
                </div>

                <div>
                  <h3 className="text-xl font-black tracking-[-0.04em]">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    {feature.text}
                  </p>
                </div>

                <div className="lg:ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-lg text-white transition group-hover:bg-white group-hover:text-black">
                  →
                </div>
              </div>
            </div>
          ))}
        </section>

        <section
  id="pricing"
  className="relative mt-10 overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_0_90px_rgba(0,0,0,.45)] backdrop-blur-2xl md:p-8"
>
  <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_10%,rgba(168,85,247,.16),transparent_34%),radial-gradient(circle_at_85%_80%,rgba(34,211,238,.12),transparent_30%)]" />

  <div className="relative z-10 grid gap-5 lg:grid-cols-[0.75fr_1fr_1.2fr]">
    <div className="flex flex-col justify-center p-3 md:p-6">
      <h2 className="text-3xl font-black leading-tight tracking-[-0.06em] md:text-4xl">
        Scegli il piano perfetto per te
      </h2>

      <p className="mt-5 text-base leading-7 text-zinc-400">
        Inizia gratis. Passa a Pro quando vuoi, senza pensieri.
      </p>
    </div>

    <PlanCard
      name="Free"
      price="0"
      suffix="€/mese"
      items={[
        "Fino a 1.000 memorie",
        "Ricerca intelligente",
        "Chat AI base",
      ]}
      cta="Inizia gratis"
      href="/register"
    />

    <PlanCard
      name="Pro"
      price="9,99"
      suffix="€/mese"
      items={[
        "Memorie illimitate",
        "AI avanzata e suggerimenti",
        "Accesso prioritario alle novità",
      ]}
      cta="Attiva Pro"
      href="/register"
      featured
    />
  </div>

  <div className="relative z-10 mx-auto mt-5 flex max-w-[1100px] flex-wrap items-center justify-center gap-10 rounded-2xl border border-white/10 bg-black/30 px-6 py-4 text-sm font-bold text-zinc-500">
    <span>Si fidano di noi</span>

    {logos.map((logo) => (
      <span key={logo} className="text-zinc-400/80">
        {logo}
      </span>
    ))}
  </div>
</section>

        <section id="workflow" className="grid gap-5 py-20 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-[34px] border border-white/10 bg-white/[0.035] p-8 backdrop-blur-2xl">
            <p className="text-sm font-black uppercase tracking-[0.26em] text-cyan-300">
              Come funziona
            </p>
            <h2 className="mt-4 text-5xl font-black tracking-[-0.07em]">
              Da caos mentale a sistema operativo.
            </h2>
            <p className="mt-5 text-lg leading-8 text-zinc-400">
              iMemory non è solo un archivio. È un cervello AI che organizza,
              collega, prevede e ti guida nella prossima azione.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <WorkflowStep number="01" title="Salva" text="Aggiungi note, idee, file e informazioni importanti." />
            <WorkflowStep number="02" title="Collega" text="L’AI trova connessioni tra memorie, goals e azioni." />
            <WorkflowStep number="03" title="Predice" text="Il sistema rileva rischi, blocchi e opportunità." />
            <WorkflowStep number="04" title="Esegui" text="Ricevi una prossima mossa chiara e azionabile." />
          </div>
        </section>

        <section id="security" className="pb-20">
          <div className="relative overflow-hidden rounded-[42px] border border-purple-400/20 bg-purple-500/[0.08] p-10 text-center shadow-[0_0_120px_rgba(168,85,247,.16)] backdrop-blur-2xl md:p-16">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,.14),transparent_36%)]" />

            <div className="relative z-10">
              <div className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-[28px] border border-cyan-400/30 bg-cyan-500/10 shadow-[0_0_45px_rgba(34,211,238,.22)]">
  <img
    src="/new-icon-main.png"
    alt="iMemory logo"
    className="h-14 w-14 object-contain drop-shadow-[0_0_24px_rgba(34,211,238,0.45)]"
  />
</div>

              <h2 className="mx-auto max-w-4xl text-5xl font-black tracking-[-0.07em] md:text-7xl">
                Costruisci il tuo cervello digitale intelligente.
              </h2>

              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
                Smetti di accumulare informazioni sparse. Lascia che iMemory
                trasformi le tue memorie in chiarezza, priorità e azioni.
              </p>

              <Link
                href="/register"
                className="mt-9 inline-flex h-16 items-center justify-center rounded-[22px] bg-white px-10 text-lg font-black text-black shadow-[0_0_35px_rgba(255,255,255,.18)] transition hover:scale-[1.03]"
              >
                Inizia gratis
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function HeroBrain() {
  return (
    <div className="brain-float absolute inset-0 flex items-center justify-center">
      <div className="absolute h-[650px] w-[650px] rounded-full bg-purple-500/10 blur-3xl pulse-core" />

      <div className="absolute h-[660px] w-[660px] rounded-full border border-cyan-400/10 orbit-slow" />
      <div className="absolute h-[520px] w-[860px] rounded-[100%] border border-purple-400/10 orbit-fast" />
      <div className="absolute h-[390px] w-[930px] rounded-[100%] border border-blue-400/10 orbit-slow" />

      <div className="absolute bottom-[8%] h-[90px] w-[520px] rounded-full border border-cyan-400/25 bg-cyan-500/5 blur-[1px]" />
      <div className="absolute bottom-[13%] h-6 w-6 rounded-full bg-cyan-300 shadow-[0_0_80px_rgba(34,211,238,.95)] pulse-core" />

      <div className="relative z-10 flex items-center justify-center">
        <div className="absolute h-[520px] w-[620px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute h-[460px] w-[560px] rounded-full bg-purple-500/10 blur-3xl" />

        <img
          src="/newnewnew.png"
          alt="iMemory brain"
          className="relative z-10 h-[430px] w-auto object-contain drop-shadow-[0_0_80px_rgba(34,211,238,0.42)] md:h-[520px] xl:h-[570px]"
        />

        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.10),transparent_45%)]" />
      </div>
    </div>
  );
}

function MemoryNode({
  node,
  delay,
}: {
  node: {
    title: string;
    value: string;
    icon: string;
    position: string;
    color: string;
  };
  delay: number;
}) {
  return (
    <div
      className={`node-float absolute z-30 hidden w-[165px] rounded-[18px] border p-4 shadow-[0_0_35px_rgba(0,0,0,.35)] backdrop-blur-xl md:block ${node.position} ${node.color}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/25 text-xl">
          {node.icon}
        </div>
        <div>
          <p className="font-black text-white">{node.title}</p>
          <p className="mt-0.5 text-xs text-zinc-400">{node.value}</p>
        </div>
      </div>
    </div>
  );
}

function TrustItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-zinc-500">●</span>
      <span>{text}</span>
    </div>
  );
}

function PlanCard({
  name,
  price,
  suffix,
  items,
  cta,
  href,
  featured = false,
}: {
  name: string;
  price: string;
  suffix: string;
  items: string[];
  cta: string;
  href: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[24px] border p-6 ${
        featured
          ? "border-purple-400/50 bg-purple-500/[0.08] shadow-[0_0_60px_rgba(168,85,247,.22)]"
          : "border-white/10 bg-black/30"
      }`}
    >
      {featured && (
        <div className="absolute right-5 top-5 rounded-full border border-purple-400/30 bg-purple-500/20 px-3 py-1 text-[10px] font-black text-purple-200">
          Più popolare
        </div>
      )}

      <p className="text-xl font-black">{name}</p>

      <div className="mt-3 flex items-end gap-2">
        <span className="text-5xl font-black tracking-[-0.08em]">
          {price}
        </span>

        <span className="pb-2 text-sm text-zinc-400">{suffix}</span>
      </div>

      <div className="mt-5 space-y-2">
        {items.map((item) => (
          <p key={item} className="flex gap-2 text-sm text-zinc-300">
            <span className="text-white">●</span>
            {item}
          </p>
        ))}
      </div>

      {featured ? (
        <ProCheckoutButton className="mt-6 flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-purple-500 to-cyan-400 text-sm font-black text-white transition hover:scale-[1.02]">
          {cta}
        </ProCheckoutButton>
      ) : (
        <Link
          href={href}
          className="mt-6 flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-black text-white transition hover:scale-[1.02] hover:bg-white hover:text-black"
        >
          {cta}
        </Link>
      )}
    </div>
  );
}

function WorkflowStep({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-6 backdrop-blur-2xl">
      <p className="text-sm font-black uppercase tracking-[0.2em] text-purple-300">
        {number}
      </p>
      <h3 className="mt-4 text-2xl font-black tracking-[-0.04em]">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-zinc-400">{text}</p>
    </div>
  );
}