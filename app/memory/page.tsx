"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  FiUploadCloud,
  FiFileText,
  FiImage,
  FiVideo,
  FiMusic,
  FiBook,
  FiCpu,
  FiBriefcase,
  FiUser,
  FiLayers,
  FiRefreshCw,
  FiSave,
  FiX,
  FiArrowLeft,
} from "react-icons/fi";
import SidebarLogo from "@/components/SidebarLogo";
import UserBox from "@/components/UserBox";
import { awardXP } from "@/lib/awardXP";

const categories = [
  "Idea",
  "Progetto",
  "Business",
  "Studio",
  "Personale",
  "Documenti",
  "Foto",
  "Video",
  "Audio",
  "Link",
];

export default function MemoryPage() {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Idea");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [aiIdea, setAiIdea] = useState("");
  const [loadingIdea, setLoadingIdea] = useState(false);
  const [saving, setSaving] = useState(false);

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    generateIdea();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function generateIdea() {
    setLoadingIdea(true);

    try {
      const res = await fetch("/api/idea-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      setAiIdea(
        data.idea ||
          "Crea una memoria su un progetto che vuoi sviluppare nei prossimi 30 giorni."
      );
    } catch {
      setAiIdea(
        "Crea una memoria su un progetto AI che potrebbe migliorare la tua vita o il tuo lavoro."
      );
    }

    setLoadingIdea(false);
  }

  async function saveMemory() {
    if (!title.trim() && !content.trim()) {
      alert("Scrivi almeno un titolo o un contenuto.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Utente non loggato");
      setSaving(false);
      return;
    }

    let fileUrl: string | null = null;

    if (file) {
      const safeName = file.name.replaceAll(" ", "-");
      const fileName = `${user.id}/${Date.now()}-${safeName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("memory-files")
        .upload(fileName, file);

      if (uploadError) {
        alert(uploadError.message);
        setSaving(false);
        return;
      }

      fileUrl = uploadData.path;
    }

    let analyze: {
      summary: string | null;
      keywords: string[];
    } = {
      summary: null,
      keywords: [],
    };

    try {
      const analyzeRes = await fetch("/api/memory-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, category }),
      });

      const analyzeData = await analyzeRes.json();

      analyze = {
        summary: analyzeData.summary || null,
        keywords: Array.isArray(analyzeData.keywords)
          ? analyzeData.keywords
          : [],
      };
    } catch {
      analyze = {
        summary: null,
        keywords: [],
      };
    }

    const { data, error } = await supabase
      .from("memories")
      .insert({
        title: title.trim(),
        content: content.trim(),
        category,
        user_id: user.id,
        file_url: fileUrl || null,
        summary: analyze.summary,
        keywords: analyze.keywords,
      })
      .select()
      .single();

    if (error) {
      alert("Errore salvataggio memoria: " + error.message);
      setSaving(false);
      return;
    }

    if (data?.id) {
      await awardXP({
        type: "memory_created",
        title: "Nuova memoria salvata",
        xp: 10,
        dedupeKey: `memory_created_${data.id}`,
        metadata: {
          memory_id: data.id,
          category,
        },
      });
    }

    setSaving(false);
    setTitle("");
    setContent("");
    setCategory("Idea");
    setFile(null);

    alert("Memoria salvata");
  }

  function categoryIcon(cat: string) {
    switch (cat.toLowerCase()) {
      case "idea":
        return <FiCpu />;
      case "progetto":
        return <FiLayers />;
      case "business":
        return <FiBriefcase />;
      case "studio":
        return <FiBook />;
      case "personale":
        return <FiUser />;
      case "documenti":
        return <FiFileText />;
      case "foto":
        return <FiImage />;
      case "video":
        return <FiVideo />;
      case "audio":
        return <FiMusic />;
      default:
        return <FiBook />;
    }
  }

  function categoryGradient(cat: string) {
    switch (cat.toLowerCase()) {
      case "idea":
        return "from-violet-600 to-purple-300";
      case "progetto":
        return "from-cyan-600 to-blue-300";
      case "business":
        return "from-emerald-600 to-lime-300";
      case "studio":
        return "from-indigo-600 to-sky-300";
      case "personale":
        return "from-rose-600 to-pink-300";
      case "documenti":
        return "from-purple-600 to-fuchsia-400";
      case "foto":
        return "from-blue-600 to-cyan-400";
      case "video":
        return "from-red-600 to-pink-400";
      case "audio":
        return "from-green-600 to-emerald-400";
      case "link":
        return "from-yellow-500 to-orange-400";
      default:
        return "from-zinc-700 to-zinc-400";
    }
  }

  function renderPreview() {
    if (!file || !previewUrl) {
      return (
        <div className="flex h-full min-h-[240px] flex-col items-center justify-center px-5 text-center text-gray-500 md:min-h-[320px]">
          <FiUploadCloud size={54} className="mb-4 text-purple-400" />
          <p className="text-base font-semibold text-gray-300 md:text-lg">
            Trascina o seleziona un allegato
          </p>
          <p className="mt-2 text-sm leading-6">
            Immagini, video, audio, PDF o file generici
          </p>
        </div>
      );
    }

    const type = file.type;

    if (type.startsWith("image/")) {
      return (
        <img
          src={previewUrl}
          alt="Anteprima"
          className="h-full min-h-[240px] w-full object-cover md:min-h-[360px]"
        />
      );
    }

    if (type.startsWith("video/")) {
      return (
        <video
          src={previewUrl}
          controls
          className="h-full min-h-[240px] w-full bg-black object-contain md:min-h-[360px]"
        />
      );
    }

    if (type.startsWith("audio/")) {
      return (
        <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-5 p-5 md:min-h-[360px] md:p-8">
          <FiMusic size={58} className="text-green-300" />
          <audio src={previewUrl} controls className="w-full" />
        </div>
      );
    }

    return (
      <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-4 px-5 text-center text-purple-300 md:min-h-[360px]">
        <FiFileText size={66} />
        <p className="max-w-full break-words text-lg font-bold md:text-xl">
          {file.name}
        </p>
        <p className="text-gray-500">{Math.round(file.size / 1024)} KB</p>
      </div>
    );
  }

  return (
    <main className="safe-mobile-bottom min-h-screen overflow-x-hidden bg-black pb-24 text-white lg:h-screen lg:overflow-hidden lg:pb-0">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(168,85,247,0.26),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(34,211,238,0.16),transparent_30%),linear-gradient(135deg,#020617,#000,#09090b)]" />

      <DesktopSidebar />

      <section className="relative z-10 w-full max-w-none overflow-x-hidden px-4 py-5 md:px-6 lg:h-screen lg:overflow-y-auto lg:pl-[348px] lg:pr-6 lg:py-8 xl:pl-[363px] 2xl:pl-[388px]">
        <div className="mx-auto w-full max-w-[1500px]">
          <MobileHeader />

          <header className="mb-5 rounded-[32px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_0_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl md:p-7">
            <p className="text-[10px] font-black uppercase tracking-[0.34em] text-purple-300 md:text-sm">
              Memory Capture
            </p>

            <div className="mt-3 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-end">
              <div className="min-w-0">
                <h1 className="bg-gradient-to-r from-purple-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-4xl font-black tracking-[-0.08em] text-transparent md:text-6xl">
                  Nuova Memoria
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-500 md:text-xl md:leading-relaxed">
                  Salva pensieri, file, idee, progetti e conoscenza nel tuo cervello digitale.
                </p>
              </div>

              <div className="rounded-[26px] border border-purple-500/20 bg-black/35 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">
                  Categoria attiva
                </p>

                <div className="mt-3 flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${categoryGradient(
                      category
                    )} text-xl text-white shadow-[0_0_25px_rgba(168,85,247,0.30)]`}
                  >
                    {categoryIcon(category)}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-xl font-black text-white">
                      {category}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Pronta per essere salvata
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,390px)]">
            <div className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(340px,430px)]">
              <MemoryFormCard
                title={title}
                setTitle={setTitle}
                content={content}
                setContent={setContent}
                category={category}
                setCategory={setCategory}
                categoryIcon={categoryIcon}
                saving={saving}
                saveMemory={saveMemory}
              />

              <AttachmentCard
                file={file}
                setFile={setFile}
                renderPreview={renderPreview}
              />
            </div>

            <AIIdeaPanel
              aiIdea={aiIdea}
              loadingIdea={loadingIdea}
              generateIdea={generateIdea}
              useIdea={() => {
                setTitle(aiIdea.slice(0, 60));
                setContent(aiIdea);
                setCategory("Idea");
              }}
            />
          </div>
        </div>
      </section>
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
            <NavLink href="/" label="Home" />
            <NavLink href="/brain" label="Brain" />
            <NavLink href="/chat" label="Chat" />
            <NavLink href="/memories" label="Memorie" />

            <Link
              href="/memory"
              className="rounded-2xl border border-purple-500/30 bg-purple-500/15 px-4 py-3 font-bold text-purple-200 shadow-[0_0_25px_rgba(168,85,247,0.16)]"
            >
              Nuova Memoria
            </Link>

            <NavLink href="/goals" label="Goals" />
            <NavLink href="/map" label="Mappa Mentale" />
            <NavLink href="/insights" label="Insights" />
          </div>
        </nav>

        <div className="mt-4 shrink-0">
          <UserBox />
        </div>
      </div>
    </aside>
  );
}

