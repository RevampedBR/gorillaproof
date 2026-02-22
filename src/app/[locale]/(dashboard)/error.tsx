"use client";

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
            <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-zinc-100 mb-2">Algo deu errado</h2>
            <p className="text-[13px] text-zinc-400 mb-6 max-w-md">
                Ocorreu um erro inesperado. Tente novamente ou entre em contato com o suporte.
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
