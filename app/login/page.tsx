"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SidebarLogo from "@/components/SidebarLogo";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  async function login() {
    if (!email.trim() || !password.trim()) {
      alert("Inserisci email e password");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password.trim(),
    });

    if (error) {
      setLoading(false);
      console.log("LOGIN ERROR:", error);
      alert(
        "Login non riuscito. Controlla email/password oppure verifica che l'email sia confermata in Supabase."
      );
      return;
    }

    if (!data.user) {
      setLoading(false);
      alert("Utente non trovato");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profile?.onboarding_completed !== true) {
      setLoading(false);
      router.push("/onboarding");
      return;
    }

    const nextAction = localStorage.getItem("imemory_after_auth_action");

    if (nextAction === "checkout_pro") {
      localStorage.removeItem("imemory_after_auth_action");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        const checkoutRes = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        });

        const checkoutText = await checkoutRes.text();
        const checkoutData = checkoutText ? JSON.parse(checkoutText) : {};

        if (checkoutData.url) {
          window.location.href = checkoutData.url;
          return;
        }
      }
    }

    setLoading(false);
    router.push("/brain");
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-black px-4 py-5 text-white sm:px-6 lg:flex lg:items-center lg:justify-center lg:px-8">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[-160px] top-[-160px] h-[430px] w-[430px] rounded-full bg-purple-600/25 blur-[140px] md:h-[600px] md:w-[600px] md:blur-[180px]" />
        <div className="absolute bottom-[-180px] right-[-160px] h-[430px] w-[430px] rounded-full bg-cyan-500/20 blur-[140px] md:h-[600px] md:w-[600px] md:blur-[180px]" />
        <div className="absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-500/10 blur-[130px] md:h-[500px] md:w-[500px] md:blur-[160px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.06),transparent_30%)]" />
      </div>

      <div className="relative z-20 mx-auto w-full max-w-[1080px] overflow-hidden rounded-[32px] border border-purple-500/20 bg-zinc-950/72 shadow-[0_0_90px_rgba(168,85,247,0.25)] backdrop-blur-2xl md:rounded-[42px] lg:grid lg:grid-cols-[0.95fr_1fr]">
        <section className="relative hidden min-h-[620px] border-r border-purple-500/20 p-10 lg:block xl:p-12">
          <SidebarLogo />

          <div className="mt-10">
            <p className="text-[11px] font-black uppercase tracking-[0.32em] text-cyan-300">
              Memory Assistant
            </p>

            <h1 className="mt-5 max-w-md bg-gradient-to-r from-purple-200 via-white to-cyan-200 bg-clip-text text-5xl font-black leading-[0.95] tracking-[-0.07em] text-transparent">
              Bentornato nel tuo cervello digitale.
            </h1>

            <p className="mt-6 max-w-md text-lg leading-8 text-gray-400">
              Accedi per continuare a salvare memorie, collegare idee, esplorare la tua mappa mentale e parlare con la tua AI personale.
            </p>
          </div>

          <div className="absolute bottom-10 left-10 right-10 rounded-[32px] border border-cyan-500/20 bg-black/40 p-6 shadow-[0_0_45px_rgba(34,211,238,0.10)]">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-300">
              iMemory
            </p>

            <p className="mt-4 text-lg leading-7 text-gray-300">
              Ogni volta che entri, iMemory usa le tue memorie per aiutarti a creare, migliorare e collegare nuove idee.
            </p>
          </div>
        </section>

        <section className="p-5 sm:p-7 md:p-10 xl:p-12">
          <div className="mb-8 flex justify-center lg:hidden">
            <SidebarLogo />
          </div>

          <div className="mx-auto max-w-[460px]">
            <p className="text-center text-[10px] font-black uppercase tracking-[0.28em] text-purple-300 lg:text-left">
              Accesso sicuro
            </p>

            <h2 className="mt-3 text-center text-4xl font-black tracking-[-0.06em] md:text-5xl lg:text-left">
              Login
            </h2>

            <p className="mt-3 text-center text-sm leading-6 text-gray-400 lg:text-left">
              Accedi al tuo spazio personale.
            </p>

            <div className="mt-8">
              <label className="text-[11px] font-black uppercase tracking-[0.22em] text-purple-300">
                Email
              </label>

              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="La tua email"
                autoComplete="email"
                inputMode="email"
                disabled={loading}
                className="mt-3 h-14 w-full rounded-2xl border border-zinc-800 bg-black/70 px-4 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-purple-500 disabled:opacity-60 md:px-5"
              />
            </div>

            <div className="mt-5">
              <label className="text-[11px] font-black uppercase tracking-[0.22em] text-purple-300">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && login()}
                placeholder="La tua password"
                autoComplete="current-password"
                disabled={loading}
                className="mt-3 h-14 w-full rounded-2xl border border-zinc-800 bg-black/70 px-4 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-purple-500 disabled:opacity-60 md:px-5"
              />
            </div>

            <button
              onClick={login}
              disabled={loading}
              className="mt-8 h-14 w-full rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-500 text-base font-black uppercase tracking-[0.14em] shadow-[0_0_45px_rgba(168,85,247,0.40)] transition hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-60 md:h-16 md:text-lg"
            >
              {loading ? "Accesso..." : "Accedi"}
            </button>

            <button
              onClick={() => router.push("/register")}
              disabled={loading}
              className="mt-6 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-center text-sm font-bold text-gray-400 transition hover:bg-white/[0.06] hover:text-purple-300 disabled:opacity-60"
            >
              Non hai un account? Registrati
            </button>

            <Link
              href="/landing"
              className="mt-5 block text-center text-xs font-bold uppercase tracking-[0.18em] text-zinc-600 transition hover:text-zinc-300"
            >
              Torna alla landing
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
