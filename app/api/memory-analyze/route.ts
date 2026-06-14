import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const { title, content, category } = await req.json();

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: `
Genera:

1. Un riassunto breve.
2. Una lista keywords separate da virgole.

Rispondi SOLO in JSON:

{
  "summary": "...",
  "keywords": "..."
}
`,
      },
      {
        role: "user",
        content: `
Titolo: ${title}

Categoria: ${category}

Contenuto:
${content}
`,
      },
    ],
  });

  const text = completion.choices[0].message.content ?? "{}";

  return Response.json(JSON.parse(text));
}