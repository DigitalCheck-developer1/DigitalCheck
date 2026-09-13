import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/db/prisma";
import { getStripeClient } from "@/lib/billing/stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe non configurato" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Firma mancante" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json(
      { error: `Firma webhook non valida: ${err instanceof Error ? err.message : "errore sconosciuto"}` },
      { status: 400 }
    );
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const checkoutSession = event.data.object as Stripe.Checkout.Session;
      const userId = checkoutSession.client_reference_id ?? checkoutSession.metadata?.userId;
      if (userId) {
        await prisma.user.update({ where: { id: userId }, data: { plan: "PRO" } });
        await prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            plan: "PRO",
            stripeCustomerId: String(checkoutSession.customer ?? ""),
            stripeSubscriptionId: String(checkoutSession.subscription ?? ""),
          },
          update: {
            plan: "PRO",
            stripeCustomerId: String(checkoutSession.customer ?? ""),
            stripeSubscriptionId: String(checkoutSession.subscription ?? ""),
          },
        });
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const existing = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId: subscription.id },
      });
      if (existing) {
        await prisma.user.update({ where: { id: existing.userId }, data: { plan: "FREE" } });
        await prisma.subscription.update({ where: { userId: existing.userId }, data: { plan: "FREE" } });
      }
      break;
    }
    default:
      break; // eventi non gestiti esplicitamente vengono ignorati, non falliti
  }

  return NextResponse.json({ received: true });
}
