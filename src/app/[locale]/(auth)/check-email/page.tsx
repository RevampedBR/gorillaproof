import { Link } from "@/i18n/navigation";

export default function CheckEmailPage() {
    return (
        <div className="flex flex-col items-center gap-6 text-center">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 flex items-center justify-center">
                <svg className="h-10 w-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
            </div>
            <h1 className="text-2xl font-bold text-zinc-100">
                Dá uma conferida no e-mail
            </h1>
            <p className="text-[15px] text-zinc-400 max-w-sm leading-relaxed">
                Mandamos um sinal de fumaça pro seu e-mail. Clique no link pra ativar sua conta e entrar na selva.
            </p>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 max-w-sm">
                <p className="text-[13px] text-amber-300">
                    Não achou? Dá uma olhada na <strong>caixa de spam</strong> — às vezes o sinal se perde na mata.
                </p>
            </div>
            <Link
                href="/login"
                className="mt-4 text-[14px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
            >
                Voltar para o Login
            </Link>
        </div>
    );
}
