"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SidebarLogo from "@/components/SidebarLogo";

const suggestedGoals = [
  "Organizzare le mie idee",
  "Costruire un progetto online",
  "Studiare meglio",
  "Ricordare informazioni importanti",
  "Creare un business",
  "Migliorare produttività e focus",
];

export default function OnboardingPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");

  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [mainGoal, setMainGoal] = useState("");
  const [goals, setGoals] = useState<string[]>([]);

  useEffect(() => {
    loadUser();
  }, []);

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
    setEmail(user.email || "");

    const fallbackName = user.user_metadata?.name || "";
    const fallbackSurname = user.user_metadata?.surname || "";

    const { data: profile } = await supabase
      .from("profiles")
      .select("name, surname, goals, onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.onboarding_completed === true) {
      router.push("/brain");
      return;
    }

    setName(profile?.name || fallbackName || "");
    setSurname(profile?.surname || fallbackSurname || "");

    if (Array.isArray(profile?.goals)) {
      setGoals(profile.goals);
      setMainGoal(profile.goals[0] || "");
    }

    setLoading(false);
  }

  const canContinue = useMemo(() => {
    return name.trim() && surname.trim() && (mainGoal.trim() || goals.length > 0);
  }, [name, surname, mainGoal, goals]);

  function toggleGoal(goal: string) {
    setGoals((prev) => {
      if (prev.includes(goal)) {
        return prev.filter((item) => item !== goal);
      }

      return [...prev, goal];
    });

    if (!mainGoal.trim()) {
      setMainGoal(goal);
    }
  }

  async function completeOnboarding() {
    if (!userId) return;

    if (!canContinue) {
      alert("Completa nome, cognome e almeno un obiettivo.");
      return;
    }

    const cleanName = name.trim();
    const cleanSurname = surname.trim();

    const finalGoals = Array.from(
      new Set(
        [
          mainGoal.trim(),
          ...goals.map((goal) => goal.trim()),
        ].filter(Boolean)
      )
    );

    setSaving(true);

    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      name: cleanName,
      surname: cleanSurname,
      full_name: `${cleanName} ${cleanSurname}`,
      email,
      goals: finalGoals,
      onboarding_completed: true,
      brain_level: 1,
      brain_score: 0,
    });

    if (error) {
      setSaving(false);
      alert("Errore onboarding: " + error.message);
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

    setSaving(false);
    router.push("/brain");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="rounded-[30px] border border-white/10 bg-white/[0.04] px-8 py-6 text-center backdrop-blur-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-purple-300">
            iMemory onboarding
          </p>
          <h1 className="mt-3 bg-gradient-to-r from-purple-400 to-cyan-300 bg-clip-text text-4xl font-black text-transparent">
            Preparazione...
          </h1>
        </div>
      </main>
    );
  }

  return (
    <main className="safe-mobile-bottom relative min-h-screen overflow-x-hidden bg-black px-4 py-5 pb-24 text-white sm:px-6 lg:flex lg:items-center lg:justify-center lg:pb-8">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[-160px] top-[-160px] h-[430px] w-[430px] rounded-full bg-purple-600/25 blur-[140px] md:h-[650px] md:w-[650px] md:blur-[190px]" />
        <div className="absolute bottom-[-180px] right-[-160px] h-[430px] w-[430px] rounded-full bg-cyan-500/20 blur-[140px] md:h-[650px] md:w-[650px] md:blur-[190px]" />
        <div className="absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-500/10 blur-[130px] md:h-[520px] md:w-[520px] md:blur-[170px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1080px] overflow-hidden rounded-[34px] border border-purple-500/20 bg-zinc-950/76 shadow-[0_0_90px_rgba(168,85,247,0.25)] backdrop-blur-2xl lg:grid lg:grid-cols-[0.9fr_1fr]">
        <section className="hidden min-h-[680px] border-r border-purple-500/20 p-10 lg:block xl:p-12">
          <SidebarLogo />

          <div className="mt-10">
            <p className="text-[11px] font-black uppercase tracking-[0.32em] text-cyan-300">
              Setup iniziale
            </p>

            <h1 className="mt-5 max-w-md bg-gradient-to-r from-purple-200 via-white to-cyan-200 bg-clip-text text-5xl font-black leading-[0.95] tracking-[-0.07em] text-transparent">
              Personalizza il tuo cervello digitale.
            </h1>

            <p className="mt-6 max-w-md text-lg leading-8 text-gray-400">
              Queste informazioni servono a iMemory per capire chi sei, cosa vuoi costruire e come aiutarti meglio.
            </p>
          </div>

          <div className="mt-10 grid gap-3">
            <InfoLine number="01" text="Identità personale" />
            <InfoLine number="02" text="Obiettivo principale" />
            <InfoLine number="03" text="Prime aree di crescita" />
          </div>
        </section>

        <section className="p-5 sm:p-7 md:p-10 xl:p-12">
          <div className="mb-8 flex justify-center lg:hidden">
            <SidebarLogo />
          </div>

          <div className="mx-auto max-w-[560px]">
            <p className="text-center text-[10px] font-black uppercase tracking-[0.28em] text-purple-300 lg:text-left">
              Primo setup
            </p>

            <h1 className="mt-3 text-center text-4xl font-black tracking-[-0.06em] text-white md:text-5xl lg:text-left">
              Configura iMemory
            </h1>

            <p className="mt-3 text-center text-sm leading-6 text-gray-400 lg:text-left">
              Bastano pochi dati per preparare la tua esperienza personale.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nome"
                autoComplete="given-name"
                className="h-14 rounded-2xl border border-zinc-800 bg-black/60 px-4 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-purple-500 md:px-5"
              />

              <input
                value={surname}
                onChange={(event) => setSurname(event.target.value)}
                placeholder="Cognome"
                autoComplete="family-name"
                className="h-14 rounded-2xl border border-zinc-800 bg-black/60 px-4 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-purple-500 md:px-5"
              />
            </div>

            <input
              value={email}
              disabled
              className="mt-4 h-14 w-full cursor-not-allowed rounded-2xl border border-zinc-800 bg-black/40 px-4 text-base text-zinc-500 outline-none md:px-5"
            />

            <div className="mt-6">
              <label className="text-[11px] font-black uppercase tracking-[0.22em] text-purple-300">
                Obiettivo principale
              </label>

              <textarea
                value={mainGoal}
                onChange={(event) => setMainGoal(event.target.value)}
                placeholder="Esempio: completare iMemory e pubblicarlo online"
                className="mt-3 min-h-[120px] w-full resize-none rounded-3xl border border-zinc-800 bg-black/60 p-4 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-purple-500 md:p-5"
              />
            </div>

            <div className="mt-6">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-purple-300">
                Aree iniziali
              </p>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {suggestedGoals.map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => toggleGoal(goal)}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${
                      goals.includes(goal)
                        ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-100"
                        : "border-white/10 bg-white/[0.035] text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    {goal}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={completeOnboarding}
              disabled={saving || !canContinue}
              className="mt-8 h-14 w-full rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-500 text-sm font-black uppercase tracking-[0.16em] shadow-[0_0_45px_rgba(34,211,238,0.28)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 md:h-16 md:text-base"
            >
              {saving ? "Salvataggio..." : "Entra in iMemory"}
            </button>

            <p className="mt-4 text-center text-xs leading-5 text-zinc-600">
              Potrai modificare questi dati dopo dalla pagina Profilo.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoLine({ number, text }: { number: string; text: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/35 p-4">
      <p className="text-xs font-black text-cyan-300">{number}</p>
      <p className="mt-2 font-bold text-white">{text}</p>
    </div>
  );
}
