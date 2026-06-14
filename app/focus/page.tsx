"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SidebarLogo from "@/components/SidebarLogo";
import UserBox from "@/components/UserBox";
import UpgradeModal from "@/components/UpgradeModal";
import { awardXP } from "@/lib/awardXP";

type Goal = {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  status: string | null;
  priority: string | null;
  deadline: string | null;
  ai_strategy: string | null;
  ai_risk: string | null;
  ai_next_action: string | null;
};

type GoalStep = {
  id: number;
  goal_id: number;
  user_id: string;
  text: string;
  completed: boolean;
  position: number;
};

type Memory = {
  id: number;
  title: string | null;
  content: string | null;
  category: string | null;
  summary: string | null;
  keywords: string[] | null;
};

type FocusDay = {
  id: number;
  user_id: string;
  focus_date: string;
  mission: string | null;
  reason: string | null;
  risk: string | null;
  energy_tip: string | null;
};

type FocusAction = {
  id: number;
  focus_id: number;
  user_id: string;
  goal_id: number | null;
  goal_step_id: number | null;
  text: string;
  priority: string | null;
  completed: boolean;
  position: number;
};

type UpgradeModalState = {
  open: boolean;
  title: string;
  message: string;
  feature: string;
  used: number | null;
  limit: number | null;
};

