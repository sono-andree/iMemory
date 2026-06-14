"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import SidebarLogo from "@/components/SidebarLogo";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("plan") === "pro") {
      localStorage.setItem("imemory_after_auth_action", "checkout_pro");
    }
  }, [searchParams]);

  async function register() {
    const cleanName = name.trim();
    const cleanSurname = surname.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanSurname || !cleanEmail || !password || !confirmPassword) {
      alert("Compila tutti i campi");
      return;
    }

    if (!cleanEmail.includes("@")) {
      alert("Inserisci una email valida");
      return;
    }

    if (password.length < 6) {
      alert("La password deve avere almeno 6 caratteri");
      return;
    }

    if (password !== confirmPassword) {
      alert("Le password non coincidono");
      return;
    }

    setLoading(true);

    console.log("REGISTER START");
    console.log("EMAIL:", cleanEmail);

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          name: cleanName,
          surname: cleanSurname,
          full_name: `${cleanName} ${cleanSurname}`,
        },
      },
    });

    console.log("REGISTER DATA:", data);
    console.log("REGISTER ERROR:", error);

    if (error) {
      setLoading(false);
      alert("Errore register: " + error.message);
      return;
    }

    if (!data.user) {
      setLoading(false);
      alert("Account non creato. Controlla Supabase e la console F12.");
      return;
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: data.user.id,
      name: cleanName,
      surname: cleanSurname,
      full_name: `${cleanName} ${cleanSurname}`,
      email: cleanEmail,
    });

    console.log("PROFILE ERROR:", profileError);

    setLoading(false);

    if (profileError) {
      alert("Account creato. Controlla l'email per la conferma.");
      return;
    }

    alert("Account creato con successo! Ora fai login.");
    router.push("/login");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-x-hidden bg-black px-4 py-5 text-white sm:px-6">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[-160px] top-[-160px] h-[430px] w-[430px] rounded-full bg-purple-600/25 blur-[140px] md:left-0 md:top-0 md:h-[600px] md:w-[600px] md:blur-[180px]" />
        <div className="absolute bottom-[-180px] right-[-160px] h-[430px] w-[430px] rounded-full bg-cyan-500/20 blur-[140px] md:bottom-0 md:right-0 md:h-[600px] md:w-[600px] md:blur-[180px]" />
        <div className="absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-500/10 blur-[130px] md:h-[500px] md:w-[500px] md:blur-[160px]" />
      </div>

      <div className="relative z-20 w-full max-w-[650px] rounded-[32px] border border-purple-500/20 bg-zinc-950/70 p-5 shadow-[0_0_80px_rgba(168,85,247,0.25)] backdrop-blur-2xl sm:p-8 md:rounded-[40px] md:p-12">
        <div className="mb-8 flex justify-center md:mb-10">
          <SidebarLogo />
        </div>

        <div className="mb-7 text-center md:mb-8">
          <h1 className="bg-gradient-to-r from-purple-400 to-cyan-300 bg-clip-text text-4xl font-black tracking-[-0.05em] text-transparent md:text-4xl">
            Crea Account
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-400 md:text-base">
            Crea il tuo cervello digitale personale
          </p>
        </div>

        <div className="mb-4 grid gap-4 sm:grid-cols-2 md:mb-5">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome"
            autoComplete="given-name"
            disabled={loading}
            className="h-14 rounded-2xl border border-zinc-800 bg-black/60 px-4 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-purple-500 disabled:opacity-60 md:px-5"
          />

          <input
            value={surname}
            onChange={(event) => setSurname(event.target.value)}
            placeholder="Cognome"
            autoComplete="family-name"
            disabled={loading}
            className="h-14 rounded-2xl border border-zinc-800 bg-black/60 px-4 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-purple-500 disabled:opacity-60 md:px-5"
          />
        </div>

        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          autoComplete="email"
          inputMode="email"
          disabled={loading}
          className="mb-4 h-14 w-full rounded-2xl border border-zinc-800 bg-black/60 px-4 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-purple-500 disabled:opacity-60 md:mb-5 md:px-5"
        />

        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          autoComplete="new-password"
          disabled={loading}
          className="mb-4 h-14 w-full rounded-2xl border border-zinc-800 bg-black/60 px-4 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-purple-500 disabled:opacity-60 md:mb-5 md:px-5"
        />

        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") register();
          }}
          placeholder="Conferma Password"
          autoComplete="new-password"
          disabled={loading}
          className="mb-7 h-14 w-full rounded-2xl border border-zinc-800 bg-black/60 px-4 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-purple-500 disabled:opacity-60 md:mb-8 md:px-5"
        />

        <button
          onClick={register}
          disabled={loading}
          className="h-14 w-full rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-500 text-base font-black shadow-[0_0_40px_rgba(168,85,247,0.5)] transition hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-60 md:h-16 md:text-xl"
        >
          {loading ? "Creazione account..." : "Crea Account"}
        </button>

        <button
          onClick={() => router.push("/login")}
          disabled={loading}
          className="mt-6 w-full text-center text-gray-400 transition hover:text-purple-400 disabled:opacity-60 md:mt-8"
        >
          Hai già un account? Accedi
        </button>

        <Link
          href="/landing"
          className="mt-5 block text-center text-xs font-bold uppercase tracking-[0.18em] text-zinc-600 transition hover:text-zinc-300"
        >
          Torna alla landing
        </Link>
      </div>
    </main>
  );
}
