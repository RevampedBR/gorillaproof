"use client";

import { useState } from "react";
import Image from "next/image";

interface GuestGateProps {
    proofTitle: string;
    onSubmit: (displayName: string, email?: string) => Promise<void>;
    loading?: boolean;
    error?: string | null;
}

export function GuestGate({ proofTitle, onSubmit, loading = false, error }: GuestGateProps) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        await onSubmit(name.trim(), email.trim() || undefined);
    };

    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
            {/* Ambient background glow */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-600/8 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-fuchsia-600/5 rounded-full blur-[100px]" />
            </div>

            <div className="relative w-full max-w-[420px]">
                {/* Card */}
                <div className="bg-[#1e1e32]/80 backdrop-blur-xl border border-zinc-800/60 rounded-2xl shadow-2xl shadow-black/40 p-8">
                    {/* Logo */}
                    <div className="flex items-center justify-center gap-2.5 mb-6">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 shadow-lg shadow-indigo-500/25">
                            <Image
                                src="https://static.wixstatic.com/media/1b0281_ef9aa17a06ce4946acda750d99e30419~mv2.png/v1/fill/w_38,h_30,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/1b0281_ef9aa17a06ce4946acda750d99e30419~mv2.png"
                                alt="GorillaProof"
                                width={18}
                                height={14}
                                className="brightness-200"
                            />
                        </div>
                        <span className="text-[16px] font-bold tracking-tight text-zinc-100">GorillaProof</span>
                    </div>

                    {/* Title */}
                    <div className="text-center mb-6">
                        <h1 className="text-[18px] font-bold text-white mb-2">Você foi convidado a revisar</h1>
                        <p className="text-[14px] text-zinc-400">
                            <span className="text-indigo-400 font-medium">&quot;{proofTitle}&quot;</span>
                        </p>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent mb-6" />

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-[12px] text-zinc-400 font-medium mb-1.5 block">
                                Seu nome <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Maria Silva"
                                required
                                autoFocus
                                className="w-full bg-[#15152a] border border-zinc-800 rounded-lg px-3.5 py-2.5 text-[14px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                            />
                        </div>

                        <div>
                            <label className="text-[12px] text-zinc-400 font-medium mb-1.5 block">
                                E-mail <span className="text-zinc-600">(opcional)</span>
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="maria@empresa.com"
                                className="w-full bg-[#15152a] border border-zinc-800 rounded-lg px-3.5 py-2.5 text-[14px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                            />
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-[13px] text-red-400">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !name.trim()}
                            className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-[14px] font-semibold rounded-lg shadow-lg shadow-indigo-500/20 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Entrando...
                                </>
                            ) : (
                                <>
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    Começar Revisão
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <p className="text-center text-[11px] text-zinc-600 mt-5">
                        Sem cadastro necessário. Apenas identifique-se para comentar.
                    </p>
                </div>
            </div>
        </div>
    );
}

/* ─── Error / Invalid Token Screen ─── */
export function GuestTokenError({ message }: { message: string }) {
    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-red-600/5 rounded-full blur-[100px]" />
            </div>

            <div className="relative w-full max-w-[400px] text-center">
                <div className="bg-[#1e1e32]/80 backdrop-blur-xl border border-zinc-800/60 rounded-2xl shadow-2xl p-8">
                    {/* Error icon */}
                    <div className="flex items-center justify-center mb-5">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
                            <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                            </svg>
                        </div>
                    </div>

                    <h1 className="text-[18px] font-bold text-white mb-2">Link indisponível</h1>
                    <p className="text-[14px] text-zinc-400 mb-6">{message}</p>

                    <a
                        href="/"
                        className="inline-flex items-center gap-2 text-[13px] text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Ir para GorillaProof
                    </a>
                </div>
            </div>
        </div>
    );
}
