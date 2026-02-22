import { Link } from "@/i18n/navigation";

export default function CheckEmailPage() {
    return (
        <div className="flex flex-col items-center gap-6 text-center">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 flex items-center justify-center">
                <span className="text-4xl">📧</span>
            </div>
            <h1 className="text-2xl font-bold text-zinc-100">
                Check your email
            </h1>
            <p className="text-[15px] text-zinc-400 max-w-sm leading-relaxed">
                We sent a confirmation link to your email address. Click the link to activate your account and start using GorillaProof.
            </p>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 max-w-sm">
                <p className="text-[13px] text-amber-300">
                    💡 Don&apos;t see the email? Check your <strong>spam folder</strong> or wait a few minutes.
                </p>
            </div>
            <Link
                href="/login"
                className="mt-4 text-[14px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
            >
                ← Back to Sign In
            </Link>
        </div>
    );
}