function MobileHeader() {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
      <Link
        href="/"
        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-300 backdrop-blur-2xl"
      >
        <FiArrowLeft />
      </Link>

      <div className="min-w-0 flex-1 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-purple-300">
          iMemory
        </p>
        <p className="truncate text-sm font-bold text-zinc-500">
          Nuova memoria
        </p>
      </div>

      <Link
        href="/memories"
        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200 backdrop-blur-2xl"
      >
        <FiBook />
      </Link>
    </div>
  );
}

function MemoryFormCard({
  title,
  setTitle,
  content,
  setContent,
  category,
  setCategory,
  categoryIcon,
  saving,
  saveMemory,
}: {
  title: string;
  setTitle: (value: string) => void;
  content: string;
  setContent: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  categoryIcon: (category: string) => React.ReactNode;
  saving: boolean;
  saveMemory: () => void;
}) {
  return (
    <div className="min-w-0 rounded-[32px] border border-purple-500/20 bg-zinc-950/80 p-5 shadow-[0_0_50px_rgba(168,85,247,0.18)] backdrop-blur-xl md:rounded-[40px] md:p-8">
      <label className="text-[10px] font-black uppercase tracking-[0.24em] text-purple-300 md:text-sm">
        Titolo
      </label>

      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Es. Nuova idea per iMemory..."
        className="mt-3 h-14 w-full min-w-0 rounded-2xl border border-zinc-800 bg-black px-4 text-base outline-none transition placeholder:text-zinc-600 focus:border-purple-500 md:px-5 md:text-lg"
      />

      <label className="mt-6 block text-[10px] font-black uppercase tracking-[0.24em] text-purple-300 md:text-sm">
        Categoria
      </label>

      <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-2 md:gap-3 md:overflow-visible">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`flex h-12 shrink-0 items-center gap-2 rounded-2xl border px-4 text-sm font-bold transition md:h-auto md:shrink md:px-4 md:py-3 ${
              category === cat
                ? "border-purple-500 bg-purple-500/20 text-white"
                : "border-zinc-800 bg-black text-gray-400 hover:border-purple-500/50"
            }`}
          >
            <span className="text-lg">{categoryIcon(cat)}</span>
            {cat}
          </button>
        ))}
      </div>

      <label className="mt-6 block text-[10px] font-black uppercase tracking-[0.24em] text-purple-300 md:text-sm">
        Contenuto
      </label>

      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="Scrivi la memoria..."
        className="mt-3 h-48 w-full min-w-0 resize-none rounded-2xl border border-zinc-800 bg-black px-4 py-4 text-base outline-none transition placeholder:text-zinc-600 focus:border-purple-500 md:h-56 md:px-5 md:text-lg"
      />

      <button
        type="button"
        onClick={saveMemory}
        disabled={saving}
        className="mt-6 flex h-14 w-full items-center justify-center gap-3 rounded-3xl bg-purple-600 text-base font-black shadow-[0_0_35px_rgba(168,85,247,0.45)] transition hover:scale-[1.01] hover:bg-purple-500 disabled:opacity-60 md:mt-8 md:h-16 md:text-xl"
      >
        <FiSave />
        {saving ? "Salvataggio..." : "Salva Memoria"}
      </button>
    </div>
  );
}

function AttachmentCard({
  file,
  setFile,
  renderPreview,
}: {
  file: File | null;
  setFile: (file: File | null) => void;
  renderPreview: () => React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-[32px] border border-cyan-500/20 bg-zinc-950/80 p-5 shadow-[0_0_50px_rgba(34,211,238,0.15)] backdrop-blur-xl md:rounded-[40px] md:p-8">
      <label className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300 md:text-sm">
        Allegato
      </label>

      <label className="mt-3 block min-h-[250px] cursor-pointer overflow-hidden rounded-[28px] border border-dashed border-cyan-500/30 bg-black/70 transition hover:border-cyan-400 md:min-h-[360px] md:rounded-[32px]">
        <input
          type="file"
          className="hidden"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
        />
        {renderPreview()}
      </label>

      {file && (
        <button
          type="button"
          onClick={() => setFile(null)}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-red-500/30 px-4 text-red-300 transition hover:bg-red-500/10"
        >
          <FiX />
          Rimuovi allegato
        </button>
      )}
    </div>
  );
}

function AIIdeaPanel({
  aiIdea,
  loadingIdea,
  generateIdea,
  useIdea,
}: {
  aiIdea: string;
  loadingIdea: boolean;
  generateIdea: () => void;
  useIdea: () => void;
}) {
  return (
    <aside className="min-w-0 rounded-[32px] border border-cyan-500/30 bg-zinc-950/85 p-5 shadow-[0_0_60px_rgba(34,211,238,0.20)] backdrop-blur-2xl md:rounded-[36px] md:p-7 xl:sticky xl:top-8 xl:max-h-[calc(100vh-64px)] xl:overflow-y-auto">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
            AI Idea Lab
          </p>

          <h2 className="mt-2 text-2xl font-black text-white md:text-3xl">
            Ispirazione
          </h2>
        </div>

        <button
          type="button"
          onClick={generateIdea}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/30 text-cyan-300 transition hover:bg-cyan-500/10"
        >
          <FiRefreshCw className={loadingIdea ? "animate-spin" : ""} />
        </button>
      </div>

      <p className="mt-3 text-sm leading-6 text-gray-500">
        Idea automatica generata per ispirare la prossima memoria.
      </p>

      <div className="mt-5 rounded-[28px] border border-cyan-500/20 bg-black/50 p-5 md:mt-8 md:rounded-[32px] md:p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300 md:text-sm">
          Suggerimento AI
        </p>

        <p className="mt-4 break-words text-base leading-7 text-gray-200 md:text-xl md:leading-relaxed">
          {loadingIdea ? "Sto generando una nuova idea..." : aiIdea}
        </p>
      </div>

      <button
        type="button"
        onClick={useIdea}
        className="mt-5 h-14 w-full rounded-3xl border border-cyan-500/30 bg-cyan-500/10 font-bold text-cyan-200 transition hover:bg-cyan-500/20 md:mt-6"
      >
        Usa questa idea
      </button>

      <div className="mt-5 rounded-[28px] border border-purple-500/20 bg-purple-500/10 p-5">
        <p className="text-sm font-black text-purple-200">Consiglio</p>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Scrivi una memoria breve ma concreta: titolo chiaro, categoria precisa e un contenuto che puoi ritrovare con la Chat AI.
        </p>
      </div>
    </aside>
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
