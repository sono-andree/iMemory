"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SidebarLogo from "@/components/SidebarLogo";
import UserBox from "@/components/UserBox";
import UpgradeModal from "@/components/UpgradeModal";

type ChatSource = {
  id: number;
  title: string;
  category: string;
  preview: string;
  created_at?: string | null;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
};

type UpgradeModalState = {
  open: boolean;
  title: string;
  message: string;
  feature: string;
  used: number | null;
  limit: number | null;
};

const suggestions = [
  "Cosa dovrei fare oggi?",
  "Riassumi le mie memorie più importanti",
  "Qual è il mio prossimo step?",
  "Analizza i miei goals",
  "Trova collegamenti tra le mie memorie",
  "Qual è il blocco principale da risolvere?",
];

export default function ChatPage() {
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const mobileBottomRef = useRef<HTMLDivElement | null>(null);

  const [userId, setUserId] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [thinking, setThinking] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Ciao, sono iMemory AI. Posso aiutarti usando le tue memorie, i tuoi goals, i focus e i progressi salvati.",
    },
  ]);

  const [upgradeModal, setUpgradeModal] = useState<UpgradeModalState>({
    open: false,
    title: "",
    message: "",
    feature: "",
    used: null,
    limit: null,
  });

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });

    mobileBottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, thinking]);

  async function loadUser() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    setUserId(user.id);
    setLoading(false);
  }

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

  async function sendMessage(customQuestion?: string) {
    const question = customQuestion || input;

    if (!question.trim()) return;
    if (!userId) return;
    if (thinking) return;

    setInput("");
    setThinking(true);

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: question.trim(),
      },
    ]);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Devi essere loggato per usare la Chat AI.",
          },
        ]);

        setThinking(false);
        return;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          question: question.trim(),
        }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (res.status === 402) {
        setUpgradeModal({
          open: true,
          title: "Chat AI Free terminata",
          message:
            data.error ||
            data.answer ||
            "Hai raggiunto il limite Free della Chat AI. Passa a Pro per continuare senza limiti.",
          feature: "Chat AI",
          used: data.used ?? null,
          limit: data.limit ?? null,
        });

        setThinking(false);
        return;
      }

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              data.error ||
              data.answer ||
              "Errore nella Chat AI. Riprova tra qualche secondo.",
          },
        ]);

        setThinking(false);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer || "Nessuna risposta ricevuta.",
          sources: data.sources || [],
        },
      ]);
    } catch (error) {
      console.log("CHAT ERROR:", error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Errore nella Chat AI. Riprova tra qualche secondo.",
        },
      ]);
    }

    setThinking(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="rounded-[30px] border border-white/10 bg-white/[0.04] px-8 py-6 text-center backdrop-blur-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">
            iMemory Chat
          </p>

          <h1 className="mt-3 bg-gradient-to-r from-purple-400 to-cyan-300 bg-clip-text text-4xl font-black text-transparent md:text-5xl">
            Caricamento...
          </h1>
        </div>
      </main>
    );
  }

  return (
    <main className="safe-mobile-bottom min-h-screen overflow-x-hidden bg-black pb-24 text-white lg:h-screen lg:overflow-hidden lg:pb-0">
      <div className="fixed inset-0">
        <div className="absolute left-0 top-0 h-[700px] w-[700px] bg-purple-600/20 blur-[210px]" />
        <div className="absolute bottom-0 right-0 h-[700px] w-[700px] bg-cyan-500/20 blur-[210px]" />
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 bg-fuchsia-500/10 blur-[190px]" />
      </div>

      <MobileChatView
        input={input}
        setInput={setInput}
        messages={messages}
        thinking={thinking}
        sendMessage={sendMessage}
        handleKeyDown={handleKeyDown}
        bottomRef={mobileBottomRef}
      />

      <div className="relative z-10 hidden min-h-screen lg:flex">
        <aside className="m-5 flex w-[330px] flex-col rounded-[38px] border border-purple-500/20 bg-zinc-950/80 p-7 shadow-[0_0_60px_rgba(168,85,247,0.18)] backdrop-blur-2xl">
          <SidebarLogo />

          <nav className="mt-10 flex flex-col gap-3">
            <NavButton label="Home" onClick={() => router.push("/")} />

            <NavButton
              label="Brain"
              onClick={() => router.push("/brain")}
            />

            <NavButton
              label="Nuova Memoria"
              onClick={() => router.push("/memory")}
            />
            <NavButton
              label="Memorie"
              onClick={() => router.push("/memories")}
            />

            <button className="rounded-2xl border border-cyan-500/30 bg-cyan-500/15 px-5 py-4 text-left font-bold text-cyan-200 shadow-[0_0_25px_rgba(34,211,238,0.15)]">
              Chat AI
            </button>

            <NavButton
              label="Mappa Mentale"
              onClick={() => router.push("/map")}
            />
            <NavButton
              label="Insights"
              onClick={() => router.push("/insights")}
            />
            <NavButton label="Goals" onClick={() => router.push("/goals")} />
            <NavButton label="Focus" onClick={() => router.push("/focus")} />
            <NavButton
              label="Pricing"
              onClick={() => router.push("/pricing")}
            />
            <NavButton
              label="Profilo"
              onClick={() => router.push("/profile")}
            />
          </nav>

          <UserBox />
        </aside>

        <section className="flex flex-1 flex-col px-8 py-8">
          <header className="mb-7 flex items-end justify-between gap-8">
            <div>
              <p className="mt-4 max-w-3xl text-lg leading-relaxed text-zinc-400">
                Fai domande al tuo cervello digitale. iMemory risponde usando
                memorie, goals, focus e progressi salvati.
              </p>
            </div>

            <div className="rounded-[28px] border border-purple-500/20 bg-zinc-950/70 px-6 py-5 backdrop-blur-2xl">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                Modalità
              </p>

              <p className="mt-2 text-2xl font-black text-cyan-300">
                Memory Context
              </p>
            </div>
          </header>

          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_360px] gap-8">
            <div className="flex min-h-0 flex-col rounded-[42px] border border-purple-500/20 bg-zinc-950/70 shadow-[0_0_80px_rgba(168,85,247,0.12)] backdrop-blur-2xl">
              <div className="flex-1 overflow-y-auto p-7">
                <div className="space-y-5">
                  {messages.map((message, index) => (
                    <ChatBubble key={index} message={message} />
                  ))}

                  {thinking && (
                    <div className="flex justify-start">
                      <div className="rounded-[28px] border border-purple-500/20 bg-black/45 px-6 py-5 text-zinc-400">
                        iMemory sta pensando...
                      </div>
                    </div>
                  )}

                  <div ref={bottomRef} />
                </div>
              </div>

              <div className="border-t border-white/10 p-6">
                <div className="flex gap-4">
                  <textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Scrivi una domanda alle tue memorie..."
                    className="min-h-[74px] flex-1 resize-none rounded-3xl border border-zinc-800 bg-black/60 p-5 text-white outline-none transition placeholder:text-zinc-600 focus:border-purple-500"
                  />

                  <button
                    onClick={() => sendMessage()}
                    disabled={thinking || !input.trim()}
                    className="w-[150px] rounded-3xl bg-gradient-to-r from-purple-600 to-cyan-500 text-lg font-black shadow-[0_0_45px_rgba(34,211,238,0.25)] transition hover:scale-[1.03] disabled:opacity-60"
                  >
                    {thinking ? "..." : "Invia"}
                  </button>
                </div>

                <p className="mt-3 text-xs text-zinc-600">
                  Premi Enter per inviare, Shift + Enter per andare a capo.
                </p>
              </div>
            </div>

            <aside className="space-y-6">
              <div className="rounded-[36px] border border-cyan-500/20 bg-cyan-500/10 p-6">
                <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">
                  Prompt rapidi
                </p>

                <div className="mt-5 space-y-3">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => sendMessage(suggestion)}
                      disabled={thinking}
                      className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-4 text-left text-sm font-bold text-zinc-300 transition hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:text-white disabled:opacity-60"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[36px] border border-purple-500/20 bg-zinc-950/70 p-6 backdrop-blur-2xl">
                <p className="text-sm uppercase tracking-[0.3em] text-purple-300">
                  Cosa può usare
                </p>

                <div className="mt-5 space-y-3 text-sm text-zinc-400">
                  <InfoLine label="Memorie" value="Note, file, summary" />
                  <InfoLine label="Goals" value="Obiettivi e checklist" />
                  <InfoLine label="Focus" value="Azioni giornaliere" />
                  <InfoLine label="Insights" value="Progressi e pattern" />
                </div>
              </div>

              <div className="rounded-[36px] border border-zinc-800 bg-black/45 p-6">
                <h3 className="text-2xl font-black">Consiglio</h3>

                <p className="mt-4 leading-relaxed text-zinc-500">
                  Chiedi cose specifiche come: “Qual è la prossima azione
                  concreta per il mio progetto principale?”.
                </p>
              </div>
            </aside>
          </div>
        </section>
      </div>

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

