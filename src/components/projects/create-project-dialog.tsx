"use client";

import { useState, useTransition, useEffect } from "react";
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
import { createProject } from "@/lib/actions/projects";
import { getClients } from "@/lib/actions/clients";

interface CreateProjectDialogProps {
    children: React.ReactNode;
}

export function CreateProjectDialog({ children }: CreateProjectDialogProps) {
    const t = useTranslations("dashboard.projects");
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [clients, setClients] = useState<any[]>([]);

    useEffect(() => {
        if (open) {
            getClients().then(({ data }) => setClients(data || []));
        }
    }, [open]);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);

        // We need to construct FormData manually to ensure client_id is included correctly
        const form = e.currentTarget;
        const formData = new FormData(form);

        // If client_id is empty string, set it to null or remove it?
        // createProject handles "null" string or empty string as null.

        startTransition(async () => {
            const result = await createProject(formData);
            if (result?.error) {
                setError(result.error);
            } else {
                setOpen(false);
                form.reset();
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[480px] bg-background border-border text-foreground">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">
                        {t("createTitle")}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        {t("createSubtitle")}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="grid gap-5 pt-2">
                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-2 rounded">
                            {error}
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor="name" className="text-sm">
                            {t("name")}
                        </Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder={t("namePlaceholder")}
                            required
                            autoFocus
                            className="bg-secondary/50 border-input placeholder:text-muted-foreground focus-visible:ring-primary"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="client_id" className="text-sm">
                            {t("client")}
                        </Label>
                        <select
                            id="client_id"
                            name="client_id"
                            className="flex h-10 w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="">{t("selectClient")}</option>
                            {clients.map((client) => (
                                <option key={client.id} value={client.id}>
                                    {client.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description" className="text-sm">
                            {t("description")}
                        </Label>
                        <textarea
                            id="description"
                            name="description"
                            placeholder={t("descriptionPlaceholder")}
                            rows={3}
                            className="flex min-h-[60px] w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setOpen(false)}
                            className="text-muted-foreground hover:text-foreground hover:bg-secondary"
                        >
                            {t("cancel")}
                        </Button>
                        <Button
                            type="submit"
                            disabled={isPending}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-md"
                        >
                            {isPending ? "..." : t("submit")}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
