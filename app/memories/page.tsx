"use client";

import Link from "next/link";
import { JSX, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  FiFileText,
  FiImage,
  FiVideo,
  FiMusic,
  FiLink,
  FiBook,
  FiCpu,
  FiBriefcase,
  FiUser,
  FiLayers,
  FiExternalLink,
  FiMenu,
  FiX,
  FiTrash2,
  FiEdit3,
  FiSave,
  FiPlus,
  FiSearch,
} from "react-icons/fi";
import SidebarLogo from "@/components/SidebarLogo";

interface Memory {
  id: number | string;
  title: string | null;
  content: string | null;
  category: string | null;
  created_at: string;
  file_url?: string | null;
}

const BASE_CATEGORIES = [
  "Tutte",
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
  "Onboarding",
];

export default function MemoriesPage(): JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);

  const [memories, setMemories] = useState<Memory[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Tutte");
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [navOpen, setNavOpen] = useState(true);
  const [blockClick, setBlockClick] = useState(false);

  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("");

  const [isDragging, setIsDragging] = useState(false);
  const [dragStarted, setDragStarted] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    loadMemories();

    const params = new URLSearchParams(window.location.search);
    const initialCategory = params.get("category");

    if (initialCategory) {
      setCategoryFilter(initialCategory);
    }
  }, []);

  async function loadMemories() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user) {
      setMemories([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("memories")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const nextMemories = data as Memory[];
      setMemories(nextMemories);
      await loadFileUrls(nextMemories);
    }

    setLoading(false);
  }

  async function loadFileUrls(items: Memory[]) {
    const paths = items.map((memory) => memory.file_url).filter(Boolean) as string[];
    const nextUrls: Record<string, string> = {};

    await Promise.all(
      paths.map(async (path) => {
        const { data: signedData } = await supabase.storage
          .from("memory-files")
          .createSignedUrl(path, 60 * 60);

        if (signedData?.signedUrl) {
          nextUrls[path] = signedData.signedUrl;
          return;
        }

        const { data: publicData } = supabase.storage
          .from("memory-files")
          .getPublicUrl(path);

        if (publicData?.publicUrl) {
          nextUrls[path] = publicData.publicUrl;
        }
      })
    );

    setFileUrls(nextUrls);
  }

  function startDrag(e: React.PointerEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;

    if (
      target.closest("input") ||
      target.closest("textarea") ||
      target.closest("button") ||
      target.closest("a") ||
      target.closest("video") ||
      target.closest("audio") ||
      target.closest("[data-memory-card]")
    ) {
      return;
    }

    if (!scrollRef.current) return;

    setIsDragging(true);
    setDragStarted(false);
    setStartX(e.clientX);
    setStartY(e.clientY);
    setScrollLeft(scrollRef.current.scrollLeft);
    setScrollTop(scrollRef.current.scrollTop);

    scrollRef.current.setPointerCapture(e.pointerId);
  }

  function moveDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging || !scrollRef.current) return;

    e.preventDefault();

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    if (Math.abs(deltaX) > 12 || Math.abs(deltaY) > 12) {
      setDragStarted(true);
      setBlockClick(true);
    }

    scrollRef.current.scrollLeft = scrollLeft - deltaX;
    scrollRef.current.scrollTop = scrollTop - deltaY;
  }

  function stopDrag() {
    setIsDragging(false);

    setTimeout(() => {
      setDragStarted(false);
      setBlockClick(false);
    }, 120);
  }

  function openMemory(memory: Memory) {
    if (blockClick || dragStarted) return;

    setSelectedMemory(memory);
    setEditMode(false);
    setEditTitle(memory.title || "");
    setEditContent(memory.content || "");
    setEditCategory(memory.category || "Generale");
  }

  async function updateMemory() {
    if (!selectedMemory) return;

    const { error } = await supabase
      .from("memories")
      .update({
        title: editTitle,
        content: editContent,
        category: editCategory,
      })
      .eq("id", selectedMemory.id);

    if (error) {
      alert(error.message);
      return;
    }

    const updated = {
      ...selectedMemory,
      title: editTitle,
      content: editContent,
      category: editCategory,
    };

    setMemories((prev) =>
      prev.map((memory) => (memory.id === selectedMemory.id ? updated : memory))
    );

    setSelectedMemory(updated);
    setEditMode(false);
  }

  async function deleteMemory() {
    if (!selectedMemory) return;

    const confirmDelete = confirm("Vuoi eliminare questa memoria?");
    if (!confirmDelete) return;

    if (selectedMemory.file_url) {
      await supabase.storage.from("memory-files").remove([selectedMemory.file_url]);
    }

    const { error } = await supabase
      .from("memories")
      .delete()
      .eq("id", selectedMemory.id);

    if (error) {
      alert(error.message);
      return;
    }

    setMemories((prev) =>
      prev.filter((memory) => memory.id !== selectedMemory.id)
    );

    setSelectedMemory(null);
  }

  const categories = useMemo(() => {
    const dynamicCategories = memories
      .map((memory) => memory.category || "Generale")
      .filter(Boolean);

    return Array.from(new Set([...BASE_CATEGORIES, ...dynamicCategories]));
  }, [memories]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return memories.filter((memory) => {
      const matchesSearch =
        !query ||
        (memory.title ?? "").toLowerCase().includes(query) ||
        (memory.content ?? "").toLowerCase().includes(query) ||
        (memory.category ?? "").toLowerCase().includes(query);

      const matchesCategory =
        categoryFilter === "Tutte" ||
        (memory.category || "Generale") === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [memories, search, categoryFilter]);

  const grouped = useMemo(() => {
    const map: Record<string, Memory[]> = {};

    filtered.forEach((memory) => {
      const category = memory.category || "Generale";
      if (!map[category]) map[category] = [];
      map[category].push(memory);
    });

    return map;
  }, [filtered]);

  const categoryIcon = (cat: string | null) => {
    switch ((cat ?? "").toLowerCase()) {
      case "documenti":
        return <FiFileText size={30} />;
      case "foto":
        return <FiImage size={30} />;
      case "video":
        return <FiVideo size={30} />;
      case "audio":
        return <FiMusic size={30} />;
      case "link":
        return <FiLink size={30} />;
      case "idea":
        return <FiCpu size={30} />;
      case "progetto":
        return <FiLayers size={30} />;
      case "business":
        return <FiBriefcase size={30} />;
      case "personale":
        return <FiUser size={30} />;
      default:
        return <FiBook size={30} />;
    }
  };

  const categoryColor = (cat: string | null) => {
    switch ((cat ?? "").toLowerCase()) {
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
      default:
        return "from-zinc-700 to-zinc-400";
    }
  };

  const getUrl = (path?: string | null) => {
    if (!path) return null;
    return fileUrls[path] || null;
  };

  const getFileType = (path?: string | null) => {
    if (!path) return "none";
    const lower = path.toLowerCase();

    if (/\.(jpg|jpeg|png|gif|webp|avif|bmp|svg)$/i.test(lower)) return "image";
    if (/\.(mp4|mov|webm|mkv)$/i.test(lower)) return "video";
    if (/\.(mp3|wav|ogg|m4a)$/i.test(lower)) return "audio";
    if (/\.pdf$/i.test(lower)) return "pdf";

    return "file";
  };

  const renderMediaPreview = (path?: string | null, large = false) => {
    if (!path) {
      return (
        <div className="flex h-full min-h-[130px] items-center justify-center bg-zinc-950 text-zinc-600">
          Nessun allegato
        </div>
      );
    }

    const url = getUrl(path);
    const type = getFileType(path);

    if (!url) {
      return (
        <div className="flex h-full min-h-[130px] items-center justify-center bg-zinc-950 text-zinc-500">
          Caricamento anteprima…
        </div>
      );
    }

    if (type === "image") {
      return (
        <div className="flex h-full w-full items-center justify-center bg-black">
          <img
            src={url}
            alt="Anteprima allegato"
            draggable={false}
            className={
              large
                ? "max-h-[520px] w-full object-contain"
                : "h-full w-full object-cover"
            }
          />
        </div>
      );
    }

    if (type === "video") {
      return (
        <video
          src={url}
          controls={large}
          className={
            large
              ? "max-h-[520px] w-full bg-black object-contain"
              : "h-full w-full object-cover"
          }
        />
      );
    }

    if (type === "audio") {
      return (
        <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-4 bg-gradient-to-br from-green-950/80 to-black p-5">
          <FiMusic size={large ? 70 : 42} className="text-green-300" />
          {large && <audio src={url} controls className="w-full" />}
        </div>
      );
    }

    if (type === "pdf") {
      return (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="flex h-full min-h-[180px] flex-col items-center justify-center gap-4 bg-gradient-to-br from-purple-950/80 to-black text-purple-300 hover:text-white"
        >
          <FiFileText size={large ? 80 : 48} />
          <span className="font-semibold">Apri PDF</span>
        </a>
      );
    }

    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        onClick={(event) => event.stopPropagation()}
        className="flex h-full min-h-[180px] flex-col items-center justify-center gap-4 bg-gradient-to-br from-zinc-900 to-black text-purple-300 hover:text-white"
      >
        <FiExternalLink size={large ? 70 : 44} />
        <span className="font-semibold">Apri allegato</span>
      </a>
    );
  };

  const totalCategories = Object.keys(grouped).length;
  const navWidth = navOpen ? 320 : 92;
  const contentMinWidth = Math.max(1600, totalCategories * 460 + navWidth + 720);

  return (
    <main className="min-h-screen overflow-x-hidden bg-black text-white">
      <MobileMemoriesView
        memories={memories}
        filtered={filtered}
        loading={loading}
        search={search}
        setSearch={setSearch}
        categories={categories}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        categoryIcon={categoryIcon}
        categoryColor={categoryColor}
        getFileType={getFileType}
        renderMediaPreview={renderMediaPreview}
        openMemory={openMemory}
      />

      <section
        ref={scrollRef}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onPointerLeave={stopDrag}
        className={`hidden h-screen overflow-x-auto overflow-y-auto bg-black text-white lg:block ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <div
          className="relative flex min-h-[180vh]"
          style={{
            minWidth: `${contentMinWidth}px`,
            minHeight: "180vh",
            background:
              "radial-gradient(circle at 20% 20%, rgba(168,85,247,0.24), transparent 35%), radial-gradient(circle at 80% 10%, rgba(34,211,238,0.18), transparent 32%), linear-gradient(135deg, #020617 0%, #000000 45%, #09090b 100%)",
          }}
        >
          <aside
            className={`sticky left-6 top-6 z-50 h-[calc(100vh-48px)] shrink-0 rounded-[36px] border border-purple-500/30 bg-zinc-950/85 p-6 shadow-[0_0_60px_rgba(168,85,247,0.35)] backdrop-blur-2xl transition-all duration-300 ${
              navOpen ? "w-80" : "w-[92px]"
            }`}
          >
            <button
              onClick={() => setNavOpen(!navOpen)}
              className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-500/30 bg-black/40 text-purple-300 hover:bg-purple-500/10"
            >
              {navOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>

            {navOpen && <SidebarLogo />}

            <nav className="mt-12 flex flex-col gap-5 text-lg text-gray-400">
              <NavItem open={navOpen} href="/" label="Home" icon="🏠" />
              <NavItem open={navOpen} href="/brain" label="Brain" icon="🧠" />
              <NavItem open={navOpen} href="/chat" label="Chat" icon="💬" />
              <NavItem
                open={navOpen}
                href="/memories"
                label="Memorie"
                icon="📁"
                active
              />
              <NavItem
                open={navOpen}
                href="/memory"
                label="Nuova Memoria"
                icon="✨"
              />
              <NavItem open={navOpen} href="/goals" label="Goals" icon="🎯" />
              <NavItem open={navOpen} href="/map" label="Mappa" icon="🌌" />
              <NavItem
                open={navOpen}
                href="/insights"
                label="Insights"
                icon="⚡"
              />
            </nav>
          </aside>

          <section className="relative z-10 p-12">
            <div className="mb-10 flex items-end justify-between gap-8">
              <div>
                <h1 className="text-6xl font-extrabold tracking-tight">
                  Le tue memorie
                </h1>

                <p className="mt-3 text-xl text-gray-500">
                  Trascina la pagina in tutte le direzioni. Clicca una memoria per aprirla.
                </p>
              </div>

              <div className="w-[520px]">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cerca tra ricordi, file, categorie…"
                  className="w-full rounded-3xl border border-purple-500/30 bg-zinc-950/80 px-8 py-5 text-lg text-gray-200 shadow-[0_0_40px_rgba(168,85,247,0.18)] outline-none backdrop-blur-xl focus:border-purple-400"
                />
              </div>
            </div>

            {categoryFilter !== "Tutte" && (
              <div className="mb-7 flex items-center gap-3">
                <button
                  onClick={() => setCategoryFilter("Tutte")}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2 text-sm font-bold text-zinc-400 hover:bg-white/10 hover:text-white"
                >
                  Mostra tutte
                </button>

                <span className="rounded-full border border-purple-400/30 bg-purple-500/15 px-5 py-2 text-sm font-bold text-purple-200">
                  Filtro: {categoryFilter}
                </span>
              </div>
            )}

            <div className="flex select-none items-start gap-8 pb-12">
              {loading ? (
                <div className="rounded-[40px] border border-zinc-800 bg-black/45 p-10 text-xl text-zinc-500 backdrop-blur-xl">
                  Caricamento memorie...
                </div>
              ) : Object.entries(grouped).length === 0 ? (
                <div className="rounded-[40px] border border-zinc-800 bg-black/45 p-10 text-xl text-zinc-500 backdrop-blur-xl">
                  Nessuna memoria trovata.
                </div>
              ) : (
                Object.entries(grouped).map(([category, categoryMemories]) => (
                  <div
                    key={category}
                    className="w-[430px] shrink-0 rounded-[40px] border border-zinc-800 bg-black/45 p-6 shadow-[0_0_50px_rgba(168,85,247,0.16)] backdrop-blur-xl"
                  >
                    <div className="sticky top-6 z-20 rounded-[32px] border border-white/10 bg-zinc-950/85 p-5 backdrop-blur-xl">
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${categoryColor(
                            category
                          )} text-white shadow-[0_0_25px_rgba(168,85,247,0.45)]`}
                        >
                          {categoryIcon(category)}
                        </div>

                        <div>
                          <h2 className="text-2xl font-bold">{category}</h2>
                          <p className="text-gray-500">
                            {categoryMemories.length} memorie
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-6">
                      {categoryMemories.map((memory) => {
                        const type = getFileType(memory.file_url);

                        return (
                          <article
                            key={memory.id}
                            data-memory-card="true"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                              event.stopPropagation();
                              openMemory(memory);
                            }}
                            className="group cursor-pointer overflow-hidden rounded-[32px] border border-zinc-800 bg-zinc-950/80 shadow-[0_0_30px_rgba(0,0,0,0.45)] transition duration-300 hover:-translate-y-1 hover:border-purple-500/50 hover:shadow-[0_0_45px_rgba(168,85,247,0.28)]"
                          >
                            <div className="relative h-56 overflow-hidden bg-black">
                              {renderMediaPreview(memory.file_url)}

                              <div className="absolute left-4 top-4 rounded-2xl border border-white/10 bg-black/55 px-4 py-2 text-xs uppercase tracking-widest text-white backdrop-blur-xl">
                                {type}
                              </div>
                            </div>

                            <div className="p-6">
                              <h3 className="line-clamp-2 text-2xl font-bold leading-tight">
                                {memory.title || "Senza titolo"}
                              </h3>

                              <p className="mt-4 line-clamp-4 leading-relaxed text-gray-400">
                                {memory.content || "Nessun contenuto"}
                              </p>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </section>

      {selectedMemory && (
        <MemoryModal
          selectedMemory={selectedMemory}
          editMode={editMode}
          setSelectedMemory={setSelectedMemory}
          setEditMode={setEditMode}
          editTitle={editTitle}
          setEditTitle={setEditTitle}
          editContent={editContent}
          setEditContent={setEditContent}
          editCategory={editCategory}
          setEditCategory={setEditCategory}
          updateMemory={updateMemory}
          deleteMemory={deleteMemory}
          renderMediaPreview={renderMediaPreview}
          categoryIcon={categoryIcon}
          categoryColor={categoryColor}
        />
      )}
    </main>
  );
}

function MobileMemoriesView({
  memories,
  filtered,
  loading,
  search,
  setSearch,
  categories,
  categoryFilter,
  setCategoryFilter,
  categoryIcon,
  categoryColor,
  getFileType,
  renderMediaPreview,
  openMemory,
}: {
  memories: Memory[];
  filtered: Memory[];
  loading: boolean;
  search: string;
  setSearch: (value: string) => void;
  categories: string[];
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
  categoryIcon: (category: string | null) => React.ReactNode;
  categoryColor: (category: string | null) => string;
  getFileType: (path?: string | null) => string;
  renderMediaPreview: (path?: string | null, large?: boolean) => React.ReactNode;
  openMemory: (memory: Memory) => void;
}) {
  return (
    <section className="safe-mobile-bottom relative z-10 block min-h-screen px-4 py-5 lg:hidden">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(168,85,247,0.18),transparent_34%),radial-gradient(circle_at_90%_12%,rgba(34,211,238,0.12),transparent_30%),linear-gradient(135deg,#020617_0%,#000000_48%,#09090b_100%)]" />

      <div className="relative z-10">
        <div className="mb-5 rounded-[30px] border border-white/10 bg-white/[0.035] p-4 shadow-[0_0_60px_rgba(0,0,0,0.40)] backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.26em] text-purple-300">
                iMemory archive
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-[-0.06em] text-white">
                Le tue memorie
              </h1>
            </div>

            <Link
              href="/memory"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-black shadow-[0_0_35px_rgba(255,255,255,0.12)]"
            >
              <FiPlus />
            </Link>
          </div>

          <p className="mt-3 text-sm leading-6 text-zinc-500">
            Cerca, filtra e apri le informazioni salvate nel tuo cervello digitale.
          </p>

          <div className="relative mt-5">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cerca nelle memorie..."
              className="h-12 w-full rounded-2xl border border-white/10 bg-black/35 pl-11 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-purple-400/40"
            />
          </div>

          <div className="scrollbar-none mt-4 flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-black/25 p-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`shrink-0 rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition ${
                  categoryFilter === cat
                    ? "border-purple-400/40 bg-purple-500/20 text-purple-200"
                    : "border-white/10 bg-white/[0.035] text-zinc-500 hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold text-zinc-600">
            <span>{memories.length} memorie totali</span>
            <span>•</span>
            <span>{filtered.length} risultati</span>
          </div>
        </div>

        {loading ? (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-8 text-center text-zinc-500 backdrop-blur-2xl">
            Caricamento memorie...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-[34px] border border-white/10 bg-white/[0.035] p-8 text-center backdrop-blur-2xl">
            <p className="text-2xl font-black text-white">Nessuna memoria trovata</p>
            <p className="mt-3 text-sm text-zinc-500">
              Prova a cambiare ricerca o crea una nuova memoria.
            </p>

            <Link
              href="/memory"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-white px-6 text-xs font-black uppercase tracking-[0.16em] text-black"
            >
              Crea memoria
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((memory) => {
              const type = getFileType(memory.file_url);

              return (
                <article
                  key={memory.id}
                  onClick={() => openMemory(memory)}
                  className="group cursor-pointer overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.035] shadow-[0_0_35px_rgba(0,0,0,0.28)] backdrop-blur-2xl transition hover:-translate-y-1 hover:border-purple-400/30 hover:bg-white/[0.055]"
                >
                  <div className="relative h-36 overflow-hidden bg-black">
                    {memory.file_url ? (
                      renderMediaPreview(memory.file_url)
                    ) : (
                      <div
                        className={`flex h-full items-center justify-center bg-gradient-to-br ${categoryColor(
                          memory.category
                        )}`}
                      >
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-black/25 text-white backdrop-blur-xl">
                          {categoryIcon(memory.category)}
                        </div>
                      </div>
                    )}

                    <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white backdrop-blur-xl">
                      {type}
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="line-clamp-1 text-base font-black text-white">
                        {memory.title || "Senza titolo"}
                      </h3>

                      <span className="shrink-0 rounded-full border border-purple-400/20 bg-purple-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-purple-300">
                        {memory.category || "Memoria"}
                      </span>
                    </div>

                    <p className="mt-3 line-clamp-3 text-xs leading-5 text-zinc-500">
                      {memory.content || "Nessun contenuto"}
                    </p>

                    <div className="mt-4 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.14em] text-zinc-600">
                      <span>
                        {memory.created_at
                          ? new Date(memory.created_at).toLocaleDateString("it-IT")
                          : ""}
                      </span>

                      <span className="transition group-hover:text-purple-300">
                        Apri →
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function MemoryModal({
  selectedMemory,
  editMode,
  setSelectedMemory,
  setEditMode,
  editTitle,
  setEditTitle,
  editContent,
  setEditContent,
  editCategory,
  setEditCategory,
  updateMemory,
  deleteMemory,
  renderMediaPreview,
  categoryIcon,
  categoryColor,
}: {
  selectedMemory: Memory;
  editMode: boolean;
  setSelectedMemory: (memory: Memory | null) => void;
  setEditMode: (value: boolean) => void;
  editTitle: string;
  setEditTitle: (value: string) => void;
  editContent: string;
  setEditContent: (value: string) => void;
  editCategory: string;
  setEditCategory: (value: string) => void;
  updateMemory: () => void;
  deleteMemory: () => void;
  renderMediaPreview: (path?: string | null, large?: boolean) => React.ReactNode;
  categoryIcon: (category: string | null) => React.ReactNode;
  categoryColor: (category: string | null) => string;
}) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-xl md:p-6">
      <div className="relative max-h-[92vh] w-full max-w-[980px] overflow-y-auto rounded-[32px] border border-purple-500/30 bg-zinc-950 shadow-[0_0_90px_rgba(168,85,247,0.35)] md:rounded-[42px]">
        <button
          onClick={() => setSelectedMemory(null)}
          className="absolute right-4 top-4 z-50 rounded-2xl border border-white/10 bg-black/70 p-3 text-gray-300 hover:text-white md:right-6 md:top-6"
        >
          <FiX size={22} />
        </button>

        <div className="w-full overflow-hidden rounded-t-[32px] border-b border-zinc-800 bg-black md:rounded-t-[42px]">
          <div className="flex min-h-[260px] w-full items-center justify-center md:min-h-[360px]">
            {renderMediaPreview(selectedMemory.file_url, true)}
          </div>
        </div>

        <div className="p-5 md:p-10">
          {!editMode ? (
            <>
              <div className="mb-6 flex items-center gap-4">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${categoryColor(
                    selectedMemory.category
                  )} text-white md:h-16 md:w-16`}
                >
                  {categoryIcon(selectedMemory.category)}
                </div>

                <div>
                  <p className="text-purple-300">
                    {selectedMemory.category || "Generale"}
                  </p>

                  <p className="text-sm text-gray-500">
                    {new Date(selectedMemory.created_at).toLocaleDateString(
                      "it-IT",
                      {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      }
                    )}
                  </p>
                </div>
              </div>

              <h2 className="text-3xl font-black leading-tight text-white md:text-5xl">
                {selectedMemory.title || "Senza titolo"}
              </h2>

              <p className="mt-6 whitespace-pre-wrap text-base leading-8 text-gray-300 md:text-xl">
                {selectedMemory.content || "Nessun contenuto"}
              </p>

              {selectedMemory.file_url && (
                <div className="mt-8 rounded-3xl border border-zinc-800 bg-black/40 p-5">
                  <p className="text-sm text-gray-500">Allegato</p>
                  <p className="mt-2 break-all text-sm text-purple-300 md:text-base">
                    {selectedMemory.file_url}
                  </p>
                </div>
              )}

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => setEditMode(true)}
                  className="flex h-12 items-center justify-center gap-3 rounded-2xl bg-purple-600 px-6 font-bold hover:bg-purple-500"
                >
                  <FiEdit3 />
                  Modifica
                </button>

                <button
                  onClick={deleteMemory}
                  className="flex h-12 items-center justify-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-6 font-bold text-red-300 hover:bg-red-500/20"
                >
                  <FiTrash2 />
                  Elimina
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-black text-purple-300 md:text-4xl">
                Modifica memoria
              </h2>

              <label className="mt-8 block text-sm uppercase tracking-widest text-gray-500">
                Titolo
              </label>
              <input
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                className="mt-3 w-full rounded-2xl border border-zinc-800 bg-black px-5 py-4 text-base outline-none focus:border-purple-500 md:text-lg"
              />

              <label className="mt-6 block text-sm uppercase tracking-widest text-gray-500">
                Categoria
              </label>
              <input
                value={editCategory}
                onChange={(event) => setEditCategory(event.target.value)}
                className="mt-3 w-full rounded-2xl border border-zinc-800 bg-black px-5 py-4 text-base outline-none focus:border-purple-500 md:text-lg"
              />

              <label className="mt-6 block text-sm uppercase tracking-widest text-gray-500">
                Contenuto
              </label>
              <textarea
                value={editContent}
                onChange={(event) => setEditContent(event.target.value)}
                className="mt-3 h-64 w-full resize-none rounded-2xl border border-zinc-800 bg-black px-5 py-4 text-base outline-none focus:border-purple-500 md:h-72 md:text-lg"
              />

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <button
                  onClick={updateMemory}
                  className="flex h-12 items-center justify-center gap-3 rounded-2xl bg-green-600 px-6 font-bold hover:bg-green-500"
                >
                  <FiSave />
                  Salva
                </button>

                <button
                  onClick={() => setEditMode(false)}
                  className="h-12 rounded-2xl border border-white/10 px-6 font-bold text-gray-300 hover:bg-white/10"
                >
                  Annulla
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function NavItem({
  href,
  label,
  icon,
  open,
  active = false,
}: {
  href: string;
  label: string;
  icon: string;
  open: boolean;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 rounded-2xl px-4 py-3 transition ${
        active
          ? "bg-purple-500/10 text-purple-300"
          : "hover:bg-white/5 hover:text-white"
      }`}
    >
      <span className="text-2xl">{icon}</span>
      {open && <span>{label}</span>}
    </Link>
  );
}
