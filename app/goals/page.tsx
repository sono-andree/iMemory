"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SidebarLogo from "@/components/SidebarLogo";
import UserBox from "@/components/UserBox";
import UpgradeModal from "@/components/UpgradeModal";
import { canCreateGoal } from "@/lib/checkUserPlan";
import { awardXP } from "@/lib/awardXP";

type Goal = {
  id: number;
  user_id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string | null;
  priority: string | null;
  deadline: string | null;
  ai_strategy: string | null;
  ai_risk: string | null;
  ai_next_action: string | null;
  created_at: string | null;
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

type UpgradeModalState = {
  open: boolean;
  title: string;
  message: string;
  feature: string;
  used: number | null;
  limit: number | null;
};

const categories = [
  "Business",
  "Studio",
  "Personale",
  "AI",
  "Prodotto",
  "Marketing",
  "Fitness",
  "Soldi",
  "Creatività",
  "Generale",
];

const priorities = ["Bassa", "Media", "Alta", "Massima"];
const statuses = ["Da iniziare", "In corso", "Completato", "Bloccato"];

export default function GoalsPage() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [steps, setSteps] = useState<GoalStep[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);

  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Business");
  const [priority, setPriority] = useState("Alta");
  const [deadline, setDeadline] = useState("");
  const [filter, setFilter] = useState("Tutti");

  const [upgradeModal, setUpgradeModal] = useState<UpgradeModalState>({
    open: false,
    title: "",
    message: "",
    feature: "",
    used: null,
    limit: null,
  });

  useEffect(() => {
    loadData();
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

  async function loadData() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    setUserId(user.id);

    const { data: goalData, error: goalError } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: false });

    if (goalError) {
      console.log("GOALS ERROR:", goalError);
    }

    const { data: stepData, error: stepError } = await supabase
      .from("goal_steps")
      .select("*")
      .eq("user_id", user.id)
      .order("position", { ascending: true });

    if (stepError) {
      console.log("STEPS ERROR:", stepError);
    }

    const { data: memoryData, error: memoryError } = await supabase
      .from("memories")
      .select("id, title, content, category, summary, keywords")
      .eq("user_id", user.id)
      .order("id", { ascending: false })
      .limit(40);

    if (memoryError) {
      console.log("MEMORIES ERROR:", memoryError);
    }

    const nextGoals = (goalData || []) as Goal[];

    setGoals(nextGoals);
    setSteps((stepData || []) as GoalStep[]);
    setMemories((memoryData || []) as Memory[]);

    if (nextGoals.length > 0) {
      if (!selectedGoal) {
        setSelectedGoal(nextGoals[0]);
      } else {
        const refreshedSelectedGoal = nextGoals.find(
          (goal) => goal.id === selectedGoal.id
        );

        setSelectedGoal(refreshedSelectedGoal || nextGoals[0]);
      }
    } else {
      setSelectedGoal(null);
    }

    setLoading(false);
  }

  async function createGoal() {
    if (!userId) return;

    const planCheck = await canCreateGoal();

    if (!planCheck.allowed) {
      setUpgradeModal({
        open: true,
        title: "Limite goals raggiunto",
        message:
          planCheck.reason ||
          "Hai raggiunto il limite Free di goals. Passa a Pro per creare goals illimitati.",
        feature: "Goals",
        used: null,
        limit: null,
      });

      return;
    }

    if (!title.trim()) {
      alert("Inserisci un titolo per l'obiettivo");
      return;
    }

    setCreating(true);

    const { data, error } = await supabase
      .from("goals")
      .insert({
        user_id: userId,
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        deadline: deadline || null,
        status: "Da iniziare",
      })
      .select()
      .single();

    if (error) {
      setCreating(false);
      alert("Errore creazione obiettivo: " + error.message);
      return;
    }

    setTitle("");
    setDescription("");
    setDeadline("");
    setCreating(false);

    await loadData();

    if (data) {
      setSelectedGoal(data as Goal);
    }
  }

  async function deleteGoal(goalId: number) {
    const confirmDelete = confirm("Vuoi eliminare questo obiettivo?");
    if (!confirmDelete) return;

    const { error } = await supabase
      .from("goals")
      .delete()
      .eq("id", goalId)
      .eq("user_id", userId);

    if (error) {
      alert("Errore eliminazione: " + error.message);
      return;
    }

    setSelectedGoal(null);
    await loadData();
  }

  async function updateGoalStatus(goal: Goal, newStatus: string) {
    const { error } = await supabase
      .from("goals")
      .update({ status: newStatus })
      .eq("id", goal.id)
      .eq("user_id", userId);

    if (error) {
      alert(error.message);
      return;
    }

    await loadData();

    if (newStatus === "Completato" && goal.status !== "Completato") {
      await awardXP({
        type: "goal_completed",
        title: "Goal completato",
        xp: 50,
        dedupeKey: `goal_completed_${goal.id}`,
        metadata: {
          goal_id: goal.id,
        },
      });
    }

    setSelectedGoal({
      ...goal,
      status: newStatus,
    });
  }

  async function toggleStep(step: GoalStep) {
    const newValue = !step.completed;

    const { error } = await supabase
      .from("goal_steps")
      .update({ completed: newValue })
      .eq("id", step.id)
      .eq("user_id", userId);

    if (error) {
      alert(error.message);
      return;
    }

    if (newValue) {
      await awardXP({
        type: "goal_step",
        title: "Goal step completato",
        xp: 20,
        dedupeKey: `goal_step_${step.id}`,
        metadata: {
          goal_id: step.goal_id,
          step_id: step.id,
        },
      });
    }

    await loadData();
  }

  async function generateAIStrategy(goal: Goal) {
    if (!userId) return;

    setAiLoading(true);

    try {
      const res = await fetch("/api/goals-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          goal,
          memories,
        }),
      });

      const data = await res.json();

      if (res.status === 402) {
        setUpgradeModal({
          open: true,
          title: "Strategie Goals Free terminate",
          message:
            data.error ||
            "Hai raggiunto il limite Free delle strategie Goals AI. Passa a Pro per continuare senza limiti.",
          feature: "Goals AI",
          used: data.used ?? null,
          limit: data.limit ?? null,
        });

        setAiLoading(false);
        return;
      }

      if (!res.ok) {
        alert(data.error || "Errore AI");
        setAiLoading(false);
        return;
      }

      await supabase
        .from("goal_steps")
        .delete()
        .eq("goal_id", goal.id)
        .eq("user_id", userId);

      const aiSteps = Array.isArray(data.steps) ? data.steps : [];

      if (aiSteps.length > 0) {
        await supabase.from("goal_steps").insert(
          aiSteps.map((step: string, index: number) => ({
            goal_id: goal.id,
            user_id: userId,
            text: step,
            completed: false,
            position: index,
          }))
        );
      }

      const newStatus = goal.status === "Da iniziare" ? "In corso" : goal.status;

      const { error } = await supabase
        .from("goals")
        .update({
          ai_strategy: data.strategy || "",
          ai_risk: data.risk || "",
          ai_next_action: data.next_action || "",
          status: newStatus,
        })
        .eq("id", goal.id)
        .eq("user_id", userId);

      if (error) {
        alert(error.message);
        setAiLoading(false);
        return;
      }

      await loadData();

      setSelectedGoal({
        ...goal,
        ai_strategy: data.strategy || "",
        ai_risk: data.risk || "",
        ai_next_action: data.next_action || "",
        status: newStatus,
      });
    } catch (error) {
      console.log(error);
      alert("Errore generazione AI");
    }

    setAiLoading(false);
  }

  const selectedSteps = useMemo(() => {
    if (!selectedGoal) return [];
    return steps.filter((step) => step.goal_id === selectedGoal.id);
  }, [steps, selectedGoal]);

  const selectedProgress = useMemo(() => {
    if (selectedSteps.length === 0) return 0;
    const completed = selectedSteps.filter((step) => step.completed).length;
    return Math.round((completed / selectedSteps.length) * 100);
  }, [selectedSteps]);

  const filteredGoals = useMemo(() => {
    if (filter === "Tutti") return goals;
    return goals.filter((goal) => goal.status === filter);
  }, [goals, filter]);

  const globalStats = useMemo(() => {
    const total = goals.length;
    const completed = goals.filter((goal) => goal.status === "Completato").length;
    const active = goals.filter((goal) => goal.status === "In corso").length;
    const blocked = goals.filter((goal) => goal.status === "Bloccato").length;

    const totalSteps = steps.length;
    const completedSteps = steps.filter((step) => step.completed).length;

    const globalProgress =
      totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100);

    return {
      total,
      completed,
      active,
      blocked,
      globalProgress,
    };
  }, [goals, steps]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="rounded-[30px] border border-white/10 bg-white/[0.04] px-8 py-6 text-center backdrop-blur-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-purple-300">
            iMemory goals
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

      <section className="relative z-10 w-full max-w-none overflow-x-hidden px-3 py-5 md:px-5 lg:h-screen lg:overflow-y-auto lg:pl-[348px] lg:pr-5 lg:py-8 xl:pl-[363px] 2xl:pl-[388px]">
        <header className="mb-5 rounded-[32px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_0_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl md:p-7">
          <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,520px)] xl:items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.34em] text-cyan-300 md:text-sm">
                AI Goal Engine
              </p>

              <h1 className="mt-3 bg-gradient-to-r from-purple-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-5xl font-black tracking-[-0.08em] text-transparent md:text-7xl">
                Goals
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400 md:text-lg md:leading-relaxed">
                Trasforma idee in obiettivi, checklist operative e strategie AI basate sulle tue memorie.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <Stat title="Goals" value={globalStats.total} />
              <Stat title="Progress" value={`${globalStats.globalProgress}%`} />
              <Stat title="In corso" value={globalStats.active} />
              <Stat title="Completati" value={globalStats.completed} />
            </div>
          </div>
        </header>

        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(360px,420px)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-5">
            <GoalCreateCard
              title={title}
              setTitle={setTitle}
              description={description}
              setDescription={setDescription}
              category={category}
              setCategory={setCategory}
              priority={priority}
              setPriority={setPriority}
              deadline={deadline}
              setDeadline={setDeadline}
              creating={creating}
              createGoal={createGoal}
            />

            <FilterCard filter={filter} setFilter={setFilter} />

            <GoalsList
              filteredGoals={filteredGoals}
              steps={steps}
              selectedGoal={selectedGoal}
              setSelectedGoal={setSelectedGoal}
            />
          </div>

          <GoalDetails
            selectedGoal={selectedGoal}
            selectedSteps={selectedSteps}
            selectedProgress={selectedProgress}
            aiLoading={aiLoading}
            generateAIStrategy={generateAIStrategy}
            deleteGoal={deleteGoal}
            toggleStep={toggleStep}
            updateGoalStatus={updateGoalStatus}
          />
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
            <NavButton label="Brain" onClick={() => routerPush("/brain")} />
            <NavButton label="Nuova Memoria" onClick={() => routerPush("/memory")} />
            <NavButton label="Memorie" onClick={() => routerPush("/memories")} />
            <NavButton label="Chat AI" onClick={() => routerPush("/chat")} />
            <NavButton label="Mappa Mentale" onClick={() => routerPush("/map")} />
            <NavButton label="Insights" onClick={() => routerPush("/insights")} />

            <button className="rounded-2xl border border-cyan-500/30 bg-cyan-500/15 px-5 py-4 text-left font-bold text-cyan-200 shadow-[0_0_25px_rgba(34,211,238,0.15)]">
              Goals
            </button>

            <NavButton label="Focus" onClick={() => routerPush("/focus")} />
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

