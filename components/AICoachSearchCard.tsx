"use client";

import { useRouter } from "next/navigation";

export default function AICoachSearchCard() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push("/ai-actions")}
      className="
        group relative hidden h-[64px] w-[307px] shrink-0 overflow-hidden
        rounded-[24px] border border-white/10
        bg-[#06040F]/90 text-left text-white
        shadow-[0_0_45px_rgba(0,0,0,0.55)]
        backdrop-blur-2xl transition-all duration-300
        hover:-translate-y-0.5 hover:border-purple-300/35
        hover:shadow-[0_0_60px_rgba(168,85,247,0.22)]
        lg:block
      "
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(168,85,247,0.26),transparent_32%),radial-gradient(circle_at_90%_80%,rgba(34,211,238,0.18),transparent_36%)]" />

      <div className="pointer-events-none absolute inset-0 opacity-[0.16]">
        <div className="absolute left-[-40px] top-1/2 h-[120px] w-[120px] -translate-y-1/2 rounded-full border border-purple-300/40" />
        <div className="absolute right-[-52px] top-1/2 h-[150px] w-[150px] -translate-y-1/2 rounded-full border border-cyan-300/30" />
      </div>

      <div className="pointer-events-none absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-purple-300/80 to-transparent" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />

      <div className="relative z-10 flex h-full items-center gap-3 px-3.5">
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border border-purple-300/20 bg-white/[0.045]">
          <div className="absolute inset-1 rounded-[14px] bg-purple-500/15 blur-md transition group-hover:bg-cyan-400/15" />

          <span className="relative text-[13px] font-black tracking-[-0.04em] text-white">
            AI
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-purple-200">
              AI Coach
            </p>

            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,1)]" />
          </div>

          <p className="mt-1 truncate text-[17px] font-VERDANA tracking-[-0.02em] text-white">
            Guided execution mode
          </p>

          <p className="mt-0.5 truncate text-[10px] font-semibold text-zinc-500">
            Completa le azioni con guida AI
          </p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.055] text-sm font-black text-zinc-400 transition-all duration-300 group-hover:rotate-[-8deg] group-hover:bg-white group-hover:text-black">
          →
        </div>
      </div>
    </button>
  );
}