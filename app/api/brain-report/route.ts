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

type ReportType = "daily" | "weekly";

function getToday() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function cleanText(value: any) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function clampScore(value: any) {
  const score = Number(value || 70);

  if (Number.isNaN(score)) return 70;

  return Math.max(1, Math.min(100, Math.round(score)));
}

async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
}

async function getBrainContext(userId: string, reportType: ReportType) {
  const rangeDays = reportType === "weekly" ? 7 : 2;
  const since = daysAgo(rangeDays);

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("brain_score, current_streak, longest_streak, goals, plan")
    .eq("id", userId)
    .maybeSingle();

  const { data: memories } = await supabaseAdmin
    .from("memories")
    .select("id, title, content, category, summary, created_at")
    .eq("user_id", userId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(12);

  const { data: goals } = await supabaseAdmin
    .from("goals")
    .select(
      "id, title, description, status, priority, deadline, ai_strategy, ai_risk, ai_next_action, created_at"
    )
    .eq("user_id", userId)
    .order("id", { ascending: false })
    .limit(10);

  const { data: focusDays } = await supabaseAdmin
    .from("focus_days")
    .select("id, focus_date, mission, reason, risk, energy_tip, created_at")
    .eq("user_id", userId)
    .order("focus_date", { ascending: false })
    .limit(5);

  const { data: focusActions } = await supabaseAdmin
    .from("focus_actions")
    .select("id, text, completed, priority, created_at")
    .eq("user_id", userId)
    .gte("created_at", since)
    .order("id", { ascending: false })
    .limit(20);

  const { data: checkins } = await supabaseAdmin
    .from("daily_checkins")
    .select(
      "id, checkin_date, mood, energy, main_focus, blocker, note, ai_reflection"
    )
    .eq("user_id", userId)
    .order("checkin_date", { ascending: false })
    .limit(7);

  const { data: connections } = await supabaseAdmin
    .from("neural_connections")
    .select(
      "id, source_type, target_type, title, reason, strength, suggested_action, updated_at"
    )
    .eq("user_id", userId)
    .order("strength", { ascending: false })
    .limit(8);

  const { data: activities } = await supabaseAdmin
    .from("brain_activity")
    .select("id, type, title, xp, created_at")
    .eq("user_id", userId)
    .gte("created_at", since)
    .order("id", { ascending: false })
    .limit(20);

  const { data: resurfacing } = await supabaseAdmin
    .from("memory_resurfacing_events")
    .select(
      "id, resurfaced_date, slot, source_type, title, reason, suggested_action, priority_score"
    )
    .eq("user_id", userId)
    .order("id", { ascending: false })
    .limit(6);

  return {
    profile: profile || null,
    memories: memories || [],
    goals: goals || [],
    focusDays: focusDays || [],
    focusActions: focusActions || [],
    checkins: checkins || [],
    connections: connections || [],
    activities: activities || [],
    resurfacing: resurfacing || [],
  };
}

async function generateBrainReport(context: any, reportType: ReportType) {
  if (!openai) {
    return {
      title: "Brain Report",
      summary:
        "iMemory ha raccolto i tuoi dati recenti e ha individuato segnali utili sui tuoi progressi.",
      productivity_pattern:
        "Il tuo andamento mostra attività distribuite tra memorie, focus e obiettivi.",
      blocker_pattern:
        "I blocchi principali sembrano legati alla continuità e alla scelta delle priorità.",
      opportunity:
        "La migliore opportunità ora è trasformare una connessione AI in una micro-azione concreta.",
      score: 72,
      next_actions: [
        "Scegli un solo goal principale per oggi.",
        "Completa una focus action rimasta aperta.",
        "Rileggi una memoria collegata al tuo goal più importante.",
      ],
      risks: ["Troppi elementi aperti possono ridurre la chiarezza."],
      highlights: ["Il sistema ha dati sufficienti per generare insight utili."],
    };
  }

  const compactContext = {
    profile: context.profile,
    memories: context.memories.map((item: any) => ({
      title: item.title,
      category: item.category,
      summary: item.summary,
      content: cleanText(item.content).slice(0, 500),
      created_at: item.created_at,
    })),
    goals: context.goals.map((item: any) => ({
      title: item.title,
      description: item.description,
      status: item.status,
      priority: item.priority,
      deadline: item.deadline,
      ai_strategy: item.ai_strategy,
      ai_risk: item.ai_risk,
      ai_next_action: item.ai_next_action,
    })),
    focusDays: context.focusDays,
    focusActions: context.focusActions,
    checkins: context.checkins,
    connections: context.connections,
    activities: context.activities,
    resurfacing: context.resurfacing,
  };

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.55,
      messages: [
        {
          role: "system",
          content: `
Sei l'AI Brain Report Engine di iMemory.

Analizzi il cervello digitale dell'utente e produci un report operativo.

Rispondi SOLO in JSON valido:
{
  "title": "titolo breve",
  "summary": "riassunto generale",
  "productivity_pattern": "pattern produttivo rilevato",
  "blocker_pattern": "blocco o rischio ricorrente",
  "opportunity": "migliore opportunità ora",
  "score": 1-100,
  "next_actions": ["azione 1", "azione 2", "azione 3"],
  "risks": ["rischio 1", "rischio 2"],
  "highlights": ["highlight 1", "highlight 2"]
}

Regole:
- italiano
- tono premium, diretto, da AI coach
- niente frasi generiche
- massimo 3 next_actions
- massimo 3 risks
- massimo 3 highlights
- score deve rappresentare chiarezza, continuità e progresso
          `,
        },
        {
          role: "user",
          content: `
Tipo report: ${reportType}

Dati utente:
${JSON.stringify(compactContext, null, 2)}
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
      title: cleanText(parsed.title).slice(0, 120) || "AI Brain Report",
      summary:
        cleanText(parsed.summary) ||
        "iMemory ha analizzato i tuoi dati recenti.",
      productivity_pattern:
        cleanText(parsed.productivity_pattern) ||
        "Il tuo pattern produttivo mostra segnali da consolidare.",
      blocker_pattern:
        cleanText(parsed.blocker_pattern) ||
        "Il blocco principale è mantenere continuità.",
      opportunity:
        cleanText(parsed.opportunity) ||
        "Trasforma una connessione AI in una micro-azione.",
      score: clampScore(parsed.score),
      next_actions: Array.isArray(parsed.next_actions)
        ? parsed.next_actions.slice(0, 3)
        : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks.slice(0, 3) : [],
      highlights: Array.isArray(parsed.highlights)
        ? parsed.highlights.slice(0, 3)
        : [],
    };
  } catch (error) {
    console.log("BRAIN REPORT AI ERROR:", error);

    return {
      title: "AI Brain Report",
      summary:
        "iMemory ha analizzato i tuoi dati recenti e ha trovato segnali utili sui tuoi progressi.",
      productivity_pattern:
        "Le attività recenti mostrano una fase di costruzione: stai creando dati, obiettivi e connessioni.",
      blocker_pattern:
        "Il rischio principale è disperdere energia su troppe cose contemporaneamente.",
      opportunity:
        "La migliore opportunità è scegliere una sola azione ad alto impatto e completarla oggi.",
      score: 70,
      next_actions: [
        "Completa una focus action aperta.",
        "Rivedi il goal più importante.",
        "Salva una nuova memoria collegata al lavoro di oggi.",
      ],
      risks: ["Possibile dispersione tra più obiettivi."],
      highlights: ["Il sistema ha abbastanza dati per generare insight."],
    };
  }
}

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return Response.json({ error: "Utente non autorizzato" }, { status: 401 });
    }

    const url = new URL(req.url);

    const reportType =
      url.searchParams.get("type") === "weekly" ? "weekly" : "daily";

    const force = url.searchParams.get("force") === "1";
    const today = url.searchParams.get("date") || getToday();

    if (!force) {
      const { data: existingReport } = await supabaseAdmin
        .from("brain_reports")
        .select("*")
        .eq("user_id", user.id)
        .eq("report_date", today)
        .eq("report_type", reportType)
        .maybeSingle();

      if (existingReport) {
        return Response.json({
          report: existingReport,
          source: "existing",
        });
      }
    }

    const context = await getBrainContext(user.id, reportType);
    const ai = await generateBrainReport(context, reportType);

    const { data: report, error } = await supabaseAdmin
      .from("brain_reports")
      .upsert(
        {
          user_id: user.id,
          report_date: today,
          report_type: reportType,
          title: ai.title,
          summary: ai.summary,
          productivity_pattern: ai.productivity_pattern,
          blocker_pattern: ai.blocker_pattern,
          opportunity: ai.opportunity,
          score: ai.score,
          next_actions: ai.next_actions,
          risks: ai.risks,
          highlights: ai.highlights,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,report_date,report_type",
        }
      )
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      report,
      source: "generated",
    });
  } catch (error: any) {
    console.log("BRAIN REPORT ERROR:", error);

    return Response.json(
      {
        error: error.message || "Errore Brain Report",
      },
      { status: 500 }
    );
  }
}