function GoalCreateCard({
  title,
  setTitle,
  description,
  setDescription,
  category,
  setCategory,
  priority,
  setPriority,
  deadline,
  setDeadline,
  creating,
  createGoal,
}: {
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  priority: string;
  setPriority: (value: string) => void;
  deadline: string;
  setDeadline: (value: string) => void;
  creating: boolean;
  createGoal: () => void;
}) {
  return (
    <div className="rounded-[32px] border border-purple-500/20 bg-zinc-950/70 p-5 shadow-[0_0_60px_rgba(168,85,247,0.12)] backdrop-blur-2xl md:rounded-[38px] md:p-7">
      <h2 className="text-2xl font-black md:text-3xl">Nuovo obiettivo</h2>

      <p className="mt-2 text-sm leading-6 text-zinc-500">
        Scrivi cosa vuoi ottenere. L'AI lo trasformerà in un piano operativo.
      </p>

      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Esempio: Lanciare iMemory online"
        className="mt-5 h-14 min-w-0 w-full rounded-2xl border border-zinc-800 bg-black/60 px-4 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-purple-500 md:h-14 md:px-5"
      />

      <textarea
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Descrivi l'obiettivo..."
        className="mt-4 min-h-[120px] min-w-0 w-full resize-none rounded-3xl border border-zinc-800 bg-black/60 p-4 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-purple-500 md:min-h-[130px] md:p-5"
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="h-14 rounded-2xl border border-zinc-800 bg-black/60 px-4 text-base text-white outline-none focus:border-purple-500 md:h-14"
        >
          {categories.map((cat) => (
            <option key={cat}>{cat}</option>
          ))}
        </select>

        <select
          value={priority}
          onChange={(event) => setPriority(event.target.value)}
          className="h-14 rounded-2xl border border-zinc-800 bg-black/60 px-4 text-base text-white outline-none focus:border-purple-500 md:h-14"
        >
          {priorities.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>

      <input
        type="date"
        value={deadline}
        onChange={(event) => setDeadline(event.target.value)}
        className="mt-4 h-14 min-w-0 w-full rounded-2xl border border-zinc-800 bg-black/60 px-4 text-base text-white outline-none focus:border-purple-500 md:h-14 md:px-5"
      />

      <button
        onClick={createGoal}
        disabled={creating}
        className="mt-5 h-14 min-w-0 w-full rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-500 text-base font-black shadow-[0_0_45px_rgba(168,85,247,0.35)] transition hover:scale-[1.02] disabled:opacity-60 md:h-16 md:text-lg"
      >
        {creating ? "Creazione..." : "Crea Goal"}
      </button>
    </div>
  );
}

function FilterCard({
  filter,
  setFilter,
}: {
  filter: string;
  setFilter: (value: string) => void;
}) {
  return (
    <div className="rounded-[32px] border border-cyan-500/20 bg-zinc-950/70 p-5 backdrop-blur-2xl md:rounded-[38px] md:p-7">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-black md:text-2xl">Filtro</h2>
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-600">
          Status
        </span>
      </div>

      <div className="scrollbar-none mt-4 flex gap-2 overflow-x-auto md:flex-wrap md:gap-3">
        {["Tutti", ...statuses].map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm transition ${
              filter === item
                ? "border-cyan-400 bg-cyan-500/20 text-cyan-200"
                : "border-zinc-800 bg-black/40 text-zinc-500 hover:text-white"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function GoalsList({
  filteredGoals,
  steps,
  selectedGoal,
  setSelectedGoal,
}: {
  filteredGoals: Goal[];
  steps: GoalStep[];
  selectedGoal: Goal | null;
  setSelectedGoal: (goal: Goal) => void;
}) {
  return (
    <div className="space-y-3 lg:max-h-[520px] lg:overflow-y-auto lg:pr-2">
      {filteredGoals.length === 0 ? (
        <div className="rounded-[30px] border border-zinc-800 bg-zinc-950/70 p-8 text-center text-zinc-500">
          Nessun goal ancora.
        </div>
      ) : (
        filteredGoals.map((goal) => {
          const goalSteps = steps.filter((step) => step.goal_id === goal.id);
          const done = goalSteps.filter((step) => step.completed).length;

          const progress =
            goalSteps.length === 0
              ? 0
              : Math.round((done / goalSteps.length) * 100);

          return (
            <button
              key={goal.id}
              onClick={() => setSelectedGoal(goal)}
              className={`w-full rounded-[26px] border p-4 text-left transition md:rounded-[30px] md:p-5 ${
                selectedGoal?.id === goal.id
                  ? "border-cyan-400/50 bg-cyan-500/10 shadow-[0_0_35px_rgba(34,211,238,0.16)]"
                  : "border-purple-500/15 bg-zinc-950/60 hover:border-purple-400/40"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-black text-white md:text-xl">
                    {goal.title}
                  </h3>

                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-500">
                    {goal.description || "Nessuna descrizione"}
                  </p>
                </div>

                <PriorityBadge priority={goal.priority || "Media"} />
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-900">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                <span>{goal.status}</span>
                <span>{progress}%</span>
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}

function GoalDetails({
  selectedGoal,
  selectedSteps,
  selectedProgress,
  aiLoading,
  generateAIStrategy,
  deleteGoal,
  toggleStep,
  updateGoalStatus,
}: {
  selectedGoal: Goal | null;
  selectedSteps: GoalStep[];
  selectedProgress: number;
  aiLoading: boolean;
  generateAIStrategy: (goal: Goal) => void;
  deleteGoal: (goalId: number) => void;
  toggleStep: (step: GoalStep) => void;
  updateGoalStatus: (goal: Goal, status: string) => void;
}) {
  if (!selectedGoal) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-[34px] border border-purple-500/20 bg-zinc-950/70 p-8 text-center text-zinc-500 backdrop-blur-2xl md:rounded-[42px] xl:min-h-[780px]">
        Seleziona o crea un goal.
      </div>
    );
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-[34px] border border-purple-500/20 bg-zinc-950/70 p-5 shadow-[0_0_80px_rgba(168,85,247,0.12)] backdrop-blur-2xl md:rounded-[42px] md:p-8">
      <div className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-start">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-300 md:text-sm">
            Selected Goal
          </p>

          <h2 className="mt-3 text-3xl font-black leading-tight tracking-[-0.05em] md:text-5xl">
            {selectedGoal.title}
          </h2>

          <p className="mt-4 max-w-4xl text-base leading-7 text-zinc-400 md:text-lg md:leading-relaxed">
            {selectedGoal.description || "Nessuna descrizione"}
          </p>

          <div className="mt-5 flex flex-wrap gap-2 md:gap-3">
            <Chip>{selectedGoal.category || "Generale"}</Chip>
            <Chip>{selectedGoal.priority || "Media"}</Chip>
            <Chip>{selectedGoal.status || "Da iniziare"}</Chip>

            {selectedGoal.deadline && (
              <Chip>Deadline: {formatDate(selectedGoal.deadline)}</Chip>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:w-[230px] xl:grid-cols-1">
          <button
            onClick={() => generateAIStrategy(selectedGoal)}
            disabled={aiLoading}
            className="h-14 rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-500 px-5 text-sm font-black shadow-[0_0_35px_rgba(34,211,238,0.25)] transition hover:scale-[1.03] disabled:opacity-60 md:h-14"
          >
            {aiLoading ? "AI..." : "Genera Strategia AI"}
          </button>

          <button
            onClick={() => deleteGoal(selectedGoal.id)}
            className="h-14 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 text-sm font-bold text-red-300 transition hover:bg-red-500/20 md:h-14"
          >
            Elimina
          </button>
        </div>
      </div>

      <div className="mt-6 grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        <div className="min-w-0 space-y-5">
          <div className="rounded-[28px] border border-cyan-500/20 bg-black/35 p-5 md:rounded-[34px] md:p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h3 className="text-xl font-black md:text-2xl">
                Progress operativo
              </h3>

              <span className="text-2xl font-black text-cyan-300 md:text-3xl">
                {selectedProgress}%
              </span>
            </div>

            <div className="h-4 overflow-hidden rounded-full bg-zinc-900">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-cyan-400"
                style={{ width: `${selectedProgress}%` }}
              />
            </div>
          </div>

          <div className="rounded-[28px] border border-purple-500/20 bg-black/35 p-5 md:rounded-[34px] md:p-6">
            <h3 className="text-xl font-black md:text-2xl">Checklist AI</h3>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Ogni step completato aumenta il progresso reale del tuo obiettivo.
            </p>

            <div className="mt-5 space-y-3 md:mt-6 md:space-y-4">
              {selectedSteps.length === 0 ? (
                <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6 text-center md:p-8">
                  <p className="text-zinc-500">Nessuno step ancora.</p>

                  <button
                    onClick={() => generateAIStrategy(selectedGoal)}
                    disabled={aiLoading}
                    className="mt-5 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-5 py-3 font-bold text-cyan-200 transition hover:bg-cyan-500/20 disabled:opacity-60"
                  >
                    {aiLoading ? "Generazione..." : "Crea checklist con AI"}
                  </button>
                </div>
              ) : (
                selectedSteps.map((step, index) => (
                  <button
                    key={step.id}
                    onClick={() => toggleStep(step)}
                    className={`flex w-full items-center gap-3 rounded-[24px] border p-4 text-left transition md:gap-4 md:rounded-3xl md:p-5 ${
                      step.completed
                        ? "border-green-500/30 bg-green-500/10"
                        : "border-zinc-800 bg-zinc-950/70 hover:border-purple-500/40"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border font-black md:h-11 md:w-11 ${
                        step.completed
                          ? "border-green-400 bg-green-500/20 text-green-300"
                          : "border-purple-500/30 bg-purple-500/10 text-purple-300"
                      }`}
                    >
                      {step.completed ? "✓" : index + 1}
                    </div>

                    <p
                      className={`min-w-0 break-words text-sm leading-relaxed md:text-base ${
                        step.completed
                          ? "text-green-200 line-through decoration-green-400/60"
                          : "text-zinc-300"
                      }`}
                    >
                      {step.text}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[28px] border border-cyan-500/20 bg-cyan-500/10 p-5 md:rounded-[34px] md:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300 md:text-sm">
              Next Action
            </p>

            <h3 className="mt-4 text-xl font-black leading-snug md:text-2xl">
              {selectedGoal.ai_next_action ||
                "Genera una strategia AI per sapere la prossima azione."}
            </h3>
          </div>

          <InfoPanel title="AI Strategy" tone="purple">
            {selectedGoal.ai_strategy ||
              "Qui apparirà la strategia personalizzata basata sulle tue memorie."}
          </InfoPanel>

          <InfoPanel title="Risk Detector" tone="red">
            {selectedGoal.ai_risk ||
              "Qui apparirà il blocco principale da evitare."}
          </InfoPanel>

          <div className="rounded-[28px] border border-zinc-800 bg-black/35 p-5 md:rounded-[34px] md:p-6">
            <h3 className="text-xl font-black">Stato obiettivo</h3>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {statuses.map((status) => (
                <button
                  key={status}
                  onClick={() => updateGoalStatus(selectedGoal, status)}
                  className={`rounded-2xl border px-3 py-3 text-sm font-bold transition md:px-4 ${
                    selectedGoal.status === status
                      ? "border-cyan-400 bg-cyan-500/20 text-cyan-200"
                      : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-white"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl px-5 py-4 text-left text-zinc-400 transition hover:bg-purple-500/10 hover:text-white"
    >
      {label}
    </button>
  );
}

function Stat({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-[24px] border border-purple-500/20 bg-zinc-950/70 p-4 backdrop-blur-2xl md:rounded-[28px] md:p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500 md:text-xs">
        {title}
      </p>

      <h3 className="mt-2 text-3xl font-black text-white md:mt-3 md:text-4xl">
        {value}
      </h3>
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 md:px-4 md:text-sm">
      {children}
    </span>
  );
}

function InfoPanel({
  title,
  children,
  tone,
}: {
  title: string;
  children: ReactNode;
  tone: "purple" | "red";
}) {
  const styles =
    tone === "red"
      ? "border-red-500/20 bg-red-500/10 text-red-100/80"
      : "border-purple-500/20 bg-black/35 text-zinc-300";

  const titleStyle = tone === "red" ? "text-red-300" : "text-purple-300";

  return (
    <div className={`rounded-[28px] border p-5 md:rounded-[34px] md:p-6 ${styles}`}>
      <p className={`text-[10px] font-black uppercase tracking-[0.28em] md:text-sm ${titleStyle}`}>
        {title}
      </p>

      <p className="mt-4 break-words text-sm leading-7 md:text-base">{children}</p>
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

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
