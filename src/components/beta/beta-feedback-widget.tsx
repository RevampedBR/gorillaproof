"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { submitFeedback, uploadFeedbackScreenshot, type SubmitFeedbackInput } from "@/lib/actions/feedback";

/* ═══ Console Error Interceptor ═══ */
const capturedErrors: unknown[] = [];
if (typeof window !== "undefined") {
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
        capturedErrors.push({
            message: args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" "),
            timestamp: new Date().toISOString(),
        });
        if (capturedErrors.length > 20) capturedErrors.shift();
        originalError.apply(console, args);
    };
}

/* ═══ Config ═══ */
const SEVERITY_OPTIONS = [
    { value: "blocker" as const, icon: "🚫", label: "Blocker — não consigo continuar" },
    { value: "annoying" as const, icon: "😤", label: "Incômodo — funciona mas incomoda" },
    { value: "cosmetic" as const, icon: "💅", label: "Cosmético — detalhe visual" },
];

const TYPE_OPTIONS = [
    { value: "bug" as const, icon: "🐛", label: "Bug" },
    { value: "suggestion" as const, icon: "💡", label: "Sugestão" },
    { value: "confusion" as const, icon: "🤔", label: "Confuso" },
];

/* ═══ MAIN WIDGET ═══ */
export function BetaFeedbackWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [bannerDismissed, setBannerDismissed] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Form state
    const [type, setType] = useState<SubmitFeedbackInput["type"]>("bug");
    const [severity, setSeverity] = useState<SubmitFeedbackInput["severity"]>("annoying");
    const [description, setDescription] = useState("");
    const [expectedBehavior, setExpectedBehavior] = useState("");
    const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
    const [manualFileUrl, setManualFileUrl] = useState<string | null>(null);
    const [showMeta, setShowMeta] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    // Metadata (captured at mount)
    const [meta, setMeta] = useState({
        pageUrl: "",
        browserInfo: "",
        screenResolution: "",
    });

    useEffect(() => {
        setMeta({
            pageUrl: window.location.href,
            browserInfo: navigator.userAgent,
            screenResolution: `${window.innerWidth}×${window.innerHeight}`,
        });
    }, [isOpen]);

    // Check banner dismissal from sessionStorage
    useEffect(() => {
        if (sessionStorage.getItem("beta-banner-dismissed") === "true") {
            setBannerDismissed(true);
        }
    }, []);

    const dismissBanner = () => {
        setBannerDismissed(true);
        sessionStorage.setItem("beta-banner-dismissed", "true");
    };

    // Close on escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsOpen(false);
        };
        document.addEventListener("keydown", handleEsc);
        return () => document.removeEventListener("keydown", handleEsc);
    }, []);

    // Close on click outside
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [isOpen]);

    // Auto screenshot via html2canvas
    const captureScreenshot = useCallback(async () => {
        try {
            const html2canvas = (await import("html2canvas")).default;
            const canvas = await html2canvas(document.body, {
                scale: 0.5,
                logging: false,
                useCORS: true,
                allowTaint: true,
                ignoreElements: (el) => el.id === "beta-feedback-widget",
            });
            const dataUrl = canvas.toDataURL("image/png");
            setScreenshotBase64(dataUrl);
        } catch {
            // Silently fail — screenshot is optional
        }
    }, []);

    // Manual file upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Show preview immediately
        const reader = new FileReader();
        reader.onload = () => setManualFileUrl(reader.result as string);
        reader.readAsDataURL(file);
    };

    // Submit
    const handleSubmit = async () => {
        if (!description.trim()) return;
        setSubmitting(true);

        try {
            // If manual file was uploaded, use that; otherwise use auto-screenshot
            let finalScreenshot = screenshotBase64;

            if (manualFileUrl && fileInputRef.current?.files?.[0]) {
                const formData = new FormData();
                formData.append("file", fileInputRef.current.files[0]);
                const { url } = await uploadFeedbackScreenshot(formData);
                if (url) finalScreenshot = null; // Don't send base64 if file was uploaded separately
            }

            const result = await submitFeedback({
                type,
                severity,
                description: description.trim(),
                expectedBehavior: expectedBehavior.trim() || undefined,
                pageUrl: meta.pageUrl,
                browserInfo: meta.browserInfo,
                screenResolution: meta.screenResolution,
                consoleErrors: [...capturedErrors],
                screenshotBase64: finalScreenshot || undefined,
            });

            if (!result.error) {
                setSubmitted(true);
                setTimeout(() => {
                    setSubmitted(false);
                    setIsOpen(false);
                    resetForm();
                }, 2000);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setType("bug");
        setSeverity("annoying");
        setDescription("");
        setExpectedBehavior("");
        setScreenshotBase64(null);
        setManualFileUrl(null);
        setShowMeta(false);
    };

    const screenshotPreview = manualFileUrl || screenshotBase64;

    return (
        <div id="beta-feedback-widget">
            {/* ═══ BETA BANNER ═══ */}
            {!bannerDismissed && (
                <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-3 bg-gradient-to-r from-amber-600/90 via-amber-500/90 to-amber-600/90 px-4 py-1.5 text-[13px] font-medium text-amber-950 backdrop-blur-sm shadow-lg shadow-amber-500/20">
                    <span className="flex items-center gap-1.5">
                        <span className="text-base">🧪</span>
                        <span className="font-semibold">BETA</span>
                        <span className="hidden sm:inline">·</span>
                        <span className="hidden sm:inline">Ajude-nos a melhorar! Encontrou algo estranho?</span>
                    </span>
                    <button
                        onClick={() => { setIsOpen(true); dismissBanner(); }}
                        className="rounded-md bg-amber-900/20 px-3 py-0.5 text-[12px] font-semibold text-amber-950 hover:bg-amber-900/30 transition-colors"
                    >
                        🐛 Reportar
                    </button>
                    <button
                        onClick={dismissBanner}
                        className="ml-1 rounded-full p-0.5 hover:bg-amber-900/20 transition-colors"
                        aria-label="Fechar banner"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            {/* ═══ FLOATING BUTTON ═══ */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-[9998] flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-[13px] font-semibold text-amber-950 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-105 transition-all duration-200 group"
                title="Reportar bug ou sugestão"
            >
                <span className="text-lg group-hover:animate-bounce">🐛</span>
                <span className="hidden sm:inline">Feedback</span>
            </button>

            {/* ═══ FEEDBACK MODAL ═══ */}
            {isOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div
                        ref={modalRef}
                        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-[oklch(0.12_0.02_155)] border border-emerald-900/30 shadow-2xl shadow-black/50"
                    >
                        {/* Header */}
                        <div className="sticky top-0 flex items-center justify-between border-b border-emerald-900/20 bg-[oklch(0.12_0.02_155)] px-5 py-3.5 rounded-t-2xl z-10">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">🐛</span>
                                <h2 className="text-[15px] font-semibold text-emerald-50">Reportar um Problema</h2>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="rounded-lg p-1.5 text-emerald-400/60 hover:bg-emerald-500/10 hover:text-emerald-300 transition-colors"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {submitted ? (
                            /* Success state */
                            <div className="flex flex-col items-center justify-center gap-3 py-16 px-5">
                                <span className="text-5xl">✅</span>
                                <p className="text-[15px] font-medium text-emerald-50">Obrigado pelo feedback!</p>
                                <p className="text-[13px] text-emerald-400/70">Vamos investigar e resolver o mais rápido possível.</p>
                            </div>
                        ) : (
                            /* Form */
                            <div className="space-y-4 px-5 py-4">

                                {/* Type selector */}
                                <div>
                                    <label className="block text-[12px] font-medium text-emerald-400/70 uppercase tracking-wide mb-2">Tipo</label>
                                    <div className="flex gap-2">
                                        {TYPE_OPTIONS.map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={() => setType(opt.value)}
                                                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-medium transition-all ${type === opt.value
                                                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-50"
                                                    : "border-emerald-900/20 bg-emerald-950/20 text-emerald-400/60 hover:border-emerald-700/30 hover:text-emerald-300"
                                                    }`}
                                            >
                                                <span>{opt.icon}</span>
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-[12px] font-medium text-emerald-400/70 uppercase tracking-wide mb-2">
                                        O que aconteceu? <span className="text-red-400">*</span>
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Descreva o problema com o máximo de detalhes possível..."
                                        rows={3}
                                        className="w-full rounded-lg border border-emerald-900/25 bg-emerald-950/30 px-3 py-2.5 text-[13px] text-emerald-50 placeholder:text-emerald-400/30 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 resize-none transition-colors"
                                    />
                                </div>

                                {/* Expected behavior */}
                                <div>
                                    <label className="block text-[12px] font-medium text-emerald-400/70 uppercase tracking-wide mb-2">
                                        O que esperava que acontecesse?
                                    </label>
                                    <textarea
                                        value={expectedBehavior}
                                        onChange={(e) => setExpectedBehavior(e.target.value)}
                                        placeholder="Opcional — descreva o comportamento esperado..."
                                        rows={2}
                                        className="w-full rounded-lg border border-emerald-900/25 bg-emerald-950/30 px-3 py-2.5 text-[13px] text-emerald-50 placeholder:text-emerald-400/30 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 resize-none transition-colors"
                                    />
                                </div>

                                {/* Severity */}
                                <div>
                                    <label className="block text-[12px] font-medium text-emerald-400/70 uppercase tracking-wide mb-2">Severidade</label>
                                    <div className="space-y-1.5">
                                        {SEVERITY_OPTIONS.map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={() => setSeverity(opt.value)}
                                                className={`w-full flex items-center gap-2.5 rounded-lg border px-3 py-2 text-[13px] text-left transition-all ${severity === opt.value
                                                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-50"
                                                    : "border-emerald-900/20 bg-emerald-950/20 text-emerald-400/60 hover:border-emerald-700/30"
                                                    }`}
                                            >
                                                <span>{opt.icon}</span>
                                                <span>{opt.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Screenshot section */}
                                <div>
                                    <label className="block text-[12px] font-medium text-emerald-400/70 uppercase tracking-wide mb-2">Captura de Tela</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={captureScreenshot}
                                            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-emerald-900/25 bg-emerald-950/30 px-3 py-2.5 text-[13px] text-emerald-300 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all"
                                        >
                                            📸 Capturar tela
                                        </button>
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-emerald-900/25 bg-emerald-950/30 px-3 py-2.5 text-[13px] text-emerald-300 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all"
                                        >
                                            📎 Upload arquivo
                                        </button>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />
                                    </div>
                                    {screenshotPreview && (
                                        <div className="relative mt-2 rounded-lg border border-emerald-900/25 overflow-hidden">
                                            <img
                                                src={screenshotPreview}
                                                alt="Screenshot preview"
                                                className="w-full h-auto max-h-40 object-cover"
                                            />
                                            <button
                                                onClick={() => { setScreenshotBase64(null); setManualFileUrl(null); }}
                                                className="absolute top-1.5 right-1.5 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition-colors"
                                            >
                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Auto-captured metadata (collapsible) */}
                                <div>
                                    <button
                                        onClick={() => setShowMeta(!showMeta)}
                                        className="flex items-center gap-1.5 text-[12px] text-emerald-400/50 hover:text-emerald-400/80 transition-colors"
                                    >
                                        <svg className={`h-3 w-3 transition-transform ${showMeta ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                        </svg>
                                        Info técnica auto-coletada
                                    </button>
                                    {showMeta && (
                                        <div className="mt-2 rounded-lg border border-emerald-900/20 bg-emerald-950/20 p-3 text-[11px] text-emerald-400/50 font-mono space-y-1">
                                            <p><span className="text-emerald-400/70">URL:</span> {meta.pageUrl}</p>
                                            <p><span className="text-emerald-400/70">Browser:</span> {meta.browserInfo.slice(0, 80)}...</p>
                                            <p><span className="text-emerald-400/70">Resolução:</span> {meta.screenResolution}</p>
                                            <p><span className="text-emerald-400/70">Erros capturados:</span> {capturedErrors.length}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Submit */}
                                <div className="pt-2 pb-1">
                                    <button
                                        onClick={handleSubmit}
                                        disabled={!description.trim() || submitting}
                                        className="w-full rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-2.5 text-[14px] font-semibold text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all"
                                    >
                                        {submitting ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                                Enviando...
                                            </span>
                                        ) : (
                                            "Enviar Feedback"
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
