"use client";

import Link from "next/link";

type UpgradeModalProps = {
  open: boolean;
  title: string;
  message: string;
  feature: string;
  used?: number | null;
  limit?: number | null;
  onClose: () => void;
};

export default function UpgradeModal({
  open,
  title,
  message,
  feature,
  used = null,
  limit = null,
  onClose,
}: UpgradeModalProps) {
  if (!open) return null;

  const hasUsage =
    typeof used === "number" && typeof limit === "number";

  const percentage = hasUsage
    ? Math.min(Math.round((used / limit) * 100), 100)
    : 100;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 px-4 backdrop-blur-xl">
      <div className="relative w-full max-w-xl overflow-hidden rounded-[32px] border border-purple-500/30 bg-zinc-950 p-8 shadow-[0_0_120px_rgba(168,85,247,0.35)]">
        <div className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full bg-purple-600/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-cyan-500/20 blur-3xl" />

        <button
          onClick={onClose}
          className="absolute right-5 top-5 z-20 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-black text-zinc-400 hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>

        <div className="relative z-10 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-cyan-400/30 bg-cyan-400/10 text-4xl shadow-[0_0_45px_rgba(34,211,238,0.35)]">
            🔒
          </div>

          <div className="mt-6 inline-flex rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-purple-200">
            Upgrade Required
          </div>

          <h2 className="mt-5 text-3xl font-black text-white">
            {title}
          </h2>

          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-zinc-400">
            {message}
          </p>
        </div>

        {hasUsage && (
          <div className="relative z-10 mt-7 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
                  Utilizzo
                </p>

                <p className="mt-1 text-sm font-bold text-white">
                  {feature}
                </p>
              </div>

              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-black text-red-300">
                {used} / {limit}
              </div>
            </div>

            <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-500 via-fuchsia-500 to-purple-500"
                style={{
                  width: `${percentage}%`,
                }}
              />
            </div>
          </div>
        )}

        <div className="relative z-10 mt-7 grid gap-3">
          <Link
            href="/pricing"
            className="rounded-2xl bg-white px-6 py-4 text-center text-sm font-black text-black transition hover:scale-[1.02]"
          >
            Passa a iMemory Pro
          </Link>

          <button
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 text-sm font-bold text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
          >
            Più tardi
          </button>
        </div>

        <div className="relative z-10 mt-7 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
            <p className="text-2xl">⚡</p>
            <p className="mt-2 text-xs font-bold text-zinc-300">
              AI illimitata
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
            <p className="text-2xl">🎯</p>
            <p className="mt-2 text-xs font-bold text-zinc-300">
              Focus illimitati
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
            <p className="text-2xl">👑</p>
            <p className="mt-2 text-xs font-bold text-zinc-300">
              Goals Pro
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}