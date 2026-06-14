"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, [pathname]);

  async function checkUser() {
    setLoading(true);

    const publicRoutes = ["/landing", "/login", "/register"];
    const isPublicRoute = publicRoutes.includes(pathname);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      if (!isPublicRoute) {
        router.push("/landing");
        setLoading(false);
        return;
      }

      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();

    const onboardingCompleted = profile?.onboarding_completed === true;

    if (!onboardingCompleted && pathname !== "/onboarding" && pathname !== "/landing") {
      router.push("/onboarding");
      setLoading(false);
      return;
    }

    if (onboardingCompleted && pathname === "/onboarding") {
      router.push("/brain");
      setLoading(false);
      return;
    }

    if (pathname === "/login" || pathname === "/register") {
      router.push(onboardingCompleted ? "/brain" : "/onboarding");
      setLoading(false);
      return;
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="rounded-[30px] border border-white/10 bg-white/[0.04] px-8 py-6 text-center backdrop-blur-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-purple-300">
            iMemory
          </p>

          <p className="mt-3 text-sm text-zinc-500">Caricamento...</p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}