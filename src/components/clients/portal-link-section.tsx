"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    createClientEntity,
    searchClientEntities,
    linkClientToEntity,
    unlinkClientFromEntity,
    getClientEntityLink,
    inviteClientUser,
    getClientUsers,
} from "@/lib/actions/client-portal";

interface PortalLinkSectionProps {
    clientId: string;
    clientName: string;
}

export function PortalLinkSection({ clientId, clientName }: PortalLinkSectionProps) {
    const [link, setLink] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [inviteOpen, setInviteOpen] = useState(false);

    const loadLink = async () => {
        setLoading(true);
        const { data } = await getClientEntityLink(clientId);
        setLink(data);
        setLoading(false);
    };

    useEffect(() => { loadLink(); }, [clientId]);

    if (loading) {
        return (
            <div className="rounded-xl border border-blue-500/15 bg-blue-950/20 p-4 animate-pulse">
                <div className="h-4 w-32 bg-blue-500/10 rounded" />
            </div>
        );
    }

    const entity = link?.client_entities;

    return (
        <div className="rounded-xl border border-blue-500/15 bg-blue-950/20 p-4 space-y-3">
            <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                </svg>
                <h3 className="text-[13px] font-semibold text-blue-200">Portal do Cliente</h3>
            </div>

            {entity ? (
                <>
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-300 text-[11px] font-medium border border-blue-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                            {entity.name}
                        </span>
                        <button
                            onClick={async () => {
                                await unlinkClientFromEntity(clientId);
                                await loadLink();
                            }}
                            className="text-[11px] text-red-400/60 hover:text-red-400 transition-colors"
                        >
                            Desvincular
                        </button>
                    </div>
                    <InviteClientUserButton entityId={entity.id} open={inviteOpen} onOpenChange={setInviteOpen} />
                    <ClientUsersList entityId={entity.id} />
                </>
            ) : (
                <LinkToEntityDialog
                    clientId={clientId}
                    clientName={clientName}
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    onLinked={loadLink}
                />
            )}
        </div>
    );
}

