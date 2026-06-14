import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST() {
  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: `
Genera un'idea casuale molto interessante originale ma generale
`,
      },
      {
        role: "user",
        content: "Genera una nuova idea generale.",
      },
    ],
  });

  return Response.json({
    idea:
      completion.choices[0].message.content ||
      "Genera un'idea casuale molto interessante originale ma generale",
  });
}