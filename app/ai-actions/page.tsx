"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AIAutopilotPlanWidget from "@/components/AIAutopilotPlanWidget";
import AIDayReviewWidget from "@/components/AIDayReviewWidget";
import PredictiveBrainWidget from "@/components/PredictiveBrainWidget";
import AIInterventionWidget from "@/components/AIInterventionWidget";
import AIWeeklyStrategyWidget from "@/components/AIWeeklyStrategyWidget";
import AIPriorityRebalanceWidget from "@/components/AIPriorityRebalanceWidget";
import AIOperatingRulesWidget from "@/components/AIOperatingRulesWidget";
import AIBrainOrchestratorWidget from "@/components/AIBrainOrchestratorWidget";

type AIAction = {
  id: number;
  title: string;
  description: string | null;
  priority: string | null;
  effort: string | null;
  impact_score: number | null;
  source_type: string | null;
  source_id: string | null;
  ai_reason: string | null;
  status: string | null;
};

type CoachStep = {
  title: string;
  instruction: string;
  duration_minutes: number;
};

type Coach = {
  mode_title: string;
  why_now: string;
  success_definition: string;
  recommended_minutes: number;
  focus_rule: string;
  steps: CoachStep[];
  blocker_responses: string[];
  final_question: string;
};

type ActionFilter = "todo" | "all" | "completed" | "high";

function formatTime(seconds: number) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;

  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function priorityClass(priority?: string | null) {
  if (priority === "high") {
    return "border-red-400/20 bg-red-500/10 text-red-300";
  }

  if (priority === "low") {
    return "border-zinc-400/20 bg-zinc-500/10 text-zinc-300";
  }

  return "border-cyan-400/20 bg-cyan-500/10 text-cyan-300";
}

function sourceLabel(source?: string | null) {
  if (source === "brain_report") return "Brain Report";
  if (source === "neural_connection") return "Neural";
  if (source === "resurfacing") return "Recall";
  if (source === "goal") return "Goal";
  if (source === "focus_action") return "Focus";
  return "AI";
}

function getActionIdFromUrl() {
  if (typeof window === "undefined") return 0;

  const params = new URLSearchParams(window.location.search);
  return Number(params.get("actionId") || 0);
}

