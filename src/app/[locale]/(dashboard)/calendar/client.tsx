"use client";

import { useState, useMemo, useTransition } from "react";
import { ChevronLeft, ChevronRight, Calendar, Clock, AlertTriangle, CheckCircle, FileText, ArrowRight } from "lucide-react";
import { CalendarProof, getCalendarDeadlines } from "@/lib/actions/analytics";
import { Link } from "@/i18n/navigation";

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    draft: { label: "Rascunho", color: "text-zinc-400", bg: "bg-zinc-500/20" },
    in_review: { label: "Em Revisao", color: "text-amber-400", bg: "bg-amber-500/20" },
    approved: { label: "Aprovada", color: "text-emerald-400", bg: "bg-emerald-500/20" },
    rejected: { label: "Rejeitada", color: "text-red-400", bg: "bg-red-500/20" },
    changes_requested: { label: "Ajustes", color: "text-orange-400", bg: "bg-orange-500/20" },
};

const MONTH_NAMES = [
    "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

interface Props {
    initialProofs: CalendarProof[];
    initialMonth: number;
    initialYear: number;
}

export function CalendarClient({ initialProofs, initialMonth, initialYear }: Props) {
    const [month, setMonth] = useState(initialMonth);
    const [year, setYear] = useState(initialYear);
    const [proofs, setProofs] = useState<CalendarProof[]>(initialProofs);
    const [selectedDay, setSelectedDay] = useState<number | null>(null);
    const [isPending, startTransition] = useTransition();

    const today = new Date();
    const isCurrentMonth = month === today.getMonth() + 1 && year === today.getFullYear();

    // Build calendar grid
    const calendarDays = useMemo(() => {
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);
        const daysInMonth = lastDay.getDate();
        const startWeekday = firstDay.getDay();

        const days: (number | null)[] = [];
        for (let i = 0; i < startWeekday; i++) days.push(null);
        for (let d = 1; d <= daysInMonth; d++) days.push(d);
        const remaining = 7 - (days.length % 7);
        if (remaining < 7) for (let i = 0; i < remaining; i++) days.push(null);

        return days;
    }, [month, year]);

    // Group proofs by day
    const proofsByDay = useMemo(() => {
        const map = new Map<number, CalendarProof[]>();
        proofs.forEach(p => {
            const d = new Date(p.deadline);
            const day = d.getDate();
            if (!map.has(day)) map.set(day, []);
            map.get(day)!.push(p);
        });
        return map;
    }, [proofs]);

    // Stats
    const totalDeadlines = proofs.length;
    const overdueCount = proofs.filter(p => {
        return new Date(p.deadline) < today && !["approved", "rejected", "not_relevant"].includes(p.status);
    }).length;

    const selectedProofs = selectedDay ? (proofsByDay.get(selectedDay) || []) : [];

    const navigateMonth = (delta: number) => {
        let newMonth = month + delta;
        let newYear = year;
        if (newMonth > 12) { newMonth = 1; newYear++; }
        if (newMonth < 1) { newMonth = 12; newYear--; }
        setMonth(newMonth);
        setYear(newYear);
        setSelectedDay(null);
        startTransition(async () => {
            const { data } = await getCalendarDeadlines(newMonth, newYear);
            setProofs(data);
        });
    };

    const goToToday = () => {
        const now = new Date();
        const m = now.getMonth() + 1;
        const y = now.getFullYear();
        setMonth(m);
        setYear(y);
        setSelectedDay(now.getDate());
        startTransition(async () => {
            const { data } = await getCalendarDeadlines(m, y);
            setProofs(data);
        });
    };

    const getDayStyle = (day: number) => {
        const isToday = isCurrentMonth && day === today.getDate();
        const dayProofs = proofsByDay.get(day) || [];
        const hasOverdue = dayProofs.some(p =>
            new Date(p.deadline) < today && !["approved", "rejected", "not_relevant"].includes(p.status)
        );
        const isSelected = selectedDay === day;

        let base = "relative flex flex-col items-center justify-start rounded-lg p-1.5 min-h-[72px] cursor-pointer transition-all border ";

        if (isSelected) {
            base += "border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/30 ";
        } else if (isToday) {
            base += "border-emerald-500/30 bg-emerald-500/5 ";
        } else if (hasOverdue) {
            base += "border-red-500/20 bg-red-500/5 ";
        } else {
            base += "border-transparent hover:bg-emerald-500/5 hover:border-emerald-900/30 ";
        }

        return base;
    };

    return (
        <div className="max-w-[1200px] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-emerald-50 tracking-tight flex items-center gap-2.5">
                        <Calendar className="h-6 w-6 text-emerald-400" />
                        Calendario de Prazos
                    </h1>
                    <p className="text-sm text-[oklch(0.55_0.04_155)] mt-1">
                        {totalDeadlines} prazo{totalDeadlines !== 1 ? "s" : ""} em {MONTH_NAMES[month - 1]}
                        {overdueCount > 0 && (
                            <span className="text-red-400 ml-2">
                                ({overdueCount} atrasado{overdueCount !== 1 ? "s" : ""})
                            </span>
                        )}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={goToToday}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-emerald-900/30 text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                    >
                        Hoje
                    </button>
                    <div className="flex items-center gap-1 bg-[oklch(0.08_0.03_155)] rounded-lg border border-emerald-900/20 px-1">
                        <button
                            onClick={() => navigateMonth(-1)}
                            className="p-1.5 hover:bg-emerald-500/10 rounded-md transition-colors"
                            disabled={isPending}
                        >
                            <ChevronLeft className="h-4 w-4 text-emerald-400" />
                        </button>
                        <span className="px-3 py-1.5 text-sm font-semibold text-emerald-50 min-w-[140px] text-center">
                            {MONTH_NAMES[month - 1]} {year}
                        </span>
                        <button
                            onClick={() => navigateMonth(1)}
                            className="p-1.5 hover:bg-emerald-500/10 rounded-md transition-colors"
                            disabled={isPending}
                        >
                            <ChevronRight className="h-4 w-4 text-emerald-400" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex gap-6">
                {/* Calendar Grid */}
                <div className={`flex-1 transition-opacity ${isPending ? "opacity-50" : ""}`}>
                    <div className="bg-[oklch(0.08_0.03_155)] rounded-xl border border-emerald-900/20 overflow-hidden">
                        {/* Day headers */}
                        <div className="grid grid-cols-7 border-b border-emerald-900/20">
                            {DAY_NAMES.map(d => (
                                <div key={d} className="text-center py-2.5 text-xs font-semibold text-[oklch(0.45_0.04_155)] uppercase tracking-wider">
                                    {d}
                                </div>
                            ))}
                        </div>

                        {/* Days grid */}
                        <div className="grid grid-cols-7 gap-px bg-emerald-900/10 p-px">
                            {calendarDays.map((day, i) => (
                                <div
                                    key={i}
                                    className={day ? getDayStyle(day) : "min-h-[72px] bg-[oklch(0.07_0.02_155)]"}
                                    onClick={() => day && setSelectedDay(day === selectedDay ? null : day)}
                                >
                                    {day && (
                                        <>
                                            <span className={`text-sm font-medium ${isCurrentMonth && day === today.getDate()
                                                    ? "text-emerald-400 font-bold"
                                                    : "text-emerald-100"
                                                }`}>
                                                {day}
                                            </span>

                                            {/* Deadline dots */}
                                            {(proofsByDay.get(day) || []).length > 0 && (
                                                <div className="flex flex-wrap gap-0.5 mt-1 justify-center">
                                                    {(proofsByDay.get(day) || []).slice(0, 4).map((p, j) => {
                                                        const isOverdue = new Date(p.deadline) < today && !["approved", "rejected", "not_relevant"].includes(p.status);
                                                        const isApproved = p.status === "approved";
                                                        return (
                                                            <span
                                                                key={j}
                                                                className={`w-2 h-2 rounded-full ${isApproved
                                                                        ? "bg-emerald-400"
                                                                        : isOverdue
                                                                            ? "bg-red-400 animate-pulse"
                                                                            : "bg-amber-400"
                                                                    }`}
                                                            />
                                                        );
                                                    })}
                                                    {(proofsByDay.get(day) || []).length > 4 && (
                                                        <span className="text-[9px] text-[oklch(0.55_0.04_155)] font-medium">
                                                            +{(proofsByDay.get(day) || []).length - 4}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-4 mt-3 px-1">
                        <div className="flex items-center gap-1.5 text-xs text-[oklch(0.55_0.04_155)]">
                            <span className="w-2 h-2 rounded-full bg-amber-400" /> Pendente
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-[oklch(0.55_0.04_155)]">
                            <span className="w-2 h-2 rounded-full bg-red-400" /> Atrasada
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-[oklch(0.55_0.04_155)]">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Aprovada
                        </div>
                    </div>
                </div>

                {/* Sidebar: selected day details */}
                <div className="w-[320px] shrink-0">
                    <div className="bg-[oklch(0.08_0.03_155)] rounded-xl border border-emerald-900/20 p-4 sticky top-6">
                        {selectedDay ? (
                            <>
                                <h3 className="text-sm font-semibold text-emerald-50 mb-3 flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-emerald-400" />
                                    {selectedDay} de {MONTH_NAMES[month - 1]}
                                    <span className="text-xs text-[oklch(0.45_0.04_155)] font-normal ml-auto">
                                        {selectedProofs.length} prazo{selectedProofs.length !== 1 ? "s" : ""}
                                    </span>
                                </h3>

                                {selectedProofs.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Calendar className="h-8 w-8 text-[oklch(0.25_0.04_155)] mx-auto mb-2" />
                                        <p className="text-sm text-[oklch(0.45_0.04_155)]">
                                            Nenhum prazo neste dia
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {selectedProofs.map(p => {
                                            const st = STATUS_MAP[p.status] || STATUS_MAP.draft;
                                            const isOverdue = new Date(p.deadline) < today && !["approved", "rejected", "not_relevant"].includes(p.status);
                                            return (
                                                <Link
                                                    key={p.id}
                                                    href={`/proofs/${p.id}`}
                                                    className="block p-3 rounded-lg border border-emerald-900/20 hover:border-emerald-700/30 bg-[oklch(0.10_0.03_155)] hover:bg-[oklch(0.12_0.03_155)] transition-all group"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-medium text-emerald-50 truncate group-hover:text-emerald-300 transition-colors">
                                                                {p.title}
                                                            </p>
                                                            <p className="text-xs text-[oklch(0.45_0.04_155)] mt-0.5 truncate">
                                                                {p.clientName}
                                                                {p.projectName && ` / ${p.projectName}`}
                                                            </p>
                                                        </div>
                                                        <ArrowRight className="h-3.5 w-3.5 text-[oklch(0.3_0.04_155)] group-hover:text-emerald-400 transition-colors shrink-0 mt-0.5" />
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${st.bg} ${st.color}`}>
                                                            {st.label}
                                                        </span>
                                                        {isOverdue && (
                                                            <span className="flex items-center gap-1 text-[10px] font-medium text-red-400">
                                                                <AlertTriangle className="h-3 w-3" />
                                                                Atrasada
                                                            </span>
                                                        )}
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-10">
                                <Calendar className="h-10 w-10 text-[oklch(0.20_0.04_155)] mx-auto mb-3" />
                                <p className="text-sm font-medium text-[oklch(0.55_0.04_155)]">
                                    Selecione um dia
                                </p>
                                <p className="text-xs text-[oklch(0.40_0.04_155)] mt-1">
                                    Clique em um dia para ver os prazos
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
