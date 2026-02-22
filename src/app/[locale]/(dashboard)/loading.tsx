export default function DashboardLoading() {
    return (
        <div className="flex flex-col h-full max-w-6xl mx-auto animate-pulse">
            <div className="flex items-end justify-between mb-6">
                <div>
                    <div className="h-7 w-48 bg-zinc-800/50 rounded-lg" />
                    <div className="h-4 w-32 bg-zinc-800/30 rounded mt-2" />
                </div>
                <div className="h-8 w-28 bg-zinc-800/50 rounded-md" />
            </div>
            <div className="h-10 w-64 bg-zinc-800/30 rounded-lg mb-6" />
            <div className="grid gap-4 md:grid-cols-4 mb-8">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-20 rounded-xl bg-zinc-800/30 border border-zinc-800/20" />
                ))}
            </div>
            <div className="h-64 rounded-xl bg-zinc-800/20 border border-zinc-800/20" />
        </div>
    );
}