export default function FocusPage() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [today] = useState(() => new Date().toISOString().slice(0, 10));

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [steps, setSteps] = useState<GoalStep[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);

  const [focusDay, setFocusDay] = useState<FocusDay | null>(null);
  const [actions, setActions] = useState<FocusAction[]>([]);

  const [upgradeModal, setUpgradeModal] = useState<UpgradeModalState>({
    open: false,
    title: "",
    message: "",
    feature: "",
    used: null,
    limit: null,
  });

  useEffect(() => {
    loadFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function closeUpgradeModal() {
    setUpgradeModal({
      open: false,
      title: "",
      message: "",
      feature: "",
      used: null,
      limit: null,
    });
  }

  async function loadFocus() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    setUserId(user.id);

    const { data: goalData } = await supabase
      .from("goals")
      .select(
        "id, title, description, category, status, priority, deadline, ai_strategy, ai_risk, ai_next_action"
      )
      .eq("user_id", user.id)
      .order("id", { ascending: false });

    const { data: stepData } = await supabase
      .from("goal_steps")
      .select("id, goal_id, user_id, text, completed, position")
      .eq("user_id", user.id)
      .order("position", { ascending: true });

    const { data: memoryData } = await supabase
      .from("memories")
      .select("id, title, content, category, summary, keywords")
      .eq("user_id", user.id)
      .order("id", { ascending: false })
      .limit(40);

    setGoals((goalData || []) as Goal[]);
    setSteps((stepData || []) as GoalStep[]);
    setMemories((memoryData || []) as Memory[]);

    const { data: focus } = await supabase
      .from("focus_days")
      .select("*")
      .eq("user_id", user.id)
      .eq("focus_date", today)
      .maybeSingle();

    if (focus) {
      const typedFocus = focus as FocusDay;
      setFocusDay(typedFocus);

      const { data: focusActions } = await supabase
        .from("focus_actions")
        .select("*")
        .eq("user_id", user.id)
        .eq("focus_id", typedFocus.id)
        .order("position", { ascending: true });

      setActions((focusActions || []) as FocusAction[]);
    } else {
      setFocusDay(null);
      setActions([]);
    }

    setLoading(false);
  }

  async function generateFocus() {
    if (!userId) return;

    setGenerating(true);

    try {
      const res = await fetch("/api/focus-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          today,
          goals,
          steps,
          memories,
        }),
      });

      const data = await res.json();

      if (res.status === 402) {
        setUpgradeModal({
          open: true,
          title: "Focus AI Free terminato",
          message:
            data.error ||
            "Hai raggiunto il limite Free di Focus AI. Passa a Pro per continuare senza limiti.",
          feature: "Focus AI",
          used: data.used ?? null,
          limit: data.limit ?? null,
        });

        setGenerating(false);
        return;
      }

      if (!res.ok) {
        alert(data.error || "Errore generazione focus");
        setGenerating(false);
        return;
      }

      const { data: focus, error: focusError } = await supabase
        .from("focus_days")
        .upsert(
          {
            user_id: userId,
            focus_date: today,
            mission: data.mission || "",
            reason: data.reason || "",
            risk: data.risk || "",
            energy_tip: data.energy_tip || "",
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,focus_date",
          }
        )
        .select()
        .single();

      if (focusError) {
        alert(focusError.message);
        setGenerating(false);
        return;
      }

      await supabase
        .from("focus_actions")
        .delete()
        .eq("focus_id", focus.id)
        .eq("user_id", userId);

      const aiActions = Array.isArray(data.actions) ? data.actions : [];

      if (aiActions.length > 0) {
        await supabase.from("focus_actions").insert(
          aiActions.slice(0, 3).map((action: any, index: number) => ({
            focus_id: focus.id,
            user_id: userId,
            goal_id: action.goal_id || null,
            goal_step_id: action.goal_step_id || null,
            text: action.text || "Azione focus",
            priority: action.priority || "Alta",
            completed: false,
            position: index,
          }))
        );
      }

      await loadFocus();
    } catch (error) {
      console.log(error);
      alert("Errore Focus AI");
    }

    setGenerating(false);
  }

  async function toggleAction(action: FocusAction) {
    const newValue = !action.completed;

    const { error } = await supabase
      .from("focus_actions")
      .update({ completed: newValue })
      .eq("id", action.id)
      .eq("user_id", userId);

    if (error) {
      alert(error.message);
      return;
    }

    if (action.goal_step_id) {
      await supabase
        .from("goal_steps")
        .update({ completed: newValue })
        .eq("id", action.goal_step_id)
        .eq("user_id", userId);
    }

    if (newValue) {
      await awardXP({
        type: "focus_action",
        title: "Focus action completata",
        xp: 15,
        dedupeKey: `focus_action_${action.id}`,
        metadata: {
          focus_action_id: action.id,
          goal_id: action.goal_id,
          goal_step_id: action.goal_step_id,
        },
      });
    }

    await loadFocus();
  }

  const progress = useMemo(() => {
    if (actions.length === 0) return 0;

    const completed = actions.filter((action) => action.completed).length;

    return Math.round((completed / actions.length) * 100);
  }, [actions]);

  const nextAction = actions.find((action) => !action.completed);

  const activeGoals = goals.filter(
    (goal) => goal.status !== "Completato"
  ).length;

  const blockedGoals = goals.filter(
    (goal) => goal.status === "Bloccato"
  ).length;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="rounded-[30px] border border-white/10 bg-white/[0.04] px-8 py-6 text-center backdrop-blur-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">
            Daily AI Mission
          </p>
          <h1 className="mt-3 bg-gradient-to-r from-purple-400 to-cyan-300 bg-clip-text text-4xl font-black text-transparent">
            Caricamento...
          </h1>
        </div>
      </main>
    );
  }

  return (
    <main className="safe-mobile-bottom min-h-screen overflow-x-hidden bg-black pb-24 text-white lg:h-screen lg:overflow-hidden lg:pb-0">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-0 top-0 h-[520px] w-[520px] bg-purple-600/20 blur-[180px] md:h-[700px] md:w-[700px]" />
        <div className="absolute bottom-0 right-0 h-[520px] w-[520px] bg-cyan-500/20 blur-[180px] md:h-[700px] md:w-[700px]" />
        <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 bg-fuchsia-500/10 blur-[170px]" />
      </div>

      <DesktopSidebar routerPush={(href) => router.push(href)} />

      <section className="relative z-10 w-full max-w-none overflow-x-hidden px-4 py-5 md:px-6 lg:h-screen lg:overflow-y-auto lg:pl-[348px] lg:pr-6 lg:py-8 xl:pl-[363px] 2xl:pl-[388px]">
        <div className="mx-auto w-full max-w-[1500px]">
          <header className="mb-5 rounded-[32px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_0_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl md:p-7">
            <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.34em] text-cyan-300 md:text-sm">
                  Daily AI Mission
                </p>

                <h1 className="mt-3 bg-gradient-to-r from-purple-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-5xl font-black tracking-[-0.08em] text-transparent md:text-7xl">
                  Focus
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400 md:text-lg md:leading-relaxed">
                  iMemory legge goals, checklist e memorie, poi decide le 3 azioni più importanti da fare oggi.
                </p>
              </div>

              <button
                onClick={generateFocus}
                disabled={generating}
                className="h-14 rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-500 px-5 text-sm font-black uppercase tracking-[0.12em] shadow-[0_0_50px_rgba(34,211,238,0.3)] transition hover:scale-[1.03] disabled:opacity-60 md:h-16 md:px-8 md:text-base xl:min-w-[250px]"
              >
                {generating
                  ? "Generazione..."
                  : focusDay
                  ? "Rigenera Focus"
                  : "Genera Focus"}
              </button>
            </div>
          </header>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
            <Stat title="Progress oggi" value={`${progress}%`} />
            <Stat title="Azioni" value={actions.length} />
            <Stat title="Goals attivi" value={activeGoals} />
            <Stat title="Bloccati" value={blockedGoals} />
          </div>

          {!focusDay ? (
            <EmptyFocusState
              generating={generating}
              generateFocus={generateFocus}
            />
          ) : (
            <FocusMission
              focusDay={focusDay}
              actions={actions}
              progress={progress}
              nextAction={nextAction}
              toggleAction={toggleAction}
            />
          )}
        </div>
      </section>

      <UpgradeModal
        open={upgradeModal.open}
        title={upgradeModal.title}
        message={upgradeModal.message}
        feature={upgradeModal.feature}
        used={upgradeModal.used}
        limit={upgradeModal.limit}
        onClose={closeUpgradeModal}
      />
    </main>
  );
}

