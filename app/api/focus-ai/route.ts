import OpenAI from "openai";
import {
  checkAIUsage,
  recordAIUsage,
} from "@/lib/server/aiUsage";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function extractJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const userId = body.userId;
    const today = body.today || "";
    const goals = body.goals || [];
    const steps = body.steps || [];
    const memories = body.memories || [];

    if (!userId) {
      return Response.json(
        {
          error: "Utente mancante",
        },
        { status: 400 }
      );
    }

    const usage = await checkAIUsage(userId, "focus");

    if (!usage.allowed) {
      return Response.json(
        {
          error: usage.message,
          upgradeRequired: true,
          used: usage.used,
          limit: usage.limit,
        },
        { status: 402 }
      );
    }

    const goalsContext = goals
      .slice(0, 30)
      .map((goal: any, index: number) => {
        const goalSteps = steps.filter(
          (step: any) => step.goal_id === goal.id
        );

        const formattedSteps = goalSteps
          .map((step: any, stepIndex: number) => {
            return `${stepIndex + 1}. ID_STEP:${step.id} | ${
              step.completed ? "COMPLETATO" : "DA FARE"
            } | ${step.text}`;
          })
          .join("\n");

        return `
GOAL ${index + 1}
ID_GOAL: ${goal.id}
Titolo: ${goal.title}
Descrizione: ${goal.description || ""}
Categoria: ${goal.category || "Generale"}
Stato: ${goal.status || "Da iniziare"}
Priorità: ${goal.priority || "Media"}
Deadline: ${goal.deadline || "Nessuna"}
Strategia AI: ${goal.ai_strategy || ""}
Rischio AI: ${goal.ai_risk || ""}
Prossima azione AI: ${goal.ai_next_action || ""}

STEP:
${formattedSteps || "Nessuno step"}
`;
      })
      .join("\n");

    const memoriesContext = memories
      .slice(0, 25)
      .map((memory: any, index: number) => {
        const keywords = Array.isArray(memory.keywords)
          ? memory.keywords.join(", ")
          : "";

        return `
MEMORIA ${index + 1}
Titolo: ${memory.title || "Senza titolo"}
Categoria: ${memory.category || ""}
Contenuto: ${memory.content || ""}
Summary: ${memory.summary || ""}
Keywords: ${keywords}
`;
      })
      .join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `
Sei il Focus Engine di iMemory.

Il tuo compito è creare il piano operativo di oggi dell'utente.

Devi leggere:
- goals
- step non completati
- priorità
- deadline
- rischi
- memorie

Devi scegliere SOLO le azioni più importanti per oggi.

Rispondi SOLO in JSON valido, senza markdown.

Formato obbligatorio:
{
  "mission": "missione principale di oggi",
  "reason": "perché questa missione è importante",
  "risk": "blocco principale da evitare oggi",
  "energy_tip": "consiglio pratico per mantenere focus",
  "actions": [
    {
      "text": "azione concreta",
      "priority": "Massima",
      "goal_id": 1,
      "goal_step_id": 10
    },
    {
      "text": "azione concreta",
      "priority": "Alta",
      "goal_id": 1,
      "goal_step_id": null
    },
    {
      "text": "azione concreta",
      "priority": "Media",
      "goal_id": null,
      "goal_step_id": null
    }
  ]
}

Regole:
- massimo 3 azioni.
- scegli azioni molto concrete.
- se possibile collega le azioni agli step esistenti usando ID_GOAL e ID_STEP.
- se uno step è già completato, non sceglierlo.
- se un goal è "Completato", ignoralo.
- se un goal è "Bloccato", puoi scegliere una micro-azione per sbloccarlo.
- rispondi in italiano.
          `,
        },
        {
          role: "user",
          content: `
DATA DI OGGI:
${today}

GOALS:
${goalsContext || "Nessun goal disponibile."}

MEMORIE:
${memoriesContext || "Nessuna memoria disponibile."}
          `,
        },
      ],
    });

    const raw = completion.choices[0].message.content || "";
    const parsed = extractJson(raw);

    await recordAIUsage(userId, "focus");

    if (!parsed) {
      return Response.json({
        mission:
          "Avanza sul goal più importante con una micro-azione concreta.",
        reason:
          "Il modo migliore per creare progresso è scegliere una sola azione importante e completarla oggi.",
        risk:
          "Il rischio principale è provare a fare troppe cose insieme e non completarne nessuna.",
        energy_tip:
          "Lavora per 25 minuti su una sola attività, senza cambiare scheda.",
        actions: [
          {
            text: "Scegli il goal più importante e completa il primo step non completato.",
            priority: "Massima",
            goal_id: null,
            goal_step_id: null,
          },
          {
            text: "Scrivi una memoria breve sui progressi fatti oggi.",
            priority: "Alta",
            goal_id: null,
            goal_step_id: null,
          },
          {
            text: "Aggiorna il goal con il prossimo ostacolo da risolvere.",
            priority: "Media",
            goal_id: null,
            goal_step_id: null,
          },
        ],
      });
    }

    return Response.json(parsed);
  } catch (error: any) {
    console.log("FOCUS AI ERROR:", error);

    return Response.json(
      {
        error: error.message || "Errore Focus AI",
      },
      { status: 500 }
    );
  }
}