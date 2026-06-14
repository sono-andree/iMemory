"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SidebarLogo from "@/components/SidebarLogo";
import UserBox from "@/components/UserBox";
import UsagePanel from "@/components/UsagePanel";

type Profile = {
  id: string;
  name: string | null;
  surname: string | null;
  full_name: string | null;
  email: string | null;
  brain_level: number | null;
  brain_score: number | null;
  goals: string[] | null;
  created_at: string | null;
};

type Memory = {
  id: number;
  category: string | null;
  file_url: string | null;
  created_at: string | null;
};

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");

  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [goalsText, setGoalsText] = useState("");

  const [brainLevel, setBrainLevel] = useState(1);
  const [brainScore, setBrainScore] = useState(0);
  const [createdAt, setCreatedAt] = useState("");

  const [memories, setMemories] = useState<Memory[]>([]);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push("/login");
      return;
    }

    setUserId(user.id);
    setEmail(user.email || "");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>();

    if (profileError) {
      console.log("PROFILE ERROR:", profileError);

      const fallbackName = user.user_metadata?.name || "";
      const fallbackSurname = user.user_metadata?.surname || "";
      const fallbackFullName =
        user.user_metadata?.full_name ||
        `${fallbackName} ${fallbackSurname}`.trim();

      await supabase.from("profiles").upsert({
        id: user.id,
        name: fallbackName,
        surname: fallbackSurname,
        full_name: fallbackFullName,
        email: user.email || "",
        brain_level: 1,
        brain_score: 0,
        goals: [],
      });

      setName(fallbackName);
      setSurname(fallbackSurname);
      setGoalsText("");
      setBrainLevel(1);
      setBrainScore(0);
    } else if (profile) {
      setName(profile.name || "");
      setSurname(profile.surname || "");
      setBrainLevel(profile.brain_level || 1);
      setBrainScore(profile.brain_score || 0);
      setCreatedAt(profile.created_at || "");

      if (profile.goals && Array.isArray(profile.goals)) {
        setGoalsText(profile.goals.join("\n"));
      }
    }

    const { data: memoryData, error: memoryError } = await supabase
      .from("memories")
      .select("id, category, file_url, created_at")
      .eq("user_id", user.id)
      .order("id", { ascending: false });

    if (memoryError) {
      console.log("MEMORIES PROFILE ERROR:", memoryError);
    }

    setMemories(memoryData || []);
    setLoading(false);
  }

  async function saveProfile() {
    if (!userId) return;

    const cleanName = name.trim();
    const cleanSurname = surname.trim();

    if (!cleanName || !cleanSurname) {
      alert("Nome e cognome non possono essere vuoti");
      return;
    }

    const goals = goalsText
      .split("\n")
      .map((goal) => goal.trim())
      .filter(Boolean);

    setSaving(true);

    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      name: cleanName,
      surname: cleanSurname,
      full_name: `${cleanName} ${cleanSurname}`,
      email,
      brain_level: brainLevel,
      brain_score: brainScore,
      goals,
    });

    setSaving(false);

    if (error) {
      console.log("SAVE PROFILE ERROR:", error);
      alert("Errore salvataggio profilo: " + error.message);
      return;
    }

    alert("Profilo aggiornato con successo");
    loadProfile();
  }

  const stats = useMemo(() => {
    const total = memories.length;
    const withFiles = memories.filter((memory) => memory.file_url).length;

    const categoriesMap: Record<string, number> = {};

    memories.forEach((memory) => {
      const category = memory.category || "Senza categoria";
      categoriesMap[category] = (categoriesMap[category] || 0) + 1;
    });

    const categories = Object.entries(categoriesMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const topCategory = categories[0]?.name || "Nessuna";

    return {
      total,
      withFiles,
      categories,
      topCategory,
    };
  }, [memories]);

  const computedBrainScore = useMemo(() => {
    return stats.total * 25 + stats.withFiles * 15 + stats.categories.length * 40;
  }, [stats]);

  const computedLevel = useMemo(() => {
    return Math.max(1, Math.floor(computedBrainScore / 250) + 1);
  }, [computedBrainScore]);

  async function updateBrainStats() {
    if (!userId) return;

    setBrainScore(computedBrainScore);
    setBrainLevel(computedLevel);

    await supabase
      .from("profiles")
      .update({
        brain_score: computedBrainScore,
        brain_level: computedLevel,
      })
      .eq("id", userId);

    alert("Brain score aggiornato");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="rounded-[30px] border border-white/10 bg-white/[0.04] px-8 py-6 text-center backdrop-blur-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-purple-300">
            iMemory profile
          </p>
          <h1 className="mt-3 bg-gradient-to-r from-purple-400 to-cyan-300 bg-clip-text text-4xl font-black text-transparent md:text-5xl">
            Caricamento...
          </h1>
        </div>
      </main>
    );
  }

  return (
    <main className="safe-mobile-bottom min-h-screen overflow-x-hidden bg-black pb-24 text-white lg:pb-0">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-0 top-0 h-[650px] w-[650px] bg-purple-600/20 blur-[190px]" />
        <div className="absolute bottom-0 right-0 h-[650px] w-[650px] bg-cyan-500/20 blur-[190px]" />
      </div>

      <MobileProfileView
        name={name}
        surname={surname}
        email={email}
        goalsText={goalsText}
        setName={setName}
        setSurname={setSurname}
        setGoalsText={setGoalsText}
        brainScore={brainScore}
        brainLevel={brainLevel}
        createdAt={createdAt}
        stats={stats}
        saving={saving}
        saveProfile={saveProfile}
        updateBrainStats={updateBrainStats}
      />

      <div className="relative z-10 hidden min-h-screen lg:flex">
        <aside className="m-5 flex w-[330px] flex-col rounded-[38px] border border-purple-500/20 bg-zinc-950/80 p-7 shadow-[0_0_60px_rgba(168,85,247,0.18)] backdrop-blur-2xl">
          <SidebarLogo />

          <nav className="mt-10 flex flex-col gap-3">
            <button
              onClick={() => router.push("/")}
              className="rounded-2xl px-5 py-4 text-left text-zinc-400 transition hover:bg-purple-500/10 hover:text-white"
            >
              Home
            </button>

            <button
              onClick={() => router.push("/memory")}
              className="rounded-2xl px-5 py-4 text-left text-zinc-400 transition hover:bg-purple-500/10 hover:text-white"
            >
              Nuova Memoria
            </button>

            <button
              onClick={() => router.push("/memories")}
              className="rounded-2xl px-5 py-4 text-left text-zinc-400 transition hover:bg-purple-500/10 hover:text-white"
            >
              Memorie
            </button>

            <button
              onClick={() => router.push("/chat")}
              className="rounded-2xl px-5 py-4 text-left text-zinc-400 transition hover:bg-purple-500/10 hover:text-white"
            >
              Chat AI
            </button>

            <button
              onClick={() => router.push("/map")}
              className="rounded-2xl px-5 py-4 text-left text-zinc-400 transition hover:bg-purple-500/10 hover:text-white"
            >
              Mappa Mentale
            </button>

            <button
              onClick={() => router.push("/insights")}
              className="rounded-2xl px-5 py-4 text-left text-zinc-400 transition hover:bg-purple-500/10 hover:text-white"
            >
              Insights
            </button>

            <button className="rounded-2xl border border-purple-500/30 bg-purple-500/15 px-5 py-4 text-left font-bold text-purple-200 shadow-[0_0_25px_rgba(168,85,247,0.15)]">
              Profilo
            </button>
          </nav>

          <UserBox />
        </aside>

        <section className="flex-1 overflow-y-auto px-8 py-8">
          <div className="mx-auto max-w-[1350px]">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-purple-300">
                  Account personale
                </p>

                <h1 className="mt-3 bg-gradient-to-r from-purple-300 to-cyan-300 bg-clip-text text-6xl font-black text-transparent">
                  Profilo
                </h1>

                <p className="mt-4 max-w-2xl text-lg text-zinc-400">
                  Gestisci la tua identità, i tuoi obiettivi e la crescita del tuo cervello digitale.
                </p>
              </div>

              <button
                onClick={updateBrainStats}
                className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-6 py-4 font-bold text-cyan-200 transition hover:bg-cyan-500/20"
              >
                Aggiorna Brain Score
              </button>
            </div>

            <UsagePanel />

            <div className="mt-8 grid grid-cols-[1fr_420px] gap-8">
              <div className="rounded-[38px] border border-purple-500/20 bg-zinc-950/70 p-8 shadow-[0_0_60px_rgba(168,85,247,0.12)] backdrop-blur-2xl">
                <h2 className="text-3xl font-black text-white">
                  Dati profilo
                </h2>

                <p className="mt-2 text-zinc-500">
                  Questi dati vengono presi dal register e salvati nella tabella profiles.
                </p>

                <button
                  onClick={() => router.push("/pricing")}
                  className="mt-5 rounded-2xl border border-purple-500/30 bg-purple-500/15 px-5 py-4 text-left text-purple-200 transition hover:bg-purple-500/20 hover:text-white"
                >
                  Pricing
                </button>

                <div className="mt-8 grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-sm uppercase tracking-[0.25em] text-purple-300">
                      Nome
                    </label>

                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="mt-3 h-14 w-full rounded-2xl border border-zinc-800 bg-black/60 px-5 text-white outline-none transition focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-sm uppercase tracking-[0.25em] text-purple-300">
                      Cognome
                    </label>

                    <input
                      value={surname}
                      onChange={(event) => setSurname(event.target.value)}
                      className="mt-3 h-14 w-full rounded-2xl border border-zinc-800 bg-black/60 px-5 text-white outline-none transition focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <label className="text-sm uppercase tracking-[0.25em] text-purple-300">
                    Email
                  </label>

                  <input
                    value={email}
                    disabled
                    className="mt-3 h-14 w-full cursor-not-allowed rounded-2xl border border-zinc-800 bg-black/40 px-5 text-zinc-500 outline-none"
                  />
                </div>

                <div className="mt-5">
                  <label className="text-sm uppercase tracking-[0.25em] text-purple-300">
                    Obiettivi personali
                  </label>

                  <textarea
                    value={goalsText}
                    onChange={(event) => setGoalsText(event.target.value)}
                    placeholder={"Scrivi un obiettivo per riga...\nEsempio: Finire iMemory\nPubblicarlo online\nTrovare i primi utenti"}
                    className="mt-3 min-h-[190px] w-full resize-none rounded-3xl border border-zinc-800 bg-black/60 p-5 text-white outline-none transition placeholder:text-zinc-600 focus:border-purple-500"
                  />
                </div>

                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="mt-8 h-16 w-full rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-500 text-xl font-bold shadow-[0_0_45px_rgba(168,85,247,0.35)] transition hover:scale-[1.01] disabled:opacity-60"
                >
                  {saving ? "Salvataggio..." : "Salva Profilo"}
                </button>
              </div>

              <div className="flex flex-col gap-6">
                <div className="rounded-[38px] border border-cyan-500/20 bg-zinc-950/70 p-8 shadow-[0_0_60px_rgba(34,211,238,0.1)] backdrop-blur-2xl">
                  <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">
                    Brain Identity
                  </p>

                  <div className="mt-8 flex items-center gap-5">
                    <div className="flex h-24 w-24 items-center justify-center rounded-[30px] bg-gradient-to-br from-purple-600 to-cyan-500 text-5xl font-black shadow-[0_0_45px_rgba(34,211,238,0.35)]">
                      {name ? name.charAt(0).toUpperCase() : "U"}
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate text-3xl font-black">
                        {name} {surname}
                      </h2>

                      <p className="mt-2 truncate text-zinc-500">
                        {email}
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 rounded-[28px] border border-purple-500/20 bg-black/40 p-5">
                    <p className="text-zinc-500">
                      Brain Score
                    </p>

                    <h3 className="mt-2 text-5xl font-black text-cyan-300">
                      {brainScore}
                    </h3>

                    <p className="mt-3 text-sm text-zinc-500">
                      Calcolato in base a memorie, file e categorie.
                    </p>
                  </div>
                </div>

                <div className="rounded-[38px] border border-purple-500/20 bg-zinc-950/70 p-8 backdrop-blur-2xl">
                  <h2 className="text-2xl font-black">
                    Attività
                  </h2>

                  <div className="mt-6 space-y-4">
                    <InfoRow label="Categoria principale" value={stats.topCategory} />
                    <InfoRow label="Account creato" value={createdAt ? formatDate(createdAt) : "Non disponibile"} />
                    <InfoRow label="Memorie con file" value={`${stats.withFiles}`} />
                  </div>
                </div>

                <div className="rounded-[38px] border border-purple-500/20 bg-zinc-950/70 p-8 backdrop-blur-2xl">
                  <h2 className="text-2xl font-black">
                    Categorie più usate
                  </h2>

                  <div className="mt-6 flex flex-wrap gap-3">
                    {stats.categories.length === 0 ? (
                      <p className="text-zinc-500">
                        Nessuna categoria ancora.
                      </p>
                    ) : (
                      stats.categories.slice(0, 8).map((category) => (
                        <span
                          key={category.name}
                          className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200"
                        >
                          {category.name} · {category.count}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function MobileProfileView({
  name,
  surname,
  email,
  goalsText,
  setName,
  setSurname,
  setGoalsText,
  brainScore,
  brainLevel,
  createdAt,
  stats,
  saving,
  saveProfile,
  updateBrainStats,
}: {
  name: string;
  surname: string;
  email: string;
  goalsText: string;
  setName: (value: string) => void;
  setSurname: (value: string) => void;
  setGoalsText: (value: string) => void;
  brainScore: number;
  brainLevel: number;
  createdAt: string;
  stats: {
    total: number;
    withFiles: number;
    categories: { name: string; count: number }[];
    topCategory: string;
  };
  saving: boolean;
  saveProfile: () => void;
  updateBrainStats: () => void;
}) {
  const initial = name ? name.charAt(0).toUpperCase() : "U";

  return (
    <section className="relative z-10 block px-4 py-5 lg:hidden">
      <header className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-purple-300">
            Account personale
          </p>

          <h1 className="mt-1 text-3xl font-black tracking-[-0.06em]">
            Profilo
          </h1>
        </div>

        <Link
          href="/pricing"
          className="flex h-11 items-center justify-center rounded-2xl border border-purple-400/20 bg-purple-500/10 px-4 text-xs font-black uppercase tracking-[0.14em] text-purple-200"
        >
          Pro
        </Link>
      </header>

      <div className="rounded-[34px] border border-cyan-500/20 bg-zinc-950/75 p-5 shadow-[0_0_60px_rgba(34,211,238,0.16)] backdrop-blur-2xl">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">
          Brain Identity
        </p>

        <div className="mt-5 flex items-center gap-4">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-[28px] bg-gradient-to-br from-purple-600 to-cyan-500 text-4xl font-black shadow-[0_0_45px_rgba(34,211,238,0.35)]">
            {initial}
            <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.9)]" />
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-2xl font-black">
              {name} {surname}
            </h2>

            <p className="mt-1 truncate text-sm text-zinc-500">{email}</p>

            <div className="mt-3 flex gap-2">
              <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-200">
                Level {brainLevel}
              </span>

              <span className="rounded-full border border-purple-400/20 bg-purple-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-purple-200">
                Score {brainScore}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={updateBrainStats}
          className="mt-5 h-12 w-full rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-sm font-black uppercase tracking-[0.14em] text-cyan-200 transition hover:bg-cyan-500/20"
        >
          Aggiorna Brain Score
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.035] p-4 backdrop-blur-2xl">
        <UsagePanel />
      </div>

      <div className="mt-4 rounded-[34px] border border-purple-500/20 bg-zinc-950/70 p-5 shadow-[0_0_60px_rgba(168,85,247,0.12)] backdrop-blur-2xl">
        <h2 className="text-2xl font-black text-white">Dati profilo</h2>

        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Modifica nome, cognome e obiettivi personali.
        </p>

        <div className="mt-5 grid gap-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.24em] text-purple-300">
              Nome
            </label>

            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-3 h-14 w-full rounded-2xl border border-zinc-800 bg-black/60 px-4 text-base text-white outline-none transition focus:border-purple-500"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.24em] text-purple-300">
              Cognome
            </label>

            <input
              value={surname}
              onChange={(event) => setSurname(event.target.value)}
              className="mt-3 h-14 w-full rounded-2xl border border-zinc-800 bg-black/60 px-4 text-base text-white outline-none transition focus:border-purple-500"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.24em] text-purple-300">
              Email
            </label>

            <input
              value={email}
              disabled
              className="mt-3 h-14 w-full cursor-not-allowed rounded-2xl border border-zinc-800 bg-black/40 px-4 text-base text-zinc-500 outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.24em] text-purple-300">
              Obiettivi personali
            </label>

            <textarea
              value={goalsText}
              onChange={(event) => setGoalsText(event.target.value)}
              placeholder={"Scrivi un obiettivo per riga...\nEsempio: Finire iMemory\nPubblicarlo online\nTrovare i primi utenti"}
              className="mt-3 min-h-[170px] w-full resize-none rounded-3xl border border-zinc-800 bg-black/60 p-4 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-purple-500"
            />
          </div>
        </div>

        <button
          onClick={saveProfile}
          disabled={saving}
          className="mt-6 h-14 w-full rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-500 text-base font-black shadow-[0_0_45px_rgba(168,85,247,0.35)] transition hover:scale-[1.01] disabled:opacity-60"
        >
          {saving ? "Salvataggio..." : "Salva Profilo"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <MobileStat title="Memorie" value={stats.total} />
        <MobileStat title="Con file" value={stats.withFiles} />
        <MobileStat title="Categorie" value={stats.categories.length} />
        <MobileStat title="Top" value={stats.topCategory} />
      </div>

      <div className="mt-4 rounded-[30px] border border-purple-500/20 bg-zinc-950/70 p-5 backdrop-blur-2xl">
        <h2 className="text-xl font-black">Attività</h2>

        <div className="mt-5 space-y-4">
          <InfoRow label="Categoria principale" value={stats.topCategory} />
          <InfoRow
            label="Account creato"
            value={createdAt ? formatDate(createdAt) : "Non disponibile"}
          />
          <InfoRow label="Memorie con file" value={`${stats.withFiles}`} />
        </div>
      </div>

      <div className="mt-4 rounded-[30px] border border-purple-500/20 bg-zinc-950/70 p-5 backdrop-blur-2xl">
        <h2 className="text-xl font-black">Categorie più usate</h2>

        <div className="mt-5 flex flex-wrap gap-2">
          {stats.categories.length === 0 ? (
            <p className="text-sm text-zinc-500">Nessuna categoria ancora.</p>
          ) : (
            stats.categories.slice(0, 8).map((category) => (
              <span
                key={category.name}
                className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200"
              >
                {category.name} · {category.count}
              </span>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function MobileStat({
  title,
  value,
}: {
  title: string;
  value: number | string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4 backdrop-blur-2xl">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
        {title}
      </p>

      <p className="mt-2 truncate text-2xl font-black text-white">
        {value}
      </p>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: number | string;
  subtitle: string;
}) {
  return (
    <div className="rounded-[30px] border border-purple-500/20 bg-zinc-950/70 p-6 backdrop-blur-2xl">
      <p className="text-sm uppercase tracking-[0.25em] text-zinc-500">
        {title}
      </p>

      <h2 className="mt-4 text-5xl font-black text-white">
        {value}
      </h2>

      <p className="mt-2 text-sm text-zinc-500">
        {subtitle}
      </p>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-3">
      <span className="text-sm text-zinc-500">
        {label}
      </span>

      <span className="max-w-[180px] truncate text-right text-sm font-bold text-white">
        {value}
      </span>
    </div>
  );
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
