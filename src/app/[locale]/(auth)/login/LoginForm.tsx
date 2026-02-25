"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "../actions";

export function LoginForm() {
    const t = useTranslations("auth.login");
    const [isPending, startTransition] = React.useTransition();
    const [error, setError] = React.useState<string | null>(null);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setError(null);

        startTransition(async () => {
            const result = await login(formData);
            if (result?.error) {
                setError(result.error);
            }
        });
    };

    return (
        <div className="flex flex-col gap-6 w-full max-w-sm mx-auto p-6">
            <div className="flex flex-col space-y-2 text-center">
                <div className="mx-auto h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
                     <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    {t("title")}
                </h1>
                <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <form onSubmit={handleSubmit} className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="email" className="text-foreground">
                            {t("email")}
                        </Label>
                        <Input
                            id="email"
                            name="email"
                            placeholder="name@agency.com"
                            type="email"
                            autoCapitalize="none"
                            autoComplete="email"
                            autoCorrect="off"
                            disabled={isPending}
                            required
                            className="bg-secondary/50 border-input text-foreground focus-visible:ring-primary"
                        />
                    </div>
                    <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password" className="text-foreground">
                                {t("password")}
                            </Label>
                            <Link
                                href="/forgot-password"
                                className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                            >
                                {t("forgotPassword")}
                            </Link>
                        </div>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            disabled={isPending}
                            required
                            className="bg-secondary/50 border-input text-foreground focus-visible:ring-primary"
                        />
                    </div>

                    {error && (
                        <div className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-lg border border-destructive/20 text-center">
                            {error}
                        </div>
                    )}

                    <Button disabled={isPending} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md">
                        {isPending && (
                            <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        )}
                        {t("submitButton")}
                    </Button>
                </form>
            </div>

            <div className="text-center text-sm text-muted-foreground">
                {t("noAccount")}{" "}
                <Link href="/register" className="font-medium text-primary hover:text-primary/80 transition-colors">
                    {t("signUpLink")}
                </Link>
            </div>
        </div>
    );
}
