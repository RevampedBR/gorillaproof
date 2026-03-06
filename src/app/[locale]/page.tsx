import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Image from "next/image";

export default async function Home({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations({ locale, namespace: "landing" });

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[oklch(0.06_0.03_155)] font-sans text-emerald-50 selection:bg-emerald-500/30">
            {/* Ambient Animated Gradients — Dark Jungle */}
            <div className="fixed inset-0 z-0 flex items-center justify-center isolate">
                <div className="absolute top-[-10%] left-[-10%] h-[50vw] w-[50vw] rounded-full bg-emerald-600/12 blur-[120px] mix-blend-screen animate-pulse duration-10000" />
                <div className="absolute bottom-[-10%] right-[-10%] h-[50vw] w-[50vw] rounded-full bg-emerald-800/10 blur-[120px] mix-blend-screen animate-pulse duration-7000 delay-1000" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[800px] w-[800px] rounded-full bg-emerald-500/5 blur-[150px] mix-blend-screen" />
                <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none" />

                {/* Subtle leaf silhouettes */}
                <svg className="absolute top-[10%] left-[5%] w-[300px] h-[300px] text-emerald-500/[0.04] rotate-[-15deg]" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="0.5">
                    <path d="M30 170 Q60 120 100 130 Q140 140 160 100 Q180 60 150 30" />
                    <path d="M40 160 Q70 110 110 120 Q150 130 170 90" />
                </svg>
                <svg className="absolute bottom-[15%] right-[8%] w-[250px] h-[250px] text-emerald-500/[0.03] rotate-[25deg]" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="0.5">
                    <path d="M10 100 Q40 60 80 80 Q120 100 160 60" />
                    <path d="M50 190 Q90 150 130 170 Q170 190 190 150" />
                </svg>
            </div>

            <main className="z-10 flex w-full max-w-6xl flex-col items-center justify-center px-4 sm:px-6 pt-32 pb-24 text-center">
                {/* Logo */}
                <Image
                    src="/logo-white.png"
                    alt="GorillaProof"
                    width={80}
                    height={62}
                    className="mb-10 object-contain invert drop-shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                    priority
                />

                {/* Shiny Badge */}
                <div className="relative mb-8 inline-flex items-center gap-2 overflow-hidden rounded-full border border-emerald-500/15 bg-emerald-500/5 px-4 py-1.5 text-xs font-medium tracking-wide text-emerald-200 backdrop-blur-xl transition-colors hover:bg-emerald-500/10 sm:text-sm shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                    <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]"></span>
                    </span>
                    {t("badge")}
                </div>

                {/* Hero Headline with refined gradient */}
                <h1 className="max-w-4xl text-5xl font-extrabold tracking-tight sm:text-7xl lg:text-[5rem] lg:leading-[1.1] font-heading">
                    <span className="text-transparent bg-clip-text bg-gradient-to-br from-white via-emerald-100 to-emerald-400/60 drop-shadow-sm">
                        {t("headline1")}
                    </span>
                    <br />
                    <span className="text-white drop-shadow-md">{t("headline2")}</span>
                </h1>

                <p className="mt-8 max-w-2xl text-lg leading-relaxed text-emerald-300/60 sm:text-xl font-light">
                    {t("description")}
                </p>

                {/* Action Buttons */}
                <div className="mt-12 flex flex-col gap-4 sm:flex-row w-full sm:w-auto">
                    <Link href="/register" className="group relative flex h-14 items-center justify-center gap-2 overflow-hidden rounded-full bg-emerald-500 px-8 font-medium text-emerald-950 transition-all hover:scale-[1.02] hover:bg-emerald-400 sm:w-auto shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                        <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(150%)]">
                            <div className="relative h-full w-8 bg-white/20" />
                        </div>
                        <span className="relative z-10 font-semibold">{t("ctaPrimary")}</span>
                        <svg
                            className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </Link>

                    <Link href="/login" className="flex h-14 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/5 px-8 font-medium text-emerald-100 backdrop-blur-md transition-all hover:bg-emerald-500/10 hover:border-emerald-500/30 sm:w-auto shadow-[0_0_20px_rgba(16,185,129,0.03)]">
                        {t("ctaSecondary")}
                    </Link>
                </div>

                {/* Mockup Placeholder with Glassmorphism */}
                <div className="mt-24 w-full max-w-5xl rounded-[2rem] border border-emerald-500/10 bg-emerald-500/[0.03] p-2 shadow-2xl shadow-emerald-500/10 backdrop-blur-3xl sm:p-4 ring-1 ring-emerald-500/10">
                    <div className="relative flex h-[500px] w-full flex-col items-center justify-center overflow-hidden rounded-[1.5rem] border border-emerald-500/10 bg-[oklch(0.06_0.03_155)] isolate">
                        {/* Inner Grid */}
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:32px_32px]"></div>

                        {/* Top glass bar */}
                        <div className="absolute top-0 inset-x-0 h-12 border-b border-emerald-500/10 bg-emerald-500/5 backdrop-blur-md flex items-center px-4 gap-2 z-20">
                            <div className="flex gap-1.5">
                                <div className="h-3 w-3 rounded-full bg-red-500/80 shadow-[0_0_5px_rgba(239,68,68,0.5)]"></div>
                                <div className="h-3 w-3 rounded-full bg-[oklch(0.85_0.15_85)] shadow-[0_0_5px_rgba(245,197,24,0.5)]"></div>
                                <div className="h-3 w-3 rounded-full bg-emerald-500/80 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>
                            </div>
                        </div>

                        <div className="z-10 flex flex-col items-center gap-6 text-emerald-500/60">
                            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-emerald-500/15 bg-emerald-500/5 shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                                <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <p className="font-medium tracking-wide text-emerald-400/60">{t("mockupLabel")}</p>
                        </div>

                        {/* Bottom Glow */}
                        <div className="absolute bottom-0 inset-x-0 h-2/3 bg-gradient-to-t from-emerald-500/10 via-emerald-700/5 to-transparent blur-3xl z-0" />
                    </div>
                </div>
            </main>
        </div>
    );
}
