"use client";

import { useState, useRef, useEffect } from "react";

interface ShareDialogProps {
    isOpen: boolean;
    onClose: () => void;
    proofId: string;
    proofTitle: string;
}

export function ShareDialog({ isOpen, onClose, proofId, proofTitle }: ShareDialogProps) {
    const [copied, setCopied] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);

    const shareUrl = typeof window !== "undefined"
        ? `${window.location.origin}/en/proofs/${proofId}`
        : `/en/proofs/${proofId}`;

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.select();
        }
    }, [isOpen]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener("mousedown", handler);
            return () => document.removeEventListener("mousedown", handler);
        }
    }, [isOpen, onClose]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            inputRef.current?.select();
            document.execCommand("copy");
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div ref={dialogRef} className="bg-[#1e1e32] border border-[#3a3a55] rounded-2xl shadow-2xl w-[440px] p-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-[16px] font-bold text-white">Share Proof</h3>
                    <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-[#2a2a40] transition-colors">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <p className="text-[13px] text-zinc-400 mb-4">
                    Share <span className="text-white font-medium">&quot;{proofTitle}&quot;</span> with your team
                </p>

                {/* Link copy */}
                <div className="flex gap-2 mb-5">
                    <input
                        ref={inputRef}
                        readOnly
                        value={shareUrl}
                        className="flex-1 bg-[#15152a] border border-[#3a3a55] rounded-lg px-3 py-2.5 text-[13px] text-zinc-300 font-mono focus:outline-none focus:border-blue-500/50"
                    />
                    <button
                        onClick={handleCopy}
                        className={`h-10 px-4 rounded-lg text-[13px] font-semibold transition-all ${copied
                            ? "bg-emerald-600 text-white"
                            : "bg-[#1a8cff] hover:bg-[#0077ee] text-white"
                            }`}
                    >
                        {copied ? "✓ Copied!" : "Copy Link"}
                    </button>
                </div>

                {/* Invite by email */}
                <div className="mb-5">
                    <label className="text-[12px] text-zinc-400 font-medium mb-2 block">Invite by email</label>
                    <div className="flex gap-2">
                        <input
                            placeholder="email@company.com"
                            className="flex-1 bg-[#15152a] border border-[#3a3a55] rounded-lg px-3 py-2.5 text-[13px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50"
                        />
                        <button className="h-10 px-4 rounded-lg text-[13px] font-semibold bg-[#2a2a40] hover:bg-[#3a3a55] text-zinc-300 transition-colors">
                            Send
                        </button>
                    </div>
                </div>

                {/* Share via buttons */}
                <div className="flex items-center gap-3 pt-3 border-t border-[#2a2a40]">
                    <span className="text-[11px] text-zinc-500 font-medium">Share via:</span>
                    {[
                        { name: "Slack", icon: "#", color: "hover:bg-purple-500/20 hover:text-purple-400" },
                        { name: "Email", icon: "✉", color: "hover:bg-blue-500/20 hover:text-blue-400" },
                        { name: "Telegram", icon: "➤", color: "hover:bg-sky-500/20 hover:text-sky-400" },
                    ].map((platform) => (
                        <button
                            key={platform.name}
                            className={`h-8 px-3 rounded-lg text-[12px] text-zinc-400 bg-[#2a2a40] transition-colors ${platform.color}`}
                        >
                            {platform.icon} {platform.name}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
