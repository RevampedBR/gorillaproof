"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { recoverPassword } from "../actions";
import { useState, useTransition } from "react";

export default function ForgotPasswordPage() {
    const t = useTranslations("auth.forgotPassword");
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        const formData = new FormData(e.currentTarget);

        startTransition(async () => {
            const result = await recoverPassword(formData);
            if (result?.error) {
                setError(result.error);
            }
        });
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-400">
                    {t("title")}
                </h1>
                <p className="text-balance text-sm text-zinc-400">
                    {t("subtitle")}
                </p>
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-2 rounded max-w-sm mt-2">
                        {error}
                    </div>
                )}
            </div>
            <div className="grid gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="email" className="text-zinc-300">{t("email")}</Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="m@example.com"
                        required
                        className="bg-zinc-900/50 border-zinc-800/80 text-zinc-100 focus-visible:ring-indigo-500"
                    />
                </div>
                <Button type="submit" disabled={isPending} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-[0_0_15px_rgba(79,70,229,0.3)]">
                    {isPending ? "..." : t("submit")}
                </Button>
            </div>
            <div className="text-center text-sm text-zinc-400">
                <Link href="/login" className="hover:text-amber-400 hover:underline underline-offset-4 transition-colors">
                    {t("backToLogin")}
                </Link>
            </div>
        </form>
    );
}
