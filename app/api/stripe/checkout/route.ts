import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

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

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return Response.json({ error: "Utente non autorizzato" }, { status: 401 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return Response.json(
        { error: "STRIPE_SECRET_KEY mancante in .env.local" },
        { status: 500 }
      );
    }

    if (!process.env.STRIPE_PRO_PRICE_ID) {
      return Response.json(
        { error: "STRIPE_PRO_PRICE_ID mancante in .env.local" },
        { status: 500 }
      );
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id, email, full_name, name, surname")
      .eq("id", user.id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id || null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || profile?.email || undefined,
        name:
          profile?.full_name ||
          `${profile?.name || ""} ${profile?.surname || ""}`.trim() ||
          undefined,
        metadata: {
          user_id: user.id,
        },
      });

      customerId = customer.id;

      await supabaseAdmin
        .from("profiles")
        .update({
          stripe_customer_id: customerId,
        })
        .eq("id", user.id);
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price: process.env.STRIPE_PRO_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/brain?checkout=success`,
      cancel_url: `${siteUrl}/landing?checkout=cancel`,
      metadata: {
        user_id: user.id,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
        },
      },
    });

    return Response.json({
      url: checkoutSession.url,
    });
  } catch (error: any) {
    console.log("STRIPE CHECKOUT ERROR:", error);

    return Response.json(
      {
        error: error.message || "Errore creazione checkout Stripe",
      },
      { status: 500 }
    );
  }
}