"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import SidebarLogo from "@/components/SidebarLogo";
import UserBox from "@/components/UserBox";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Memory = {
  id: number;
  title: string | null;
  category: string | null;
  file_url: string | null;
  created_at: string | null;
};

type Goal = {
  id: number;
  title: string;
  category: string | null;
  status: string | null;
  priority: string | null;
  deadline: string | null;
  created_at: string | null;
};

type GoalStep = {
  id: number;
  goal_id: number;
  completed: boolean;
  created_at: string | null;
};

type FocusDay = {
  id: number;
  focus_date: string;
  mission: string | null;
};

type FocusAction = {
  id: number;
  focus_id: number;
  completed: boolean;
  created_at: string | null;
};

const COLORS = [
  "#a855f7",
  "#22d3ee",
  "#d946ef",
  "#6366f1",
  "#14b8a6",
  "#f97316",
  "#ef4444",
  "#84cc16",
];

export default function InsightsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [memories, setMemories] = useState<Memory[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalSteps, setGoalSteps] = useState<GoalStep[]>([]);
  const [focusDays, setFocusDays] = useState<FocusDay[]>([]);
  const [focusActions, setFocusActions] = useState<FocusAction[]>([]);

  useEffect(() => {
    loadInsights();
  }, []);

  async function loadInsights() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: memoriesData } = await supabase
      .from("memories")
      .select("id, title, category, file_url, created_at")
      .eq("user_id", user.id)
      .order("id", { ascending: false });

    const { data: goalsData } = await supabase
      .from("goals")
      .select("id, title, category, status, priority, deadline, created_at")
      .eq("user_id", user.id)
      .order("id", { ascending: false });

    const { data: stepsData } = await supabase
      .from("goal_steps")
      .select("id, goal_id, completed, created_at")
      .eq("user_id", user.id);

    const { data: focusDaysData } = await supabase
      .from("focus_days")
      .select("id, focus_date, mission")
      .eq("user_id", user.id)
      .order("focus_date", { ascending: true });

    const { data: focusActionsData } = await supabase
      .from("focus_actions")
      .select("id, focus_id, completed, created_at")
      .eq("user_id", user.id);

    setMemories(memoriesData || []);
    setGoals(goalsData || []);
    setGoalSteps(stepsData || []);
    setFocusDays(focusDaysData || []);
    setFocusActions(focusActionsData || []);

    setLoading(false);
  }

  const analytics = useMemo(() => {
    const completedGoals = goals.filter((g) => g.status === "Completato").length;
    const activeGoals = goals.filter((g) => g.status === "In corso").length;
    const blockedGoals = goals.filter((g) => g.status === "Bloccato").length;

    const completedSteps = goalSteps.filter((s) => s.completed).length;
    const stepProgress =
      goalSteps.length === 0
        ? 0
        : Math.round((completedSteps / goalSteps.length) * 100);

    const completedFocusActions = focusActions.filter((a) => a.completed).length;
    const focusProgress =
      focusActions.length === 0
        ? 0
        : Math.round((completedFocusActions / focusActions.length) * 100);

    const memoriesWithFiles = memories.filter((m) => m.file_url).length;

    const productivityScore = Math.min(
      100,
      Math.round(
        stepProgress * 0.35 +
          focusProgress * 0.45 +
          Math.min(memories.length * 4, 100) * 0.2
      )
    );

    return {
      completedGoals,
      activeGoals,
      blockedGoals,
      completedSteps,
      stepProgress,
      completedFocusActions,
      focusProgress,
      memoriesWithFiles,
      productivityScore,
    };
  }, [goals, goalSteps, focusActions, memories]);

  const memoryTrendData = useMemo(() => {
    return getLastDays(14).map((day) => {
      const count = memories.filter((memory) => {
        if (!memory.created_at) return false;
        return toDateKey(memory.created_at) === day.key;
      }).length;

      return {
        day: day.label,
        memorie: count,
      };
    });
  }, [memories]);

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};

    memories.forEach((memory) => {
      const category = memory.category || "Senza categoria";
      map[category] = (map[category] || 0) + 1;
    });

    return Object.entries(map)
      .map(([category, count]) => ({
        category,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [memories]);

  const goalStatusData = useMemo(() => {
    const map: Record<string, number> = {};

    goals.forEach((goal) => {
      const status = goal.status || "Da iniziare";
      map[status] = (map[status] || 0) + 1;
    });

    return Object.entries(map).map(([status, count]) => ({
      status,
      count,
    }));
  }, [goals]);

  const goalProgressData = useMemo(() => {
    return goals.slice(0, 8).map((goal) => {
      const steps = goalSteps.filter((step) => step.goal_id === goal.id);
      const completed = steps.filter((step) => step.completed).length;

      const progress =
        steps.length === 0
          ? goal.status === "Completato"
            ? 100
            : 0
          : Math.round((completed / steps.length) * 100);

      return {
        name: goal.title.length > 18 ? goal.title.slice(0, 18) + "..." : goal.title,
        progress,
      };
    });
  }, [goals, goalSteps]);

  const focusTrendData = useMemo(() => {
    return getLastDays(7).map((day) => {
      const dayFocus = focusDays.find((focus) => focus.focus_date === day.key);

      if (!dayFocus) {
        return {
          day: day.label,
          completate: 0,
          totali: 0,
          progresso: 0,
        };
      }

      const actions = focusActions.filter((action) => action.focus_id === dayFocus.id);
      const completed = actions.filter((action) => action.completed).length;

      return {
        day: day.label,
        completate: completed,
        totali: actions.length,
        progresso:
          actions.length === 0 ? 0 : Math.round((completed / actions.length) * 100),
      };
    });
  }, [focusDays, focusActions]);

  const productivityData = useMemo(() => {
    return getLastDays(7).map((day) => {
      const memoryCount = memories.filter((memory) => {
        if (!memory.created_at) return false;
        return toDateKey(memory.created_at) === day.key;
      }).length;

      const stepCount = goalSteps.filter((step) => {
        if (!step.created_at || !step.completed) return false;
        return toDateKey(step.created_at) === day.key;
      }).length;

      const dayFocus = focusDays.find((focus) => focus.focus_date === day.key);
      const focusDone = dayFocus
        ? focusActions.filter(
            (action) => action.focus_id === dayFocus.id && action.completed
          ).length
        : 0;

      return {
        day: day.label,
        memorie: memoryCount,
        step: stepCount,
        focus: focusDone,
      };
    });
  }, [memories, goalSteps, focusDays, focusActions]);

  const aiConsideration = useMemo(() => {
    if (goals.length === 0) {
      return "Crea almeno un goal per far diventare gli insights più intelligenti.";
    }

    if (analytics.blockedGoals > 0) {
      return "Hai alcuni goal bloccati: la priorità dovrebbe essere sbloccare quelli prima di crearne altri.";
    }

    if (analytics.focusProgress < 40 && focusActions.length > 0) {
      return "Il focus giornaliero viene generato, ma non completato abbastanza: riduci le azioni a task più piccoli.";
    }

    if (analytics.stepProgress > 70) {
      return "Stai avanzando bene: ora puoi aumentare leggermente la difficoltà degli obiettivi.";
    }

    return "Il sistema sta crescendo: continua a creare memorie, completare focus e aggiornare i goals.";
  }, [goals, analytics, focusActions]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <h1 className="bg-gradient-to-r from-purple-400 to-cyan-300 bg-clip-text text-5xl font-black text-transparent">
          Caricamento Insights...
        </h1>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <div className="fixed inset-0">
        <div className="absolute left-0 top-0 h-[700px] w-[700px] bg-purple-600/20 blur-[210px]" />
        <div className="absolute bottom-0 right-0 h-[700px] w-[700px] bg-cyan-500/20 blur-[210px]" />
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 bg-fuchsia-500/10 blur-[190px]" />
      </div>

      <div className="relative z-10 flex min-h-screen">
        <aside className="m-5 flex w-[330px] flex-col rounded-[38px] border border-purple-500/20 bg-zinc-950/80 p-7 shadow-[0_0_60px_rgba(168,85,247,0.18)] backdrop-blur-2xl">
          <SidebarLogo />

          <nav className="mt-10 flex flex-col gap-3">
            <NavButton label="Home" onClick={() => router.push("/")} />
              <NavButton
              label="Brain"
              onClick={() => router.push("/brain")}
            />
            <NavButton label="Nuova Memoria" onClick={() => router.push("/memory")} />
            <NavButton label="Memorie" onClick={() => router.push("/memories")} />
            <NavButton label="Chat AI" onClick={() => router.push("/chat")} />
            <NavButton label="Mappa Mentale" onClick={() => router.push("/map")} />

            <button className="rounded-2xl border border-cyan-500/30 bg-cyan-500/15 px-5 py-4 text-left font-bold text-cyan-200 shadow-[0_0_25px_rgba(34,211,238,0.15)]">
              Insights
            </button>

            <NavButton label="Goals" onClick={() => router.push("/goals")} />
            <NavButton label="Focus" onClick={() => router.push("/focus")} />
            <NavButton label="Profilo" onClick={() => router.push("/profile")} />
          </nav>

          <UserBox />
        </aside>

        <section className="flex-1 overflow-y-auto px-8 py-8">
          <div className="mx-auto max-w-[1500px]">
            <header className="mb-8 flex items-end justify-between gap-8">
              <div>
                <p className="text-sm uppercase tracking-[0.4em] text-cyan-300">
                  Neural Analytics
                </p>

                <h1 className="mt-3 bg-gradient-to-r from-purple-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-7xl font-black text-transparent">
                  Insights
                </h1>

                <p className="mt-4 max-w-3xl text-lg leading-relaxed text-zinc-400">
                  Grafici reali su memorie, goals, focus giornaliero e produttività.
                </p>
              </div>

              <button
                onClick={loadInsights}
                className="h-15 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-7 font-black text-cyan-200 transition hover:bg-cyan-500/20"
              >
                Aggiorna dati
              </button>
            </header>

            <div className="grid grid-cols-5 gap-5">
              <StatCard title="Memorie" value={memories.length} />
              <StatCard title="Goals" value={goals.length} />
              <StatCard title="Step" value={`${analytics.stepProgress}%`} />
              <StatCard title="Focus" value={`${analytics.focusProgress}%`} />
              <StatCard title="Score" value={`${analytics.productivityScore}%`} />
            </div>

            <div className="mt-8 grid grid-cols-[1.2fr_0.8fr] gap-8">
              <ChartCard
                title="Crescita memorie"
                subtitle="Numero di memorie salvate negli ultimi 14 giorni."
              >
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={memoryTrendData}>
                    <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                    <XAxis dataKey="day" stroke="#71717a" />
                    <YAxis stroke="#71717a" allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line
                      type="monotone"
                      dataKey="memorie"
                      stroke="#22d3ee"
                      strokeWidth={4}
                      dot={{ r: 5, fill: "#a855f7" }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Memorie per categoria"
                subtitle="Categorie più usate nel tuo cervello digitale."
              >
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={categoryData}>
                    <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                    <XAxis dataKey="category" stroke="#71717a" />
                    <YAxis stroke="#71717a" allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" radius={[14, 14, 0, 0]}>
                      {categoryData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div className="mt-8 grid grid-cols-[0.8fr_1.2fr] gap-8">
              <ChartCard
                title="Stato goals"
                subtitle="Distribuzione degli obiettivi per stato."
              >
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={goalStatusData}
                      dataKey="count"
                      nameKey="status"
                      innerRadius={70}
                      outerRadius={115}
                      paddingAngle={4}
                    >
                      {goalStatusData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="mt-4 flex flex-wrap gap-3">
                  {goalStatusData.map((item, index) => (
                    <span
                      key={item.status}
                      className="rounded-full border border-purple-500/20 bg-black/40 px-4 py-2 text-sm text-zinc-300"
                    >
                      <span style={{ color: COLORS[index % COLORS.length] }}>●</span>{" "}
                      {item.status}: {item.count}
                    </span>
                  ))}
                </div>
              </ChartCard>

              <ChartCard
                title="Progresso goals"
                subtitle="Percentuale di completamento degli obiettivi principali."
              >
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={goalProgressData}>
                    <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="#71717a" />
                    <YAxis stroke="#71717a" domain={[0, 100]} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="progress" radius={[14, 14, 0, 0]}>
                      {goalProgressData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div className="mt-8 grid grid-cols-[1fr_1fr] gap-8">
              <ChartCard
                title="Focus giornaliero"
                subtitle="Azioni completate e progresso negli ultimi 7 giorni."
              >
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={focusTrendData}>
                    <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                    <XAxis dataKey="day" stroke="#71717a" />
                    <YAxis stroke="#71717a" domain={[0, 100]} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line
                      type="monotone"
                      dataKey="progresso"
                      stroke="#a855f7"
                      strokeWidth={4}
                      dot={{ r: 5, fill: "#22d3ee" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Produttività reale"
                subtitle="Memorie create, step completati e focus completati negli ultimi 7 giorni."
              >
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={productivityData}>
                    <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                    <XAxis dataKey="day" stroke="#71717a" />
                    <YAxis stroke="#71717a" allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="memorie" fill="#a855f7" radius={[10, 10, 0, 0]} />
                    <Bar dataKey="step" fill="#22d3ee" radius={[10, 10, 0, 0]} />
                    <Bar dataKey="focus" fill="#d946ef" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div className="mt-8 grid grid-cols-[1fr_1fr_1fr] gap-6">
              <InsightBox
                title="Considerazione AI"
                value={aiConsideration}
                color="cyan"
              />

              <InsightBox
                title="Blocco principale"
                value={
                  analytics.blockedGoals > 0
                    ? `Hai ${analytics.blockedGoals} goal bloccati. Conviene sbloccarli prima di crearne altri.`
                    : "Nessun goal bloccato. Continua ad avanzare sugli step."
                }
                color="red"
              />

              <InsightBox
                title="Prossima mossa"
                value={
                  analytics.focusProgress < 70
                    ? "Vai su Focus e completa almeno una azione giornaliera."
                    : "Ottimo ritmo. Ora aggiorna i goals e crea nuove memorie sui progressi."
                }
                color="purple"
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

const tooltipStyle = {
  background: "#09090b",
  border: "1px solid rgba(168,85,247,0.35)",
  borderRadius: "18px",
  color: "#fff",
};

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

function StatCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[30px] border border-purple-500/20 bg-zinc-950/70 p-6 shadow-[0_0_40px_rgba(168,85,247,0.08)] backdrop-blur-2xl">
      <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
        {title}
      </p>

      <h2 className="mt-4 text-5xl font-black text-white">
        {value}
      </h2>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[38px] border border-purple-500/20 bg-zinc-950/70 p-7 shadow-[0_0_60px_rgba(168,85,247,0.1)] backdrop-blur-2xl">
      <h2 className="text-3xl font-black text-white">
        {title}
      </h2>

      <p className="mt-2 text-sm text-zinc-500">
        {subtitle}
      </p>

      <div className="mt-8">
        {children}
      </div>
    </div>
  );
}

function InsightBox({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color: "cyan" | "red" | "purple";
}) {
  const colorClass =
    color === "cyan"
      ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-300"
      : color === "red"
      ? "border-red-500/20 bg-red-500/10 text-red-300"
      : "border-purple-500/20 bg-purple-500/10 text-purple-300";

  return (
    <div className={`rounded-[34px] border p-7 ${colorClass}`}>
      <p className="text-sm uppercase tracking-[0.3em] opacity-80">
        {title}
      </p>

      <p className="mt-5 text-lg font-bold leading-relaxed text-white/90">
        {value}
      </p>
    </div>
  );
}

function getLastDays(days: number) {
  const result = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    const key = toDateKey(date.toISOString());

    result.push({
      key,
      label: date.toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "2-digit",
      }),
    });
  }

  return result;
}

function toDateKey(date: string) {
  const d = new Date(date);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}