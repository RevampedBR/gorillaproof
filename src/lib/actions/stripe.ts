"use server";

import Stripe from "stripe";
import { createClient } from "@/utils/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-12-18.acacia", // Use the valid API version for your stripe package
});

/**
 * Creates a Stripe Checkout session to subscribe an organization to a specific plan (priceId).
 */
export async function createCheckoutSession(orgId: string, priceId: string, returnUrl: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Não autenticado." };
    }

    // Verify user is an admin or owner of the org
    const { data: membership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return { error: "Sem permissão para gerenciar a assinatura." };
    }

    // Check if the organization already has a customer ID
    const { data: org } = await supabase
      .from("organizations")
      .select("stripe_customer_id, name")
      .eq("id", orgId)
      .single();

    let customerId = org?.stripe_customer_id;

    if (!customerId) {
      // Create a new Stripe Customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: org?.name,
        metadata: {
          organization_id: orgId,
        },
      });
      customerId = customer.id;

      // Ensure the newly created customer ID is stored immediately or let the webhook do it.
      // But it's safer to have it stored so we can reuse it if checkout fails.
      // In this action, we update it via a service role or the standard client if RLS allows it.
      // Assuming RLS allows admins to update their organization.
      await supabase
          .from("organizations")
          .update({ stripe_customer_id: customerId })
          .eq("id", orgId);
    }

    // Create the checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${returnUrl}?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl}?canceled=true`,
      metadata: {
        organization_id: orgId,
      },
      client_reference_id: orgId, // this is very useful in webhooks
    });

    return { url: session.url };
  } catch (error: unknown) {
    console.error("Stripe Checkout Error:", error);
    return { error: error instanceof Error ? error.message : "Falha ao criar sessão de checkout." };
  }
}

/**
 * Creates a Customer Portal session for managing an existing subscription.
 */
export async function createCustomerPortalSession(orgId: string, returnUrl: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Não autenticado." };
    }

    // Verify user is an admin or owner of the org
    const { data: membership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return { error: "Sem permissão para gerenciar a assinatura." };
    }

    // Fetch the customer ID
    const { data: org } = await supabase
      .from("organizations")
      .select("stripe_customer_id")
      .eq("id", orgId)
      .single();

    if (!org?.stripe_customer_id) {
      return { error: "Esta organização não possui uma assinatura ativa." };
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: returnUrl,
    });

    return { url: session.url };
  } catch (error: unknown) {
    console.error("Stripe Portal Error:", error);
    return { error: error instanceof Error ? error.message : "Falha ao acessar o portal do cliente." };
  }
}