function DesktopSidebar({ routerPush }: { routerPush: (href: string) => void }) {
  return (
    <aside className="fixed left-6 top-6 z-50 hidden h-[calc(100vh-48px)] w-[300px] flex-col overflow-hidden rounded-[38px] border border-purple-500/30 bg-zinc-950/80 p-5 text-white shadow-[0_0_70px_rgba(168,85,247,0.35)] backdrop-blur-2xl lg:flex xl:w-[315px] 2xl:w-[340px]">
      <div className="flex h-full min-h-0 flex-col">
        <SidebarLogo />

        <nav className="mt-8 min-h-0 flex-1 overflow-y-auto pr-1 text-base">
          <div className="flex flex-col gap-3">
            <NavButton label="Home" onClick={() => routerPush("/")} />
            <NavButton label="Nuova Memoria" onClick={() => routerPush("/memory")} />
            <NavButton label="Brain" onClick={() => routerPush("/brain")} />
            <NavButton label="Memorie" onClick={() => routerPush("/memories")} />
            <NavButton label="Chat AI" onClick={() => routerPush("/chat")} />
            <NavButton label="Mappa Mentale" onClick={() => routerPush("/map")} />
            <NavButton label="Insights" onClick={() => routerPush("/insights")} />
            <NavButton label="Goals" onClick={() => routerPush("/goals")} />

            <button className="rounded-2xl border border-cyan-500/30 bg-cyan-500/15 px-5 py-4 text-left font-bold text-cyan-200 shadow-[0_0_25px_rgba(34,211,238,0.15)]">
              Focus
            </button>

            <NavButton label="Profilo" onClick={() => routerPush("/profile")} />
          </div>
        </nav>

        <div className="mt-4 shrink-0">
          <UserBox />
        </div>
      </div>
    </aside>
  );
}

function EmptyFocusState({
  generating,
  generateFocus,
}: {
  generating: boolean;
  generateFocus: () => void;
}) {
  return (
    <div className="mt-5 flex min-h-[420px] flex-col items-center justify-center rounded-[34px] border border-purple-500/20 bg-zinc-950/70 p-6 text-center backdrop-blur-2xl md:mt-8 md:min-h-[620px] md:rounded-[44px] md:p-12">
      <h2 className="bg-gradient-to-r from-purple-300 to-cyan-300 bg-clip-text text-3xl font-black tracking-[-0.05em] text-transparent md:text-5xl">
        Nessun focus generato per oggi
      </h2>

      <p className="mt-5 max-w-2xl text-sm leading-6 text-zinc-400 md:text-lg md:leading-8">
        Clicca il pulsante per far analizzare a iMemory i tuoi goals, gli step non completati e le tue memorie.
      </p>

      <button
        onClick={generateFocus}
        disabled={generating}
        className="mt-8 h-14 rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-500 px-7 text-sm font-black uppercase tracking-[0.14em] shadow-[0_0_50px_rgba(34,211,238,0.3)] transition hover:scale-[1.03] disabled:opacity-60 md:mt-10 md:h-16 md:px-10 md:text-base"
      >
        {generating ? "Analisi in corso..." : "Crea missione di oggi"}
      </button>
    </div>
  );
}

