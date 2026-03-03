"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProof } from "@/lib/actions/proofs";

interface CreateProofDialogProps {
    clientId: string;
    projectId?: string;
    clientName?: string;
    projectName?: string;
    children: React.ReactNode;
}

export function CreateProofDialog({ clientId, projectId, clientName, projectName, children }: CreateProofDialogProps) {
    const t = useTranslations("dashboard.projects");
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        const formData = new FormData(e.currentTarget);

        startTransition(async () => {
            const result = await createProof(clientId, formData, projectId || null);
            if (result?.error) {
                setError(result.error);
            } else {
                setOpen(false);
                if (result.id) router.push(`/proofs/${result.id}`);
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[420px] bg-zinc-950 border-zinc-800 text-zinc-100">
                <DialogHeader>
                    {(clientName || projectName) && (
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium mb-1">
                            {clientName && (
                                <>
                                    <svg className="h-3 w-3 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                    </svg>
                                    <span className="text-zinc-400">{clientName}</span>
                                </>
                            )}
                            {clientName && projectName && (
                                <svg className="h-2.5 w-2.5 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                </svg>
                            )}
                            {projectName && (
                                <>
                                    <svg className="h-3 w-3 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                                    </svg>
                                    <span className="text-zinc-400">{projectName}</span>
                                </>
                            )}
                        </div>
                    )}
                    <DialogTitle className="text-xl font-bold text-zinc-100">
                        {t("createProof")}
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        {t("createSubtitle")}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="grid gap-5 pt-2">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-2 rounded">
                            {error}
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor="title" className="text-zinc-300 text-sm">
                            {t("proofTitle")}
                        </Label>
                        <Input
                            id="title"
                            name="title"
                            placeholder={t("proofTitlePlaceholder")}
                            required
                            autoFocus
                            className="bg-zinc-900/50 border-zinc-800/80 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-emerald-500"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setOpen(false)}
                            className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                        >
                            {t("cancel")}
                        </Button>
                        <Button
                            type="submit"
                            disabled={isPending}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                        >
                            {isPending ? "..." : t("createProof")}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
