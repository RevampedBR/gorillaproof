"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { createCheckoutSession, createCustomerPortalSession } from "@/lib/actions/stripe";

interface BillingTabProps {
  orgId: string;
  subscriptionStatus?: string;
  priceId?: string;
}

export function BillingTab({ orgId, subscriptionStatus, priceId }: BillingTabProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const isPremium = subscriptionStatus === "active";
  const PREMIUM_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID || "price_123456789";

  const handleSubscribe = async () => {
    setLoading(true);
    const returnUrl = window.location.href; // current page
    const res = await createCheckoutSession(orgId, PREMIUM_PRICE_ID, returnUrl);
    setLoading(false);

    if (res.error) {
      toast(res.error, "error");
    } else if (res.url) {
      window.location.href = res.url;
    }
  };

  const handleManage = async () => {
    setLoading(true);
    const returnUrl = window.location.href; // current page
    const res = await createCustomerPortalSession(orgId, returnUrl);
    setLoading(false);

    if (res.error) {
      toast(res.error, "error");
    } else if (res.url) {
      window.location.href = res.url;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-white mb-2">Plano Atual</h2>
          <div className="flex items-center gap-4">
            <div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${isPremium ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-300'}`}>
              {isPremium ? "Premium" : "Gratuito"}
            </div>
            {isPremium && subscriptionStatus && (
              <span className="text-xs text-zinc-500 uppercase">
                Status: {subscriptionStatus}
              </span>
            )}
          </div>
        </div>

        <div className="text-sm text-zinc-400">
          {isPremium ? (
            <p>Sua organização possui acesso total a todos os recursos da plataforma.</p>
          ) : (
            <p>Faça upgrade para o plano Premium para desbloquear mais recursos e remover limites.</p>
          )}
        </div>

        <div className="pt-4 border-t border-zinc-800">
          {isPremium ? (
            <Button
              onClick={handleManage}
              disabled={loading}
              variant="outline"
              className="h-10 px-6 rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? "Acessando portal..." : "Gerenciar Assinatura"}
            </Button>
          ) : (
            <Button
              onClick={handleSubscribe}
              disabled={loading}
              className="h-10 px-6 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? "Redirecionando..." : "Assinar Premium"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
