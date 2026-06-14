import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

type ConnectionCandidate = {
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
  source_title: string;
  target_title: string;
  source_content: string;
  target_content: string;
};

async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader) return null;

  const token = authHeader.replace("Bearer ", "");

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) return null;

  return user;
}

function cleanText(value: any) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function clampStrength(value: any) {
  const number = Number(value || 70);

  if (Number.isNaN(number)) return 70;

  return Math.max(1, Math.min(100, Math.round(number)));
}

function textSlice(value: any, max = 1300) {
  return cleanText(value).slice(0, max);
}

async function analyzeConnection(candidate: ConnectionCandidate) {
  if (!openai) {
    return {
      title: `${candidate.source_title} ↔ ${candidate.target_title}`,
      reason:
        "Questi due elementi sembrano collegati perché condividono un tema utile per i tuoi progressi.",
      strength: 70,
      suggested_action:
        "Rileggili insieme e scegli una sola azione pratica da fare oggi.",
    };
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.55,
      messages: [
        {
          role: "system",
          content: `
Sei il Neural Connections Engine di iMemory.

Devi analizzare due elementi dell'utente e capire se sono collegati.

Rispondi SOLO in JSON valido:
{
  "title": "titolo breve della connessione",
  "reason": "perché questi due elementi sono collegati",
  "strength": 1-100,
  "suggested_action": "azione pratica che l'utente dovrebbe fare"
}

Regole:
- italiano
- tono professionale, diretto, futuristico
- niente frasi generiche
- title massimo 70 caratteri
- reason massimo 2 righe
- suggested_action massimo 2 righe
- strength deve indicare quanto è forte il collegamento
          `,
        },
        {
          role: "user",
          content: `
Elemento A
Tipo: ${candidate.source_type}
Titolo: ${candidate.source_title}
Contenuto:
${candidate.source_content}

Elemento B
Tipo: ${candidate.target_type}
Titolo: ${candidate.target_title}
Contenuto:
${candidate.target_content}
          `,
        },
      ],
    });

    const raw = completion.choices[0].message.content || "";

    let parsed: any;

    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("JSON non trovato");
      parsed = JSON.parse(match[0]);
    }

    return {
      title:
        cleanText(parsed.title).slice(0, 90) ||
        `${candidate.source_title} ↔ ${candidate.target_title}`,
      reason:
        cleanText(parsed.reason) ||
        "Questi due elementi sono collegati da un tema comune.",
      strength: clampStrength(parsed.strength),
      suggested_action:
        cleanText(parsed.suggested_action) ||
        "Rileggili insieme e trasformali in una prossima azione concreta.",
    };
  } catch (error) {
    console.log("NEURAL CONNECTION AI ERROR:", error);

    return {
      title: `${candidate.source_title} ↔ ${candidate.target_title}`,
      reason:
        "Questi elementi sembrano condividere un contesto utile per capire meglio i tuoi progressi.",
      strength: 68,
      suggested_action:
        "Apri entrambi mentalmente e scegli un micro passo collegato.",
    };
  }
}

