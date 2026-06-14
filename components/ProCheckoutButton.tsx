"use client";

import { startProCheckout } from "@/lib/client/startCheckout";

export default function ProCheckoutButton({
  children = "Attiva Pro",
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={startProCheckout}
      className={
        className ||
        "flex h-14 w-full items-center justify-center rounded-2xl bg-white text-sm font-black uppercase tracking-[0.16em] text-black transition hover:scale-[1.02]"
      }
    >
      {children}
    </button>
  );
}