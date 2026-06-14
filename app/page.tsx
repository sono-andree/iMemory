"use client";

import { useRouter } from "next/navigation";
import { JSX, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import SidebarLogo from "@/components/SidebarLogo";
import UserBox from "@/components/UserBox";
import HomeFocusWidget from "@/components/HomeFocusWidget";
import DailyCheckInPopup from "@/components/DailyCheckInPopup";
import BrainXPWidget from "@/components/BrainXPWidget";
import HomeBrainIntelligenceCards from "@/components/HomeBrainIntelligenceCards";
import AICoachSearchCard from "@/components/AICoachSearchCard";

type Memory = {
  id: string;
  title: string | null;
  content: string | null;
  category: string | null;
  file_url?: string | null;
  created_at?: string | null;
};

type CategoryNode = {
  id: string;
  name: string;
  count: number;
  files: number;
  x: number;
  y: number;
};

export default function Home(): JSX.Element {
  const router = useRouter();

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [memories, setMemories] = useState<Memory[]>([]);
  const [nodes, setNodes] = useState<CategoryNode[]>([]);
  const [profileName, setProfileName] = useState("Profilo");
  const [profileInitial, setProfileInitial] = useState("U");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });
  const [moved, setMoved] = useState(false);

  useEffect(() => {
    loadMemories();
  }, []);

  async function loadMemories() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("name, surname, full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    const metadataName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      "";

    const displayName =
      profile?.full_name ||
      `${profile?.name || ""} ${profile?.surname || ""}`.trim() ||
      profile?.name ||
      metadataName ||
      user.email ||
      "Utente";

    setProfileName(displayName);
    setProfileInitial(displayName.trim().charAt(0).toUpperCase() || "U");

    const { data } = await supabase
      .from("memories")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const safeData = (data || []) as Memory[];
    setMemories(safeData);

    const grouped: Record<string, Memory[]> = {};

    safeData.forEach((memory) => {
      const category = memory.category || "Generale";
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(memory);
    });

    const categoryNames = Object.keys(grouped);
    const radius = 300;

    const newNodes = categoryNames.map((category, index) => {
      const angle = (index / Math.max(categoryNames.length, 1)) * Math.PI * 2;

      return {
        id: category,
        name: category,
        count: grouped[category].length,
        files: grouped[category].filter((memory) => memory.file_url).length,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      };
    });

    setNodes(newNodes);
  }

  const stats = useMemo(() => {
    const total = memories.length;
    const files = memories.filter((memory) => memory.file_url).length;
    const categories = new Set(
      memories.map((memory) => memory.category || "Generale")
    ).size;

    const words: Record<string, number> = {};
    const stop = new Set([
      "della",
      "delle",
      "questo",
      "questa",
      "quello",
      "quella",
      "sono",
      "come",
      "con",
      "per",
      "che",
      "una",
      "uno",
      "fare",
      "fatto",
      "memoria",
      "memorie",
      "progetto",
      "nuovo",
      "nuova",
      "creare",
      "creato",
    ]);

    memories.forEach((memory) => {
      const text = `${memory.title || ""} ${memory.content || ""}`.toLowerCase();

      text
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter((word) => word.length > 4 && !stop.has(word))
        .forEach((word) => {
          words[word] = (words[word] || 0) + 1;
        });
    });

    const topWords = Object.entries(words)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    const topCategory =
      nodes.slice().sort((a, b) => b.count - a.count)[0]?.name || "Nessuna";

    return {
      total,
      files,
      categories,
      topWords,
      topCategory,
      brainScore: Math.min(
        100,
        Math.round(total * 7 + files * 4 + categories * 8)
      ),
    };
  }, [memories, nodes]);

  async function ask(customQuestion?: string) {
    const finalQuestion = customQuestion || question;

    if (!finalQuestion.trim()) return;

    setIsLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setAnswer("Devi essere loggato per usare la memoria AI.");
        setIsLoading(false);
        return;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          question: finalQuestion.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAnswer(
          data.error ||
            data.answer ||
            "Errore nella richiesta. Riprova tra qualche secondo."
        );
        setIsLoading(false);
        return;
      }

      setAnswer(data.answer || "Nessuna risposta ricevuta.");
    } catch (error) {
      console.log("HOME CHAT ERROR:", error);
      setAnswer("Errore nella richiesta.");
    }

    setIsLoading(false);
  }

  function startDrag(e: React.MouseEvent, id: string) {
    e.preventDefault();
    setDraggingId(id);
    setLastMouse({ x: e.clientX, y: e.clientY });
    setMoved(false);
  }

  function moveDrag(e: React.MouseEvent) {
    if (!draggingId) return;

    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;

    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      setMoved(true);
    }

    setNodes((prev) =>
      prev.map((node) =>
        node.id === draggingId
          ? {
              ...node,
              x: Math.max(-560, Math.min(560, (node.x || 0) + dx)),
              y: Math.max(-360, Math.min(260, (node.y || 0) + dy)),
            }
          : node
      )
    );

    setLastMouse({ x: e.clientX, y: e.clientY });
  }

  function stopDrag() {
    setDraggingId(null);
  }

  function openCategory(category: string) {
    if (moved) return;
    router.push(`/memories?category=${encodeURIComponent(category)}`);
  }

  return (
    <main className="safe-mobile-bottom min-h-screen overflow-x-hidden bg-black text-white lg:h-screen lg:overflow-hidden lg:pb-0">
      <HomeBrainIntelligenceCards />
      <DailyCheckInPopup />

      <style jsx global>{`
        @keyframes moveDot {
          from {
            left: 0%;
          }
          to {
            left: 100%;
          }
        }

        @keyframes neuralFlow {
          from {
            stroke-dashoffset: 110;
          }
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes pulseGlow {
          0%,
          100% {
            opacity: 0.35;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes brainFloat {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-12px);
          }
        }

        @keyframes mobileCardGlow {
          0%,
          100% {
            box-shadow: 0 0 35px rgba(168, 85, 247, 0.14);
          }
          50% {
            box-shadow: 0 0 55px rgba(34, 211, 238, 0.22);
          }
        }

        .neural-line {
          stroke-dasharray: 12 18;
          animation: neuralFlow 2.2s linear infinite,
            pulseGlow 3s ease-in-out infinite;
        }

        .brain-float-soft {
          animation: brainFloat 5.5s ease-in-out infinite;
        }

        .mobile-card-glow {
          animation: mobileCardGlow 4.5s ease-in-out infinite;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_8%,rgba(168,85,247,0.25),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(34,211,238,0.15),transparent_28%),linear-gradient(135deg,#020617,#000,#09090b)]" />

      <DesktopSidebar />

      <MobileHome
        question={question}
        setQuestion={setQuestion}
        answer={answer}
        isLoading={isLoading}
        ask={ask}
        nodes={nodes}
        stats={stats}
        profileName={profileName}
        profileInitial={profileInitial}
        openCategory={(category) =>
          router.push(`/memories?category=${encodeURIComponent(category)}`)
        }
      />

      <DesktopWorkspace
        question={question}
        setQuestion={setQuestion}
        answer={answer}
        isLoading={isLoading}
        ask={ask}
        nodes={nodes}
        stats={stats}
        startDrag={startDrag}
        moveDrag={moveDrag}
        stopDrag={stopDrag}
        openCategory={openCategory} profileName={""} profileInitial={""}      />
    </main>
  );
}

function DesktopSidebar() {
  return (
    <aside className="fixed left-6 top-6 z-50 hidden h-[calc(100vh-48px)] w-[300px] flex-col overflow-hidden rounded-[38px] border border-purple-500/30 bg-zinc-950/80 p-5 text-white shadow-[0_0_70px_rgba(168,85,247,0.35)] backdrop-blur-2xl lg:flex xl:w-[315px] 2xl:w-[340px]">
      <div className="flex h-full min-h-0 flex-col">
        <SidebarLogo />

        <nav className="mt-8 min-h-0 flex-1 overflow-y-auto pr-1 text-base text-gray-400">
          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="rounded-2xl bg-purple-500/10 px-4 py-3 font-bold text-purple-300"
            >
              Home
            </Link>
            <NavLink label="Brain" href="/brain" />
            <NavLink href="/chat" label="Chat" />
            <NavLink href="/memories" label="Memorie" />
            <NavLink href="/memory" label="Nuova Memoria" />
            <NavLink href="/map" label="Mappa Mentale" />
            <NavLink href="/insights" label="Insights" />
            <NavLink href="/goals" label="Goals" />
          </div>
        </nav>

        <div className="mt-4 shrink-0">
          <UserBox />
        </div>
      </div>
    </aside>
  );
}

function MobileHome({
  question,
  setQuestion,
  answer,
  isLoading,
  ask,
  nodes,
  stats,
  profileName,
  profileInitial,
  openCategory,
}: {
  question: string;
  setQuestion: (value: string) => void;
  answer: string;
  isLoading: boolean;
  ask: () => void;
  nodes: CategoryNode[];
  profileName: string;
  profileInitial: string;
  stats: {
    total: number;
    files: number;
    categories: number;
    topWords: [string, number][];
    topCategory: string;
    brainScore: number;
  };
  openCategory: (category: string) => void;
}) {
  return (
    <section className="relative z-10 block px-4 py-5 lg:hidden">
      <header className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-purple-300">
            iMemory
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-[-0.07em]">
            Brain Home
          </h1>
        </div>

        <Link
          href="/profile"
          aria-label="Apri profilo"
          title={profileName}
          className="group relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-cyan-300/30 bg-black/45 shadow-[0_0_32px_rgba(34,211,238,0.28)] backdrop-blur-2xl transition hover:scale-105 hover:border-purple-300/50 hover:shadow-[0_0_46px_rgba(168,85,247,0.42)]"
        >
          <span className="absolute inset-[-5px] rounded-full bg-[conic-gradient(from_140deg,rgba(34,211,238,0.0),rgba(34,211,238,0.55),rgba(168,85,247,0.65),rgba(34,211,238,0.0))] opacity-70 blur-md transition group-hover:opacity-100" />
          <span className="absolute inset-[2px] rounded-full bg-gradient-to-br from-cyan-400/20 via-purple-500/25 to-black" />
          <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-zinc-950/85 text-lg font-black uppercase tracking-[-0.04em] text-white shadow-[inset_0_0_18px_rgba(255,255,255,0.06)]">
            {profileInitial}
          </span>
          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-black bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.85)]" />
        </Link>
      </header>

      <div className="mobile-card-glow relative overflow-hidden rounded-[34px] border border-purple-400/20 bg-[#05050A]/88 p-5 backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(168,85,247,0.23),transparent_38%),radial-gradient(circle_at_80%_80%,rgba(34,211,238,0.13),transparent_34%)]" />

        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-cyan-300">
            Digital Brain
          </p>

          <div className="brain-float-soft mx-auto mt-4 flex h-[230px] items-center justify-center">
            <Image
              src="/newnewnew.png"
              alt="iMemory Brain"
              width={260}
              height={260}
              priority
              className="max-h-[230px] w-auto object-contain drop-shadow-[0_0_70px_rgba(34,211,238,0.42)]"
            />
          </div>

          <h2 className="mt-2 text-4xl font-black leading-[0.95] tracking-[-0.08em]">
            La tua memoria intelligente.
          </h2>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Cerca nelle memorie, apri il Brain e continua la prossima azione dal telefono.
          </p>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <MiniStat label="Memorie" value={stats.total} />
            <MiniStat label="File" value={stats.files} />
            <MiniStat label="Score" value={stats.brainScore} />
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[30px] border border-white/10 bg-white/[0.035] p-4 shadow-[0_0_50px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-purple-300">
          Chiedi alla memoria
        </p>

        <div className="mt-3 flex flex-col gap-3">
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && ask()}
            placeholder="Chiedi qualcosa a iMemory..."
            className="h-13 w-full rounded-2xl border border-zinc-800 bg-black/70 px-4 text-base text-gray-200 outline-none focus:border-purple-500"
          />

          <button
            onClick={ask}
            disabled={isLoading}
            className="h-12 rounded-2xl bg-purple-600 text-sm font-black uppercase tracking-[0.16em] text-white shadow-[0_0_35px_rgba(168,85,247,0.35)] transition hover:bg-purple-500 disabled:opacity-60"
          >
            {isLoading ? "Cercando..." : "Cerca"}
          </button>

          <AICoachSearchCard />
        </div>

        {answer && (
          <div className="mt-4 max-h-56 overflow-y-auto rounded-2xl border border-purple-500/20 bg-black/60 p-4 text-sm leading-6 text-gray-300">
            {answer}
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <QuickLink href="/brain" title="Brain" text="Centro AI" />
        <QuickLink href="/ai-actions?start=next" title="AI Actions" text="Esegui" />
        <QuickLink href="/memory" title="Nuova memoria" text="Salva" />
        <QuickLink href="/memories" title="Memorie" text="Archivio" />
      </div>

      <div className="mt-4 grid gap-4">
        <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.035] p-4 backdrop-blur-2xl">
          <BrainXPWidget />
        </div>

        <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.035] p-4 backdrop-blur-2xl">
          <HomeFocusWidget />
        </div>
      </div>

      <section className="mt-4 rounded-[30px] border border-white/10 bg-white/[0.035] p-4 backdrop-blur-2xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
              Cluster
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-[-0.05em]">
              Categorie attive
            </h2>
          </div>

          <Link href="/memories" className="text-xs font-black text-purple-300">
            Apri →
          </Link>
        </div>

        <div className="mt-4 grid gap-3">
          {nodes.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-500">
              Nessuna categoria ancora. Crea la tua prima memoria.
            </p>
          ) : (
            nodes.slice(0, 8).map((node) => (
              <button
                key={node.id}
                onClick={() => openCategory(node.name)}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/25 p-4 text-left transition hover:border-purple-400/30 hover:bg-purple-500/10"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-500 text-xl shadow-[0_0_25px_rgba(34,211,238,0.25)]">
                  🧠
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-black text-white">
                    {node.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {node.count} memorie · {node.files} file
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="mt-4 rounded-[30px] border border-white/10 bg-white/[0.035] p-4 backdrop-blur-2xl">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-purple-300">
          Insights
        </p>

        <Insight title="🎯 Obiettivo consigliato">
          Concentrati sul cluster <b>{stats.topCategory}</b>: sembra essere la zona più forte della tua memoria.
        </Insight>

        <Insight title="🚀 Prossima azione">
          Apri una memoria importante e trasformala in un progetto concreto.
        </Insight>

        <Insight title="🧠 Concetti attivi">
          <div className="mt-3 flex flex-wrap gap-2">
            {stats.topWords.length === 0 && (
              <span className="text-gray-500">Nessun concetto rilevato.</span>
            )}

            {stats.topWords.map(([word, count]) => (
              <span
                key={word}
                className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-200"
              >
                {word} · {count}
              </span>
            ))}
          </div>
        </Insight>
      </section>
    </section>
  );
}

function DesktopWorkspace({
  question,
  setQuestion,
  answer,
  isLoading,
  ask,
  nodes,
  stats,
  startDrag,
  moveDrag,
  stopDrag,
  openCategory,
}: {
  question: string;
  setQuestion: (value: string) => void;
  answer: string;
  isLoading: boolean;
  ask: () => void;
  nodes: CategoryNode[];
  profileName: string;
  profileInitial: string;
  stats: {
    total: number;
    files: number;
    categories: number;
    topWords: [string, number][];
    topCategory: string;
    brainScore: number;
  };
  startDrag: (event: React.MouseEvent, id: string) => void;
  moveDrag: (event: React.MouseEvent) => void;
  stopDrag: () => void;
  openCategory: (category: string) => void;
}) {
  return (
    <section
      onMouseMove={moveDrag}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
      className="relative hidden h-screen overflow-hidden lg:ml-[348px] lg:flex xl:ml-[363px] 2xl:ml-[388px]"
    >
      <div className="relative min-w-0 flex-1">
        <div className="absolute inset-0">
          <div className="pointer-events-none absolute inset-0 z-0">
            {nodes.map((node, index) => (
              <NeuralLine key={node.id} node={node} index={index} />
            ))}
          </div>

          <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <div className="absolute inset-0 rounded-full bg-purple-600/40 blur-[160px]" />

            <Image
              src="/newnewnew.png"
              alt="iMemory Brain"
              width={390}
              height={390}
              priority
              className="relative z-10 select-none drop-shadow-[0_0_80px_rgba(255,255,255,0.45)]"
            />
          </div>

          {nodes.map((node) => (
            <div
              key={node.id}
              onMouseDown={(event) => startDrag(event, node.id)}
              onMouseUp={() => openCategory(node.name)}
              className="absolute z-30 cursor-grab active:cursor-grabbing active:scale-95"
              style={{
                left: `calc(50% + ${node.x || 0}px)`,
                top: `calc(50% + ${node.y || 0}px)`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <CategoryCard node={node} />
            </div>
          ))}
        </div>

        <div className="absolute bottom-6 left-6 right-6 z-50">
          <div className="rounded-[30px] border border-purple-500/20 bg-zinc-950/82 p-4 shadow-[0_0_60px_rgba(168,85,247,0.25)] backdrop-blur-2xl">
            <div className="grid gap-3 xl:grid-cols-[1fr_180px_280px]">
              <input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && ask()}
                placeholder="Chiedi qualcosa alla tua memoria..."
                className="h-13 rounded-2xl border border-zinc-800 bg-black px-5 text-base text-gray-200 outline-none focus:border-purple-500"
              />

              <button
                onClick={ask}
                disabled={isLoading}
                className="h-13 rounded-2xl bg-purple-600 px-6 text-sm font-black uppercase tracking-[0.14em] shadow-[0_0_35px_rgba(168,85,247,0.35)] hover:bg-purple-500 disabled:opacity-60"
              >
                {isLoading ? "..." : "Cerca"}
              </button>

              <AICoachSearchCard />
            </div>

            {answer && (
              <div className="mt-4 max-h-44 overflow-y-auto rounded-2xl border border-purple-500/20 bg-black/60 p-5 text-sm leading-6 text-gray-300">
                {answer}
              </div>
            )}
          </div>
        </div>
      </div>

      <aside className="relative z-40 m-6 h-[calc(100vh-48px)] w-[390px] shrink-0 overflow-y-auto rounded-[38px] border border-cyan-500/30 bg-zinc-950/85 p-6 shadow-[0_0_70px_rgba(34,211,238,0.25)] backdrop-blur-2xl 2xl:w-[430px]">
        <BrainXPWidget />

        <div className="mt-5">
          <HomeFocusWidget />
        </div>

        <div className="mt-6 rounded-3xl border border-purple-500/20 bg-black/40 p-6">
          <p className="text-sm text-purple-300">Brain Score</p>
          <p className="mt-2 text-6xl font-bold">{stats.brainScore}</p>
          <p className="mt-3 text-gray-500">
            Più memorie e categorie salvi, più cresce il tuo cervello digitale.
          </p>
        </div>

        <Insight title="🎯 Obiettivo consigliato">
          Concentrati sul cluster <b>{stats.topCategory}</b>: sembra essere la zona più forte della tua memoria.
        </Insight>

        <Insight title="🚀 Prossima azione">
          Apri la categoria più importante, trova una memoria utile e trasformala in un progetto concreto.
        </Insight>

        <Insight title="🧠 Concetti attivi">
          <div className="mt-4 flex flex-wrap gap-3">
            {stats.topWords.length === 0 && (
              <span className="text-gray-500">Nessun concetto rilevato.</span>
            )}

            {stats.topWords.map(([word, count]) => (
              <span
                key={word}
                className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200"
              >
                {word} · {count}
              </span>
            ))}
          </div>
        </Insight>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <Link
            href="/memory"
            className="rounded-3xl border border-purple-500/30 bg-purple-500/10 p-5 text-center font-bold text-purple-200 hover:bg-purple-500/20"
          >
            ✨ Nuova Memoria
          </Link>

          <Link
            href="/chat"
            className="rounded-3xl border border-cyan-500/30 bg-cyan-500/10 p-5 text-center font-bold text-cyan-200 hover:bg-cyan-500/20"
          >
            💬 Chat AI
          </Link>
        </div>
      </aside>
    </section>
  );
}

function NeuralLine({
  node,
  index,
}: {
  node: CategoryNode;
  index: number;
}) {
  const length = Math.sqrt(node.x * node.x + node.y * node.y);
  const angle = Math.atan2(node.y, node.x) * (180 / Math.PI);

  const colors = [
    "from-pink-500 to-purple-500",
    "from-cyan-400 to-blue-500",
    "from-green-400 to-teal-400",
    "from-yellow-400 to-orange-500",
  ];

  const color = colors[index % colors.length];

  return (
    <div
      className="absolute left-1/2 top-1/2 h-[3px] origin-left"
      style={{
        width: `${length}px`,
        transform: `rotate(${angle}deg)`,
      }}
    >
      <div
        className={`relative h-full w-full rounded-full bg-gradient-to-r ${color} opacity-80 shadow-[0_0_18px_rgba(34,211,238,0.8)]`}
      >
        <div className="absolute inset-0 animate-pulse rounded-full bg-white/30 blur-sm" />

        <div
          className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_14px_white]"
          style={{
            animation: `moveDot ${2 + index * 0.15}s linear infinite`,
          }}
        />
      </div>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl px-4 py-3 transition hover:bg-white/5 hover:text-white"
    >
      {label}
    </Link>
  );
}

function QuickLink({
  href,
  title,
  text,
}: {
  href: string;
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4 shadow-[0_0_35px_rgba(0,0,0,0.28)] backdrop-blur-2xl transition hover:border-purple-400/30 hover:bg-purple-500/10"
    >
      <p className="text-lg font-black text-white">{title}</p>
      <p className="mt-1 text-xs text-zinc-500">{text}</p>
    </Link>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-purple-500/20 bg-black/40 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function CategoryCard({ node }: { node: CategoryNode }) {
  return (
    <div className="group flex h-[82px] w-[220px] items-center gap-4 rounded-3xl border border-white/10 bg-zinc-950/65 px-5 shadow-[0_0_35px_rgba(34,211,238,0.16)] backdrop-blur-xl transition duration-300 hover:scale-105 hover:border-white/20 hover:shadow-[0_0_45px_rgba(168,85,247,0.42)]">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-500 text-xl shadow-[0_0_25px_rgba(34,211,238,0.35)]">
        🧠
      </div>

      <div className="flex-1">
        <p className="text-lg font-semibold text-white">{node.name}</p>

        <p className="text-sm text-gray-400">{node.count} memorie</p>
      </div>
    </div>
  );
}

function Insight({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 rounded-3xl border border-zinc-800 bg-black/40 p-5">
      <h3 className="font-bold text-purple-300">{title}</h3>
      <div className="mt-3 leading-relaxed text-gray-300">{children}</div>
    </div>
  );
}