function MobileChatView({
  input,
  setInput,
  messages,
  thinking,
  sendMessage,
  handleKeyDown,
  bottomRef,
}: {
  input: string;
  setInput: (value: string) => void;
  messages: ChatMessage[];
  thinking: boolean;
  sendMessage: (customQuestion?: string) => void;
  handleKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  bottomRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <section className="relative z-10 flex min-h-screen flex-col px-4 py-5 lg:hidden">
      <header className="mb-4 rounded-[30px] border border-white/10 bg-zinc-950/80 p-4 shadow-[0_0_60px_rgba(0,0,0,0.38)] backdrop-blur-2xl">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">
          iMemory AI
        </p>

        <div className="mt-2 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-3xl font-black tracking-[-0.06em] text-white">
              Chat AI
            </h1>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Fai domande al tuo cervello digitale usando memorie, goals e focus.
            </p>
          </div>

          <div className="shrink-0 rounded-2xl border border-purple-500/20 bg-purple-500/10 px-3 py-2 text-right">
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">
              Mode
            </p>
            <p className="text-xs font-black text-cyan-300">Context</p>
          </div>
        </div>
      </header>

      <div className="scrollbar-none mb-4 flex gap-2 overflow-x-auto pb-1">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => sendMessage(suggestion)}
            disabled={thinking}
            className="shrink-0 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-xs font-black text-cyan-200 disabled:opacity-50"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <div className="flex min-h-[58vh] flex-1 flex-col overflow-hidden rounded-[30px] border border-purple-500/20 bg-zinc-950/72 shadow-[0_0_70px_rgba(168,85,247,0.14)] backdrop-blur-2xl">
        <div className="mobile-scroll flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <ChatBubble key={index} message={message} mobile />
            ))}

            {thinking && (
              <div className="flex justify-start">
                <div className="rounded-[24px] border border-purple-500/20 bg-black/45 px-5 py-4 text-sm text-zinc-400">
                  iMemory sta pensando...
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        <div className="border-t border-white/10 bg-black/25 p-3">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Scrivi una domanda..."
            className="min-h-[82px] w-full resize-none rounded-2xl border border-zinc-800 bg-black/70 p-4 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-purple-500"
          />

          <button
            onClick={() => sendMessage()}
            disabled={thinking || !input.trim()}
            className="mt-3 h-12 w-full rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-500 text-sm font-black uppercase tracking-[0.16em] shadow-[0_0_35px_rgba(34,211,238,0.22)] transition active:scale-[0.98] disabled:opacity-60"
          >
            {thinking ? "Sto pensando..." : "Invia"}
          </button>

          <p className="mt-3 text-center text-[10px] text-zinc-600">
            Enter invia · Shift + Enter va a capo
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <MobileInfoCard title="Cosa può usare">
          <div className="grid gap-2">
            <InfoLine label="Memorie" value="Note, file, summary" />
            <InfoLine label="Goals" value="Obiettivi" />
            <InfoLine label="Focus" value="Azioni" />
            <InfoLine label="Insights" value="Pattern" />
          </div>
        </MobileInfoCard>

        <MobileInfoCard title="Consiglio">
          <p className="text-sm leading-6 text-zinc-500">
            Chiedi cose specifiche come: “Qual è la prossima azione concreta per il mio progetto principale?”.
          </p>
        </MobileInfoCard>
      </div>
    </section>
  );
}

