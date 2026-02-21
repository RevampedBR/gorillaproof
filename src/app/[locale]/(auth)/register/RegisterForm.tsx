"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signup } from "../actions";

export function RegisterForm() {
    const t = useTranslations("auth.register");
    const [isPending, startTransition] = React.useTransition();
    const [error, setError] = React.useState<string | null>(null);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setError(null);

        startTransition(async () => {
            const result = await signup(formData);
            if (result?.error) {
                setError(result.error);
            }
        });
    };

    return (
        <div className="grid gap-6">
            <div className="flex flex-col space-y-2 text-center">
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
                    {t("title")}
                </h1>
                <p className="text-sm text-zinc-400">{t("subtitle")}</p>
            </div>
            <form onSubmit={handleSubmit}>
                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="fullName" className="text-zinc-200">
                            {t("fullName")}
                        </Label>
                        <Input
                            id="fullName"
                            name="fullName"
                            placeholder="Jane Doe"
                            type="text"
                            autoCapitalize="words"
                            disabled={isPending}
                            required
                            className="bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-indigo-500"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="agencyName" className="text-zinc-200">
                            {t("agencyName")}
                        </Label>
                        <Input
                            id="agencyName"
                            name="agencyName"
                            placeholder="Acme Agency"
                            type="text"
                            disabled={isPending}
                            required
                            className="bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-indigo-500"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="email" className="text-zinc-200">
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
                            className="bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-indigo-500"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password" className="text-zinc-200">
                            {t("password")}
                        </Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="new-password"
                            disabled={isPending}
                            required
                            className="bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-indigo-500"
                        />
                    </div>

                    {error && (
                        <div className="text-sm text-red-500 font-medium">{error}</div>
                    )}

                    <Button disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full">
                        {isPending && (
                            <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        )}
                        {t("submitButton")}
                    </Button>
                </div>
            </form>
            <div className="text-center text-sm text-zinc-400">
                {t("alreadyHaveAccount")}{" "}
                <Link href="/login" className="font-medium text-indigo-400 hover:text-indigo-300">
                    {t("loginLink")}
                </Link>
            </div>
        </div>
    );
}
