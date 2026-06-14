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

function cleanText(value: any) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function clampMinutes(value: any) {
  const n = Number(value || 15);
  if (Number.isNaN(n)) return 15;
  return Math.max(5, Math.min(45, Math.round(n)));
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

function fallbackCoach(action: any) {
  return {
    mode_title: "Execution Mode",
    why_now:
      action.ai_reason ||
      "Questa azione e' importante per trasformare un insight AI in progresso concreto.",
    success_definition:
      "La sessione e' riuscita se produci un risultato visibile, anche piccolo.",
    recommended_minutes: 15,
    focus_rule:
      "Lavora solo su questa azione. Niente nuove idee, niente cambio task.",
    steps: [
      {
        title: "Chiarisci il risultato",
        instruction:
          "Scrivi in una frase cosa deve esistere alla fine della sessione.",
        duration_minutes: 3,
      },
      {
        title: "Esegui il nucleo",
        instruction:
          "Completa la parte piu' importante dell'azione senza perfezionare.",
        duration_minutes: 10,
      },
      {
        title: "Chiudi e salva",
        instruction:
          "Scrivi cosa hai completato, cosa manca e il prossimo micro-passo.",
        duration_minutes: 2,
      },
    ],
    blocker_responses: [
      "Se non sai da dove iniziare, riduci l'azione a un risultato di 5 minuti.",
      "Se sembra troppo grande, completa solo la prima versione grezza.",
      "Se ti blocchi, scrivi il problema esatto e scegli una sola decisione.",
    ],
    final_question: "Qual e' il risultato concreto prodotto da questa sessione?",
  };
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return Response.json({ error: "Utente non autorizzato" }, { status: 401 });
    }

    const body = await req.json();
    const actionId = Number(body.actionId);

    if (!actionId) {
      return Response.json({ error: "Action ID non valido" }, { status: 400 });
    }

    const { data: action, error: actionError } = await supabaseAdmin
      .from("ai_actions")
      .select("*")
      .eq("id", actionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (actionError || !action) {
      return Response.json({ error: "Azione non trovata" }, { status: 404 });
    }

    const { data: recentSessions } = await supabaseAdmin
      .from("ai_action_sessions")
      .select("duration_seconds, note, ai_reflection, completed, created_at")
      .eq("user_id", user.id)
      .eq("action_id", actionId)
      .order("created_at", { ascending: false })
      .limit(3);

    if (!openai) {
      return Response.json({
        coach: fallbackCoach(action),
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.55,
      messages: [
        {
          role: "system",
          content: `
Sei AI Execution Coach di iMemory.

Devi guidare l'utente a completare una singola azione.

Rispondi SOLO in JSON valido:
{
  "mode_title": "titolo breve",
  "why_now": "perche' farla ora",
  "success_definition": "come capire che e' completata",
  "recommended_minutes": 15,
  "focus_rule": "regola focus",
  "steps": [
    {
      "title": "step breve",
      "instruction": "istruzione concreta",
      "duration_minutes": 5
    }
  ],
  "blocker_responses": ["risposta 1", "risposta 2", "risposta 3"],
  "final_question": "domanda finale"
}

Regole:
- italiano
- massimo 4 step
- ogni step deve essere pratico
- niente motivazione generica
- guida l'utente come un coach operativo
- recommended_minutes tra 5 e 45
          `,
        },
        {
          role: "user",
          content: `
Azione:
${JSON.stringify(action, null, 2)}

Sessioni recenti:
${JSON.stringify(recentSessions || [], null, 2)}
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

    const coach = {
      mode_title: cleanText(parsed.mode_title) || "Execution Mode",
      why_now:
        cleanText(parsed.why_now) ||
        action.ai_reason ||
        "Questa azione puo' creare progresso concreto oggi.",
      success_definition:
        cleanText(parsed.success_definition) ||
        "La sessione e' riuscita se completi un risultato visibile.",
      recommended_minutes: clampMinutes(parsed.recommended_minutes),
      focus_rule:
        cleanText(parsed.focus_rule) ||
        "Resta su una sola azione fino alla fine della sessione.",
      steps: Array.isArray(parsed.steps)
        ? parsed.steps.slice(0, 4).map((step: any) => ({
            title: cleanText(step.title).slice(0, 80) || "Step",
            instruction:
              cleanText(step.instruction).slice(0, 220) ||
              "Completa questo micro-passo.",
            duration_minutes: clampMinutes(step.duration_minutes),
          }))
        : fallbackCoach(action).steps,
      blocker_responses: Array.isArray(parsed.blocker_responses)
        ? parsed.blocker_responses
            .slice(0, 3)
            .map((item: any) => cleanText(item).slice(0, 180))
        : fallbackCoach(action).blocker_responses,
      final_question:
        cleanText(parsed.final_question) ||
        "Quale risultato concreto hai prodotto?",
    };

    return Response.json({ coach });
  } catch (error: any) {
    console.log("AI ACTION COACH ERROR:", error);

    return Response.json(
      {
        error: error.message || "Errore AI Coach",
      },
      { status: 500 }
    );
  }
}