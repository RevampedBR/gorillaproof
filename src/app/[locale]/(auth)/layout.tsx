import Image from "next/image";
import { Link } from "@/i18n/navigation";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-[oklch(0.08_0.03_155)]">
            {/* Left Pane - Branding with Jungle Image */}
            <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden p-12 lg:flex">
                {/* Jungle background image */}
                <div className="absolute inset-0 z-0">
                    <Image
                        src="/jungle-bg.png"
                        alt=""
                        fill
                        className="object-cover"
                        priority
                    />
                    {/* Dark gradient overlay — right edge fades into form bg */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[oklch(0.08_0.03_155)]" />
                    {/* Overall darkening so text is readable */}
                    <div className="absolute inset-0 bg-black/50" />
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
                        <span className="text-xl font-bold tracking-tight text-white drop-shadow-md font-heading">
                            GorillaProof
                        </span>
                    </Link>
                </div>

                <div className="relative z-10 space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight text-emerald-50 font-heading drop-shadow-lg">
                        Domine suas revisões como um primata evoluído.
                    </h1>
                    <p className="text-lg text-emerald-300/70 drop-shadow-md">
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
