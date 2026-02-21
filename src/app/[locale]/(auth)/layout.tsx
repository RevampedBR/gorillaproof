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
                            src="https://static.wixstatic.com/media/1b0281_ef9aa17a06ce4946acda750d99e30419~mv2.png/v1/fill/w_77,h_60,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/1b0281_ef9aa17a06ce4946acda750d99e30419~mv2.png"
                            alt="GorillaProof Logo"
                            width={38}
                            height={30}
                            className="drop-shadow-xl"
                        />
                        <span className="text-xl font-bold tracking-tight text-white drop-shadow-md">
                            GorillaProof
                        </span>
                    </Link>
                </div>

                <div className="relative z-10 space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight text-zinc-100">
                        Streamline your creative review process.
                    </h1>
                    <p className="text-lg text-zinc-400">
                        Join hundreds of agencies managing feedback, versions, and approvals
                        in one centralized workspace.
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