function LinkToEntityDialog({
    clientId,
    clientName,
    open,
    onOpenChange,
    onLinked,
}: {
    clientId: string;
    clientName: string;
    open: boolean;
    onOpenChange: (v: boolean) => void;
    onLinked: () => void;
}) {
    const [mode, setMode] = useState<"search" | "create">("search");
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [newName, setNewName] = useState(clientName);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (q: string) => {
        setQuery(q);
        if (q.length < 2) { setResults([]); return; }
        const { data } = await searchClientEntities(q);
        setResults(data);
    };

    const handleLink = async (entityId: string) => {
        setLoading(true);
        const { error: err } = await linkClientToEntity(clientId, entityId);
        setLoading(false);
        if (err) { setError(err); return; }
        onOpenChange(false);
        onLinked();
    };

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setLoading(true);
        const { data, error: err } = await createClientEntity(newName.trim());
        if (err || !data) { setError(err || "Erro"); setLoading(false); return; }
        await handleLink(data.id);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="text-[12px] border-blue-500/20 text-blue-300 hover:text-blue-200 hover:bg-blue-500/10"
                >
                    <svg className="h-3.5 w-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.915-3.657a4.5 4.5 0 00-6.364-6.364L4.757 6.764a4.5 4.5 0 006.364 6.364" />
                    </svg>
                    Vincular ao Portal
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-[oklch(0.12_0.03_240)] border-blue-900/30 text-blue-100 sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-blue-50">Vincular ao Portal do Cliente</DialogTitle>
                    <DialogDescription className="text-blue-300/60">
                        Vincule &quot;{clientName}&quot; a uma entidade do portal para que o cliente veja as provas no painel unificado.
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <p className="text-[12px] text-red-400 bg-red-400/10 rounded px-3 py-2">{error}</p>
                )}

                <div className="flex gap-2 mb-3">
                    <button
                        onClick={() => setMode("search")}
                        className={`text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors ${mode === "search" ? "bg-blue-500/15 text-blue-200" : "text-blue-400/50 hover:text-blue-300"}`}
                    >
                        Buscar existente
                    </button>
                    <button
                        onClick={() => setMode("create")}
                        className={`text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors ${mode === "create" ? "bg-blue-500/15 text-blue-200" : "text-blue-400/50 hover:text-blue-300"}`}
                    >
                        Criar novo
                    </button>
                </div>

                {mode === "search" ? (
                    <div className="space-y-3">
                        <Input
                            placeholder="Buscar entidade..."
                            value={query}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="bg-blue-950/30 border-blue-900/30 text-blue-100 placeholder:text-blue-400/40"
                        />
                        {results.length > 0 && (
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                                {results.map(r => (
                                    <button
                                        key={r.id}
                                        onClick={() => handleLink(r.id)}
                                        disabled={loading}
                                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-500/10 transition-colors flex items-center gap-2"
                                    >
                                        <div className="h-7 w-7 rounded bg-blue-500/15 flex items-center justify-center text-[11px] font-bold text-blue-300">
                                            {r.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-medium text-blue-100">{r.name}</p>
                                            {r.slug && <p className="text-[10px] text-blue-400/50">{r.slug}</p>}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                        {query.length >= 2 && results.length === 0 && (
                            <p className="text-[12px] text-blue-400/60 text-center py-4">
                                Nenhuma entidade encontrada.{" "}
                                <button onClick={() => setMode("create")} className="text-blue-300 underline">Criar nova?</button>
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        <Input
                            placeholder="Nome da entidade (ex: Grupo Cristina)"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="bg-blue-950/30 border-blue-900/30 text-blue-100 placeholder:text-blue-400/40"
                        />
                        <Button
                            onClick={handleCreate}
                            disabled={loading || !newName.trim()}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white text-[13px]"
                        >
                            {loading ? "Criando..." : "Criar e Vincular"}
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

function InviteClientUserButton({ entityId, open, onOpenChange }: { entityId: string; open: boolean; onOpenChange: (v: boolean) => void }) {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"viewer" | "approver" | "admin">("viewer");
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    const handleInvite = async () => {
        if (!email.trim()) return;
        setLoading(true);
        setMsg(null);
        const { error } = await inviteClientUser(entityId, email.trim(), role);
        setLoading(false);
        if (error) { setMsg(error); return; }
        setMsg("Convite enviado!");
        setEmail("");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="text-[11px] border-blue-500/15 text-blue-300/70 hover:text-blue-200 hover:bg-blue-500/10"
                >
                    + Convidar usuário do cliente
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-[oklch(0.12_0.03_240)] border-blue-900/30 text-blue-100 sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="text-blue-50 text-[15px]">Convidar Usuário</DialogTitle>
                    <DialogDescription className="text-blue-300/60 text-[12px]">
                        O usuário receberá um convite por e-mail para acessar o Portal do Cliente.
                    </DialogDescription>
                </DialogHeader>
                {msg && (
                    <p className={`text-[12px] rounded px-3 py-2 ${msg.startsWith("Convite") ? "text-emerald-400 bg-emerald-400/10" : "text-red-400 bg-red-400/10"}`}>{msg}</p>
                )}
                <div className="space-y-3">
                    <Input
                        type="email"
                        placeholder="email@empresa.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-blue-950/30 border-blue-900/30 text-blue-100 placeholder:text-blue-400/40"
                    />
                    <div className="flex gap-1.5">
                        {(["viewer", "approver", "admin"] as const).map(r => (
                            <button
                                key={r}
                                onClick={() => setRole(r)}
                                className={`text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors ${role === r ? "bg-blue-500/15 text-blue-200" : "text-blue-400/40 hover:text-blue-300"}`}
                            >
                                {r === "viewer" ? "Visualizador" : r === "approver" ? "Aprovador" : "Admin"}
                            </button>
                        ))}
                    </div>
                    <Button
                        onClick={handleInvite}
                        disabled={loading || !email.trim()}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white text-[13px]"
                    >
                        {loading ? "Enviando..." : "Enviar Convite"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function ClientUsersList({ entityId }: { entityId: string }) {
    const [users, setUsers] = useState<any[]>([]);

    useEffect(() => {
        getClientUsers(entityId).then(({ data }) => setUsers(data));
    }, [entityId]);

    if (users.length === 0) return null;

    return (
        <div className="space-y-1.5 mt-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-400/40">Usuários do portal</p>
            {users.map(u => (
                <div key={u.id} className="flex items-center gap-2 text-[12px]">
                    <div className="h-5 w-5 rounded-full bg-blue-500/15 text-[9px] font-bold text-blue-300 flex items-center justify-center">
                        {(u.name || "U").charAt(0).toUpperCase()}
                    </div>
                    <span className="text-blue-200 truncate flex-1">{u.email || u.name}</span>
                    <span className="text-[10px] text-blue-400/40">{u.role}</span>
                </div>
            ))}
        </div>
    );
}
