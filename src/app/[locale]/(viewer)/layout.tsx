import { ToastProvider } from "@/components/ui/toast-provider";

export default function ViewerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ToastProvider>
            <div className="h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-emerald-500/30">
                {children}
            </div>
        </ToastProvider>
    );
}
