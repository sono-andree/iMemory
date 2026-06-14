import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  const { userId } = await req.json();

  if (!userId) {
    return Response.json({
      insight: "Utente non autenticato.",
    });
  }

  const { data } = await supabase
    .from("memories")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const memories =
    data
      ?.map(
        (m) => `
Titolo: ${m.title || "Senza titolo"}
Categoria: ${m.category || "Generale"}
Contenuto: ${m.content || ""}
Riassunto: ${m.summary || ""}
Keywords: ${Array.isArray(m.keywords) ? m.keywords.join(", ") : ""}
`
      )
      .join("\n---\n") || "";

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: `
Sei l'AI Intelligence Center di iMemory.
Analizza le memorie dell'utente e restituisci SOLO JSON valido.

Formato:
{
  "goal": "...",
  "nextStep": "...",
  "block": "...",
  "suggestion": "...",
  "insight": "..."
}

Devi essere concreto, utile, motivante e collegare tutto alle memorie.
`,
      },
      {
        role: "user",
        content: memories,
      },
    ],
  });

  try {
    const parsed = JSON.parse(completion.choices[0].message.content || "{}");
    return Response.json(parsed);
  } catch {
    return Response.json({
      goal: "Organizzare meglio le memorie salvate.",
      nextStep: "Aggiungi nuove memorie con categoria e titolo chiaro.",
      block: "Non ci sono abbastanza dati strutturati.",
      suggestion: "Salva più idee, progetti e obiettivi per aumentare la qualità degli insight.",
      insight:
        completion.choices[0].message.content ||
        "La tua memoria digitale sta crescendo.",
    });
  }
}