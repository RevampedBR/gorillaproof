"use client";

import { useState, useRef, useEffect } from "react";
import { generateShareToken } from "@/lib/actions/proofs";
import { revokeShareToken, setShareTokenExpiration, getGuestsByProof } from "@/lib/actions/guests";
import { useToast } from "@/components/ui/toast-provider";

interface ShareDialogProps {
    isOpen: boolean;
    onClose: () => void;
    proofId: string;
    proofTitle: string;
    projectId: string;
    existingToken?: string | null;
}

export function ShareDialog({ isOpen, onClose, proofId, proofTitle, projectId, existingToken }: ShareDialogProps) {
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);
    const [token, setToken] = useState<string | null>(existingToken || null);
    const [generating, setGenerating] = useState(false);
    const [guests, setGuests] = useState<{ id: string; display_name: string; email?: string | null; created_at: string }[]>([]);
    const [expiration, setExpiration] = useState<string>("none");
    const inputRef = useRef<HTMLInputElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);

    const reviewUrl = token && typeof window !== "undefined"
        ? `${window.location.origin}/review/${token}`
        : "";

    // Load guests when dialog opens
    useEffect(() => {
        if (isOpen && proofId) {
            getGuestsByProof(proofId).then(({ data }) => setGuests(data));
        }
    }, [isOpen, proofId]);

    useEffect(() => {
        if (isOpen && inputRef.current && token) inputRef.current.select();
    }, [isOpen, token]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) onClose();
        };
        if (isOpen) {
            document.addEventListener("mousedown", handler);
            return () => document.removeEventListener("mousedown", handler);
        }
    }, [isOpen, onClose]);

    const handleGenerate = async () => {
        setGenerating(true);
        const result = await generateShareToken(proofId, projectId);
        if (result.token) {
            setToken(result.token);
            toast("Link de revisão gerado!", "success");
        } else {
            toast(result.error || "Erro ao gerar link", "error");
        }
        setGenerating(false);
    };

    const handleCopy = async () => {
        if (!reviewUrl) return;
        try {
            await navigator.clipboard.writeText(reviewUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            inputRef.current?.select();
            document.execCommand("copy");
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleRevoke = async () => {
        if (!confirm("Revogar este link? Revisores externos não poderão mais acessar.")) return;
        const result = await revokeShareToken(proofId);
        if (result.error) {
            toast(result.error, "error");
        } else {
            setToken(null);
            toast("Link revogado com sucesso", "success");
        }
    };

    const handleExpiration = async (value: string) => {
        setExpiration(value);
        let expiresAt: string | null = null;
        if (value !== "none") {
            const d = new Date();
            if (value === "24h") d.setHours(d.getHours() + 24);
            else if (value === "7d") d.setDate(d.getDate() + 7);
            else if (value === "30d") d.setDate(d.getDate() + 30);
            expiresAt = d.toISOString();
        }
        await setShareTokenExpiration(proofId, expiresAt);
        toast(expiresAt ? "Expiração definida" : "Sem expiração", "info");
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div ref={dialogRef} className="bg-[#1e1e32] border border-[#3a3a55] rounded-2xl shadow-2xl w-[480px] p-6 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-[16px] font-bold text-white">Convidar Revisores Externos</h3>
                    <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-[#2a2a40] transition-colors cursor-pointer">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <p className="text-[13px] text-zinc-400 mb-5">
                    Gere um link único para <span className="text-white font-medium">&quot;{proofTitle}&quot;</span>. Revisores externos podem comentar e dar parecer sem precisar criar conta.
                </p>

                {/* Link section */}
                {!token ? (
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-800 text-white text-[14px] font-semibold rounded-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed mb-5"
                    >
                        {generating ? (
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        ) : (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.54a4.5 4.5 0 00-6.364-6.364L4.5 8.257" /></svg>
                        )}
                        Gerar Link de Revisão
                    </button>
                ) : (
                    <div className="mb-5">
                        <label className="text-[11px] text-zinc-500 font-medium mb-1.5 block uppercase tracking-wider">Link de revisão</label>
                        <div className="flex gap-2">
                            <input
                                ref={inputRef}
                                readOnly
                                value={reviewUrl}
                                className="flex-1 bg-[#15152a] border border-[#3a3a55] rounded-lg px-3 py-2.5 text-[12px] text-zinc-300 font-mono focus:outline-none focus:border-blue-500/50"
                            />
                            <button
                                onClick={handleCopy}
                                className={`h-10 px-4 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${copied
                                    ? "bg-emerald-600 text-white"
                                    : "bg-[#1a8cff] hover:bg-[#0077ee] text-white"
                                    }`}
                            >
                                {copied ? "✓ Copiado!" : "Copiar"}
                            </button>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-3 mt-3">
                            {/* Expiration select */}
                            <div className="flex items-center gap-2">
                                <svg className="h-3.5 w-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <select
                                    value={expiration}
                                    onChange={(e) => handleExpiration(e.target.value)}
                                    className="bg-[#15152a] border border-[#3a3a55] rounded-lg px-2 py-1.5 text-[12px] text-zinc-300 focus:outline-none focus:border-blue-500/50 cursor-pointer"
                                >
                                    <option value="none">Sem expiração</option>
                                    <option value="24h">Expira em 24h</option>
                                    <option value="7d">Expira em 7 dias</option>
                                    <option value="30d">Expira em 30 dias</option>
                                </select>
                            </div>

                            <div className="flex-1" />

                            {/* Revoke */}
                            <button
                                onClick={handleRevoke}
                                className="text-[12px] text-red-400 hover:text-red-300 transition-colors cursor-pointer flex items-center gap-1"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                Revogar link
                            </button>
                        </div>
                    </div>
                )}

                {/* Guests who accessed */}
                {guests.length > 0 && (
                    <div className="border-t border-[#2a2a40] pt-4 mt-1">
                        <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider mb-2">
                            Revisores externos ({guests.length})
                        </p>
                        <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                            {guests.map((g) => (
                                <div key={g.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#2a2a40]/50 transition-colors">
                                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                                        {g.display_name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-medium text-zinc-200 truncate">{g.display_name}</p>
                                        {g.email && <p className="text-[11px] text-zinc-500 truncate">{g.email}</p>}
                                    </div>
                                    <span className="text-[10px] text-zinc-600 shrink-0">
                                        {new Date(g.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Share via buttons */}
                {token && (
                    <div className="flex items-center gap-3 pt-4 mt-3 border-t border-[#2a2a40]">
                        <span className="text-[11px] text-zinc-500 font-medium">Enviar via:</span>
                        {[
                            { name: "WhatsApp", icon: "↗", color: "hover:bg-green-500/20 hover:text-green-400", url: `https://wa.me/?text=${encodeURIComponent(`Revise "${proofTitle}" aqui: ${reviewUrl}`)}` },
                            { name: "Email", icon: "✉", color: "hover:bg-blue-500/20 hover:text-blue-400", url: `mailto:?subject=${encodeURIComponent(`Revisão: ${proofTitle}`)}&body=${encodeURIComponent(`Olá!\n\nRevise "${proofTitle}" usando o link abaixo:\n${reviewUrl}\n\nNão é necessário criar conta.`)}` },
                            { name: "Telegram", icon: "➤", color: "hover:bg-sky-500/20 hover:text-sky-400", url: `https://t.me/share/url?url=${encodeURIComponent(reviewUrl)}&text=${encodeURIComponent(`Revisão: ${proofTitle}`)}` },
                        ].map((platform) => (
                            <a
                                key={platform.name}
                                href={platform.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`h-8 px-3 rounded-lg text-[12px] text-zinc-400 bg-[#2a2a40] transition-colors no-underline flex items-center gap-1 ${platform.color}`}
                            >
                                {platform.icon} {platform.name}
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
