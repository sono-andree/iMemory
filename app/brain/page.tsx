import Link from "next/link";
import AIBrainOrchestratorWidget from "@/components/AIBrainOrchestratorWidget";
import AIAutopilotPlanWidget from "@/components/AIAutopilotPlanWidget";
import AIDayReviewWidget from "@/components/AIDayReviewWidget";
import PredictiveBrainWidget from "@/components/PredictiveBrainWidget";
import AIInterventionWidget from "@/components/AIInterventionWidget";
import AIWeeklyStrategyWidget from "@/components/AIWeeklyStrategyWidget";
import AIPriorityRebalanceWidget from "@/components/AIPriorityRebalanceWidget";
import AIOperatingRulesWidget from "@/components/AIOperatingRulesWidget";

export default function BrainPage() {
  return (
    <main className="safe-mobile-bottom min-h-screen overflow-x-hidden bg-black text-white lg:pb-0">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(168,85,247,0.18),transparent_32%),radial-gradient(circle_at_85%_20%,rgba(34,211,238,0.14),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.10),transparent_34%)]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1800px] flex-col px-4 py-4">
        <header className="mb-5 flex flex-col gap-4 rounded-[34px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_0_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/"
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
              >
                Home
              </Link>

              <Link
                href="/ai-actions"
                className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-300 transition hover:bg-emerald-500/20"
              >
                AI Actions
              </Link>

              <span className="rounded-2xl border border-purple-400/20 bg-purple-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-purple-300">
                Brain Command Center
              </span>
            </div>

            <h1 className="mt-5 text-4xl font-black tracking-[-0.06em] text-white md:text-6xl">
              iMemory Brain
            </h1>

            <p className="mt-4 max-w-4xl text-sm leading-7 text-zinc-400 md:text-base">
              Il centro di comando del tuo sistema AI: coordina Autopilot,
              Review, Predictive Brain, Intervention, Weekly Strategy, Priority
              Rebalance e Operating Rules.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:w-[520px]">
            <BrainStat label="Mode" value="AI OS" />
            <BrainStat label="Status" value="Live" />
            <BrainStat label="Scope" value="Daily + Weekly" />
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[520px_1fr]">
  <div className="h-[560px] overflow-hidden md:h-[620px]">
    <AIBrainOrchestratorWidget />
  </div>

  <div className="flex min-h-[620px] flex-col gap-3">
  <div className="grid gap-3 sm:grid-cols-2">
    <BrainShortcut
      title="Esecuzione"
      description="Apri AI Coach e completa la prossima azione."
      href="/ai-actions?start=next"
      label="AI Coach"
      accent="emerald"
    />

    <BrainShortcut
      title="Mappa"
      description="Visualizza connessioni e nodi del cervello digitale."
      href="/map"
      label="Brain Map"
      accent="cyan"
    />

    <BrainShortcut
      title="Memorie"
      description="Gestisci l’archivio intelligente di iMemory."
      href="/memories"
      label="Archive"
      accent="purple"
    />

    <BrainShortcut
      title="Goals"
      description="Controlla obiettivi, strategie e progresso."
      href="/goals"
      label="Goals"
      accent="amber"
    />
  </div>

  <BrainDailyCommand />
</div>
</section>

        <section className="mt-5 grid gap-5 xl:grid-cols-3">
          <div className="h-[620px] overflow-hidden md:h-[720px]">
            <AIAutopilotPlanWidget />
          </div>

          <div className="h-[620px] overflow-hidden md:h-[720px]">
            <PredictiveBrainWidget />
          </div>

          <div className="h-[620px] overflow-hidden md:h-[720px]">
            <AIInterventionWidget />
          </div>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-3">
          <div className="h-[620px] overflow-hidden md:h-[720px]">
            <AIWeeklyStrategyWidget />
          </div>

          <div className="h-[620px] overflow-hidden md:h-[720px]">
            <AIPriorityRebalanceWidget />
          </div>

          <div className="h-[620px] overflow-hidden md:h-[720px]">
            <AIOperatingRulesWidget />
          </div>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_520px]">
          <div className="rounded-[34px] border border-white/10 bg-[#05050A]/88 p-6 shadow-[0_0_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">
              Brain workflow
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-[-0.05em]">
              Come funziona il ciclo AI
            </h2>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <WorkflowStep
                number="01"
                title="Plan"
                text="Autopilot crea il piano operativo della giornata."
              />

              <WorkflowStep
                number="02"
                title="Execute"
                text="AI Coach ti guida nella missione selezionata."
              />

              <WorkflowStep
                number="03"
                title="Review"
                text="Daily Review analizza cosa ha funzionato e cosa no."
              />

              <WorkflowStep
                number="04"
                title="Predict"
                text="Predictive Brain trova pattern, rischi e opportunità."
              />

              <WorkflowStep
                number="05"
                title="Rebalance"
                text="Priority Engine ricalcola ordine, impatto e priorità."
              />

              <WorkflowStep
                number="06"
                title="Improve"
                text="Operating Rules aggiorna le regole personali del tuo sistema."
              />
            </div>
          </div>

          <div className="h-[620px] overflow-hidden md:h-[720px]">
            <AIDayReviewWidget />
          </div>
        </section>
      </div>
    </main>
  );
}

function BrainStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600">
        {label}
      </p>

      <p className="mt-1 text-xl font-black tracking-[-0.04em] text-white">
        {value}
      </p>
    </div>
  );
}

function BrainShortcut({
  title,
  description,
  href,
  label,
  accent,
}: {
  title: string;
  description: string;
  href: string;
  label: string;
  accent: "emerald" | "cyan" | "purple" | "amber";
}) {
  const accentClass =
    accent === "emerald"
      ? "border-emerald-400/20 bg-emerald-500/[0.07] text-emerald-300"
      : accent === "cyan"
      ? "border-cyan-400/20 bg-cyan-500/[0.07] text-cyan-300"
      : accent === "purple"
      ? "border-purple-400/20 bg-purple-500/[0.07] text-purple-300"
      : "border-amber-400/20 bg-amber-500/[0.07] text-amber-300";

  return (
    <Link
      href={href}
      className={`group relative h-[150px] overflow-hidden rounded-[26px] border p-4 shadow-[0_0_45px_rgba(0,0,0,0.35)] backdrop-blur-2xl transition hover:-translate-y-0.5 ${accentClass}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(255,255,255,0.10),transparent_38%)]" />

      <div className="relative z-10 flex h-full flex-col justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.22em] opacity-80">
            {label}
          </p>

          <h3 className="mt-3 text-xl font-black tracking-[-0.04em] text-white">
            {title}
          </h3>

          <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-400">
            {description}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] opacity-70">
            Apri
          </span>

          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-sm font-black text-black transition group-hover:rotate-[-8deg]">
            →
          </div>
        </div>
      </div>
    </Link>
  );
}

function BrainDailyCommand() {
  return (
    <div className="relative flex flex-1 overflow-hidden rounded-[34px] border border-white/10 bg-[#05050A]/88 p-5 shadow-[0_0_70px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(168,85,247,0.14),transparent_34%),radial-gradient(circle_at_100%_100%,rgba(34,211,238,0.10),transparent_36%)]" />

      <div className="relative z-10 grid w-full gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-purple-300">
              Daily Command
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-[-0.06em] text-white">
              Sistema operativo attivo
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
              Usa questa sequenza per far lavorare iMemory nel modo corretto:
              prima decide, poi esegue, poi impara dai risultati.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <MiniCommandStep
              number="01"
              title="Decide"
              text="Brain Orchestrator sceglie la prossima mossa."
            />

            <MiniCommandStep
              number="02"
              title="Execute"
              text="AI Coach ti guida sulla missione attiva."
            />

            <MiniCommandStep
              number="03"
              title="Learn"
              text="Daily Review aggiorna pattern e regole."
            />
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-[28px] border border-cyan-400/15 bg-cyan-500/[0.06] p-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
              Recommended flow
            </p>

            <div className="mt-4 space-y-3">
              <BrainFlowItem text="Apri la prossima azione consigliata." />
              <BrainFlowItem text="Completa una sessione breve con AI Coach." />
              <BrainFlowItem text="Chiudi la giornata con Daily Review." />
            </div>
          </div>

          <Link
            href="/ai-actions?start=next"
            className="mt-6 flex h-12 items-center justify-center rounded-2xl bg-white text-xs font-black uppercase tracking-[0.16em] text-black transition hover:scale-[1.01]"
          >
            Start execution
          </Link>
        </div>
      </div>
    </div>
  );
}

function MiniCommandStep({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600">
        {number}
      </p>

      <h3 className="mt-2 text-base font-black text-white">{title}</h3>

      <p className="mt-2 text-xs leading-5 text-zinc-500">{text}</p>
    </div>
  );
}

function BrainFlowItem({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-white/10 bg-black/25 p-3">
      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.75)]" />

      <p className="text-xs leading-5 text-zinc-400">{text}</p>
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
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">
        {number}
      </p>

      <h3 className="mt-2 text-lg font-black text-white">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-zinc-500">{text}</p>
    </div>
  );
}