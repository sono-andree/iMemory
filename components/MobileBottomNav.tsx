"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  FiActivity,
  FiCpu,
  FiFolder,
  FiHome,
  FiMap,
  FiMenu,
  FiMessageCircle,
  FiPlus,
  FiTarget,
  FiUser,
  FiX,
  FiZap,
  FiLogOut,
} from "react-icons/fi";
import { supabase } from "@/lib/supabase";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
};

const hiddenPrefixes = [
  "/login",
  "/register",
  "/landing",
  "/onboarding",
];

const mainItems: NavItem[] = [
  {
    href: "/",
    label: "Home",
    icon: <FiHome />,
    exact: true,
  },
  {
    href: "/brain",
    label: "Brain",
    icon: <FiCpu />,
  },
  {
    href: "/memories",
    label: "Memorie",
    icon: <FiFolder />,
  },
];

const menuItems: NavItem[] = [
  {
    href: "/goals",
    label: "Goals",
    icon: <FiTarget />,
  },
  {
    href: "/focus",
    label: "Focus",
    icon: <FiZap />,
  },
  {
    href: "/ai-actions",
    label: "AI Actions",
    icon: <FiActivity />,
  },
  {
    href: "/map",
    label: "Mappa",
    icon: <FiMap />,
  },
  {
    href: "/chat",
    label: "Chat AI",
    icon: <FiMessageCircle />,
  },
  {
    href: "/profile",
    label: "Profilo",
    icon: <FiUser />,
  },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const shouldHide = useMemo(() => {
    if (!pathname) return false;
    return hiddenPrefixes.some((prefix) => pathname.startsWith(prefix));
  }, [pathname]);

  function isActive(item: NavItem) {
    if (!pathname) return false;
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  async function logout() {
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push("/login");
  }

  if (shouldHide) return null;

  return (
    <>
      {menuOpen && (
        <div className="fixed inset-0 z-[998] bg-black/50 backdrop-blur-sm lg:hidden">
          <button
            aria-label="Chiudi menu"
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={() => setMenuOpen(false)}
          />

          <div className="mobile-sheet absolute bottom-0 left-0 right-0 z-[999] px-4 pb-[calc(20px+env(safe-area-inset-bottom))] pt-4">
            <div className="mx-auto h-1.5 w-12 rounded-full bg-white/20" />

            <div className="mt-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-purple-300">
                  iMemory
                </p>
                <h2 className="mt-1 text-2xl font-black text-white">
                  Menu rapido
                </h2>
              </div>

              <button
                onClick={() => setMenuOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-300"
              >
                <FiX />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {menuItems.map((item) => {
                const active = isActive(item);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex h-16 items-center gap-3 rounded-2xl border px-4 text-sm font-black transition ${
                      active
                        ? "border-purple-400/40 bg-purple-500/20 text-purple-100 shadow-[0_0_28px_rgba(168,85,247,0.22)]"
                        : "border-white/10 bg-white/[0.035] text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <button
              onClick={logout}
              className="mt-4 flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 text-sm font-black text-red-300"
            >
              <FiLogOut />
              Logout
            </button>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-[997] px-3 pb-[calc(10px+env(safe-area-inset-bottom))] lg:hidden">
        <div className="mx-auto grid h-[74px] max-w-[520px] grid-cols-5 items-center rounded-[28px] border border-white/10 bg-zinc-950/88 px-2 shadow-[0_0_70px_rgba(168,85,247,0.25)] backdrop-blur-2xl">
          {mainItems.slice(0, 2).map((item) => (
            <BottomItem key={item.href} item={item} active={isActive(item)} />
          ))}

          <Link
            href="/memory"
            aria-label="Nuova memoria"
            className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-[24px] bg-gradient-to-br from-purple-600 to-cyan-400 text-2xl text-white shadow-[0_0_35px_rgba(34,211,238,0.45)] transition active:scale-95"
          >
            <span className="absolute inset-[-5px] rounded-[28px] bg-purple-500/20 blur-xl" />
            <FiPlus className="relative z-10" />
          </Link>

          <BottomItem
            item={mainItems[2]}
            active={isActive(mainItems[2])}
          />

          <button
            onClick={() => setMenuOpen(true)}
            className={`mx-auto flex h-14 w-full max-w-[72px] flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-black transition active:scale-95 ${
              menuOpen ||
              menuItems.some((item) => isActive(item))
                ? "bg-white text-black"
                : "text-zinc-500 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            <FiMenu className="text-xl" />
            Menu
          </button>
        </div>
      </nav>
    </>
  );
}

function BottomItem({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={`mx-auto flex h-14 w-full max-w-[72px] flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-black transition active:scale-95 ${
        active
          ? "bg-white text-black shadow-[0_0_28px_rgba(255,255,255,0.12)]"
          : "text-zinc-500 hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      <span className="text-xl">{item.icon}</span>
      {item.label}
    </Link>
  );
}
