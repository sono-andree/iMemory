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

type Slot = "morning" | "afternoon" | "evening";

type Candidate = {
  sourceType: "focus" | "goal" | "memory";
  sourceId: string;
  title: string;
  content: string;
  link: string;
  fallbackPreview: string;
};

function isValidSlot(slot: string | null): slot is Slot {
  return slot === "morning" || slot === "afternoon" || slot === "evening";
}

function getFallbackDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

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

function clampPriority(value: any) {
  const number = Number(value || 70);

  if (Number.isNaN(number)) return 70;

  return Math.max(1, Math.min(100, Math.round(number)));
}

function getSlotOrder(slot: Slot) {
  if (slot === "morning") return ["focus", "goal", "memory"];
  if (slot === "afternoon") return ["goal", "focus", "memory"];
  return ["memory", "goal", "focus"];
}

async function analyzeCandidate(candidate: Candidate, slot: Slot) {
  if (!openai) {
    return {
      reason:
        "Questo elemento può aiutarti a recuperare un filo importante dei tuoi progressi.",
      suggested_action:
        "Aprilo, rileggilo per 1 minuto e trasformalo in una micro-azione concreta.",
      preview: candidate.fallbackPreview,
      priority_score: 72,
    };
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.65,
      messages: [
        {
          role: "system",
          content: `
Sei il Memory Resurfacing Engine di iMemory.

Devi analizzare un elemento dell'utente e decidere perché deve riemergere ora.

Rispondi SOLO in JSON valido:
{
  "reason": "perché viene mostrato ora",
  "suggested_action": "azione concreta da fare subito",
  "preview": "mini preview del contenuto in massimo 160 caratteri",
  "priority_score": 1-100
}

Regole:
- italiano
- tono premium, diretto, personale
- niente frasi generiche
- reason massimo 2 righe
- suggested_action massimo 2 righe
- preview massimo 160 caratteri
- priority_score deve indicare urgenza/importanza reale
          `,
        },
        {
          role: "user",
          content: `
Slot del giorno: ${slot}

Tipo elemento: ${candidate.sourceType}
Titolo: ${candidate.title}

Contenuto:
${candidate.content}
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
      reason:
        cleanText(parsed.reason) ||
        "Questo elemento può aiutarti a riprendere un punto importante.",
      suggested_action:
        cleanText(parsed.suggested_action) ||
        "Aprilo e scegli una micro-azione da fare oggi.",
      preview:
        cleanText(parsed.preview).slice(0, 180) ||
        candidate.fallbackPreview.slice(0, 180),
      priority_score: clampPriority(parsed.priority_score),
    };
  } catch (error) {
    console.log("RESURFACING AI ERROR:", error);

    return {
      reason:
        "Questo elemento sembra collegato a qualcosa che avevi iniziato e che rischiavi di lasciare fermo.",
      suggested_action:
        "Aprilo adesso e trasformalo in un singolo passo pratico da completare.",
      preview: candidate.fallbackPreview.slice(0, 180),
      priority_score: 70,
    };
  }
}

async function saveEvent({
  userId,
  date,
  slot,
  candidate,
  ai,
}: {
  userId: string;
  date: string;
  slot: Slot;
  candidate: Candidate;
  ai: {
    reason: string;
    suggested_action: string;
    preview: string;
    priority_score: number;
  };
}) {
  const { data: event, error } = await supabaseAdmin
    .from("memory_resurfacing_events")
    .upsert(
      {
        user_id: userId,
        resurfaced_date: date,
        slot,
        source_type: candidate.sourceType,
        source_id: candidate.sourceId,
        title: candidate.title,
        reason: ai.reason,
        suggested_action: ai.suggested_action,
        preview: ai.preview,
        priority_score: ai.priority_score,
        link: candidate.link,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,resurfaced_date,slot",
      }
    )
    .select()
    .single();

  if (error) {
    console.log("SAVE RESURFACING EVENT ERROR:", error);

    const { data: existingEvent } = await supabaseAdmin
      .from("memory_resurfacing_events")
      .select("*")
      .eq("user_id", userId)
      .eq("resurfaced_date", date)
      .eq("slot", slot)
      .maybeSingle();

    return existingEvent || null;
  }

  return event;
}

async function getAlreadyUsedSources(userId: string, date: string) {
  const { data } = await supabaseAdmin
    .from("memory_resurfacing_events")
    .select("source_type, source_id")
    .eq("user_id", userId)
    .eq("resurfaced_date", date);

  return new Set(
    (data || []).map((item) => `${item.source_type}:${item.source_id}`)
  );
}

async function getCandidates(userId: string) {
  const candidates: Candidate[] = [];

  const { data: focusDays } = await supabaseAdmin
    .from("focus_days")
    .select("id, focus_date, mission, reason, risk, energy_tip")
    .eq("user_id", userId)
    .order("focus_date", { ascending: false })
    .limit(5);

  for (const focus of focusDays || []) {
    const { data: action } = await supabaseAdmin
      .from("focus_actions")
      .select("id, text, priority, goal_id, goal_step_id, position, completed")
      .eq("user_id", userId)
      .eq("focus_id", focus.id)
      .eq("completed", false)
      .order("position", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (action) {
      candidates.push({
        sourceType: "focus",
        sourceId: String(action.id),
        title: action.text || "Focus action incompleta",
        link: "/focus",
        fallbackPreview: cleanText(
          `Missione: ${focus.mission || ""}. Azione: ${action.text || ""}`
        ),
        content: `
Missione focus: ${focus.mission || ""}
Azione incompleta: ${action.text || ""}
Priorità: ${action.priority || ""}
Rischio: ${focus.risk || ""}
Consiglio energia: ${focus.energy_tip || ""}
Data focus: ${focus.focus_date || ""}
        `,
      });
    }
  }

  const { data: goals } = await supabaseAdmin
    .from("goals")
    .select(
      "id, title, description, status, priority, deadline, ai_next_action, ai_risk, created_at"
    )
    .eq("user_id", userId)
    .neq("status", "Completato")
    .order("id", { ascending: false })
    .limit(8);

  for (const goal of goals || []) {
    candidates.push({
      sourceType: "goal",
      sourceId: String(goal.id),
      title: goal.title || "Goal attivo",
      link: "/goals",
      fallbackPreview: cleanText(
        `${goal.description || ""} ${goal.ai_next_action || ""}`
      ),
      content: `
Titolo goal: ${goal.title || ""}
Descrizione: ${goal.description || ""}
Stato: ${goal.status || ""}
Priorità: ${goal.priority || ""}
Deadline: ${goal.deadline || "nessuna"}
Prossima azione AI: ${goal.ai_next_action || ""}
Rischio AI: ${goal.ai_risk || ""}
Creato il: ${goal.created_at || ""}
      `,
    });
  }

  const { data: memories } = await supabaseAdmin
    .from("memories")
    .select("id, title, content, category, summary, created_at")
    .eq("user_id", userId)
    .neq("category", "Check-in")
    .order("id", { ascending: false })
    .limit(10);

  for (const memory of memories || []) {
    const content = cleanText(memory.summary || memory.content || "");

    candidates.push({
      sourceType: "memory",
      sourceId: String(memory.id),
      title: memory.title || "Memoria importante",
      link: "/memories",
      fallbackPreview: content.slice(0, 180),
      content: `
Titolo memoria: ${memory.title || ""}
Categoria: ${memory.category || ""}
Summary: ${memory.summary || ""}
Contenuto: ${cleanText(memory.content).slice(0, 1800)}
Creata il: ${memory.created_at || ""}
      `,
    });
  }

  return candidates;
}

function pickCandidate({
  candidates,
  usedSources,
  slot,
}: {
  candidates: Candidate[];
  usedSources: Set<string>;
  slot: Slot;
}) {
  const order = getSlotOrder(slot);

  for (const type of order) {
    const fresh = candidates.find(
      (candidate) =>
        candidate.sourceType === type &&
        !usedSources.has(`${candidate.sourceType}:${candidate.sourceId}`)
    );

    if (fresh) return fresh;
  }

  for (const type of order) {
    const any = candidates.find((candidate) => candidate.sourceType === type);
    if (any) return any;
  }

  return null;
}

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return Response.json({ error: "Utente non autorizzato" }, { status: 401 });
    }

    const url = new URL(req.url);

    const slotParam = url.searchParams.get("slot");
    const slot: Slot = isValidSlot(slotParam) ? slotParam : "morning";

    const date = url.searchParams.get("date") || getFallbackDate();
    const force = url.searchParams.get("force") === "1";

    if (!force) {
      const { data: existingEvent } = await supabaseAdmin
        .from("memory_resurfacing_events")
        .select("*")
        .eq("user_id", user.id)
        .eq("resurfaced_date", date)
        .eq("slot", slot)
        .maybeSingle();

      if (existingEvent) {
        return Response.json({
          hasItem: true,
          event: existingEvent,
          source: "existing",
        });
      }
    }

    if (force) {
      await supabaseAdmin
        .from("memory_resurfacing_events")
        .delete()
        .eq("user_id", user.id)
        .eq("resurfaced_date", date)
        .eq("slot", slot);
    }

    const candidates = await getCandidates(user.id);

    if (candidates.length === 0) {
      return Response.json({
        hasItem: false,
        event: null,
        source: "none",
        debug: "Nessun focus, goal o memoria disponibile.",
      });
    }

    const usedSources = await getAlreadyUsedSources(user.id, date);

    const candidate = pickCandidate({
      candidates,
      usedSources,
      slot,
    });

    if (!candidate) {
      return Response.json({
        hasItem: false,
        event: null,
        source: "none",
      });
    }

    const ai = await analyzeCandidate(candidate, slot);

    const event = await saveEvent({
      userId: user.id,
      date,
      slot,
      candidate,
      ai,
    });

    return Response.json({
      hasItem: !!event,
      event,
      source: candidate.sourceType,
    });
  } catch (error: any) {
    console.log("MEMORY RESURFACING ERROR:", error);

    return Response.json(
      {
        error: error.message || "Errore Memory Resurfacing",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return Response.json({ error: "Utente non autorizzato" }, { status: 401 });
    }

    const body = await req.json();

    if (body.action !== "snooze_tonight") {
      return Response.json({ error: "Azione non valida" }, { status: 400 });
    }

    const eventId = Number(body.eventId);

    const { data: originalEvent, error } = await supabaseAdmin
      .from("memory_resurfacing_events")
      .select("*")
      .eq("id", eventId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !originalEvent) {
      return Response.json({ error: "Evento non trovato" }, { status: 404 });
    }

    const { data: eveningEvent, error: upsertError } = await supabaseAdmin
      .from("memory_resurfacing_events")
      .upsert(
        {
          user_id: user.id,
          resurfaced_date: originalEvent.resurfaced_date,
          slot: "evening",
          source_type: originalEvent.source_type,
          source_id: originalEvent.source_id,
          title: originalEvent.title,
          reason: originalEvent.reason,
          suggested_action: originalEvent.suggested_action,
          preview: originalEvent.preview,
          priority_score: originalEvent.priority_score,
          link: originalEvent.link,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,resurfaced_date,slot",
        }
      )
      .select()
      .single();

    if (upsertError) {
      return Response.json({ error: upsertError.message }, { status: 500 });
    }

    return Response.json({
      success: true,
      event: eveningEvent,
    });
  } catch (error: any) {
    console.log("SNOOZE RESURFACING ERROR:", error);

    return Response.json(
      {
        error: error.message || "Errore promemoria serale",
      },
      { status: 500 }
    );
  }
}