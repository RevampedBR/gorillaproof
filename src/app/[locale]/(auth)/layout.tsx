import Image from "next/image";
import { Link } from "@/i18n/navigation";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-zinc-950">
            {/* Left Pane - Branding / Visuals */}
            <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-zinc-900 p-12 lg:flex">
                {/* Background Gradients */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute -left-1/4 -top-1/4 h-[800px] w-[800px] rounded-full bg-indigo-600/10 blur-[120px]" />
                    <div className="absolute -bottom-1/4 -right-1/4 h-[600px] w-[600px] rounded-full bg-fuchsia-600/10 blur-[120px]" />
                </div>

                <div className="relative z-10">
                    <Link href="/" className="inline-flex items-center gap-3">
                        <Image
                            src="/logo-white.png"
                            alt="GorillaProof Logo"
                            width={38}
                            height={30}
                            className="drop-shadow-xl invert"
                        />
                        <span className="text-xl font-bold tracking-tight text-white drop-shadow-md">
                            GorillaProof
                        </span>
                    </Link>
                </div>

                <div className="relative z-10 space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight text-zinc-100">
                        Domine suas revisões como um primata evoluído.
                    </h1>
                    <p className="text-lg text-zinc-400">
                        Agências inteligentes já revisam no habitat certo — feedback
                        centralizado, sem caos.
                    </p>
                </div>
            </div>

            {/* Right Pane - Auth Form */}
            <div className="flex w-full items-center justify-center p-8 lg:w-1/2">
                <div className="w-full max-w-sm">{children}</div>
            </div>
        </div>
    );
}
