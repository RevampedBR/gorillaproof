const GRADIENTS = [
    "from-teal-500 to-emerald-400",
    "from-orange-500 to-rose-500",
    "from-cyan-500 to-blue-500",
    "from-emerald-500 to-teal-400",
    "from-amber-400 to-orange-500",
    "from-rose-500 to-pink-500",
];

export function getGradient(name: string): string {
    let hash = 0;
    for (const c of name) hash = ((hash << 5) - hash + c.charCodeAt(0)) | 0;
    return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}
