"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import * as THREE from "three";
import SidebarLogo from "@/components/SidebarLogo";

const ForceGraph3D: any = dynamic(
  () => import("react-force-graph-3d").then((mod) => mod.default),
  { ssr: false }
);

interface MemoryRow {
  id: string;
  title: string | null;
  content: string | null;
  category: string | null;
  file_url?: string | null;
  created_at?: string | null;
}

interface GraphNode {
  id: string;
  memoryId?: string;
  name: string;
  group: "core" | "category" | "memory" | "keyword";
  category?: string;
  content?: string;
  size?: number;
  x?: number;
  y?: number;
  z?: number;
}

interface GraphLink {
  source: string;
  target: string;
  type?: "category" | "semantic" | "keyword";
}

const STOPWORDS = new Set([
  "della", "delle", "degli", "questo", "questa", "quello", "quella",
  "sono", "come", "con", "per", "che", "una", "uno", "gli", "nel",
  "nella", "allo", "alla", "dove", "quando", "memoria", "memorie",
  "oggi", "tutto", "tutti", "fare", "fatto", "devo", "anche",
  "progetto", "nuovo", "nuova", "creare", "creato", "essere"
]);

export default function MapPage() {
  const router = useRouter();
  const graphRef = useRef<any>(null);
  const mobileGraphRef = useRef<any>(null);
  const lastClickRef = useRef<{ id: string; time: number } | null>(null);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tutte");
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [allMemories, setAllMemories] = useState<MemoryRow[]>([]);
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({
    nodes: [],
    links: [],
  });

  useEffect(() => {
    loadMemories();
  }, []);

  useEffect(() => {
    buildGraph(allMemories);
  }, [search, selectedCategory, allMemories]);

  useEffect(() => {
  if (graphData.nodes.length === 0) return;

  const timer = setTimeout(() => {
    setMapLeftView(700);
  }, 900);

  return () => clearTimeout(timer);
}, [graphData.nodes.length, insightsOpen]);

  useEffect(() => {
  const timer = setTimeout(() => {
    applySmoothControls();
  }, 800);

  return () => clearTimeout(timer);
}, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const graph = graphRef.current;
      if (!graph) return;

      graph.d3Force("charge")?.strength(-180);
      graph.d3Force("link")?.distance((link: GraphLink) => {
        if (link.type === "keyword") return 70;
        if (link.type === "semantic") return 115;
        return 155;
      });

      graph.d3Force("center")?.strength?.(0.045);
      graph.d3ReheatSimulation?.();
    }, 300);

    return () => clearTimeout(t);
  }, [graphData]);

  async function loadMemories() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("memories")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setAllMemories((data || []) as MemoryRow[]);
  }

  function normalizeWords(text: string) {
    return text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 4 && !STOPWORDS.has(w));
  }

  function buildGraph(memories: MemoryRow[]) {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const memoryPool: { id: string; text: string; words: string[] }[] = [];
    const groupedCategories: Record<string, MemoryRow[]> = {};
    const keywordCount: Record<string, number> = {};

    memories.forEach((memory) => {
      const category = memory.category || "Generale";
      if (!groupedCategories[category]) groupedCategories[category] = [];
      groupedCategories[category].push(memory);
    });

    const categoryList = Object.keys(groupedCategories);
    setCategories(categoryList);

    nodes.push({
      id: "iMemory",
      name: "iMemory Core",
      group: "core",
      size: 48,
      content: `Centro neurale con ${memories.length} memorie.`,
    });

    categoryList
      .filter((cat) => selectedCategory === "Tutte" || cat === selectedCategory)
      .forEach((category) => {
        const categoryId = "cat-" + category;

        nodes.push({
          id: categoryId,
          name: category,
          group: "category",
          category,
          size: 24,
          content: `${groupedCategories[category].length} memorie in questa categoria.`,
        });

        links.push({
          source: "iMemory",
          target: categoryId,
          type: "category",
        });

        groupedCategories[category]
          .filter((memory) => {
            const text = `${memory.title || ""} ${memory.content || ""}`.toLowerCase();
            return text.includes(search.toLowerCase());
          })
          .forEach((memory) => {
            const memoryId = "memory-" + memory.id;
            const text = `${memory.title || ""} ${memory.content || ""}`;
            const words = normalizeWords(text);

            words.forEach((w) => {
              keywordCount[w] = (keywordCount[w] || 0) + 1;
            });

            nodes.push({
              id: memoryId,
              memoryId: memory.id,
              name: memory.title || memory.content?.slice(0, 42) || "Memoria",
              group: "memory",
              category,
              size: 9,
              content: memory.content || "Nessun contenuto",
            });

            links.push({
              source: categoryId,
              target: memoryId,
              type: "category",
            });

            memoryPool.push({
              id: memoryId,
              text: text.toLowerCase(),
              words,
            });
          });
      });

    const topKeywords = Object.entries(keywordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    topKeywords.forEach(([word, count]) => {
      const keywordId = "kw-" + word;

      nodes.push({
        id: keywordId,
        name: word,
        group: "keyword",
        size: 6 + Math.min(10, count),
        content: `Concetto rilevato in ${count} memorie.`,
      });

      links.push({
        source: "iMemory",
        target: keywordId,
        type: "keyword",
      });

      memoryPool.forEach((memory) => {
        if (memory.words.includes(word)) {
          links.push({
            source: keywordId,
            target: memory.id,
            type: "keyword",
          });
        }
      });
    });

    for (let i = 0; i < memoryPool.length; i++) {
      for (let j = i + 1; j < memoryPool.length; j++) {
        const common = memoryPool[i].words.filter((word) =>
          memoryPool[j].words.includes(word)
        );

        if (common.length >= 2) {
          links.push({
            source: memoryPool[i].id,
            target: memoryPool[j].id,
            type: "semantic",
          });
        }
      }
    }

    setGraphData({ nodes, links });
  }

  const insights = useMemo(() => {
    const categoryCount: Record<string, number> = {};
    const wordCount: Record<string, number> = {};

    allMemories.forEach((memory) => {
      const category = memory.category || "Generale";
      categoryCount[category] = (categoryCount[category] || 0) + 1;

      normalizeWords(`${memory.title || ""} ${memory.content || ""}`).forEach((word) => {
        wordCount[word] = (wordCount[word] || 0) + 1;
      });
    });

    const sortedCategories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]);
    const sortedWords = Object.entries(wordCount).sort((a, b) => b[1] - a[1]);

    const total = allMemories.length;
    const neuralLinks = graphData.links.filter((l) => l.type === "semantic").length;
    const keywordLinks = graphData.links.filter((l) => l.type === "keyword").length;
    const files = allMemories.filter((m) => m.file_url).length;
    const topCategory = sortedCategories[0]?.[0] || "Nessuna";
    const topCategoryValue = sortedCategories[0]?.[1] || 0;

    const density = total === 0 ? 0 : Math.min(100, Math.round(((neuralLinks + keywordLinks) / total) * 18));

    return {
      total,
      files,
      neuralLinks,
      keywordLinks,
      topCategory,
      topCategoryValue,
      density,
      topWords: sortedWords.slice(0, 8),
      explanation:
        total === 0
          ? "Non ci sono ancora abbastanza memorie per generare una rete cognitiva."
          : `La rete contiene ${neuralLinks} collegamenti semantici e ${keywordLinks} connessioni concettuali. Il cluster dominante è "${topCategory}".`,
      forecast:
        total === 0
          ? "Aggiungi nuove memorie per far emergere pattern e collegamenti automatici."
          : `iMemory rileva una crescita cognitiva orientata verso ${topCategory}. I nodi keyword mostrano i concetti più forti della tua mente digitale.`,
    };
  }, [allMemories, graphData.links]);

  function focusNode(node: any) {
    if (!node || node.x == null || node.y == null || node.z == null) {
      return;
    }

    setSelectedNode(node);

    if (!graphRef.current) return;

    const distance = node.group === "core" ? 380 : node.group === "category" ? 240 : 190;
    const distRatio = 1 + distance / Math.hypot(node.x || 1, node.y || 1, node.z || 1);

    graphRef.current.cameraPosition(
      {
        x: node.x * distRatio,
        y: node.y * distRatio,
        z: node.z * distRatio,
      },
      node,
      900
    );
  }

  function handleNodeClick(node: any) {
    const now = Date.now();

    if (
      lastClickRef.current &&
      lastClickRef.current.id === node.id &&
      now - lastClickRef.current.time < 350
    ) {
      if (node.group === "memory" && node.memoryId) {
        router.push(`/memories?open=${node.memoryId}`);
      }
      return;
    }

    lastClickRef.current = { id: node.id, time: now };
    focusNode(node);
  }

  const MAP_LEFT_SHIFT = 180;

