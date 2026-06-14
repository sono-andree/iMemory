import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { checkAIUsage, recordAIUsage } from "@/lib/server/aiUsage";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Memory = {
  id: number;
  title: string | null;
  content: string | null;
  category: string | null;
  summary: string | null;
  keywords: string[] | null;
  created_at: string | null;
};

function cleanText(value: any) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3);
}

function scoreMemory(question: string, memory: Memory) {
  const qWords = tokenize(question);
  const text = [
    memory.title,
    memory.category,
    memory.summary,
    Array.isArray(memory.keywords) ? memory.keywords.join(" ") : "",
    memory.content,
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;

  for (const word of qWords) {
    if (text.includes(word)) score += 3;
  }

  if (memory.title && question.toLowerCase().includes(memory.title.toLowerCase())) {
    score += 10;
  }

  if (memory.summary) score += 1;
  if (memory.content && memory.content.length > 40) score += 1;

  return score;
}

function pickRelevantMemories(question: string, memories: Memory[]) {
  const scored = memories
    .map((memory) => ({
      memory,
      score: scoreMemory(question, memory),
    }))
    .sort((a, b) => b.score - a.score);

  const positive = scored.filter((item) => item.score > 0).slice(0, 10);

  if (positive.length > 0) {
    return positive.map((item) => item.memory);
  }

  return memories.slice(0, 8);
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

async function awardChatXP(userId: string) {
  const dedupeKey = `chat_${userId}_${Date.now()}`;

  await supabaseAdmin.from("brain_activity").insert({
    user_id: userId,
    type: "chat",
    title: "Chat AI utilizzata",
    xp: 2,
    dedupe_key: dedupeKey,
    metadata: {
      source: "chat",
    },
  });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("brain_score")
    .eq("id", userId)
    .single();

  const currentScore = Number(profile?.brain_score || 0);

  await supabaseAdmin
    .from("profiles")
    .update({
      brain_score: currentScore + 2,
    })
    .eq("id", userId);
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return Response.json(
        { error: "Utente non autorizzato" },
        { status: 401 }
      );
    }

    const usage = await checkAIUsage(user.id, "chat");

    if (!usage.allowed) {
      return Response.json(
        {
          error: usage.message,
          limit: usage.limit,
          used: usage.used,
          upgradeRequired: true,
        },
        { status: 402 }
      );
    }

    const body = await req.json();
    const question = cleanText(body.question || body.message || "");

    if (!question) {
      return Response.json(
        { error: "Domanda mancante" },
        { status: 400 }
      );
    }

    const { data: memories, error: memoriesError } = await supabaseAdmin
      .from("memories")
      .select("id, title, content, category, summary, keywords, created_at")
      .eq("user_id", user.id)
      .order("id", { ascending: false })
      .limit(120);

    if (memoriesError) {
      return Response.json(
        { error: memoriesError.message },
        { status: 500 }
      );
    }

    const allMemories = (memories || []) as Memory[];

    if (allMemories.length === 0) {
      return Response.json({
        answer:
          "Non ho ancora memorie salvate su cui basarmi. Aggiungi prima una memoria, poi potrò rispondere usando le tue informazioni.",
        sources: [],
      });
    }

    const relevantMemories = pickRelevantMemories(question, allMemories);

    const compactMemories = relevantMemories.map((memory) => ({
      id: memory.id,
      title: memory.title || "Senza titolo",
      category: memory.category || "Memoria",
      summary: memory.summary || "",
      content: cleanText(memory.content).slice(0, 1800),
      created_at: memory.created_at,
    }));

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.25,
      messages: [
        {
          role: "system",
          content: `
Sei la Chat AI di iMemory.

Regole obbligatorie:
- Rispondi usando SOLO le memorie fornite.
- Se le memorie non bastano, dillo chiaramente.
- Non inventare informazioni.
- Devi restituire SOLO JSON valido.
- Devi citare gli ID delle memorie realmente usate.

Formato JSON:
{
  "answer": "risposta chiara in italiano",
  "citedMemoryIds": [1, 2, 3]
}
          `,
        },
        {
          role: "user",
          content: `
Domanda dell'utente:
${question}

Memorie disponibili:
${JSON.stringify(compactMemories, null, 2)}
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
      if (!match) {
        parsed = {
          answer:
            "Ho trovato alcune memorie, ma non sono riuscito a costruire una risposta affidabile.",
          citedMemoryIds: [],
        };
      } else {
        parsed = JSON.parse(match[0]);
      }
    }

    const allowedIds = new Set(relevantMemories.map((memory) => Number(memory.id)));

    const citedIds = Array.isArray(parsed.citedMemoryIds)
      ? parsed.citedMemoryIds
          .map((id: any) => Number(id))
          .filter((id: number) => allowedIds.has(id))
          .slice(0, 5)
      : [];

    const fallbackIds =
      citedIds.length > 0
        ? citedIds
        : relevantMemories.slice(0, 3).map((memory) => memory.id);

    const sources = fallbackIds
  .map((id: number) => relevantMemories.find((memory: any) => memory.id === id))
  .filter((memory: any): memory is any => Boolean(memory))
  .map((memory: { id: any; title: any; category: any; content: string | any[]; created_at: any; }) => ({
    id: memory.id,
    title: memory.title,
    category: memory.category,
    preview: memory.content?.slice(0, 220) || "",
    created_at: memory.created_at,
  }));
    await recordAIUsage(user.id, "chat");
    await awardChatXP(user.id);

    return Response.json({
      answer:
        cleanText(parsed.answer) ||
        "Non ho trovato abbastanza informazioni nelle tue memorie per rispondere con sicurezza.",
      sources,
    });
  } catch (error: any) {
    console.log("CHAT API ERROR:", error);

    return Response.json(
      {
        error: error.message || "Errore Chat AI",
      },
      { status: 500 }
    );
  }
}