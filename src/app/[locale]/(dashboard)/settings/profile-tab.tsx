"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { createClient } from "@/utils/supabase/client";

interface ProfileTabProps {
    userEmail: string;
    userName: string;
    initialPrefs: {
        email_on_comment: boolean;
        email_on_decision: boolean;
        email_on_mention: boolean;
        email_on_deadline: boolean;
    };
}

export function ProfileTab({ userEmail, userName, initialPrefs }: ProfileTabProps) {
    const { toast } = useToast();
    const [name, setName] = useState(userName);
    const [prefs, setPrefs] = useState(initialPrefs);
    const [savingName, setSavingName] = useState(false);

    // Password change
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [savingPassword, setSavingPassword] = useState(false);

    const handleSaveName = async () => {
        setSavingName(true);
        const supabase = createClient();
        const { error } = await supabase.auth.updateUser({
            data: { full_name: name },
        });
        setSavingName(false);
        if (error) {
            toast("Erro ao atualizar nome: " + error.message, "error");
        } else {
            toast("Nome atualizado!", "success");
        }
    };

    const handleChangePassword = async () => {
        if (newPassword.length < 6) {
            toast("Senha deve ter pelo menos 6 caracteres", "error");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast("As senhas não coincidem", "error");
            return;
        }
        setSavingPassword(true);
        const supabase = createClient();
        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });
        setSavingPassword(false);
        if (error) {
            toast("Erro ao alterar senha: " + error.message, "error");
        } else {
            toast("Senha alterada com sucesso!", "success");
            setShowPasswordForm(false);
            setNewPassword("");
            setConfirmPassword("");
        }
    };

    const handleTogglePref = async (key: keyof typeof prefs) => {
        const updated = { ...prefs, [key]: !prefs[key] };
        setPrefs(updated);
        toast("Preferência atualizada", "success");
    };

    return (
        <div className="space-y-6">
            {/* Personal Info */}
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="h-8 w-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                        <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white">Seus Dados</h3>
                        <p className="text-[12px] text-zinc-500">Informações pessoais da sua conta.</p>
                    </div>
                </div>

                {/* Avatar + Name */}
                <div className="flex items-start gap-6 mb-5">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                        <span className="text-2xl font-bold text-emerald-400">
                            {(name || userEmail).charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div className="flex-1 space-y-4">
                        <div>
                            <label className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Nome Completo</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="flex-1 h-10 rounded-lg bg-zinc-800/60 border border-zinc-700/40 px-4 text-[14px] text-white placeholder-zinc-500 outline-none focus:border-emerald-500/40 transition-colors"
                                />
                                <Button
                                    onClick={handleSaveName}
                                    disabled={savingName || name === userName}
                                    className="h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-semibold transition-colors disabled:opacity-50"
                                >
                                    {savingName ? "..." : "Salvar"}
                                </Button>
                            </div>
                        </div>
                        <div>
                            <label className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Email</label>
                            <div className="flex items-center gap-3 h-10 px-4 rounded-lg bg-zinc-800/30 border border-zinc-700/20">
                                <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                </svg>
                                <span className="text-[14px] text-zinc-400">{userEmail}</span>
                                <span className="ml-auto text-[10px] text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded">Vinculado ao login</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Password */}
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                        <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white">Segurança</h3>
                        <p className="text-[12px] text-zinc-500">Altere sua senha de acesso.</p>
                    </div>
                </div>

                {!showPasswordForm ? (
                    <Button
                        onClick={() => setShowPasswordForm(true)}
                        className="h-10 px-5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-[13px] font-medium transition-colors"
                    >
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                        </svg>
                        Alterar Senha
                    </Button>
                ) : (
                    <div className="space-y-3 max-w-md">
                        <div>
                            <label className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Nova senha</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Mínimo 6 caracteres"
                                className="w-full h-10 rounded-lg bg-zinc-800/60 border border-zinc-700/40 px-4 text-[14px] text-white placeholder-zinc-500 outline-none focus:border-emerald-500/40 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Confirmar senha</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repita a nova senha"
                                className="w-full h-10 rounded-lg bg-zinc-800/60 border border-zinc-700/40 px-4 text-[14px] text-white placeholder-zinc-500 outline-none focus:border-emerald-500/40 transition-colors"
                            />
                        </div>
                        {newPassword && confirmPassword && newPassword !== confirmPassword && (
                            <p className="text-[12px] text-red-400">As senhas não coincidem.</p>
                        )}
                        <div className="flex items-center gap-2 pt-1">
                            <Button
                                onClick={handleChangePassword}
                                disabled={savingPassword || !newPassword || newPassword !== confirmPassword}
                                className="h-10 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold transition-colors disabled:opacity-50"
                            >
                                {savingPassword ? "Alterando..." : "Confirmar Alteração"}
                            </Button>
                            <Button
                                onClick={() => { setShowPasswordForm(false); setNewPassword(""); setConfirmPassword(""); }}
                                variant="ghost"
                                className="h-10 px-4 text-zinc-400 hover:text-white text-[13px]"
                            >
                                Cancelar
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Notifications */}
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="h-8 w-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                        <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white">Notificações por Email</h3>
                        <p className="text-[12px] text-zinc-500">Escolha quais eventos geram notificações na sua caixa de entrada.</p>
                    </div>
                </div>

                <div className="space-y-1">
                    {[
                        {
                            key: "email_on_comment" as const,
                            label: "Novos comentários",
                            desc: "Quando alguém comentar nos seus proofs",
                            iconPath: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
                        },
                        {
                            key: "email_on_decision" as const,
                            label: "Decisões de review",
                            desc: "Quando um reviewer aprovar ou rejeitar",
                            iconPath: "M22 11.08V12a10 10 0 11-5.93-9.14 M22 4L12 14.01l-3-3",
                        },
                        {
                            key: "email_on_mention" as const,
                            label: "Menções (@)",
                            desc: "Quando você for mencionado em um comentário",
                            iconPath: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6",
                        },
                        {
                            key: "email_on_deadline" as const,
                            label: "Deadlines próximos",
                            desc: "Lembrete quando um proof estiver perto do prazo",
                            iconPath: "M12 2a10 10 0 100 20 10 10 0 000-20z M12 6v6l4 2",
                        },
                    ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between py-3.5 px-3 rounded-lg hover:bg-zinc-800/30 transition-colors -mx-3">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-zinc-800/60 flex items-center justify-center shrink-0">
                                    <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d={item.iconPath} />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-[14px] font-medium text-white">{item.label}</p>
                                    <p className="text-[12px] text-zinc-500 mt-0.5">{item.desc}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleTogglePref(item.key)}
                                className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer ${prefs[item.key] ? "bg-emerald-500" : "bg-zinc-700"}`}
                            >
                                <div className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform shadow-sm ${prefs[item.key] ? "translate-x-5" : "translate-x-0"}`} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
