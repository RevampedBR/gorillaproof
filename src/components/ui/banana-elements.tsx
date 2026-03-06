"use client";

import { useEffect, useState } from "react";

/* ═══════════════════════════════════════════════════════════════════
   🍌 BANANA LOADING SPINNER
   Animated SVG banana that wobbles while loading.
   Usage: <BananaSpinner /> or <BananaSpinner text="Carregando..." />
   ═══════════════════════════════════════════════════════════════════ */

export function BananaSpinner({ text = "Carregando...", size = 48 }: { text?: string; size?: number }) {
    return (
        <div className="flex flex-col items-center gap-3">
            <div className="banana-spinner" style={{ fontSize: size }}>
                <svg
                    width={size}
                    height={size}
                    viewBox="0 0 64 64"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    {/* Banana body */}
                    <path
                        d="M18 48C14 40 12 28 18 18C24 8 36 6 44 10C38 12 30 18 26 28C22 38 22 44 18 48Z"
                        fill="#f5c518"
                        stroke="#d4a616"
                        strokeWidth="1.5"
                    />
                    {/* Inner curve */}
                    <path
                        d="M20 44C17 37 16 28 20 20C24 12 33 9 40 12"
                        stroke="#e8b515"
                        strokeWidth="2"
                        strokeLinecap="round"
                        fill="none"
                    />
                    {/* Tip */}
                    <path
                        d="M44 10C46 9 48 9.5 47 12C46 14 44 13 44 10Z"
                        fill="#8B7D2A"
                    />
                    {/* Bottom tip */}
                    <path
                        d="M18 48C17 50 16 51 18 52C20 51 19 49 18 48Z"
                        fill="#8B7D2A"
                    />
                    {/* Subtle shine */}
                    <path
                        d="M24 16C28 12 34 10 38 12"
                        stroke="rgba(255,255,255,0.3)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        fill="none"
                    />
                </svg>
            </div>
            {text && (
                <span className="text-[13px] font-medium text-emerald-400/80 tracking-wide">
                    {text}
                </span>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   🦍 GORILLA EMPTY STATE ILLUSTRATION
   SVG gorilla silhouette holding a banana for empty state screens.
   Usage: <GorillaEmpty text="Nenhuma prova aqui ainda" sub="Crie sua primeira prova para começar!" />
   ═══════════════════════════════════════════════════════════════════ */

export function GorillaEmpty({
    text = "Nenhuma prova aqui ainda",
    sub,
    size = 120,
}: {
    text?: string;
    sub?: string;
    size?: number;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
            {/* Circular background with gorilla */}
            <div
                className="relative rounded-full bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center mb-5"
                style={{ width: size, height: size }}
            >
                {/* Leaf decoration behind */}
                <svg
                    className="absolute inset-0 text-emerald-500/10"
                    viewBox="0 0 120 120"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.5"
                >
                    <path d="M20 100 Q40 70 60 75 Q80 80 95 55" />
                    <path d="M25 90 Q50 65 70 70 Q90 75 100 50" />
                    <path d="M15 80 Q35 55 55 60 Q75 65 90 45" />
                </svg>

                {/* Gorilla silhouette */}
                <svg
                    width={size * 0.55}
                    height={size * 0.55}
                    viewBox="0 0 80 80"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="relative z-10"
                >
                    {/* Head */}
                    <ellipse cx="40" cy="22" rx="14" ry="12" fill="oklch(0.30 0.06 155)" />
                    {/* Brow ridge */}
                    <path d="M28 18 Q40 14 52 18" stroke="oklch(0.25 0.06 155)" strokeWidth="3" strokeLinecap="round" fill="none" />
                    {/* Eyes */}
                    <circle cx="35" cy="22" r="2" fill="oklch(0.15 0.04 155)" />
                    <circle cx="45" cy="22" r="2" fill="oklch(0.15 0.04 155)" />
                    <circle cx="35.5" cy="21.5" r="0.7" fill="oklch(0.60 0.18 160)" />
                    <circle cx="45.5" cy="21.5" r="0.7" fill="oklch(0.60 0.18 160)" />
                    {/* Nostrils */}
                    <ellipse cx="38" cy="27" rx="1.2" ry="1" fill="oklch(0.20 0.05 155)" />
                    <ellipse cx="42" cy="27" rx="1.2" ry="1" fill="oklch(0.20 0.05 155)" />
                    {/* Body */}
                    <path
                        d="M26 30 Q20 40 22 55 Q24 65 30 70 L50 70 Q56 65 58 55 Q60 40 54 30 Z"
                        fill="oklch(0.28 0.06 155)"
                    />
                    {/* Chest */}
                    <path
                        d="M32 35 Q40 32 48 35 Q46 48 40 50 Q34 48 32 35Z"
                        fill="oklch(0.35 0.05 155)"
                    />
                    {/* Left arm */}
                    <path
                        d="M26 34 Q16 42 14 55 Q13 60 16 62"
                        stroke="oklch(0.28 0.06 155)"
                        strokeWidth="7"
                        strokeLinecap="round"
                        fill="none"
                    />
                    {/* Right arm holding banana */}
                    <path
                        d="M54 34 Q62 40 64 50 Q65 55 62 58"
                        stroke="oklch(0.28 0.06 155)"
                        strokeWidth="7"
                        strokeLinecap="round"
                        fill="none"
                    />
                    {/* 🍌 Banana being held */}
                    <g transform="translate(58, 52) rotate(-30)">
                        <path
                            d="M0 12C-1 8 0 2 4 0C6 -1 8 0 7 3C5 6 3 10 0 12Z"
                            fill="#f5c518"
                            stroke="#d4a616"
                            strokeWidth="0.5"
                        />
                        <path d="M4 0C5 -1 6 -0.5 5.5 1" stroke="#8B7D2A" strokeWidth="0.8" fill="none" />
                    </g>
                    {/* Feet */}
                    <ellipse cx="32" cy="72" rx="6" ry="3" fill="oklch(0.25 0.06 155)" />
                    <ellipse cx="48" cy="72" rx="6" ry="3" fill="oklch(0.25 0.06 155)" />
                </svg>
            </div>

            <h3 className="text-[15px] font-semibold text-emerald-50/80 mb-1 font-heading">{text}</h3>
            {sub && <p className="text-[12px] text-emerald-500/40">{sub}</p>}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   🍌 BANANA CONFETTI BURST
   Spawns animated banana pieces from a point.
   Usage: <BananaConfetti trigger={showConfetti} />
   ═══════════════════════════════════════════════════════════════════ */

export function BananaConfetti({ trigger }: { trigger: boolean }) {
    const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; rotation: number; delay: number }>>([]);

    useEffect(() => {
        if (!trigger) { setParticles([]); return; }
        const p = Array.from({ length: 8 }, (_, i) => ({
            id: i,
            x: (Math.random() - 0.5) * 120,
            y: -(Math.random() * 60 + 30),
            rotation: Math.random() * 360,
            delay: Math.random() * 0.3,
        }));
        setParticles(p);
        const t = setTimeout(() => setParticles([]), 1200);
        return () => clearTimeout(t);
    }, [trigger]);

    if (!particles.length) return null;
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
            {particles.map(p => (
                <div
                    key={p.id}
                    className="absolute left-1/2 top-1/2"
                    style={{
                        animation: `banana-confetti 0.9s ease-out ${p.delay}s forwards`,
                        transform: `translate(${p.x}px, ${p.y}px) rotate(${p.rotation}deg)`,
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 64 64" fill="none">
                        <path
                            d="M18 48C14 40 12 28 18 18C24 8 36 6 44 10C38 12 30 18 26 28C22 38 22 44 18 48Z"
                            fill="#f5c518"
                            stroke="#d4a616"
                            strokeWidth="1.5"
                        />
                    </svg>
                </div>
            ))}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   🦍 GORILLA EASTER EGG ANIMATION
   Full SVG gorilla animation triggered by 5 rapid clicks on logo.
   Gorilla appears, beats chest, tosses banana, then leaves.
   ═══════════════════════════════════════════════════════════════════ */

export function GorillaEasterEgg({ show, onDone }: { show: boolean; onDone: () => void }) {
    useEffect(() => {
        if (!show) return;
        const t = setTimeout(onDone, 3500);
        return () => clearTimeout(t);
    }, [show, onDone]);

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[99999] pointer-events-none flex items-center justify-center">
            {/* Dim overlay */}
            <div className="absolute inset-0 bg-black/40 animate-[fadeIn_0.3s_ease-out]" />

            {/* Gorilla + banana */}
            <div className="relative animate-[gorilla-entrance_0.6s_ease-out_forwards]">
                <svg
                    width="180"
                    height="200"
                    viewBox="0 0 180 200"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="drop-shadow-[0_0_40px_rgba(16,185,129,0.3)]"
                >
                    {/* --- GORILLA BODY --- */}
                    {/* Head */}
                    <ellipse cx="90" cy="55" rx="35" ry="30" fill="oklch(0.22 0.06 155)" />
                    {/* Brow ridge with sagittal crest */}
                    <path d="M60 45 Q90 35 120 45" stroke="oklch(0.18 0.06 155)" strokeWidth="6" strokeLinecap="round" fill="none" />
                    {/* Ears */}
                    <ellipse cx="58" cy="52" rx="6" ry="8" fill="oklch(0.20 0.05 155)" />
                    <ellipse cx="122" cy="52" rx="6" ry="8" fill="oklch(0.20 0.05 155)" />
                    {/* Eyes with glow */}
                    <circle cx="78" cy="55" r="5" fill="oklch(0.12 0.04 155)" />
                    <circle cx="102" cy="55" r="5" fill="oklch(0.12 0.04 155)" />
                    <circle cx="79" cy="54" r="2" fill="oklch(0.65 0.18 160)" />
                    <circle cx="103" cy="54" r="2" fill="oklch(0.65 0.18 160)" />
                    <circle cx="80" cy="53" r="0.8" fill="white" opacity="0.6" />
                    <circle cx="104" cy="53" r="0.8" fill="white" opacity="0.6" />
                    {/* Nose */}
                    <ellipse cx="87" cy="65" rx="3" ry="2.5" fill="oklch(0.15 0.05 155)" />
                    <ellipse cx="93" cy="65" rx="3" ry="2.5" fill="oklch(0.15 0.05 155)" />
                    {/* Mouth — slight smile */}
                    <path d="M83 71 Q90 76 97 71" stroke="oklch(0.15 0.04 155)" strokeWidth="1.5" fill="none" strokeLinecap="round" />

                    {/* Body */}
                    <path
                        d="M55 80 Q40 100 45 140 Q50 165 70 175 L110 175 Q130 165 135 140 Q140 100 125 80 Z"
                        fill="oklch(0.20 0.06 155)"
                    />
                    {/* Chest */}
                    <path
                        d="M70 90 Q90 82 110 90 Q105 125 90 130 Q75 125 70 90Z"
                        fill="oklch(0.28 0.05 155)"
                    />

                    {/* Left arm — chest beating animation */}
                    <g className="animate-[chest-beat_0.4s_ease-in-out_0.6s_4_alternate]" style={{ transformOrigin: '55px 85px' }}>
                        <path
                            d="M55 85 Q35 100 30 130 Q28 145 35 150"
                            stroke="oklch(0.20 0.06 155)"
                            strokeWidth="16"
                            strokeLinecap="round"
                            fill="none"
                        />
                        {/* Left fist */}
                        <circle cx="35" cy="150" r="8" fill="oklch(0.18 0.05 155)" />
                    </g>

                    {/* Right arm — holding and tossing banana */}
                    <g className="animate-[banana-toss_1.5s_ease-in-out_1.5s_forwards]" style={{ transformOrigin: '125px 85px' }}>
                        <path
                            d="M125 85 Q145 100 150 120 Q152 130 148 135"
                            stroke="oklch(0.20 0.06 155)"
                            strokeWidth="16"
                            strokeLinecap="round"
                            fill="none"
                        />
                        {/* Right fist */}
                        <circle cx="148" cy="135" r="8" fill="oklch(0.18 0.05 155)" />

                        {/* 🍌 BIG BANANA held in right hand */}
                        <g transform="translate(148, 120) rotate(-45)">
                            <path
                                d="M0 28C-3 18 -1 5 8 0C13 -2 18 0 16 6C12 14 7 22 0 28Z"
                                fill="#f5c518"
                                stroke="#d4a616"
                                strokeWidth="1"
                            />
                            <path d="M8 0C10 -2 13 -1 12 3" stroke="#8B7D2A" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                            <path d="M2 20 Q5 12 10 6" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                        </g>
                    </g>

                    {/* Feet */}
                    <ellipse cx="75" cy="180" rx="15" ry="6" fill="oklch(0.17 0.06 155)" />
                    <ellipse cx="105" cy="180" rx="15" ry="6" fill="oklch(0.17 0.06 155)" />
                </svg>

                {/* Particle bananas that fly out */}
                <BananaConfetti trigger={show} />

                {/* Text bubble */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md rounded-full px-4 py-1.5 whitespace-nowrap animate-[fadeIn_0.3s_ease-out_0.5s_both]">
                    <span className="text-[13px] font-semibold text-emerald-300 font-heading">
                        GorillaProof! 🍌
                    </span>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   🍌 UPLOAD PROGRESS WITH BANANA FEEDBACK
   Shows banana-themed text during upload.
   ═══════════════════════════════════════════════════════════════════ */

export function BananaUploadProgress({ current, total }: { current?: number; total?: number }) {
    const messages = [
        "Alimentando o gorila...",
        "Descascando os arquivos...",
        "Preparando as bananas...",
        "Escalando a árvore...",
        "Quase lá, primata!",
    ];
    const [msgIdx, setMsgIdx] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setMsgIdx(i => (i + 1) % messages.length);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex items-center gap-3 py-2">
            <div className="banana-spinner" style={{ fontSize: 24 }}>
                <svg width="24" height="24" viewBox="0 0 64 64" fill="none">
                    <path
                        d="M18 48C14 40 12 28 18 18C24 8 36 6 44 10C38 12 30 18 26 28C22 38 22 44 18 48Z"
                        fill="#f5c518"
                        stroke="#d4a616"
                        strokeWidth="1.5"
                    />
                </svg>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[12px] text-emerald-300/80 font-medium truncate">
                    {messages[msgIdx]}
                </p>
                {current !== undefined && total !== undefined && (
                    <p className="text-[11px] text-emerald-500/50">
                        {current} de {total} arquivo{total !== 1 ? "s" : ""}
                    </p>
                )}
            </div>
        </div>
    );
}
