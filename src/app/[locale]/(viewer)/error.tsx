"use client";

import { AlertTriangle } from "lucide-react";

export default function ViewerError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f0f1e] px-4 text-center">
            <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-zinc-100 mb-2">Erro no Viewer</h2>
            <p className="text-[13px] text-zinc-400 mb-6 max-w-md">
                Não foi possível carregar este proof. Verifique se o link está correto.
            </p>
            <button
                onClick={reset}
                className="h-9 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-medium transition-colors cursor-pointer"
            >
                Tentar novamente
            </button>
        </div>
    );
}
