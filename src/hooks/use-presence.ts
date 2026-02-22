"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface PresenceUser {
    userId: string;
    fullName: string | null;
    email: string;
    enteredAt: string;
}

export function usePresence(proofId: string, currentUser: { id: string; full_name?: string | null; email?: string }) {
    const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
    const [channel, setChannel] = useState<RealtimeChannel | null>(null);

    const syncPresence = useCallback((state: Record<string, { userId: string; fullName: string | null; email: string; enteredAt: string }[]>) => {
        const users: PresenceUser[] = [];
        const seen = new Set<string>();

        Object.values(state).forEach((presences) => {
            presences.forEach((p) => {
                if (!seen.has(p.userId)) {
                    seen.add(p.userId);
                    users.push({
                        userId: p.userId,
                        fullName: p.fullName,
                        email: p.email,
                        enteredAt: p.enteredAt,
                    });
                }
            });
        });

        setOnlineUsers(users);
    }, []);

    useEffect(() => {
        const supabase = createClient();
        const ch = supabase.channel(`presence:proof:${proofId}`, {
            config: { presence: { key: currentUser.id } },
        });

        ch.on("presence", { event: "sync" }, () => {
            syncPresence(ch.presenceState() as any);
        });

        ch.subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
                await ch.track({
                    userId: currentUser.id,
                    fullName: currentUser.full_name || null,
                    email: currentUser.email,
                    enteredAt: new Date().toISOString(),
                });
            }
        });

        setChannel(ch);

        return () => {
            ch.unsubscribe();
        };
    }, [proofId, currentUser.id, currentUser.email, currentUser.full_name, syncPresence]);

    return { onlineUsers, channel };
}
