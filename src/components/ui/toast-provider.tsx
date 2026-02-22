"use client";

import { useState, useCallback, createContext, useContext, type ReactNode } from "react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextValue {
    toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => { } });
export const useToast = () => useContext(ToastContext);

let nextId = 0;

const TYPE_STYLES: Record<ToastType, { bg: string; border: string; icon: string }> = {
    success: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: "✅" },
    error: { bg: "bg-red-500/10", border: "border-red-500/30", icon: "❌" },
    info: { bg: "bg-blue-500/10", border: "border-blue-500/30", icon: "ℹ️" },
    warning: { bg: "bg-amber-500/10", border: "border-amber-500/30", icon: "⚠️" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: ToastType = "success") => {
        const id = ++nextId;
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
    }, []);

    const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

    return (
        <ToastContext.Provider value={{ toast: addToast }}>
            {children}
            {/* Toast container */}
            <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 380 }}>
                {toasts.map((t) => {
                    const s = TYPE_STYLES[t.type];
                    return (
                        <div
                            key={t.id}
                            className={`pointer-events-auto ${s.bg} ${s.border} border rounded-xl px-4 py-3 shadow-2xl backdrop-blur-md flex items-start gap-3 animate-slide-in-right`}
                        >
                            <span className="text-[16px] shrink-0 mt-0.5">{s.icon}</span>
                            <p className="text-[13px] text-zinc-200 leading-snug flex-1">{t.message}</p>
                            <button
                                onClick={() => dismiss(t.id)}
                                className="text-zinc-500 hover:text-zinc-300 text-[11px] shrink-0 cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}