export default function AIActionsPage() {
  const initialized = useRef(false);
  const searchParams = useSearchParams();
const actionIdParam = searchParams.get("actionId");
const startMode = searchParams.get("start");

const coachCardRef = useRef<HTMLElement | null>(null);
  const mainSectionRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [actions, setActions] = useState<AIAction[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<ActionFilter>("todo");

  const [coachLoading, setCoachLoading] = useState(false);
  const [coach, setCoach] = useState<Coach | null>(null);

  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [reflection, setReflection] = useState("");

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    loadActions(false);
  }, []);

  useEffect(() => {
    if (!running || reflection) return;

    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [running, reflection]);

  const selectedAction = useMemo(() => {
    return (
      actions.find((action) => action.id === selectedId) ||
      actions.find((action) => action.status !== "completed") ||
      actions[0] ||
      null
    );
  }, [actions, selectedId]);

  useEffect(() => {
  if (actions.length === 0) return;

  const actionIdFromUrl = Number(actionIdParam || 0);

  let targetAction: AIAction | null = null;

  if (actionIdFromUrl) {
    targetAction =
      actions.find((action) => action.id === actionIdFromUrl) || null;
  }

  if (!targetAction && startMode === "next") {
    targetAction =
      actions.find((action) => action.status !== "completed") ||
      actions[0] ||
      null;
  }

  if (!targetAction) return;

  if (selectedId !== targetAction.id) {
    setSelectedId(targetAction.id);
    loadCoach(targetAction.id);
  }

  setTimeout(() => {
    coachCardRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, 180);
}, [actionIdParam, startMode, actions, selectedId]);

  const filteredActions = useMemo(() => {
    if (filter === "all") return actions;

    if (filter === "completed") {
      return actions.filter((action) => action.status === "completed");
    }

    if (filter === "high") {
      return actions.filter(
        (action) =>
          action.priority === "high" || Number(action.impact_score || 0) >= 80
      );
    }

    return actions.filter((action) => action.status !== "completed");
  }, [actions, filter]);

  const completedCount = actions.filter(
    (action) => action.status === "completed"
  ).length;

  const totalCount = actions.length;

  const progress =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  const targetSeconds = Math.max(
    300,
    Number(coach?.recommended_minutes || 15) * 60
  );

  const timerProgress = Math.min(100, Math.round((seconds / targetSeconds) * 100));

  function scrollMainSection(direction: "left" | "right") {
    mainSectionRef.current?.scrollBy({
      left: direction === "right" ? 760 : -760,
      behavior: "smooth",
    });
  }

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  }

  async function loadActions(force = false) {
    try {
      setLoading(true);

      const token = await getToken();

      if (!token) {
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/ai-actions${force ? "?force=1" : ""}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("AI ACTIONS ERROR:", data);
        return;
      }

      const list: AIAction[] = data.actions || [];

      setActions(list);

      if (list.length > 0) {
        const actionIdFromUrl = getActionIdFromUrl();
        const fromUrl = list.find((item) => item.id === actionIdFromUrl);
        const firstTodo =
          list.find((item) => item.status !== "completed") || list[0];

        const selectedStillExists = selectedId
          ? list.find((item) => item.id === selectedId)
          : null;

        const targetAction = selectedStillExists || fromUrl || firstTodo;

        if (targetAction) {
          setSelectedId(targetAction.id);
          loadCoach(targetAction.id);
        }
      }
    } catch (error) {
      console.log("LOAD AI ACTIONS ERROR:", error);
    } finally {
      setLoading(false);
    }
  }

  async function regenerateActions() {
    try {
      setGenerating(true);
      resetExecutionState();
      await loadActions(true);
    } finally {
      setGenerating(false);
    }
  }

  async function loadCoach(actionId: number) {
    try {
      setCoachLoading(true);
      setCoach(null);
      setReflection("");
      setNote("");
      setSeconds(0);
      setRunning(false);
      setCurrentStep(0);

      const token = await getToken();

      if (!token) {
        setCoachLoading(false);
        return;
      }

      const res = await fetch("/api/ai-action-coach", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          actionId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("AI COACH ERROR:", data);
        return;
      }

      setCoach(data.coach);
    } catch (error) {
      console.log("LOAD COACH ERROR:", error);
    } finally {
      setCoachLoading(false);
    }
  }

  function selectAction(action: AIAction) {
    setSelectedId(action.id);
    loadCoach(action.id);
  }

  function resetExecutionState() {
    setRunning(false);
    setSeconds(0);
    setCurrentStep(0);
    setNote("");
    setReflection("");
    setSaving(false);
  }

  async function toggleCompleted(action: AIAction) {
    const completed = action.status !== "completed";
    const oldActions = actions;

    setActions((prev) =>
      prev.map((item) =>
        item.id === action.id
          ? {
              ...item,
              status: completed ? "completed" : "todo",
            }
          : item
      )
    );

    try {
      const token = await getToken();

      if (!token) {
        setActions(oldActions);
        return;
      }

      const res = await fetch("/api/ai-actions", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          actionId: action.id,
          completed,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("PATCH ACTION ERROR:", data);
        setActions(oldActions);
      }
    } catch (error) {
      console.log("TOGGLE ACTION ERROR:", error);
      setActions(oldActions);
    }
  }

  async function finishSession(completed: boolean) {
    if (!selectedAction) return;

    try {
      setSaving(true);

      const token = await getToken();

      if (!token) {
        setSaving(false);
        return;
      }

      const res = await fetch("/api/ai-action-session", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          actionId: selectedAction.id,
          durationSeconds: seconds,
          note,
          completed,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("SESSION ERROR:", data);
        return;
      }

      setReflection(data.reflection || "");

      if (data.action) {
        setActions((prev) =>
          prev.map((item) => (item.id === data.action.id ? data.action : item))
        );
      }

      setRunning(false);
    } catch (error) {
      console.log("FINISH SESSION ERROR:", error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="safe-mobile-bottom min-h-screen w-screen overflow-hidden bg-black text-white lg:h-screen lg:pb-0">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(168,85,247,0.16),transparent_32%),radial-gradient(circle_at_90%_20%,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.10),transparent_34%)]" />

      <div className="relative z-10 flex h-screen w-screen flex-col overflow-hidden px-4 py-4">
        <header className="mb-3 flex shrink-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
           <Link
                href="/"
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
              >
                Home
              </Link>
        </header>


        <TopActionQueue
          filteredActions={filteredActions}
          selectedAction={selectedAction}
          filter={filter}
          setFilter={setFilter}
          loading={loading}
          generating={generating}
          regenerateActions={regenerateActions}
          selectAction={selectAction}
          completedCount={completedCount}
          totalCount={totalCount}
          progress={progress}
        />

        <section className="relative min-h-0 flex-1 w-full overflow-hidden pb-3 min-h-0">
          <div className="absolute right-5 top-4 z-30 flex gap-2">
            <button
              onClick={() => scrollMainSection("left")}
              className="h-10 w-10 rounded-2xl border border-white/10 bg-white/[0.08] text-sm font-black text-zinc-300 shadow-[0_0_25px_rgba(0,0,0,0.45)] backdrop-blur-xl transition hover:bg-white hover:text-black"
            >
              {"<"}
            </button>

            <button
              onClick={() => scrollMainSection("right")}
              className="h-10 w-10 rounded-2xl border border-white/10 bg-white/[0.08] text-sm font-black text-zinc-300 shadow-[0_0_25px_rgba(0,0,0,0.45)] backdrop-blur-xl transition hover:bg-white hover:text-black"
            >
              {">"}
            </button>
             
          </div>

          <div
            ref={mainSectionRef}
            className="h-full w-full min-h-0 overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth"
          >
            <div className="flex h-full w-max min-w-full items-start gap-5 pr-[220px]">
              <div className="h-full w-[min(92vw,430px)] flex-none overflow-y-auto">
                <AIAutopilotPlanWidget />
              </div>

              <div className="h-full w-[min(92vw,430px)] flex-none overflow-y-auto">
                <AIDayReviewWidget />
              </div>

              <div className="h-full w-[min(92vw,430px)] flex-none overflow-hidden">
                <PredictiveBrainWidget />
              </div>

              <div className="h-full w-[min(92vw,430px)] flex-none overflow-hidden">
                <AIInterventionWidget />
              </div>
              
             <div className="h-full w-[min(92vw,430px)] flex-none overflow-hidden">
  <AIWeeklyStrategyWidget />
</div>

<div className="h-full w-[min(92vw,430px)] flex-none overflow-hidden">
  <AIPriorityRebalanceWidget />
</div>

<div className="h-full w-[min(92vw,430px)] flex-none overflow-hidden">
  <AIOperatingRulesWidget />
</div>

<div className="h-full w-[min(92vw,430px)] flex-none overflow-hidden">
  <AIBrainOrchestratorWidget />
</div>

              <section
  ref={coachCardRef}
  className="h-full w-[min(94vw,900px)] flex-none overflow-y-auto rounded-[34px] border border-emerald-400/15 bg-[#05050A]/88 p-5 shadow-[0_0_90px_rgba(0,0,0,0.62)] backdrop-blur-2xl"
>
                {!selectedAction ? (
                  <div className="flex min-h-[520px] items-center justify-center rounded-[28px] border border-white/10 bg-white/[0.03] p-8 text-center">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">
                        No action selected
                      </p>

                      <h2 className="mt-3 text-3xl font-black">
                        Seleziona un'azione
                      </h2>

                      <p className="mt-3 max-w-md text-sm leading-7 text-zinc-400">
                        Scegli un'azione dalla queue orizzontale per far partire la
                        guida AI.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-300">
                          Current mission
                        </p>

                        <h2 className="mt-3 text-3xl font-black leading-tight tracking-[-0.04em] md:text-5xl">
                          {selectedAction.title}
                        </h2>

                        {selectedAction.description && (
                          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
                            {selectedAction.description}
                          </p>
                        )}

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span
                            className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${priorityClass(
                              selectedAction.priority
                            )}`}
                          >
                            {selectedAction.priority || "medium"}
                          </span>

                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                            {selectedAction.effort || "15min"}
                          </span>

                          <span className="rounded-full border border-cyan-400/15 bg-cyan-500/[0.07] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
                            {Number(selectedAction.impact_score || 70)}% impact
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleCompleted(selectedAction)}
                        className={`rounded-2xl px-5 py-3 text-xs font-black uppercase tracking-[0.16em] transition ${
                          selectedAction.status === "completed"
                            ? "border border-white/10 bg-white/[0.05] text-zinc-400"
                            : "bg-emerald-400 text-black hover:scale-[1.02]"
                        }`}
                      >
                        {selectedAction.status === "completed"
                          ? "Segna todo"
                          : "Completa subito"}
                      </button>
                    </div>

                    <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_280px]">
                      <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
                              AI Coach
                            </p>

                            <h3 className="mt-2 text-xl font-black">
                              {coachLoading
                                ? "Preparazione guida..."
                                : coach?.mode_title || "Execution guide"}
                            </h3>
                          </div>

                          <button
                            onClick={() => loadCoach(selectedAction.id)}
                            disabled={coachLoading}
                            className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-xs font-black text-cyan-200 disabled:opacity-50"
                          >
                            {coachLoading ? "AI..." : "Nuova guida"}
                          </button>
                        </div>

                        {coachLoading ? (
                          <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-400">
                            L'AI sta creando un piano operativo per completare
                            questa azione.
                          </div>
                        ) : coach ? (
                          <div className="mt-5 space-y-4">
                            <GuideBox label="Perche' ora" value={coach.why_now} />

                            <GuideBox
                              label="Definizione di successo"
                              value={coach.success_definition}
                            />

                            <GuideBox label="Regola focus" value={coach.focus_rule} />

                            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.06] p-4">
                              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">
                                Piano step-by-step
                              </p>

                              <div className="mt-4 space-y-3">
                                {coach.steps.map((step, index) => {
                                  const active = currentStep === index;

                                  return (
                                    <button
                                      key={index}
                                      onClick={() => setCurrentStep(index)}
                                      className={`w-full rounded-2xl border p-4 text-left transition ${
                                        active
                                          ? "border-emerald-400/35 bg-emerald-500/[0.10]"
                                          : "border-white/10 bg-black/25 hover:bg-white/[0.04]"
                                      }`}
                                    >
                                      <div className="flex items-start gap-3">
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-black text-black">
                                          {index + 1}
                                        </span>

                                        <div>
                                          <h4 className="text-sm font-black text-white">
                                            {step.title}
                                          </h4>

                                          <p className="mt-2 text-sm leading-6 text-zinc-400">
                                            {step.instruction}
                                          </p>

                                          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600">
                                            {step.duration_minutes} min
                                          </p>
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-400">
                            Premi "Nuova guida" per far generare all'AI il piano di
                            completamento.
                          </div>
                        )}
                      </div>

                      <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">
                          Focus timer
                        </p>

                        <div className="mt-4 rounded-[24px] border border-emerald-400/20 bg-emerald-500/[0.07] p-5 text-center">
                          <p className="text-5xl font-black tracking-[-0.06em]">
                            {formatTime(seconds)}
                          </p>

                          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                              style={{ width: `${timerProgress}%` }}
                            />
                          </div>

                          <p className="mt-3 text-xs font-bold text-zinc-500">
                            Target: {coach?.recommended_minutes || 15} min
                          </p>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setRunning(true)}
                            disabled={running || !!reflection}
                            className="h-11 rounded-2xl bg-emerald-400 text-xs font-black text-black disabled:opacity-50"
                          >
                            Start
                          </button>

                          <button
                            onClick={() => setRunning(false)}
                            disabled={!running}
                            className="h-11 rounded-2xl border border-white/10 bg-white/[0.05] text-xs font-black text-zinc-300 disabled:opacity-50"
                          >
                            Pausa
                          </button>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            onClick={() =>
                              setCurrentStep((prev) => Math.max(0, prev - 1))
                            }
                            className="h-10 rounded-2xl border border-white/10 bg-white/[0.04] text-xs font-black text-zinc-400"
                          >
                            Step prima
                          </button>

                          <button
                            onClick={() =>
                              setCurrentStep((prev) =>
                                Math.min((coach?.steps.length || 1) - 1, prev + 1)
                              )
                            }
                            className="h-10 rounded-2xl border border-white/10 bg-white/[0.04] text-xs font-black text-zinc-400"
                          >
                            Step dopo
                          </button>
                        </div>

                        {coach?.blocker_responses?.length ? (
                          <div className="mt-5 rounded-2xl border border-purple-400/15 bg-purple-500/[0.07] p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-purple-300">
                              Se ti blocchi
                            </p>

                            <div className="mt-3 space-y-2">
                              {coach.blocker_responses.map((item, index) => (
                                <p
                                  key={index}
                                  className="rounded-xl border border-white/10 bg-black/25 p-3 text-xs leading-5 text-zinc-400"
                                >
                                  {item}
                                </p>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-5 rounded-[28px] border border-white/10 bg-white/[0.035] p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">
                        Execution notes
                      </p>

                      <p className="mt-2 text-sm leading-6 text-zinc-400">
                        {coach?.final_question ||
                          "Scrivi cosa hai completato e cosa manca."}
                      </p>

                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Scrivi qui il risultato prodotto, gli ostacoli e il prossimo passo..."
                        className="mt-4 min-h-[140px] w-full resize-none rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-emerald-400/40"
                      />

                      {reflection && (
                        <div className="mt-4 rounded-2xl border border-purple-400/15 bg-purple-500/[0.08] p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-purple-300">
                            Riflessione AI
                          </p>

                          <p className="mt-2 text-sm leading-6 text-zinc-300">
                            {reflection}
                          </p>
                        </div>
                      )}

                      <div className="mt-5 grid gap-3 md:grid-cols-3">
                        {!reflection ? (
                          <>
                            <button
                              onClick={() => finishSession(true)}
                              disabled={saving || !selectedAction}
                              className="h-12 rounded-2xl bg-emerald-400 text-sm font-black text-black transition hover:scale-[1.02] disabled:opacity-50"
                            >
                              {saving ? "Salvataggio..." : "Completa +12 XP"}
                            </button>

                            <button
                              onClick={() => finishSession(false)}
                              disabled={saving || !selectedAction}
                              className="h-12 rounded-2xl border border-white/10 bg-white/[0.05] text-sm font-black text-zinc-300 hover:bg-white/[0.08] disabled:opacity-50"
                            >
                              Salva progresso
                            </button>

                            <button
                              onClick={resetExecutionState}
                              className="h-12 rounded-2xl border border-white/10 bg-transparent text-sm font-black text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
                            >
                              Reset sessione
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={resetExecutionState}
                            className="h-12 rounded-2xl bg-white text-sm font-black text-black md:col-span-3"
                          >
                            Nuova sessione
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </section>

              <aside className="h-full w-[380px] flex-none overflow-y-auto rounded-[32px] border border-white/10 bg-[#05050A]/86 p-5 shadow-[0_0_70px_rgba(0,0,0,0.50)] backdrop-blur-2xl">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
                  AI Guidance
                </p>

                <h2 className="mt-2 text-2xl font-black">Come completarla</h2>

                <div className="mt-5 space-y-3">
                  <SideTip
                    title="1. Non cambiare task"
                    text="L'azione selezionata e' l'unica missione finche' il timer e' attivo."
                  />

                  <SideTip
                    title="2. Cerca un output"
                    text="Non puntare a pensare meglio. Punta a produrre qualcosa di visibile."
                  />

                  <SideTip
                    title="3. Chiudi sempre"
                    text="Alla fine scrivi una nota, salva la sessione o completa l'azione."
                  />

                  <SideTip
                    title="4. Usa gli step AI"
                    text="Se ti blocchi, non decidere da zero: segui lo step corrente."
                  />
                </div>

                {selectedAction?.ai_reason && (
                  <div className="mt-5 rounded-2xl border border-cyan-400/15 bg-cyan-500/[0.07] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
                      AI reason
                    </p>

                    <p className="mt-2 text-sm leading-6 text-zinc-300">
                      {selectedAction.ai_reason}
                    </p>
                  </div>
                )}
              </aside>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function TopActionQueue({
  filteredActions,
  selectedAction,
  filter,
  setFilter,
  loading,
  generating,
  regenerateActions,
  selectAction,
  completedCount,
  totalCount,
  progress,
}: {
  filteredActions: AIAction[];
  selectedAction: AIAction | null;
  filter: ActionFilter;
  setFilter: (value: ActionFilter) => void;
  loading: boolean;
  generating: boolean;
  regenerateActions: () => void;
  selectAction: (action: AIAction) => void;
  completedCount: number;
  totalCount: number;
  progress: number;
}) {
  const queueRef = useRef<HTMLDivElement | null>(null);

  function scrollQueue(direction: "left" | "right") {
    queueRef.current?.scrollBy({
      left: direction === "right" ? 520 : -520,
      behavior: "smooth",
    });
  }

  return (
    <section className="mb-3 shrink-0 overflow-hidden rounded-[34px] border border-emerald-400/20 bg-[#030807]/92 text-white shadow-[0_0_80px_rgba(0,0,0,0.62)] backdrop-blur-2xl">
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(16,185,129,0.18),transparent_32%),radial-gradient(circle_at_100%_100%,rgba(34,211,238,0.10),transparent_34%)]" />

        <div className="relative z-10 flex items-center justify-between gap-4 border-b border-white/10 px-5 py-3">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-500/10">
              <span className="h-3 w-3 rounded-full bg-emerald-300 shadow-[0_0_20px_rgba(110,231,183,1)]" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.26em] text-emerald-300">
                AI Action Queue
              </p>

              <h2 className="mt-0.5 truncate text-lg font-black tracking-[-0.04em] text-white">
                Naviga le azioni operative di oggi
              </h2>
            </div>
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-right">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600">
                Progress
              </p>

              <p className="text-sm font-black text-emerald-300">
                {completedCount}/{totalCount} - {progress}%
              </p>
            </div>

            <button
              onClick={() => scrollQueue("left")}
              className="h-10 w-10 rounded-2xl border border-white/10 bg-white/[0.05] text-sm font-black text-zinc-400 transition hover:bg-white hover:text-black"
            >
              {"<"}
            </button>

            <button
              onClick={() => scrollQueue("right")}
              className="h-10 w-10 rounded-2xl border border-white/10 bg-white/[0.05] text-sm font-black text-zinc-400 transition hover:bg-white hover:text-black"
            >
              {">"}
            </button>

            <button
              onClick={regenerateActions}
              disabled={generating || loading}
              className="h-10 rounded-2xl bg-white px-5 text-xs font-black uppercase tracking-[0.16em] text-black transition hover:scale-[1.02] disabled:opacity-50"
            >
              {generating ? "AI..." : "Rigenera"}
            </button>
          </div>
        </div>

        <div className="relative z-10 px-5 py-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <FilterButton
                label="Todo"
                active={filter === "todo"}
                onClick={() => setFilter("todo")}
              />

              <FilterButton
                label="High"
                active={filter === "high"}
                onClick={() => setFilter("high")}
              />

              <FilterButton
                label="Done"
                active={filter === "completed"}
                onClick={() => setFilter("completed")}
              />

              <FilterButton
                label="All"
                active={filter === "all"}
                onClick={() => setFilter("all")}
              />
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10 lg:w-[260px]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-400"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div
            ref={queueRef}
            className="flex gap-3 overflow-x-auto pb-1 pr-3 scroll-smooth"
          >
            {loading ? (
              <div className="h-[128px] w-[340px] shrink-0 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm text-zinc-400">
                Caricamento azioni AI...
              </div>
            ) : filteredActions.length === 0 ? (
              <div className="h-[128px] w-[420px] shrink-0 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <p className="text-sm font-bold text-zinc-300">
                  Nessuna azione in questo filtro.
                </p>

                <p className="mt-2 text-sm text-zinc-500">
                  Cambia filtro oppure rigenera la queue.
                </p>
              </div>
            ) : (
              filteredActions.map((action) => {
                const active = selectedAction?.id === action.id;
                const completed = action.status === "completed";
                const impact = Math.max(
                  1,
                  Math.min(100, Number(action.impact_score || 70))
                );

                return (
                  <button
                    key={action.id}
                    onClick={() => selectAction(action)}
                    className={`group h-[128px] w-[340px] shrink-0 overflow-hidden rounded-[26px] border p-4 text-left transition hover:-translate-y-0.5 ${
                      active
                        ? "border-emerald-400/40 bg-emerald-500/[0.10] shadow-[0_0_35px_rgba(16,185,129,0.12)]"
                        : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex h-full flex-col justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${priorityClass(
                              action.priority
                            )}`}
                          >
                            {action.priority || "medium"}
                          </span>

                          <span className="rounded-full border border-cyan-400/15 bg-cyan-500/[0.07] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-300">
                            {impact}% impact
                          </span>

                          {completed && (
                            <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-300">
                              Done
                            </span>
                          )}
                        </div>

                        <h3
                          className={`mt-3 line-clamp-2 text-sm font-black leading-5 ${
                            completed
                              ? "text-zinc-500 line-through"
                              : "text-white"
                          }`}
                        >
                          {action.title}
                        </h3>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600">
                          {sourceLabel(action.source_type)} - {action.effort || "15min"}
                        </p>

                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-xs font-black text-zinc-400 transition group-hover:bg-white group-hover:text-black">
                          {">"}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition ${
        active
          ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
          : "border-white/10 bg-white/[0.03] text-zinc-600 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function GuideBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
        {label}
      </p>

      <p className="mt-2 text-sm leading-6 text-zinc-300">{value}</p>
    </div>
  );
}

function SideTip({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <h3 className="text-sm font-black text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-500">{text}</p>
    </div>
  );
}
