import { Link } from "@/i18n/navigation";

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
            <div className="text-6xl mb-4">🦍</div>
            <h1 className="text-3xl font-bold text-zinc-100 mb-2">404</h1>
            <p className="text-[14px] text-zinc-400 mb-6 max-w-md">
                Essa página não existe ou você não tem permissão para acessá-la.
            </p>
            <Link
                href="/dashboard"
                className="h-9 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-medium transition-colors inline-flex items-center"
            >
                ← Voltar ao Dashboard
            </Link>
        </div>
    );
}
