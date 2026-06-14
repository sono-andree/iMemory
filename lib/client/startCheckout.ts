import { supabase } from "@/lib/supabase";

export async function startProCheckout() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Se non è loggato, prima deve creare account
  // altrimenti Stripe non può collegare il pagamento al profilo iMemory.
  if (!session?.access_token) {
    localStorage.setItem("imemory_after_auth_action", "checkout_pro");
    window.location.href = "/register?plan=pro";
    return;
  }

  const res = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};

  if (!res.ok) {
    alert(data.error || "Errore checkout Stripe.");
    return;
  }

  if (!data.url) {
    alert("URL checkout Stripe mancante.");
    return;
  }

  // Qui porta direttamente alla pagina checkout Stripe
  window.location.href = data.url;
}