import Image from "next/image";
import { Link } from "@/i18n/navigation";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-background">
            {/* Left Pane - Branding / Visuals */}
            <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-zinc-950 p-12 lg:flex text-white">
                {/* Background Gradients */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute -left-1/4 -top-1/4 h-[800px] w-[800px] rounded-full bg-indigo-500/20 blur-[120px]" />
                    <div className="absolute -bottom-1/4 -right-1/4 h-[600px] w-[600px] rounded-full bg-fuchsia-500/20 blur-[120px]" />
                </div>

                <div className="relative z-10 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                         <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                             <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                        </svg>
                    </div>
                    <span className="text-xl font-bold tracking-tight">GorillaProof</span>
                </div>

                <div className="relative z-10 space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight text-white/90 leading-tight">
                        Streamline your creative review process.
                    </h1>
                    <p className="text-lg text-white/60 max-w-md">
                        Join hundreds of agencies managing feedback, versions, and approvals
                        in one centralized workspace.
                    </p>
                </div>
            </div>

            {/* Right Pane - Auth Form */}
            <div className="flex w-full items-center justify-center p-8 lg:w-1/2 bg-background text-foreground">
                <div className="w-full max-w-md">{children}</div>
            </div>
        </div>
    );
}
