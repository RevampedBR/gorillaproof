"use client";

import { useState, useCallback, createContext, useContext, type ReactNode } from "react";
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";

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

const TYPE_STYLES: Record<ToastType, { bg: string; border: string; Icon: any; iconColor: string }> = {
    success: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", Icon: CheckCircle2, iconColor: "text-emerald-400" },
    error: { bg: "bg-red-500/10", border: "border-red-500/30", Icon: XCircle, iconColor: "text-red-400" },
    info: { bg: "bg-blue-500/10", border: "border-blue-500/30", Icon: Info, iconColor: "text-blue-400" },
    warning: { bg: "bg-amber-500/10", border: "border-amber-500/30", Icon: AlertTriangle, iconColor: "text-amber-400" },
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
                            <s.Icon className={`h-[18px] w-[18px] shrink-0 mt-0.5 ${s.iconColor}`} />
                            <p className="text-[13px] text-zinc-200 leading-snug flex-1">{t.message}</p>
                            <button
                                onClick={() => dismiss(t.id)}
                                className="text-zinc-500 hover:text-zinc-300 text-[11px] shrink-0 cursor-pointer flex items-center justify-center p-0.5"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}
