import { supabase } from "@/lib/supabase";

export async function awardXP({
  type,
  title,
  xp,
  dedupeKey,
  metadata = {},
}: {
  type: string;
  title: string;
  xp: number;
  dedupeKey?: string | null;
  metadata?: Record<string, any>;
}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    console.log("AWARD XP ERROR: nessuna sessione");
    return null;
  }

  const res = await fetch("/api/brain-xp", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type,
      title,
      xp,
      dedupe_key: dedupeKey || null,
      metadata,
    }),
  });

  const data = await res.json();

  console.log("AWARD XP RESPONSE:", {
    status: res.status,
    data,
  });

  if (!res.ok) {
    console.log("AWARD XP ERROR:", data);
    return null;
  }

  return data;
}