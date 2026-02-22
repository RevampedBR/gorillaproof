export default function ViewerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-emerald-500/30">
            {children}
        </div>
    );
}
