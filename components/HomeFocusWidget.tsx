"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type FocusDay = {
  id: number;
  mission: string | null;
  reason: string | null;
  risk: string | null;
  energy_tip: string | null;
  focus_date: string;
};

type FocusAction = {
  id: number;
  text: string;
  priority: string | null;
  completed: boolean;
  position: number;
};

function getTodayLocal() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function HomeFocusWidget() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [focusDay, setFocusDay] = useState<FocusDay | null>(null);
  const [actions, setActions] = useState<FocusAction[]>([]);

  useEffect(() => {
    loadFocus();
  }, []);

  async function loadFocus() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const today = getTodayLocal();

    const { data: focus } = await supabase
      .from("focus_days")
      .select("*")
      .eq("user_id", user.id)
      .eq("focus_date", today)
      .maybeSingle();

    if (!focus) {
      setFocusDay(null);
      setActions([]);
      setLoading(false);
      return;
    }

    setFocusDay(focus);

    const { data: focusActions } = await supabase
      .from("focus_actions")
      .select("*")
      .eq("user_id", user.id)
      .eq("focus_id", focus.id)
      .order("position", { ascending: true });

    setActions(focusActions || []);
    setLoading(false);
  }

  const progress = useMemo(() => {
    if (actions.length === 0) return 0;

    const completed = actions.filter((action) => action.completed).length;

    return Math.round((completed / actions.length) * 100);
  }, [actions]);

  const nextAction = actions.find((action) => !action.completed);

  if (loading) {
    return (
      <div className="rounded-[34px] border border-cyan-500/20 bg-black/35 p-6">
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">
          Daily Focus
        </p>

        <h3 className="mt-4 text-2xl font-black text-white">
          Caricamento focus...
        </h3>
      </div>
    );
  }

  if (!focusDay) {
    return (

      
      <div className="rounded-[34px] border border-cyan-500/20 bg-black/35 p-6 shadow-[0_0_45px_rgba(34,211,238,0.08)]">
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">
          Daily Focus
        </p>

        <h3 className="mt-4 text-3xl font-black text-white">
          Nessun focus generato oggi
        </h3>

        <p className="mt-4 leading-relaxed text-zinc-400">
          Crea la missione giornaliera con AI usando goals, checklist e memorie.
        </p>

        <button
          onClick={() => router.push("/focus")}
          className="mt-6 h-13 w-full rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-500 font-black text-white shadow-[0_0_35px_rgba(34,211,238,0.25)] transition hover:scale-[1.02]"
        >
          Genera Focus di oggi
        </button>
      </div>
    );
  }

  return (

    
    <div className="rounded-[34px] border border-cyan-500/20 bg-black/35 p-6 shadow-[0_0_45px_rgba(34,211,238,0.08)]">
      <div className="flex items-start justify-between gap-5">
        <div>
          <button
        onClick={() => router.push("/focus")}
        className="mt-6 h-20 w-full rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-500 font-black text-white shadow-[0_0_35px_rgba(34,211,238,0.25)] transition hover:scale-[1.02]"
      >
        Entra nella pagina Focus
      </button>
      <br></br>
      <br></br>
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">
            Daily Focus
          </p>

          <h3 className="mt-4 text-3xl font-black leading-tight text-white">
            {focusDay.mission}
          </h3>
        </div>

        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[26px] border border-cyan-500/30 bg-cyan-500/10 text-3xl font-black text-cyan-300 shadow-[0_0_30px_rgba(34,211,238,0.2)]">
          {progress}%
        </div>
      </div>

      <p className="mt-5 line-clamp-3 leading-relaxed text-zinc-400">
        {focusDay.reason}
      </p>

      <div className="mt-6 h-3 overflow-hidden rounded-full bg-zinc-900">
        <div
          className="h-full rounded-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-cyan-400 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-6 rounded-[26px] border border-purple-500/20 bg-zinc-950/70 p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-purple-300">
          Prossima azione
        </p>

        <p className="mt-3 text-lg font-bold leading-relaxed text-white">
          {nextAction ? nextAction.text : "Focus completato per oggi."}
        </p>
      </div>
    </div>
  );
}