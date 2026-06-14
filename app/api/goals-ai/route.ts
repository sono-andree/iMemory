import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function extractJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;

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

    const goal = body.goal;
    const memories = body.memories || [];

    if (!goal?.title) {
      return Response.json(
        { error: "Goal mancante" },
        { status: 400 }
      );
    }

    const memoryContext = memories
      .slice(0, 25)
      .map(
        (memory: any, index: number) =>
          `${index + 1}. Titolo: ${memory.title || "Senza titolo"} | Categoria: ${
            memory.category || "Nessuna"
          } | Contenuto: ${memory.content || ""} | Summary: ${
            memory.summary || ""
          } | Keywords: ${Array.isArray(memory.keywords) ? memory.keywords.join(", ") : ""}`
      )
      .join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.8,
      messages: [
        {
          role: "system",
          content: `
Sei l'AI Strategist di iMemory.

Devi trasformare un obiettivo dell'utente in un piano operativo concreto.
Usa anche le memorie dell'utente per personalizzare il piano.

Rispondi SOLO in JSON valido, senza markdown.

Formato obbligatorio:
{
  "strategy": "strategia breve ma potente",
  "risk": "rischio/blocco principale da evitare",
  "next_action": "azione immediata più importante da fare oggi",
  "steps": [
    "step 1 concreto",
    "step 2 concreto",
    "step 3 concreto",
    "step 4 concreto",
    "step 5 concreto",
    "step 6 concreto"
  ]
}
          `,
        },
        {
          role: "user",
          content: `
OBIETTIVO:
Titolo: ${goal.title}
Descrizione: ${goal.description || ""}
Categoria: ${goal.category || "Generale"}
Priorità: ${goal.priority || "Media"}
Deadline: ${goal.deadline || "Nessuna"}

MEMORIE UTENTE:
${memoryContext || "Nessuna memoria disponibile."}
          `,
        },
      ],
    });

    const raw = completion.choices[0].message.content || "";
    const parsed = extractJson(raw);

    if (!parsed) {
      return Response.json({
        strategy:
          "Dividi questo obiettivo in micro-azioni giornaliere e concentrati sulla prima azione concreta.",
        risk:
          "Il rischio principale è renderlo troppo grande e non iniziare.",
        next_action:
          "Scrivi il primo risultato misurabile che vuoi ottenere entro oggi.",
        steps: [
          "Definisci il risultato finale",
          "Dividi l'obiettivo in 3 fasi",
          "Completa la prima micro-azione oggi",
          "Salva una memoria sui progressi",
          "Controlla cosa blocca l'avanzamento",
          "Aggiorna il piano dopo 24 ore",
        ],
      });
    }

    return Response.json(parsed);
  } catch (error: any) {
    console.log("GOALS AI ERROR:", error);

    return Response.json(
      {
        error: error.message || "Errore AI goals",
      },
      { status: 500 }
    );
  }
}