async function getCandidates(userId: string) {
  const candidates: ConnectionCandidate[] = [];

  const { data: memories } = await supabaseAdmin
    .from("memories")
    .select("id, title, content, category, summary, created_at")
    .eq("user_id", userId)
    .order("id", { ascending: false })
    .limit(8);

  const { data: goals } = await supabaseAdmin
    .from("goals")
    .select(
      "id, title, description, status, priority, deadline, ai_strategy, ai_next_action, ai_risk"
    )
    .eq("user_id", userId)
    .neq("status", "Completato")
    .order("id", { ascending: false })
    .limit(6);

  const { data: focusDays } = await supabaseAdmin
    .from("focus_days")
    .select("id, focus_date, mission, reason, risk, energy_tip")
    .eq("user_id", userId)
    .order("focus_date", { ascending: false })
    .limit(4);

  const { data: checkins } = await supabaseAdmin
    .from("daily_checkins")
    .select("id, checkin_date, mood, energy, main_focus, blocker, note, ai_reflection")
    .eq("user_id", userId)
    .order("checkin_date", { ascending: false })
    .limit(4);

  for (const memory of memories || []) {
    for (const goal of goals || []) {
      candidates.push({
        source_type: "memory",
        source_id: String(memory.id),
        target_type: "goal",
        target_id: String(goal.id),
        source_title: memory.title || "Memoria",
        target_title: goal.title || "Goal",
        source_content: textSlice(
          `${memory.category || ""}\n${memory.summary || ""}\n${memory.content || ""}`
        ),
        target_content: textSlice(
          `${goal.description || ""}\n${goal.ai_strategy || ""}\n${goal.ai_next_action || ""}\n${goal.ai_risk || ""}`
        ),
      });
    }
  }

  for (const focus of focusDays || []) {
    for (const goal of goals || []) {
      candidates.push({
        source_type: "focus",
        source_id: String(focus.id),
        target_type: "goal",
        target_id: String(goal.id),
        source_title: focus.mission || "Focus",
        target_title: goal.title || "Goal",
        source_content: textSlice(
          `${focus.reason || ""}\n${focus.risk || ""}\n${focus.energy_tip || ""}`
        ),
        target_content: textSlice(
          `${goal.description || ""}\n${goal.ai_strategy || ""}\n${goal.ai_next_action || ""}`
        ),
      });
    }
  }

  for (const checkin of checkins || []) {
    for (const goal of goals || []) {
      candidates.push({
        source_type: "checkin",
        source_id: String(checkin.id),
        target_type: "goal",
        target_id: String(goal.id),
        source_title: checkin.main_focus || `Check-in ${checkin.checkin_date}`,
        target_title: goal.title || "Goal",
        source_content: textSlice(
          `Mood: ${checkin.mood || ""}\nEnergia: ${checkin.energy || ""}\nFocus: ${
            checkin.main_focus || ""
          }\nBlocco: ${checkin.blocker || ""}\nNota: ${
            checkin.note || ""
          }\nRiflessione AI: ${checkin.ai_reflection || ""}`
        ),
        target_content: textSlice(
          `${goal.description || ""}\n${goal.ai_next_action || ""}\n${goal.ai_risk || ""}`
        ),
      });
    }
  }

  return candidates;
}

function scoreCandidate(candidate: ConnectionCandidate) {
  const source = `${candidate.source_title} ${candidate.source_content}`.toLowerCase();
  const target = `${candidate.target_title} ${candidate.target_content}`.toLowerCase();

  const words = source
    .split(/[^a-zA-ZÀ-ÿ0-9]+/)
    .filter((word) => word.length > 4)
    .slice(0, 80);

  let overlap = 0;

  for (const word of words) {
    if (target.includes(word)) overlap += 1;
  }

  let base = overlap * 8;

  if (candidate.source_type === "memory" && candidate.target_type === "goal") {
    base += 15;
  }

  if (candidate.source_type === "focus" && candidate.target_type === "goal") {
    base += 20;
  }

  if (candidate.source_type === "checkin" && candidate.target_type === "goal") {
    base += 12;
  }

  return base;
}

async function saveConnection(userId: string, candidate: ConnectionCandidate) {
  const ai = await analyzeConnection(candidate);

  const { data, error } = await supabaseAdmin
    .from("neural_connections")
    .upsert(
      {
        user_id: userId,
        source_type: candidate.source_type,
        source_id: candidate.source_id,
        target_type: candidate.target_type,
        target_id: candidate.target_id,
        title: ai.title,
        reason: ai.reason,
        strength: ai.strength,
        suggested_action: ai.suggested_action,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,source_type,source_id,target_type,target_id",
      }
    )
    .select()
    .single();

  if (error) {
    console.log("SAVE NEURAL CONNECTION ERROR:", error);
    return null;
  }

  return data;
}

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return Response.json({ error: "Utente non autorizzato" }, { status: 401 });
    }

    const url = new URL(req.url);
    const generate = url.searchParams.get("generate") === "1";

    if (generate) {
      const candidates = await getCandidates(user.id);

      const ranked = candidates
        .map((candidate) => ({
          candidate,
          score: scoreCandidate(candidate),
        }))
        .filter((item) => item.score >= 12)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);

      const generated = [];

      for (const item of ranked) {
        const connection = await saveConnection(user.id, item.candidate);
        if (connection) generated.push(connection);
      }
    }

    const { data: connections, error } = await supabaseAdmin
      .from("neural_connections")
      .select("*")
      .eq("user_id", user.id)
      .order("strength", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(12);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      connections: connections || [],
    });
  } catch (error: any) {
    console.log("NEURAL CONNECTIONS ERROR:", error);

    return Response.json(
      {
        error: error.message || "Errore Neural Connections",
      },
      { status: 500 }
    );
  }
}