function setMapLeftView(duration = 800) {
  graphRef.current?.cameraPosition(
    { x: MAP_LEFT_SHIFT, y: 0, z: 760 },
    { x: MAP_LEFT_SHIFT, y: 0, z: 0 },
    duration
  );
}

function resetView() {
  setMapLeftView(800);
}
function resetMobileView() {
  mobileGraphRef.current?.cameraPosition({ x: 0, y: 0, z: 620 }, { x: 0, y: 0, z: 0 }, 700);
}
  function applySmoothControls() {
  const controls = graphRef.current?.controls?.();

  if (!controls) return;

  // Tasto sinistro: rotazione visuale
  controls.rotateSpeed = 0.18;

  // Tasto destro: movimento / camminata / pan
  controls.panSpeed = 0.10;

  // Rotella mouse
  controls.zoomSpeed = 0.45;

  // Movimento più morbido
  if ("enableDamping" in controls) {
    controls.enableDamping = true;
  }

  if ("dampingFactor" in controls) {
    controls.dampingFactor = 0.10;
  }

  if ("dynamicDampingFactor" in controls) {
    controls.dynamicDampingFactor = 0.12;
  }

  controls.update?.();
}

  function createNodeObject(node: GraphNode) {
    const group = new THREE.Group();

    const color =
      node.group === "core"
        ? "#ff38ff"
        : node.group === "category"
        ? "#24d8ff"
        : node.group === "keyword"
        ? "#ffd166"
        : "#36ffd0";

    let icon: THREE.Object3D;

    if (node.group === "core") {
      icon = new THREE.Mesh(
        new THREE.TorusKnotGeometry(10, 2.6, 180, 28),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 1.35,
          metalness: 1,
          roughness: 0.12,
        })
      );
    } else if (node.group === "category") {
      icon = new THREE.Mesh(
        new THREE.OctahedronGeometry(9, 1),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 1,
          metalness: 1,
          roughness: 0.16,
        })
      );
    } else if (node.group === "keyword") {
      icon = new THREE.Mesh(
        new THREE.IcosahedronGeometry(5.5, 1),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 1.1,
          metalness: 1,
          roughness: 0.18,
        })
      );
    } else {
      icon = new THREE.Mesh(
        new THREE.IcosahedronGeometry(4.8, 1),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.92,
          metalness: 0.8,
          roughness: 0.25,
        })
      );
    }

    group.add(icon);

    const ringSize =
      node.group === "core" ? 23 : node.group === "category" ? 17 : node.group === "keyword" ? 12 : 10;

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(ringSize, ringSize + 0.7, 80),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.24,
        side: THREE.DoubleSide,
      })
    );

    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    return group;
  }

  return (
    <main className="safe-mobile-bottom min-h-screen overflow-x-hidden bg-black pb-24 text-white lg:h-screen lg:overflow-hidden lg:pb-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(168,85,247,0.24),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(34,211,238,0.18),transparent_30%),linear-gradient(135deg,#020617,#000,#09090b)] pointer-events-none" />

      <MobileMapView search={search} setSearch={setSearch} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} categories={categories} insights={insights} graphData={graphData} mobileGraphRef={mobileGraphRef} createNodeObject={createNodeObject} handleNodeClick={handleNodeClick} resetMobileView={resetMobileView} selectedNode={selectedNode} />

      <div className="hidden h-screen w-full lg:flex">
      <aside className="relative z-50 m-6 h-[calc(100vh-48px)] w-80 rounded-[38px] border border-purple-500/30 bg-zinc-950/80 p-8 shadow-[0_0_70px_rgba(168,85,247,0.35)] backdrop-blur-2xl">
        <SidebarLogo />

        <nav className="mt-12 flex flex-col gap-4 text-lg text-gray-400">
          <NavLink href="/" label="Home" />
          <NavLink
              label="Brain"
              href="/brain"
            />
          <NavLink href="/chat" label="Chat" />
          <NavLink href="/memories" label="Memorie" />
          <NavLink href="/memory" label="Nuova Memoria" />
          <Link href="/map" className="rounded-2xl bg-purple-500/10 px-4 py-3 text-purple-300">Mappa Mentale</Link>
          <NavLink href="/insights" label="Insights" />
        </nav>

        <div className="mt-10 space-y-4">
          <StatCard label="Memorie" value={insights.total} color="text-white" />
          <StatCard label="Categorie" value={categories.length} color="text-cyan-300" />
          <StatCard label="Connessioni" value={insights.neuralLinks + insights.keywordLinks} color="text-green-300" />
        </div>
      </aside>

      <section className="relative z-10 flex-1">
        <div className="absolute left-8 top-8 z-50">
          <p className="text-lg text-gray-400">
            Neural Universe automatico costruito dalle tue memorie
          </p>
        </div>

        <div className="absolute left-8 top-20 z-50 flex gap-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca nodo, idea o memoria..."
            className="w-[390px] rounded-3xl border border-purple-500/30 bg-zinc-950/90 px-6 py-4 text-white outline-none backdrop-blur-xl focus:border-purple-400"
          />

          <div className="relative">
            <button
              onClick={() => setCategoryMenuOpen(!categoryMenuOpen)}
              className="min-w-[210px] rounded-3xl border border-cyan-500/30 bg-zinc-950/90 px-6 py-4 text-left text-white backdrop-blur-xl"
            >
              {selectedCategory}
            </button>

            {categoryMenuOpen && (
              <div className="absolute mt-3 w-72 rounded-3xl border border-cyan-500/30 bg-zinc-950/95 p-2 shadow-[0_0_50px_rgba(34,211,238,0.2)] backdrop-blur-2xl">
                {["Tutte", ...categories].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setCategoryMenuOpen(false);
                    }}
                    className="w-full rounded-2xl px-4 py-3 text-left text-gray-300 hover:bg-cyan-500/10 hover:text-white"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={resetView}
            className="rounded-3xl border border-white/20 bg-white/10 px-6 py-4 hover:bg-white/20 transition"
          >
            Reset
          </button>
        </div>

        <div className={`absolute right-0 top-0 z-50 h-screen transition-all duration-500 ${insightsOpen ? "w-[500px]" : "w-[72px]"}`}>
          <button
            onClick={() => setInsightsOpen(!insightsOpen)}
            className="absolute left-[-48px] top-8 z-50 h-12 w-12 rounded-l-2xl border border-purple-500/30 bg-zinc-950 text-purple-300 shadow-[0_0_30px_rgba(168,85,247,0.5)]"
          >
            {insightsOpen ? "→" : "←"}
          </button>

          <aside className="h-full border-l border-purple-500/20 bg-zinc-950/90 p-7 overflow-y-auto shadow-[0_0_70px_rgba(168,85,247,0.25)] backdrop-blur-2xl">
            {insightsOpen ? (
              <>
                <h2 className="text-4xl font-bold text-purple-300">Neural Insights</h2>
                <p className="mt-2 text-gray-500">Analisi live della tua rete cognitiva</p>

                <div className="mt-8 grid grid-cols-2 gap-4">
                  <MiniStat title="Memorie" value={insights.total} />
                  <MiniStat title="Allegati" value={insights.files} />
                  <MiniStat title="Categorie" value={categories.length} />
                  <MiniStat title="Connessioni" value={insights.neuralLinks + insights.keywordLinks} />
                </div>

                <InsightBox title="🧠 Connessioni neuronali" color="text-cyan-300">
                  {insights.explanation}
                </InsightBox>

                
                <InsightBox title="🔮 Neural forecast" color="text-pink-300">
                  {insights.forecast}
                </InsightBox>

                <div className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
                  <h3 className="font-bold text-yellow-300">Keyword nodes</h3>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {insights.topWords.map(([word, count]) => (
                      <span key={word} className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-200">
                        {word} · {count}
                      </span>
                    ))}
                  </div>
                </div>

                {selectedNode && (
                  <div className="mt-6 rounded-3xl border border-purple-500/30 bg-black/40 p-6">
                    <h3 className="text-2xl font-bold text-purple-300">Nodo selezionato</h3>
                    <p className="mt-2 text-gray-500">
                      {selectedNode.group}
                      {selectedNode.category ? ` · ${selectedNode.category}` : ""}
                    </p>
                    <p className="mt-4 max-h-[220px] overflow-y-auto text-gray-300 leading-relaxed">
                      {selectedNode.content || "Nodo della memoria"}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="rotate-90 whitespace-nowrap font-bold tracking-widest text-purple-300">
                  NEURAL INSIGHTS
                </p>
              </div>
            )}
          </aside>
        </div>

        <div
  className={`absolute inset-y-0 left-0 transition-all duration-500 ${
    insightsOpen ? "right-[500px]" : "right-[72px]"
  }`}
>
          <ForceGraph3D
  ref={graphRef}
  graphData={graphData}
  controlType="orbit"
            backgroundColor="#020617"
            enableNodeDrag={true}
            warmupTicks={100}
            cooldownTicks={170}
            d3AlphaDecay={0.022}
            d3VelocityDecay={0.18}
            linkDirectionalParticles={(link: GraphLink) => {
              if (link.type === "semantic") return 4;
              if (link.type === "keyword") return 2;
              return 1;
            }}
            linkDirectionalParticleWidth={(link: GraphLink) =>
              link.type === "semantic" ? 1.8 : 1.2
            }
            linkDirectionalParticleSpeed={(link: GraphLink) =>
              link.type === "semantic" ? 0.006 : 0.003
            }
            nodeLabel={(node: GraphNode) => node.name}
            nodeVal={(node: GraphNode) => node.size || 8}
            linkColor={(link: GraphLink) => {
              if (link.type === "semantic") return "rgba(54,255,208,0.48)";
              if (link.type === "keyword") return "rgba(255,209,102,0.45)";
              return "rgba(168,85,247,0.32)";
            }}
            linkWidth={(link: GraphLink) => {
              if (link.type === "semantic") return 1.35;
              if (link.type === "keyword") return 1.05;
              return 0.8;
            }}
            nodeThreeObject={(node: GraphNode) => createNodeObject(node)}
            onNodeClick={(node: GraphNode) => handleNodeClick(node)}
            onEngineStop={() => {
  graphRef.current?.zoomToFit?.(500, 160);

  setTimeout(() => {
    setMapLeftView(600);
  }, 550);
}}
          />
        </div>
      </section>
      </div>
    </main>
  );
}

function MobileMapView({ search, setSearch, selectedCategory, setSelectedCategory, categories, insights, graphData, mobileGraphRef, createNodeObject, handleNodeClick, resetMobileView, selectedNode }: any) {
  return (
    <section className="relative z-10 block min-h-screen px-4 py-5 lg:hidden">
      <header className="mb-4 rounded-[30px] border border-white/10 bg-zinc-950/80 p-4 backdrop-blur-2xl">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-purple-300">Neural Universe</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.06em]">Mappa Mentale</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">Mappa 3D costruita automaticamente dalle tue memorie.</p>
      </header>
      <div className="grid grid-cols-3 gap-2">
        <MiniStat title="Memorie" value={insights.total} />
        <MiniStat title="Categorie" value={categories.length} />
        <MiniStat title="Link" value={insights.neuralLinks + insights.keywordLinks} />
      </div>
      <div className="mt-4 rounded-[26px] border border-white/10 bg-zinc-950/80 p-3 backdrop-blur-2xl">
        <input value={search} onChange={(e:any)=>setSearch(e.target.value)} placeholder="Cerca nodo o memoria..." className="h-12 w-full rounded-2xl border border-purple-500/20 bg-black/60 px-4 text-base outline-none focus:border-purple-400" />
        <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto pb-1">
          {["Tutte", ...categories].map((cat:string)=>(
            <button key={cat} onClick={()=>setSelectedCategory(cat)} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black ${selectedCategory===cat?"border-cyan-400/40 bg-cyan-500/20 text-cyan-200":"border-white/10 bg-white/[0.04] text-zinc-500"}`}>{cat}</button>
          ))}
        </div>
      </div>
      <div className="relative mt-4 h-[62vh] min-h-[430px] overflow-hidden rounded-[32px] border border-purple-500/25 bg-black shadow-[0_0_55px_rgba(168,85,247,0.20)]">
        <button onClick={resetMobileView} className="absolute right-3 top-3 z-20 rounded-2xl border border-white/10 bg-black/70 px-4 py-2 text-xs font-black text-white backdrop-blur-xl">Reset</button>
        <ForceGraph3D ref={mobileGraphRef} graphData={graphData} controlType="orbit" backgroundColor="#020617" enableNodeDrag={true} warmupTicks={80} cooldownTicks={140} d3AlphaDecay={0.024} d3VelocityDecay={0.2} linkDirectionalParticles={(link: GraphLink)=>link.type==="semantic"?4:link.type==="keyword"?2:1} linkDirectionalParticleWidth={(link: GraphLink)=>link.type==="semantic"?1.8:1.2} linkDirectionalParticleSpeed={(link: GraphLink)=>link.type==="semantic"?0.006:0.003} nodeLabel={(node:GraphNode)=>node.name} nodeVal={(node:GraphNode)=>node.size||8} linkColor={(link:GraphLink)=>link.type==="semantic"?"rgba(54,255,208,0.48)":link.type==="keyword"?"rgba(255,209,102,0.45)":"rgba(168,85,247,0.32)"} linkWidth={(link:GraphLink)=>link.type==="semantic"?1.35:link.type==="keyword"?1.05:0.8} nodeThreeObject={(node:GraphNode)=>createNodeObject(node)} onNodeClick={(node:GraphNode)=>handleNodeClick(node)} onEngineStop={()=>{mobileGraphRef.current?.zoomToFit?.(500,120); setTimeout(()=>mobileGraphRef.current?.cameraPosition({x:0,y:0,z:620},{x:0,y:0,z:0},500),400)}} />
      </div>
      <div className="mt-4 rounded-[28px] border border-purple-500/20 bg-zinc-950/80 p-5 backdrop-blur-2xl">
        <h2 className="text-xl font-black text-purple-300">Neural Insights</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-400">{insights.explanation}</p>
        <p className="mt-3 text-sm leading-6 text-zinc-500">{insights.forecast}</p>
        {selectedNode && <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4"><p className="text-sm font-black text-cyan-300">Nodo selezionato</p><p className="mt-2 text-sm leading-6 text-zinc-300">{selectedNode.content || selectedNode.name}</p></div>}
      </div>
    </section>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="rounded-2xl px-4 py-3 hover:bg-white/5 hover:text-white">
      {label}
    </Link>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-3xl border border-purple-500/20 bg-black/40 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-4xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function MiniStat({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl border border-purple-500/20 bg-black/40 p-4">
      <p className="text-xs text-gray-500">{title}</p>
      <p className="mt-1 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function InsightBox({
  title,
  color,
  children,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
      <h3 className={`font-bold ${color}`}>{title}</h3>
      <div className="mt-3 text-gray-300 leading-relaxed">{children}</div>
    </div>
  );
}