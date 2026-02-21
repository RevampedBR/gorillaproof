"use client";

import { useState, useTransition } from "react";
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
    projectId: string;
    children: React.ReactNode;
}

export function CreateProofDialog({ projectId, children }: CreateProofDialogProps) {
    const t = useTranslations("dashboard.projects");
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        const formData = new FormData(e.currentTarget);

        startTransition(async () => {
            const result = await createProof(projectId, formData);
            if (result?.error) {
                setError(result.error);
            } else {
                setOpen(false);
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[420px] bg-zinc-950 border-zinc-800 text-zinc-100">
                <DialogHeader>
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