function ChatBubble({
  message,
  mobile = false,
}: {
  message: ChatMessage;
  mobile?: boolean;
}) {
  return (
    <div
      className={`flex ${
        message.role === "user" ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`rounded-[26px] border leading-relaxed ${
          mobile
            ? "max-w-[92%] px-4 py-4 text-sm"
            : "max-w-[78%] px-6 py-5 text-base"
        } ${
          message.role === "user"
            ? "border-cyan-500/30 bg-cyan-500/15 text-cyan-50"
            : "border-purple-500/20 bg-black/45 text-zinc-200"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>

        {message.role === "assistant" &&
          message.sources &&
          message.sources.length > 0 && (
            <div className="mt-4 rounded-2xl border border-cyan-400/15 bg-cyan-500/[0.06] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
                Fonti usate da iMemory
              </p>

              <div className="mt-3 grid gap-3">
                {message.sources.map((source) => (
                  <div
                    key={source.id}
                    className="rounded-2xl border border-white/10 bg-black/25 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="truncate text-sm font-black text-white">
                        {source.title}
                      </h4>

                      <span className="shrink-0 rounded-full border border-purple-400/20 bg-purple-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-purple-300">
                        {source.category}
                      </span>
                    </div>

                    <p className="mt-2 break-words text-xs leading-5 text-zinc-500">
                      {source.preview}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}

function MobileInfoCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-white/[0.035] p-4 backdrop-blur-2xl">
      <h3 className="text-lg font-black text-white">{title}</h3>
      <div className="mt-3">{children}</div>
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

function InfoLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <span className="font-bold text-zinc-300">{label}</span>
      <span className="text-right text-xs text-zinc-500">{value}</span>
    </div>
  );
}
