"use client";

import { useState, useTransition } from "react";
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
import { createClientAction } from "@/lib/actions/clients";
import { LogoCropper } from "@/components/ui/logo-cropper";
import { createClient } from "@/utils/supabase/client";

interface CreateClientDialogProps {
    children: React.ReactNode;
}

export function CreateClientDialog({ children }: CreateClientDialogProps) {
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleLogoUpload = async (file: File) => {
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get org ID (needed for storage RLS path)
            const { data: membership } = await supabase
                .from("organization_members")
                .select("organization_id")
                .eq("user_id", user.id)
                .limit(1)
                .single();
            if (!membership) { setError("Organização não encontrada"); return; }

            const path = `${membership.organization_id}/logos/${Date.now()}-client-logo.png`;
            const { error: uploadError } = await supabase.storage.from("brand-assets").upload(path, file, {
                cacheControl: "3600",
                upsert: true,
            });
            if (uploadError) { setError("Erro ao enviar logo: " + uploadError.message); return; }

            const { data: urlData } = supabase.storage.from("brand-assets").getPublicUrl(path);
            setLogoUrl(urlData.publicUrl);
        } catch {
            setError("Erro interno ao enviar logo");
        }
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        const formData = new FormData(e.currentTarget);
        if (logoUrl) {
            formData.append("logo_url", logoUrl);
        }

        startTransition(async () => {
            const result = await createClientAction(formData);
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
            <DialogContent className="sm:max-w-[480px] bg-zinc-950 border-zinc-800 text-zinc-100">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-zinc-100">
                        Novo Cliente
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Adicione um novo cliente para organizar seus projetos e provas.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="grid gap-5 pt-2">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-2 rounded">
                            {error}
                        </div>
                    )}

                    {/* Logo (centered, compact) */}
                    <LogoCropper onUpload={handleLogoUpload} currentLogoUrl={logoUrl} />

                    {/* Nome */}
                    <div className="grid gap-2">
                        <Label htmlFor="name" className="text-zinc-300 text-sm">
                            Nome do cliente
                        </Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder="Ex: Marca XYZ, Empresa ABC..."
                            required
                            autoFocus
                            className="bg-zinc-900/50 border-zinc-800/80 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-emerald-500"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description" className="text-zinc-300 text-sm">
                            Descrição (opcional)
                        </Label>
                        <textarea
                            id="description"
                            name="description"
                            placeholder="Breve descrição sobre o cliente..."
                            rows={2}
                            className="flex min-h-[50px] w-full rounded-md border border-zinc-800/80 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                            <Label htmlFor="contact_email" className="text-zinc-300 text-sm">
                                E-mail de contato
                            </Label>
                            <Input
                                id="contact_email"
                                name="contact_email"
                                type="email"
                                placeholder="contato@cliente.com"
                                className="bg-zinc-900/50 border-zinc-800/80 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-emerald-500"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="contact_phone" className="text-zinc-300 text-sm">
                                Telefone
                            </Label>
                            <Input
                                id="contact_phone"
                                name="contact_phone"
                                type="tel"
                                placeholder="(11) 99999-0000"
                                className="bg-zinc-900/50 border-zinc-800/80 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-emerald-500"
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="segment" className="text-zinc-300 text-sm">
                            Segmento
                        </Label>
                        <select
                            id="segment"
                            name="segment"
                            className="flex h-10 w-full rounded-md border border-zinc-800/80 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-1 focus:ring-emerald-500 appearance-none"
                        >
                            <option value="">Selecione...</option>
                            <option value="publicidade">Publicidade</option>
                            <option value="design">Design</option>
                            <option value="moda">Moda</option>
                            <option value="fotografia">Fotografia</option>
                            <option value="audiovisual">Audiovisual</option>
                            <option value="outro">Outro</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setOpen(false)}
                            className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isPending}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                        >
                            {isPending ? "..." : "Criar Cliente"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