function FocusMission({
  focusDay,
  actions,
  progress,
  nextAction,
  toggleAction,
}: {
  focusDay: FocusDay;
  actions: FocusAction[];
  progress: number;
  nextAction: FocusAction | undefined;
  toggleAction: (action: FocusAction) => void;
}) {
  return (
    <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,410px)] md:mt-8 md:gap-8">
      <div className="min-w-0 space-y-5 md:space-y-8">
        <div className="rounded-[34px] border border-cyan-500/20 bg-zinc-950/70 p-5 shadow-[0_0_80px_rgba(34,211,238,0.12)] backdrop-blur-2xl md:rounded-[44px] md:p-9">
          <p className="text-[10px] font-black uppercase tracking-[0.34em] text-cyan-300 md:text-sm">
            Missione principale
          </p>

          <h2 className="mt-4 break-words text-3xl font-black leading-tight text-white md:mt-5 md:text-5xl">
            {focusDay.mission}
          </h2>

          <p className="mt-5 max-w-4xl break-words text-base leading-7 text-zinc-400 md:mt-6 md:text-xl md:leading-relaxed">
            {focusDay.reason}
          </p>

          <div className="mt-6 h-4 overflow-hidden rounded-full bg-zinc-900 md:mt-8">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-cyan-400 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="rounded-[34px] border border-purple-500/20 bg-zinc-950/70 p-5 backdrop-blur-2xl md:rounded-[44px] md:p-9">
          <div className="mb-5 flex items-end justify-between gap-4 md:mb-7">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-300 md:text-sm">
                Azioni di oggi
              </p>

              <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] md:text-4xl">
                Checklist Focus
              </h3>
            </div>

            <span className="text-3xl font-black text-cyan-300 md:text-5xl">
              {progress}%
            </span>
          </div>

          <div className="space-y-3 md:space-y-5">
            {actions.map((action, index) => (
              <button
                key={action.id}
                onClick={() => toggleAction(action)}
                className={`flex w-full min-w-0 items-start gap-3 rounded-[24px] border p-4 text-left transition md:items-center md:gap-5 md:rounded-[30px] md:p-6 ${
                  action.completed
                    ? "border-green-500/30 bg-green-500/10"
                    : "border-zinc-800 bg-black/45 hover:border-purple-500/40"
                }`}
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-base font-black md:h-14 md:w-14 md:text-xl ${
                    action.completed
                      ? "border-green-400 bg-green-500/20 text-green-300"
                      : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                  }`}
                >
                  {action.completed ? "✓" : index + 1}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2 md:gap-3">
                    <PriorityBadge priority={action.priority || "Alta"} />

                    {action.goal_id && (
                      <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs text-purple-200">
                        Goal #{action.goal_id}
                      </span>
                    )}
                  </div>

                  <p
                    className={`break-words text-sm leading-relaxed md:text-lg ${
                      action.completed
                        ? "text-green-200 line-through decoration-green-400/60"
                        : "text-zinc-200"
                    }`}
                  >
                    {action.text}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="min-w-0 space-y-5 md:space-y-6">
        <InfoPanel title="Next action" tone="cyan">
          {nextAction ? nextAction.text : "Hai completato tutto il focus di oggi."}
        </InfoPanel>

        <InfoPanel title="Risk detector" tone="red">
          {focusDay.risk}
        </InfoPanel>

        <InfoPanel title="Energy tip" tone="purple">
          {focusDay.energy_tip}
        </InfoPanel>

        <div className="rounded-[30px] border border-zinc-800 bg-black/45 p-5 md:rounded-[38px] md:p-7">
          <h3 className="text-xl font-black md:text-2xl">Come funziona</h3>

          <p className="mt-4 text-sm leading-7 text-zinc-500 md:text-base">
            Quando completi una focus action collegata a uno step, iMemory completa anche quello step dentro Goals.
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoPanel({
  title,
  children,
  tone,
}: {
  title: string;
  children: ReactNode;
  tone: "cyan" | "red" | "purple";
}) {
  const styles =
    tone === "cyan"
      ? "border-cyan-500/20 bg-cyan-500/10 text-white"
      : tone === "red"
      ? "border-red-500/20 bg-red-500/10 text-red-100/80"
      : "border-purple-500/20 bg-zinc-950/70 text-zinc-300";

  const titleClass =
    tone === "cyan"
      ? "text-cyan-300"
      : tone === "red"
      ? "text-red-300"
      : "text-purple-300";

  return (
    <div className={`rounded-[30px] border p-5 md:rounded-[38px] md:p-7 ${styles}`}>
      <p className={`text-[10px] font-black uppercase tracking-[0.3em] md:text-sm ${titleClass}`}>
        {title}
      </p>

      <p className="mt-4 break-words text-base font-semibold leading-7 md:mt-5 md:text-lg md:leading-relaxed">
        {children}
      </p>
    </div>
  );
}

function NavButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl px-5 py-4 text-left text-zinc-400 transition hover:bg-purple-500/10 hover:text-white"
    >
      {label}
    </button>
  );
}

function Stat({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[24px] border border-purple-500/20 bg-zinc-950/70 p-4 backdrop-blur-2xl md:rounded-[30px] md:p-6">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 md:text-xs md:tracking-[0.25em]">
        {title}
      </p>

      <h3 className="mt-2 text-3xl font-black text-white md:mt-4 md:text-5xl">
        {value}
      </h3>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const className =
    priority === "Massima"
      ? "border-red-500/30 bg-red-500/10 text-red-300"
      : priority === "Alta"
      ? "border-orange-500/30 bg-orange-500/10 text-orange-300"
      : priority === "Media"
      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
      : "border-zinc-700 bg-zinc-900 text-zinc-400";

  return (
    <span
      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${className}`}
    >
      {priority}
    </span>
  );
}
