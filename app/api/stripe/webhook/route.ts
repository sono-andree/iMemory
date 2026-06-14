import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  console.log("WEBHOOK CALLED");

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    console.log("NO STRIPE SIGNATURE");

    return Response.json(
      { error: "Missing signature" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    console.log("WEBHOOK SIGNATURE ERROR:", error.message);

    return Response.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  console.log("STRIPE EVENT RECEIVED:", event.type);

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      console.log("CHECKOUT SESSION:", {
        customer: session.customer,
        subscription: session.subscription,
        metadata: session.metadata,
      });

      const userId = session.metadata?.userId;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      if (!userId) {
        console.log("NO USER ID IN SESSION METADATA");

        return Response.json({ received: true });
      }

      if (!subscriptionId) {
        console.log("NO SUBSCRIPTION ID");

        return Response.json({ received: true });
      }

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      console.log("SUBSCRIPTION STATUS:", subscription.status);

      const { data, error } = await supabaseAdmin
        .from("profiles")
        .update({
          plan:
            subscription.status === "active" ||
            subscription.status === "trialing"
              ? "pro"
              : "free",
          subscription_status: subscription.status,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          current_period_end: (subscription as any).current_period_end
            ? new Date(
                (subscription as any).current_period_end * 1000
              ).toISOString()
            : null,
        })
        .eq("id", userId)
        .select();

      console.log("SUPABASE UPDATE DATA:", data);
      console.log("SUPABASE UPDATE ERROR:", error);
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;

      console.log("SUBSCRIPTION UPDATED:", {
        id: subscription.id,
        customer: subscription.customer,
        status: subscription.status,
        metadata: subscription.metadata,
      });

      const userId = subscription.metadata?.userId;
      const customerId = subscription.customer as string;

      const updateData = {
        plan:
          subscription.status === "active" ||
          subscription.status === "trialing"
            ? "pro"
            : "free",
        subscription_status: subscription.status,
        stripe_subscription_id: subscription.id,
        current_period_end: (subscription as any).current_period_end
          ? new Date(
              (subscription as any).current_period_end * 1000
            ).toISOString()
          : null,
      };

      let query = supabaseAdmin.from("profiles").update(updateData);

      if (userId) {
        query = query.eq("id", userId);
      } else {
        query = query.eq("stripe_customer_id", customerId);
      }

      const { data, error } = await query.select();

      console.log("SUB UPDATE DATA:", data);
      console.log("SUB UPDATE ERROR:", error);
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;

      const userId = subscription.metadata?.userId;
      const customerId = subscription.customer as string;

      let query = supabaseAdmin
        .from("profiles")
        .update({
          plan: "free",
          subscription_status: "canceled",
          stripe_subscription_id: subscription.id,
        });

      if (userId) {
        query = query.eq("id", userId);
      } else {
        query = query.eq("stripe_customer_id", customerId);
      }

      const { data, error } = await query.select();

      console.log("SUB DELETE DATA:", data);
      console.log("SUB DELETE ERROR:", error);
    }

    return Response.json({ received: true });
  } catch (error: any) {
    console.log("WEBHOOK HANDLE ERROR:", error);

    return Response.json(
      {
        error: error.message,
      },
      { status: 500 }
    );
  }
}