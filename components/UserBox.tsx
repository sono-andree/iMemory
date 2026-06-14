"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";


type Profile = {
  full_name?: string | null;
  name?: string | null;
  surname?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  plan?: string | null;
  subscription_status?: string | null;
};

export default function UserBox() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setEmail(user.email || "");

    const { data } = await supabase
      .from("profiles")
      .select("full_name, name, surname, email, avatar_url, plan, subscription_status")
      .eq("id", user.id)
      .single();

    setProfile(data || null);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const displayName =
    profile?.full_name ||
    `${profile?.name || ""} ${profile?.surname || ""}`.trim() ||
    email ||
    "User";

  const plan = profile?.plan === "pro" && profile?.subscription_status === "active"
    ? "PRO"
    : "FREE";

  return (
    <div className="w-full overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.035] p-3 text-white shadow-[0_0_35px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-purple-400/20 bg-purple-500/10">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Avatar"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-sm font-black text-purple-200">
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-black leading-none text-white">
              {displayName}
            </p>

            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] ${
                plan === "PRO"
                  ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-300"
                  : "border-zinc-400/20 bg-zinc-500/10 text-zinc-400"
              }`}
            >
              {plan}
            </span>
          </div>

          <p className="mt-1 truncate text-[11px] font-semibold text-zinc-500">
            {email}
          </p>
        </div>
      </div>

<div className="mt-3 grid grid-cols-2 gap-2">
  <Link
    href="/profile"
    className="flex h-9 items-center justify-center rounded-2xl border border-purple-400/20 bg-purple-500/10 text-[11px] font-black uppercase tracking-[0.14em] text-purple-200 transition hover:bg-purple-500/20"
  >
    Profilo
  </Link>

  <button
    onClick={logout}
    className="h-9 rounded-2xl border border-white/10 bg-white/[0.045] text-[11px] font-black uppercase tracking-[0.14em] text-zinc-400 transition hover:bg-white hover:text-black"
  >
    Logout
  </button>
</div>
    </div>
  );
}